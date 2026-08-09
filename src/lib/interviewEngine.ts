import { CandidateProfile, CurriculumDay, InterviewFeedback, InterviewSessionState, Mission, ResponseOutcome, TopicMastery, InterviewIntelligenceState, CodingEvidence, CodingSubmission, CodingOpportunity } from "../types/interview";
import { getCurriculumDay } from "./dataService";
import { breethClient } from "./breethClient";
import { generateGeminiContent, GeminiMessage } from "./geminiClient";
import { buildInterviewerSystemPrompt, buildFeedbackSystemPrompt } from "./prompts";
import { generateCandidateProfile } from "./candidateProfiler";
import { classifyResponseOutcome } from "./responseClassifier";
import { evaluateAnswer, updateTopicMastery } from "./answerEvaluator";
import { generateEvidenceBackedFeedback } from "./feedbackGenerator";
import { getSession, saveSession } from "./sessionStore";
import { displayFirstName } from "./pii";
import { log, sessionRef } from "./logger";
import { detectPromptInjection, wrapUntrustedAnswer } from "./promptGuard";
import { compactHistory } from "./historyCompact";
import { interviewFeedbackSchema } from "./feedbackSchema";
import { evaluateCodeSubmission, getCodingTaskById, getOpportunisticCodingTask, CodeTask } from "./codingTasks";

export { getSession } from "./sessionStore";

export async function createSession(sessionId: string, candidate: CandidateProfile): Promise<InterviewSessionState> {
  const intelligenceProfile = generateCandidateProfile(candidate);

  // Requirement 1: Choose initial focus area from candidate profile
  const initialFocusDay = intelligenceProfile.recommendedFocusAreas[0]?.day || candidate.missions[0]?.day || 7;

  const state: InterviewSessionState = {
    sessionId,
    candidate,
    turnCount: 0,
    evaluatedDays: new Set<number>([initialFocusDay]),
    currentQuestionDay: initialFocusDay,
    turnsOnCurrentDay: 1,
    history: [],
    done: false,
    intelligenceProfile,
    masteryState: new Map<number, TopicMastery>(),
    codingEvidence: [],
    codingAssessmentsCompleted: 0,
  };
  await saveSession(state);
  return state;
}

export async function processInterviewTurn(
  sessionId: string,
  candidateInput?: CandidateProfile,
  messageInput?: string,
  codingSubmission?: CodingSubmission
): Promise<{ reply: string; done: boolean; feedback?: InterviewFeedback; intelligence?: InterviewIntelligenceState }> {
  let session = await getSession(sessionId);

  // 1. Initial turn / Start Session
  if (!session) {
    if (!candidateInput) {
      throw new Error("Candidate profile is required to initialize a new interview session.");
    }
    session = await createSession(sessionId, candidateInput);
  }

  if (session.done) {
    const completedReply = [...session.history].reverse().find((item) => item.role === "interviewer")?.content
      || `Thanks for the thoughtful discussion, ${displayFirstName(session.candidate)}. The interview is complete.`;
    return {
      reply: completedReply,
      done: true,
      feedback: session.feedback,
      intelligence: buildInterviewIntelligenceState(
        session,
        session.currentQuestionDay || 7,
        session.candidate.missions.find((mission) => mission.day === session!.currentQuestionDay) || { day: 7, title: "Final Evaluation" },
      ),
    };
  }

  // Active question day that candidate is currently answering
  const activeQuestionDay = session.currentQuestionDay || 7;
  const activeCurriculumDay = getCurriculumDay(activeQuestionDay);
  const activeMission = session.candidate.missions.find((m) => m.day === activeQuestionDay) || {
    day: activeQuestionDay,
    title: activeCurriculumDay?.title || `Day ${activeQuestionDay} Curriculum Module`,
  };
  const activeCanonicalTitle = activeCurriculumDay?.title || activeMission.title;

  // 2. Add incoming candidate message to history if provided & classify response outcome against active question day
  let lastOutcome: ResponseOutcome | undefined;
  if (messageInput) {
    session.history.push({ role: "candidate", content: messageInput });
    session.turnCount += 1;

    // Classify answer into structured outcome against active question day
    lastOutcome = detectPromptInjection(messageInput)
      ? "off_topic"
      : classifyResponseOutcome(messageInput, activeCurriculumDay);
    session.lastOutcome = lastOutcome;

    // Stream to Breeth memory graph asynchronously (Preserve Breeth integration)
    breethClient.addEpisode([
      { role: "user", content: `[Candidate ${session.candidate.member.id}] ${messageInput}` }
    ]).catch(() => {});

    // Evaluate the answer against active curriculum day and update mastery state BEFORE changing targetDay
    const evaluation = evaluateAnswer(messageInput, activeCurriculumDay);
    session.latestEvaluation = evaluation;

    const existingMastery = session.masteryState.get(activeQuestionDay);
    const updatedMastery = updateTopicMastery(
      existingMastery,
      evaluation,
      activeQuestionDay,
      activeCanonicalTitle
    );
    session.masteryState.set(activeQuestionDay, updatedMastery);

    if (!session.codingOpportunity) {
      const opportunityTask = getOpportunisticCodingTask(
        activeCanonicalTitle,
        lastOutcome,
        evaluation.demonstratedConcepts,
        session.codingAssessmentsCompleted || 0
      );
      if (opportunityTask) session.codingOpportunity = toCodingOpportunity(opportunityTask);
    }
  }


  if (codingSubmission) {
    const codingEvidence = recordCodingSubmission(session, codingSubmission, Math.max(1, session.turnCount));
    if (codingEvidence) {
      session.codingEvidence = [...(session.codingEvidence || []).filter((evidence) => evidence.taskId !== codingEvidence.taskId), codingEvidence].slice(-2);
      session.codingAssessmentsCompleted = (session.codingAssessmentsCompleted || 0) + 1;
      session.codingOpportunity = undefined;
    }
  }
  // 3. Check if interview is finished
  const isFinished = session.turnCount >= 8;

  if (isFinished || (messageInput && messageInput.toLowerCase().includes("wrap up interview"))) {
    session.done = true;
    const feedback = await generateFeedbackWithGemini(session);
    session.feedback = feedback;

    const endReply = `Thanks for the thoughtful discussion, ${displayFirstName(session.candidate)}. That completes the interview, and the evidence from your responses has been captured for review.`;

    session.history.push({ role: "interviewer", content: endReply });
    await saveSession(session);

    const intelligence = buildInterviewIntelligenceState(
      session,
      session.currentQuestionDay || 7,
      session.candidate.missions.find((m) => m.day === session!.currentQuestionDay) || { day: 7, title: "Final Evaluation" },
    );

    return {
      reply: endReply,
      done: true,
      feedback,
      intelligence,
    };
  }

  // 4. Determine target day & topic for the NEXT question turn
  let targetDay = session.currentQuestionDay || 7;
  const turnsOnCurrentDay = session.turnsOnCurrentDay || 1;

  if (messageInput) {
    const currentTopicAttempts = session.masteryState.get(activeQuestionDay)?.attempts || 1;
    const staysForDeeperProbe = lastOutcome === "strong" && currentTopicAttempts < 2;
    const staysForRecovery = ["unknown", "weak", "off_topic", "partial"].includes(lastOutcome || "") && currentTopicAttempts < 4;

    if (staysForDeeperProbe || staysForRecovery) {
      targetDay = session.currentQuestionDay!;
      session.turnsOnCurrentDay = turnsOnCurrentDay + 1;
    } else {
      const candidateFocusDays = session.intelligenceProfile?.recommendedFocusAreas.map((f) => f.day) || [];
      const candidateMissionDays = session.candidate.missions.map((m) => m.day);
      const candidateTargetDays = Array.from(new Set([...candidateFocusDays, ...candidateMissionDays]));
      const unassessedDays = candidateTargetDays.filter((day) => day !== activeQuestionDay && !session!.evaluatedDays.has(day));
      const alternateDays = candidateTargetDays.filter((day) => day !== activeQuestionDay);

      if (unassessedDays.length > 0) {
        targetDay = unassessedDays[0];
      } else if (alternateDays.length > 0) {
        targetDay = alternateDays[session.turnCount % alternateDays.length];
      } else {
        targetDay = activeQuestionDay;
      }

      session.evaluatedDays.add(targetDay);
      session.currentQuestionDay = targetDay;
      session.turnsOnCurrentDay = 1;
    }
  }

  // Grounding context & target mission for next turn
  const targetCurriculumDay = getCurriculumDay(targetDay);
  const targetMission = session.candidate.missions.find((m) => m.day === targetDay) || {
    day: targetDay,
    title: targetCurriculumDay?.title || `Day ${targetDay} Curriculum Module`,
  };

  // 5. Best-effort Breeth contextual memory retrieval
  let retrievedMemories: string[] = [];
  if (messageInput) {
    try {
      const searchQuery = `${targetCurriculumDay?.title || targetMission.title} ${messageInput}`;
      retrievedMemories = await breethClient.searchMemory(searchQuery, 3);
    } catch {
      log("warn", "breeth.search_failed", { session: sessionRef(session.sessionId) });
      retrievedMemories = [];
    }
  }

  // 6. Generate dynamic turn response using Gemini 3.5 Flash Lite
  let reply = "";
  try {
    reply = await generateTurnWithGemini(session, targetMission, targetCurriculumDay, retrievedMemories, session.codingEvidence, session.codingOpportunity);
  } catch {
    log("error", "gemini.turn_failed", { session: sessionRef(session.sessionId) });
    const latestCodingEvidence = session.codingEvidence?.[session.codingEvidence.length - 1];
    const candidateChallenged = messageInput && /\b(disagree|push back|not sure that|would not use|wouldn't use)\b/i.test(messageInput);
    if (latestCodingEvidence && codingSubmission) {
      reply = `Your implementation passed ${latestCodingEvidence.passed} of ${latestCodingEvidence.total} checks. If this ran across a large production corpus, what would you change first?`;
    } else if (session.codingOpportunity && lastOutcome === "strong") {
      reply = `That is a good approach. Let's make that concrete for a moment. Can you implement the small ${session.codingOpportunity.title.toLowerCase()} check before we continue?`;
    } else if (candidateChallenged) {
      reply = `That's a fair challenge. What evidence or production constraint makes you prefer that approach?`;
    } else if (session.turnCount === 0) {
      reply = `Thanks for joining, ${displayFirstName(session.candidate)}. Let's start with ${targetCurriculumDay?.title || targetMission.title}. What did you build, and which design decision mattered most?`;
    } else if (lastOutcome === "off_topic") {
      reply = `That's useful context. Bringing it back to ${targetCurriculumDay?.title || targetMission.title}: ${targetCurriculumDay?.objectives?.[0] || "what is the core implementation choice here"}?`;
    } else if (lastOutcome === "unknown" || lastOutcome === "weak") {
      reply = `Let's make that more concrete. In ${targetCurriculumDay?.title || targetMission.title}, how would you explain ${targetCurriculumDay?.objectives?.[0] || "the central idea"} to a teammate implementing it for the first time?`;
    } else if (lastOutcome === "partial") {
      reply = `Let's narrow that down. In ${targetCurriculumDay?.title || targetMission.title}, which part of ${targetCurriculumDay?.objectives?.[0] || "the implementation"} would you make explicit?`;
    } else {
      reply = `That gives us a solid base. Let's go one level deeper: ${targetCurriculumDay?.objectives?.[0] || "how did you design this system"}? Which trade-off would you revisit in production?`;
    }
  }

  session.history.push({ role: "interviewer", content: reply });
  await saveSession(session);

  const intelligence = buildInterviewIntelligenceState(
    session,
    targetDay,
    targetMission,
  );

  return {
    reply,
    done: false,
    intelligence,
  };
}


function toCodingOpportunity(task: CodeTask): CodingOpportunity {
  return {
    taskId: task.id,
    title: task.title,
    topic: task.topic,
    language: task.language,
    whyThisTask: task.whyThisTask,
    functionSignature: task.functionSignature,
    estimatedMinutes: task.estimatedMinutes,
  };
}

function recordCodingSubmission(session: InterviewSessionState, submission: CodingSubmission, sourceQuestion: number): CodingEvidence | undefined {
  const task = getCodingTaskById(submission.taskId);
  if (!task) return undefined;
  const evaluation = evaluateCodeSubmission(task, submission.code.slice(0, 24000));
  return {
    taskId: task.id,
    title: task.title,
    topic: task.topic,
    language: task.language,
    passed: evaluation.passed,
    total: evaluation.total,
    score: evaluation.score,
    tests: evaluation.tests.map((test) => ({ name: test.name, passed: test.passed })),
    demonstratedConcepts: evaluation.tests.filter((test) => test.passed).map((test) => test.name),
    missingConcepts: evaluation.tests.filter((test) => !test.passed).map((test) => test.name),
    sourceQuestion,
  };
}
function buildInterviewIntelligenceState(
  session: InterviewSessionState,
  targetDay: number,
  targetMission: Pick<Mission, "day" | "title">,
): InterviewIntelligenceState {
  const turnsOnCurrentDay = session.turnsOnCurrentDay || 1;
  const lastOutcome = session.lastOutcome;
  const targetCanonicalRecord = getCurriculumDay(targetDay);
  const targetCanonicalTitle = targetCanonicalRecord?.title || targetMission.title;

  let difficultyState = "Standard Adaptive Assessment";
  if (lastOutcome === "off_topic") {
    difficultyState = "Redirecting / Off-Topic";
  } else if (turnsOnCurrentDay > 1 && (lastOutcome === "unknown" || lastOutcome === "weak")) {
    difficultyState = "Prerequisite Recovery";
  } else if (lastOutcome === "strong") {
    difficultyState = "Deep-Dive / Advanced";
  }

  let whyThisQuestion = "";
  if (session.turnCount === 0) {
    const focusReason = session.intelligenceProfile?.recommendedFocusAreas[0]?.reason || "profile signal";
    whyThisQuestion = "Profile signal: Selected " + targetCanonicalTitle + " because " + focusReason + ".";
  } else if (lastOutcome === "off_topic") {
    whyThisQuestion = "Previous answer was off-topic. Staying with " + targetCanonicalTitle + " to gather direct evidence.";
  } else if (lastOutcome === "unknown" || lastOutcome === "weak") {
    whyThisQuestion = "Previous answer showed " + lastOutcome + " understanding. Staying with the topic for a simpler prerequisite probe.";
  } else if (lastOutcome === "partial") {
    whyThisQuestion = "Previous answer showed partial understanding. Asking a narrower clarification before moving on.";
  } else if (lastOutcome === "strong" && turnsOnCurrentDay > 1) {
    whyThisQuestion = "The candidate demonstrated strong understanding. Moving to the next focus area after a deeper probe.";
  } else if (lastOutcome === "strong") {
    whyThisQuestion = "The candidate demonstrated strong understanding. Asking a deeper trade-off or implementation follow-up.";
  } else {
    whyThisQuestion = "Evaluating the next useful implementation detail for " + targetCanonicalTitle + ".";
  }

  // Canonical mastery scores mapping: always resolve day number to its canonical curriculum title
  const masteryScores = Array.from(session.masteryState.entries()).map(([dayNumber, m]) => {
    const canonicalRecord = getCurriculumDay(dayNumber);
    return {
      day: dayNumber,
      topic: canonicalRecord?.title || m.topic,
      score: m.score,
      attempts: m.attempts,
      lastOutcome: m.lastOutcome,
    };
  });

  return {
    currentDay: targetDay,
    currentTopic: targetCanonicalTitle,
    progress: {
      turnCount: session.turnCount,
      totalTurns: 8,
      evaluatedDaysCount: session.evaluatedDays.size,
    },
    difficultyState,
    focusAreas: session.intelligenceProfile?.recommendedFocusAreas || [],
    masteryScores,
    latestEvaluation: session.latestEvaluation,
    whyThisQuestion,
    codingEvidence: session.codingEvidence || [],
    codingOpportunity: session.codingOpportunity,
    codingAssessmentsCompleted: session.codingAssessmentsCompleted || 0,
  };
}

async function generateTurnWithGemini(
  session: InterviewSessionState,
  targetMission: Pick<Mission, "day" | "title">,
  curriculumDay: CurriculumDay | undefined,
  retrievedMemories?: string[],
  codingEvidence?: CodingEvidence[],
  codingOpportunity?: CodingOpportunity
): Promise<string> {
  const candidate = session.candidate;
  const systemInstruction = buildInterviewerSystemPrompt(
    candidate,
    targetMission,
    curriculumDay,
    session.intelligenceProfile,
    session.lastOutcome,
    session.turnsOnCurrentDay,
    retrievedMemories,
    session.masteryState.get(targetMission.day),
    codingEvidence,
    codingOpportunity
  );

  // Build message contents for Gemini
  const contents: GeminiMessage[] = [];

  for (const item of compactHistory(session.history)) {
    contents.push({
      role: item.role === "candidate" ? "user" : "model",
      parts: [{ text: item.role === "candidate" ? wrapUntrustedAnswer(item.content) : item.content }],
    });
  }

  if (contents.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: `Start the technical interview for ${displayFirstName(candidate)}. Focus on ${curriculumDay?.title || targetMission.title}.` }],
    });
  } else if (contents[contents.length - 1].role === "model") {
    contents.push({
      role: "user",
      parts: [{ text: `Please ask the next interview question about ${curriculumDay?.title || targetMission.title}.` }],
    });
  }

  const responseText = await generateGeminiContent(contents, systemInstruction);
  return responseText.trim();
}

async function generateFeedbackWithGemini(session: InterviewSessionState): Promise<InterviewFeedback> {
  const candidate = session.candidate;
  const evidenceFeedback = generateEvidenceBackedFeedback(session);

  const systemInstruction = buildFeedbackSystemPrompt(
    candidate,
    Array.from(session.evaluatedDays),
    session.intelligenceProfile,
    evidenceFeedback,
    session.codingEvidence
  );

  const conversationSummary = session.history
    .map((h) => `${h.role === "candidate" ? displayFirstName(candidate) : "Interviewer"}: ${h.content}`)
    .join("\n");

  const contents: GeminiMessage[] = [
    {
      role: "user",
      parts: [{ text: `Here is the full interview transcript:\n\n${conversationSummary}\n\nGenerate structured evaluation feedback matching the accumulated evidence.` }],
    },
  ];

  try {
    const rawJson = await generateGeminiContent(contents, systemInstruction, true);
    const parsed = interviewFeedbackSchema.safeParse(JSON.parse(rawJson));
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    log("error", "gemini.feedback_failed", { session: sessionRef(session.sessionId) });
  }

  return evidenceFeedback;
}

