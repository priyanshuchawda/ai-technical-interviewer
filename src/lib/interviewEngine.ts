import { CandidateProfile, InterviewFeedback, InterviewSessionState } from "../types/interview";
import { getCurriculumDay } from "./dataService";
import { breethClient } from "./breethClient";

// Global session state cache (In-memory for active API sessions)
const sessions = new Map<string, InterviewSessionState>();

export function getSession(sessionId: string): InterviewSessionState | undefined {
  return sessions.get(sessionId);
}

export function createSession(sessionId: string, candidate: CandidateProfile): InterviewSessionState {
  const state: InterviewSessionState = {
    sessionId,
    candidate,
    turnCount: 0,
    evaluatedDays: new Set<number>(),
    history: [],
    done: false,
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

  // 2. Add incoming message to history if provided
  if (messageInput) {
    session.history.push({ role: "candidate", content: messageInput });
    session.turnCount += 1;

    // Asynchronously stream to Breeth memory graph
    breethClient.addEpisode([
      { role: "user", content: `[Candidate ${session.candidate.member.name}] ${messageInput}` }
    ]).catch(() => {});
  }

  // 3. Determine if interview is finished (e.g. at least 8 questions completed across at least 4 curriculum days)
  const isFinished = session.turnCount >= 8 && session.evaluatedDays.size >= 4;

  if (isFinished || (messageInput && messageInput.toLowerCase().includes("wrap up interview"))) {
    session.done = true;
    const feedback = generateFeedback(session);
    session.feedback = feedback;

    const endReply = `Thank you for completing the technical interview, ${session.candidate.member.name}. We have thoroughly assessed your knowledge across the cohort curriculum modules and prepared comprehensive feedback.`;

    session.history.push({ role: "interviewer", content: endReply });
    return {
      reply: endReply,
      done: true,
      feedback,
    };
  }

  // 4. Select next question target day & topic
  const candidateMissions = session.candidate.missions;
  const unassessedMissions = candidateMissions.filter((m) => !session!.evaluatedDays.has(m.day));
  
  const targetMission = unassessedMissions.length > 0
    ? unassessedMissions[session.turnCount % unassessedMissions.length]
    : candidateMissions[session.turnCount % candidateMissions.length];

  session.evaluatedDays.add(targetMission.day);
  session.currentQuestionDay = targetMission.day;

  const curriculumDay = getCurriculumDay(targetMission.day);

  // Construct dynamic turn reply
  let reply = "";
  if (session.turnCount === 0) {
    reply = `Welcome ${session.candidate.member.name} (${session.candidate.member.jobRole}). Let's begin your technical interview! To kick off, on Day ${targetMission.day} you worked on "${targetMission.title}". Could you walk me through your core implementation and engineering choices?`;
  } else {
    const prevAnswer = messageInput || "";
    let followUpPrefix = "Great explanation. ";
    if (prevAnswer.length < 30) {
      followUpPrefix = "Thank you for the brief note. Let's delve deeper into this topic. ";
    } else if (prevAnswer.toLowerCase().includes("vector") || prevAnswer.toLowerCase().includes("rag")) {
      followUpPrefix = "That is a solid analysis of retrieval architecture. ";
    }

    reply = `${followUpPrefix}Moving to Day ${targetMission.day} (${targetMission.title}): ${curriculumDay?.objectives?.[0] || "How did you tackle this system module?"} Specifically, what key technical challenges or edge cases did you resolve during your ${targetMission.attempts || 1} attempt(s)?`;
  }

  session.history.push({ role: "interviewer", content: reply });
  return {
    reply,
    done: false,
  };
}

function generateFeedback(session: InterviewSessionState): InterviewFeedback {
  const candidate = session.candidate;
  const evaluatedCount = session.evaluatedDays.size;

  const strengths: string[] = [];
  const gaps: string[] = [];
  const next: string[] = [];

  const passedMissions = candidate.missions.filter((m) => m.passed);
  const skippedMissions = candidate.missions.filter((m) => m.skipped);

  if (passedMissions.length > 0) {
    strengths.push(`Demonstrated hands-on competence in ${passedMissions.slice(0, 3).map((m) => m.title).join(", ")}.`);
  }
  if (candidate.signals.missionsFirstTry > 15) {
    strengths.push(`Strong initial accuracy with ${candidate.signals.missionsFirstTry} missions passed on first attempt.`);
  } else {
    strengths.push(`Persistent problem solver with ${candidate.signals.commitDays} active cohort commit days.`);
  }

  if (skippedMissions.length > 0) {
    gaps.push(`Skipped key curriculum topic(s): ${skippedMissions.map((m) => m.title).join(", ")}.`);
  }
  if (candidate.missions.some((m) => (m.attempts || 0) > 3)) {
    gaps.push(`Required multiple iterations on complex topics like Prompt Engineering and Function Calling.`);
  } else {
    gaps.push(`Could improve depth on advanced system observability and production telemetry.`);
  }

  next.push("Review end-to-end RAG evaluation metrics (Ragas, TruLens) in production environments.");
  next.push("Practice explaining real-time streaming architectures and MCP server protocol tooling.");

  return {
    summary: `${candidate.member.name} completed a multi-turn technical evaluation covering ${evaluatedCount} curriculum days across the 31-day AI Cohort. The candidate displayed solid technical foundation as a ${candidate.member.jobRole}.`,
    strengths,
    gaps,
    next,
  };
}
