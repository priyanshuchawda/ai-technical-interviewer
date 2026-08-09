import { CandidateProfile, InterviewFeedback, InterviewSessionState } from "../types/interview";
import { getCurriculumDay } from "./dataService";
import { breethClient } from "./breethClient";
import { generateGeminiContent, GeminiMessage } from "./geminiClient";
import { buildInterviewerSystemPrompt, buildFeedbackSystemPrompt } from "./prompts";
import { generateCandidateProfile } from "./candidateProfiler";

// Global session state cache (In-memory for active API sessions)
const sessions = new Map<string, InterviewSessionState>();

export function getSession(sessionId: string): InterviewSessionState | undefined {
  return sessions.get(sessionId);
}

export function createSession(sessionId: string, candidate: CandidateProfile): InterviewSessionState {
  const intelligenceProfile = generateCandidateProfile(candidate);
  const state: InterviewSessionState = {
    sessionId,
    candidate,
    turnCount: 0,
    evaluatedDays: new Set<number>(),
    history: [],
    done: false,
    intelligenceProfile,
  };
  sessions.set(sessionId, state);
  return state;
}

export async function processInterviewTurn(
  sessionId: string,
  candidateInput?: CandidateProfile,
  messageInput?: string
): Promise<{ reply: string; done: boolean; feedback?: InterviewFeedback }> {
  let session = getSession(sessionId);

  // 1. Initial turn / Start Session
  if (!session) {
    if (!candidateInput) {
      throw new Error("Candidate profile is required to initialize a new interview session.");
    }
    session = createSession(sessionId, candidateInput);
  }

  // 2. Add incoming candidate message to history if provided
  if (messageInput) {
    session.history.push({ role: "candidate", content: messageInput });
    session.turnCount += 1;

    // Stream to Breeth memory graph asynchronously
    breethClient.addEpisode([
      { role: "user", content: `[Candidate ${session.candidate.member.name}] ${messageInput}` }
    ]).catch(() => {});
  }

  // 3. Check if interview is finished
  const isFinished = session.turnCount >= 8 && session.evaluatedDays.size >= 4;

  if (isFinished || (messageInput && messageInput.toLowerCase().includes("wrap up interview"))) {
    session.done = true;
    const feedback = await generateFeedbackWithGemini(session);
    session.feedback = feedback;

    const endReply = `Thank you for completing the technical interview, ${session.candidate.member.name}. We have thoroughly evaluated your responses across the AI Cohort curriculum modules and generated your detailed assessment feedback.`;

    session.history.push({ role: "interviewer", content: endReply });
    return {
      reply: endReply,
      done: true,
      feedback,
    };
  }

  // 4. Select target mission & day topic
  const candidateMissions = session.candidate.missions;
  const unassessedMissions = candidateMissions.filter((m) => !session!.evaluatedDays.has(m.day));

  const targetMission = unassessedMissions.length > 0
    ? unassessedMissions[session.turnCount % unassessedMissions.length]
    : candidateMissions[session.turnCount % candidateMissions.length];

  session.evaluatedDays.add(targetMission.day);
  session.currentQuestionDay = targetMission.day;

  const curriculumDay = getCurriculumDay(targetMission.day);

  // 5. Generate dynamic turn response using Gemini 3.5 Flash Lite
  let reply = "";
  try {
    reply = await generateTurnWithGemini(session, targetMission, curriculumDay);
  } catch (err) {
    console.error("[Gemini AI Generation Error, falling back to static prompt]:", err);
    if (session.turnCount === 0) {
      reply = `Welcome ${session.candidate.member.name} (${session.candidate.member.jobRole}). Let's start your technical evaluation! On Day ${targetMission.day} you tackled "${targetMission.title}". Could you explain your implementation and core architectural choices?`;
    } else {
      reply = `Great points. Moving to Day ${targetMission.day} (${targetMission.title}): ${curriculumDay?.objectives?.[0] || "How did you design this system module?"} What key technical trade-offs or edge cases did you navigate during your ${targetMission.attempts || 1} attempt(s)?`;
    }
  }

  session.history.push({ role: "interviewer", content: reply });
  return {
    reply,
    done: false,
  };
}

async function generateTurnWithGemini(
  session: InterviewSessionState,
  targetMission: any,
  curriculumDay: any
): Promise<string> {
  const candidate = session.candidate;
  const systemInstruction = buildInterviewerSystemPrompt(
    candidate,
    targetMission,
    curriculumDay,
    session.intelligenceProfile
  );

  // Build message contents for Gemini
  const contents: GeminiMessage[] = [];

  for (const item of session.history) {
    contents.push({
      role: item.role === "candidate" ? "user" : "model",
      parts: [{ text: item.content }],
    });
  }

  if (contents.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: `Start technical interview for candidate ${candidate.member.name}. Focus first on Day ${targetMission.day} (${targetMission.title}).` }],
    });
  } else if (contents[contents.length - 1].role === "model") {
    contents.push({
      role: "user",
      parts: [{ text: `Please ask the next interview question for Day ${targetMission.day} (${targetMission.title}).` }],
    });
  }

  const responseText = await generateGeminiContent(contents, systemInstruction);
  return responseText.trim();
}

async function generateFeedbackWithGemini(session: InterviewSessionState): Promise<InterviewFeedback> {
  const candidate = session.candidate;
  const systemInstruction = buildFeedbackSystemPrompt(
    candidate,
    Array.from(session.evaluatedDays),
    session.intelligenceProfile
  );

  const conversationSummary = session.history
    .map((h) => `${h.role === "candidate" ? candidate.member.name : "Interviewer"}: ${h.content}`)
    .join("\n");

  const contents: GeminiMessage[] = [
    {
      role: "user",
      parts: [{ text: `Here is the full interview transcript:\n\n${conversationSummary}\n\nGenerate structured evaluation feedback.` }],
    },
  ];

  try {
    const rawJson = await generateGeminiContent(contents, systemInstruction, true);
    const parsed = JSON.parse(rawJson);
    if (parsed.summary && Array.isArray(parsed.strengths) && Array.isArray(parsed.gaps) && Array.isArray(parsed.next)) {
      return parsed as InterviewFeedback;
    }
  } catch (err) {
    console.error("[Gemini Feedback Generation Error, using fallback]:", err);
  }

  return fallbackFeedback(session);
}

function fallbackFeedback(session: InterviewSessionState): InterviewFeedback {
  const candidate = session.candidate;
  return {
    summary: `${candidate.member.name} completed a multi-turn technical evaluation covering ${session.evaluatedDays.size} curriculum days. The candidate demonstrated practical understanding as a ${candidate.member.jobRole}.`,
    strengths: [
      `Demonstrated active engagement across ${session.evaluatedDays.size} core curriculum modules.`,
      `Solid familiarity with AI cohort missions and system design principles.`,
      `Clear technical articulation during conversation turns.`
    ],
    gaps: [
      `Could deepen analysis on production telemetry and scale constraints.`,
      `Additional hands-on iteration recommended for skipped curriculum topics.`
    ],
    next: [
      `Review end-to-end evaluation metrics (Ragas, TruLens) in production environments.`,
      `Practice real-time streaming architectures and system protocol tooling.`
    ]
  };
}
