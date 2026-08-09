import { CandidateProfile, CurriculumDay, InterviewFeedback, InterviewSessionState, Mission, ResponseOutcome, TopicMastery, InterviewIntelligenceState } from "../types/interview";
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
  };
  await saveSession(state);
  return state;
}

export async function processInterviewTurn(
  sessionId: string,
  candidateInput?: CandidateProfile,
  messageInput?: string
): Promise<{ reply: string; done: boolean; feedback?: InterviewFeedback; intelligence?: InterviewIntelligenceState }> {
  let session = await getSession(sessionId);

  // 1. Initial turn / Start Session
  if (!session) {
    if (!candidateInput) {
      throw new Error("Candidate profile is required to initialize a new interview session.");
    }
    session = await createSession(sessionId, candidateInput);
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
  }

  // 3. Check if interview is finished
  const isFinished = session.turnCount >= 8 && session.evaluatedDays.size >= 4;

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
      getCurriculumDay(session.currentQuestionDay || 7)
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
    if ((lastOutcome === "unknown" || lastOutcome === "weak" || lastOutcome === "off_topic") && turnsOnCurrentDay < 2) {
      targetDay = session.currentQuestionDay!;
      session.turnsOnCurrentDay = turnsOnCurrentDay + 1;
    } else {
      const candidateFocusDays = session.intelligenceProfile?.recommendedFocusAreas.map((f) => f.day) || [];
      const candidateMissionDays = session.candidate.missions.map((m) => m.day);

      const candidateTargetDays = Array.from(new Set([...candidateFocusDays, ...candidateMissionDays]));
      const unassessedDays = candidateTargetDays.filter((day) => !session!.evaluatedDays.has(day));

      if (unassessedDays.length > 0) {
        targetDay = unassessedDays[0];
      } else {
        targetDay = candidateTargetDays[session.turnCount % candidateTargetDays.length];
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
    reply = await generateTurnWithGemini(session, targetMission, targetCurriculumDay, retrievedMemories);
  } catch {
    log("error", "gemini.turn_failed", { session: sessionRef(session.sessionId) });
    if (session.turnCount === 0) {
      reply = `Thanks for joining, ${displayFirstName(session.candidate)}. Let's start with ${targetCurriculumDay?.title || targetMission.title}. What did you build, and which design decision mattered most?`;
    } else if (lastOutcome === "off_topic") {
      reply = `That's useful context. Bringing it back to ${targetCurriculumDay?.title || targetMission.title}: ${targetCurriculumDay?.objectives?.[0] || "what is the core implementation choice here"}?`;
    } else if (lastOutcome === "unknown" || lastOutcome === "weak") {
      reply = `Let's make that more concrete. In ${targetCurriculumDay?.title || targetMission.title}, how would you explain ${targetCurriculumDay?.objectives?.[0] || "the central idea"} to a teammate implementing it for the first time?`;
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
    targetCurriculumDay
  );

  return {
    reply,
    done: false,
    intelligence,
  };
}

function buildInterviewIntelligenceState(
  session: InterviewSessionState,
  targetDay: number,
  targetMission: Pick<Mission, "day" | "title">,
  curriculumDay: CurriculumDay | undefined
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
    const focusReason = session.intelligenceProfile?.recommendedFocusAreas[0]?.reason || "historical cohort signal";
    whyThisQuestion = `Profile signal: Selected candidate's priority focus area (Day ${targetDay}: ${targetCanonicalTitle}) because ${focusReason}.`;
  } else if (lastOutcome === "off_topic") {
    whyThisQuestion = `Previous answer: Candidate gave an off-topic response. Staying on Day ${targetDay} (${targetCanonicalTitle}) to redirect and evaluate target curriculum objectives.`;
  } else if (turnsOnCurrentDay > 1 && (lastOutcome === "unknown" || lastOutcome === "weak")) {
    whyThisQuestion = `Previous answer: Candidate responded with '${lastOutcome}' on Day ${targetDay}. Staying on topic to test foundational prerequisite concepts before moving on.`;
  } else if (lastOutcome === "strong") {
    whyThisQuestion = `Current mastery: Candidate demonstrated strong technical understanding. Advancing to next curriculum focus area (Day ${targetDay}: ${targetCanonicalTitle}).`;
  } else {
    whyThisQuestion = `Curriculum objective: Evaluating candidate knowledge on Day ${targetDay} (${targetCanonicalTitle}) based on objective: ${curriculumDay?.objectives?.[0] || "core implementation"}.`;
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
  };
}

async function generateTurnWithGemini(
  session: InterviewSessionState,
  targetMission: Pick<Mission, "day" | "title">,
  curriculumDay: CurriculumDay | undefined,
  retrievedMemories?: string[]
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
    session.masteryState.get(targetMission.day)
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
    evidenceFeedback
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

