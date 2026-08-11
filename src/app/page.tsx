"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  CandidateProfile,
  InterviewFeedback,
  InterviewIntelligenceState,
  ResponseOutcome,
} from "@/types/interview";
import { generateCandidateProfile } from "@/lib/candidateProfiler";
import { evaluateCodeSubmission, getCodingTaskById, CodeEvaluation } from "@/lib/codingTasks";
import candidatesData from "../../candidates.json";

const candidatesList: CandidateProfile[] = (
  candidatesData as { candidates: CandidateProfile[] }
).candidates;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function obTagClass(o: ResponseOutcome | undefined) {
  if (!o) return "ob-tag unknown";
  if (o === "off_topic") return "ob-tag offtopic";
  return `ob-tag ${o}`;
}

function obLabel(o: ResponseOutcome | undefined) {
  if (!o) return "—";
  if (o === "off_topic") return "Off topic";
  return o.charAt(0).toUpperCase() + o.slice(1);
}

function mbFillColor(s: number): string {
  if (s >= 0.65) return "var(--mint)";
  if (s >= 0.4) return "var(--accent)";
  return "var(--rose)";
}

/**
 * Concise parser for "Why This Question" inside the Assessment drawer.
 */
function parseWhy(raw: string): Array<{ key: string; val: string }> {
  const prefixes = [
    { match: "Profile signal", label: "Profile" },
    { match: "Previous answer", label: "Previous" },
    { match: "Current mastery", label: "Mastery" },
    { match: "Assessment strategy", label: "Next decision" },
    { match: "Curriculum objective", label: "Goal" },
    { match: "Current evidence", label: "Evidence" },
  ];

  const parts: Array<{ key: string; val: string }> = [];
  let remaining = raw;

  for (let i = 0; i < prefixes.length; i++) {
    const { match, label } = prefixes[i];
    const idx = remaining.indexOf(match + ":");
    if (idx === -1) continue;
    const afterColon = remaining.slice(idx + match.length + 1).trim();
    let end = afterColon.length;
    for (let j = i + 1; j < prefixes.length; j++) {
      const ni = afterColon.indexOf(prefixes[j].match + ":");
      if (ni !== -1 && ni < end) end = ni;
    }
    const val = afterColon.slice(0, end).replace(/\.$/, "").trim();
    if (val) parts.push({ key: label, val });
    remaining = afterColon.slice(end);
  }

  if (parts.length === 0) {
    const sentences = raw.split(/\.\s+/).filter(Boolean);
    if (sentences.length > 1) {
      return sentences.slice(0, 3).map((s, i) => ({
        key: i === 0 ? "Profile" : i === 1 ? "Goal" : "Next decision",
        val: s.replace(/\.$/, "").trim(),
      }));
    }
    return [{ key: "Goal", val: raw }];
  }
  return parts;
}

type Theme = "light" | "dark";
type VoiceState = "idle" | "recording" | "processing" | "transcribed" | "error" | "unsupported";
interface SpeechRecognitionResultLike { isFinal: boolean; 0: { transcript: string }; }
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike>; }
interface SpeechRecognitionErrorEventLike { error?: string; }
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function InterviewPage() {
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile>(candidatesList[0]);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "interviewer" | "candidate"; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [assessmentPhase, setAssessmentPhase] = useState<"idle" | "evaluating" | "assessed">("idle");
  const [isDone, setIsDone] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [intelligence, setIntelligence] = useState<InterviewIntelligenceState | null>(null);

  // Drawer state for progressive disclosure
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const storedTheme = window.localStorage.getItem("interview-theme") as Theme | null;
    const systemTheme = typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    return storedTheme || systemTheme;
  });
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [codingMode, setCodingMode] = useState(false);
  const [codeValue, setCodeValue] = useState("");
  const [codeEvaluation, setCodeEvaluation] = useState<CodeEvaluation | null>(null);
  const [pendingCodingSubmission, setPendingCodingSubmission] = useState<{ taskId: string; code: string } | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const recognitionErrorRef = useRef(false);

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  // Keyboard listener: Cmd/Ctrl+Enter, Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  useEffect(() => {
    void fetch("/api/csrf").catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("interview-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (voiceState !== "recording") return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [voiceState]);
  const startInterview = async () => {
    setRequestError("");
    setIsLoading(true);
    const sid = `session-${Date.now()}`;
    setSessionId(sid);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, candidate: selectedCandidate }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages([{ role: "interviewer", content: data.reply }]);
        if (data.intelligence) setIntelligence(data.intelligence);
        setPendingCodingSubmission(null);
        setIsStarted(true);
      } else {
        setRequestError(data.error || data.message || "Could not start the interview. Retry in a moment.");
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setRequestError("Could not start the interview. Retry in a moment.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  const toggleVoiceInput = () => {
    if (voiceState === "recording") {
      setVoiceState("processing");
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("Voice input is not supported in this browser");
      setVoiceState("unsupported");
      return;
    }

    transcriptRef.current = inputMessage;
    recognitionErrorRef.current = false;
    setVoiceError("");
    setRecordingSeconds(0);
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => setVoiceState("recording");
    recognition.onresult = (event) => {
      let transcript = transcriptRef.current;
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) transcript += result[0].transcript;
        else interimTranscript += result[0].transcript;
      }
      transcriptRef.current = transcript;
      setInputMessage(`${transcript} ${interimTranscript}`.trim());
    };
    recognition.onerror = (event) => {
      recognitionErrorRef.current = true;
      const message = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Allow microphone access to speak"
        : event.error === "no-speech"
          ? "No speech detected — try again"
          : "Voice input failed — try again";
      setVoiceError(message);
      setVoiceState("error");
    };
    recognition.onend = () => {
      if (recognitionErrorRef.current) {
        setVoiceState("error");
        return;
      }
      setVoiceState(transcriptRef.current.trim() ? "transcribed" : "idle");
      setInputMessage(transcriptRef.current);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionErrorRef.current = true;
      setVoiceError("Voice input could not start — try again");
      setVoiceState("error");
    }
  };
  const runCodingTests = () => {
    if (!codingTask) return;
    setCodeEvaluation(evaluateCodeSubmission(codingTask, codeValue));
  };

  const saveCodingEvidence = () => {
    if (!codingTask) return;
    const evaluation = codeEvaluation || evaluateCodeSubmission(codingTask, codeValue);
    setCodeEvaluation(evaluation);
    setPendingCodingSubmission({ taskId: codingTask.id, code: codeValue });
    setInputMessage("I completed the coding check and can talk through the implementation.");
    setCodingMode(false);
  };
  const cancelRequest = () => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    setIsLoading(false);
    setAssessmentPhase("idle");
  };

  const sendTurn = async () => {
    if (!inputMessage.trim() || isLoading || isDone) return;
    const text = inputMessage;
    setInputMessage("");
    setMessages((p) => [...p, { role: "candidate", content: text }]);
    setIsLoading(true);
    setAssessmentPhase("evaluating");
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, codingSubmission: pendingCodingSubmission || undefined }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((p) => [...p, { role: "interviewer", content: data.reply }]);
        if (data.intelligence) setIntelligence(data.intelligence);
        setPendingCodingSubmission(null);
        setAssessmentPhase("assessed");
        window.setTimeout(() => setAssessmentPhase("idle"), 2200);
        if (data.done) {
          setIsDone(true);
          if (data.feedback) setFeedback(data.feedback);
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error(err);
      }
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      setIsLoading(false);
    }
  };
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendTurn();
    }
  };

  const m = selectedCandidate.member;
  const totalTurns = 8;
  const currentTurn = intelligence?.progress?.turnCount ?? 0;

  const dotClass = isStarted ? (isDone ? "live-dot done" : "live-dot active") : "live-dot";
  const liveText = isStarted ? (isDone ? "Completed" : "Live") : "Ready";

  const currentDay = intelligence?.currentDay;
  const currentMastery = intelligence?.masteryScores.find((ms) => ms.day === currentDay);
  const currentMasteryPct = currentMastery ? Math.round(currentMastery.score * 100) : null;

  const profileFocusAreas = useMemo(
    () => generateCandidateProfile(selectedCandidate).recommendedFocusAreas,
    [selectedCandidate]
  );

  // Latest interviewer question is the visual hero
  const latestInterviewerMsg = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "interviewer") return messages[i].content;
    }
    return "";
  }, [messages]);

  const latestEval = intelligence?.latestEvaluation;
  const codingOpportunity = intelligence?.codingOpportunity;
  const codingTask = codingOpportunity ? getCodingTaskById(codingOpportunity.taskId) : null;
  const themeLabel = theme === "light" ? "Dark mode" : "Light mode";
  const voiceLabel = voiceState === "recording" ? "Listening…" : voiceState === "processing" ? "Transcribing…" : voiceState === "transcribed" ? "Transcript ready" : voiceState === "error" || voiceState === "unsupported" ? voiceError || "Try again" : "Speak";
  const reportTopics = intelligence?.masteryScores ?? [];
  const codingEvidence = intelligence?.codingEvidence ?? [];
  const evidenceAttempts = reportTopics.reduce((total, topic) => total + topic.attempts, 0);
  const evidenceConfidence = reportTopics.length >= 4 && evidenceAttempts >= 6 ? "High" : reportTopics.length >= 2 && evidenceAttempts >= 3 ? "Medium" : "Limited";

  return (
    <>
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header className="hdr">
        <div className="hdr-inner">
          <div className="brand-wrap">
            <span className="brand-name">Autonomous Interviewer</span>
            {isStarted && (
              <span className="brand-cand-tag">
                {m.name} · {m.jobRole}
              </span>
            )}
          </div>

          <nav className="studio-nav" aria-label="Interview sections">
            <button className="studio-nav-item active" type="button">Interview</button>
          </nav>
          <div className="hdr-right">
            {isStarted && !isDone && (
              <div className="hdr-progress">
                {String(currentTurn).padStart(2, "0")} / {String(totalTurns).padStart(2, "0")}
              </div>
            )}
            <div className="live-wrap">
              <span className={dotClass} />
              <span className="live-text">{liveText}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="csel-label">Candidate</span>
              <select
                id="candidate-selector"
                aria-label="Candidate"
                className="csel"
                disabled={isStarted}
                value={m.id}
                onChange={(e) => {
                  const f = candidatesList.find((c) => c.member.id === e.target.value);
                  if (f) setSelectedCandidate(f);
                }}
              >
                {candidatesList.map((c) => (
                  <option key={c.member.id} value={c.member.id}>
                    {c.member.name} — {c.member.jobRole}
                  </option>
                ))}
              </select>
            </div>

            <button className="theme-toggle" type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Change color theme">{themeLabel}</button>
            {/* Assessment Drawer Trigger Button */}
            <button
              className="btn-drawer-trigger"
              onClick={() => setIsDrawerOpen((p) => !p)}
            >
              Assessment
            </button>
          </div>
        </div>
      </header>

      {/* ─── SINGLE FOCUSED WORKSPACE (85-90% Viewport Width) ──────── */}
      <main className="workspace-focused">

        {!isStarted ? (
          /* ── STATE A: MINIMAL PRE-INTERVIEW BRIEFING ── */
          <div className="start-container">
            <div className="start-title">Autonomous Interviewer</div>
            <div className="start-copy">
              <div className="start-cand-kicker">Candidate profile</div>
              <div className="start-cand-name">{m.name}</div>
              <div className="start-cand-role">{m.jobRole}</div>
              <div className="start-cand-meta">
                <span>8 questions · Conversation + practical exercises</span>
              </div>
            </div>
            <div className="start-details">
              <p className="start-desc">
                A focused technical screen that follows your reasoning, tests the edges, and records evidence as you go.
              </p>
              <p className="start-subtext">
                Topics follow your answers, with room to go deeper where it matters.
              </p>
              <div className="start-plan">
              <div className="start-plan-label">Interview plan</div>
              {profileFocusAreas.slice(0, 4).map((area) => (
                <div key={area.day} className="start-plan-row">
                  <span aria-hidden="true">—</span>
                  <span>{area.title}</span>
                </div>
              ))}
              </div>
            {requestError && <div className="request-error" role="alert">{requestError}</div>}
            <button
              id="start-interview-btn"
              className="btn-start-main"
              onClick={startInterview}
              disabled={isLoading}
            >
              {isLoading ? "Initializing…" : "Start interview →"}
            </button>
            </div>
          </div>
        ) : (
          /* ── STATE B: ACTIVE INTERVIEW WORKSPACE ── */
          <>
            {/* Topic Header & Segmented Progress Track */}
            {intelligence && (
              <div className="topic-header">
                <div className="topic-meta">
                  <span>Question {Math.min(currentTurn + 1, totalTurns)} of {totalTurns}</span>
                  <span>·</span>
                  <span>{intelligence.currentTopic}</span>
                </div>
                <div className="prog-line-track">
                  {Array.from({ length: totalTurns }, (_, i) => (
                    <div
                      key={i}
                      className={`prog-line-seg${i < currentTurn ? " on" : ""}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {assessmentPhase !== "idle" && (
              <div className={"adaptive-status " + assessmentPhase} role="status" aria-live="polite">
                <span className="adaptive-status-mark">{assessmentPhase === "evaluating" ? "•••" : "✓"}</span>
                <span className="adaptive-status-copy">
                  <strong>{assessmentPhase === "evaluating" ? "Thinking through that" : "Next question ready"}</strong>
                  {assessmentPhase === "assessed" && <span>Based on what you just shared.</span>}
                </span>
              </div>
            )}
            {/* Current Prominent Interviewer Question */}
            {latestInterviewerMsg && (
              <div className="question-hero">
                <div className="question-label">Interviewer</div>
                <div className="question-text">{latestInterviewerMsg}</div>
              </div>
            )}

            {isLoading && (
              <div className="loading-indicator">
                <div className="ldots">
                  <div className="ldot" />
                  <div className="ldot" />
                  <div className="ldot" />
                </div>
                <span>Preparing your next question…</span>
              </div>
            )}

            {codingTask && (
              <div className="coding-launch">
              <div>
                <span className="coding-launch-kicker">Practical check</span>
                <strong>{codingOpportunity?.title}</strong>
                <span>{codingOpportunity?.estimatedMinutes} min · {codingOpportunity?.language}</span>
              </div>
              <button type="button" className="coding-launch-button" onClick={() => { setCodingMode(true); setCodeEvaluation(null); setCodeValue(codingTask.starterCode); }}>
                Start implementation
              </button>
            </div>
            )}

            {codingMode && codingTask && (
              <section className="coding-workspace" aria-label="Coding assessment">
                <div className="coding-head">
                  <div>
                    <span className="coding-kicker">Coding assessment</span>
                    <h2>{codingTask.title}</h2>
                    <p>{codingTask.context}</p>
                    <p className="coding-why">Why: {codingTask.whyThisTask}</p>
                  </div>
                  <button type="button" className="coding-close" onClick={() => setCodingMode(false)}>Close</button>
                </div>
                <div className="coding-contract">
                  <span>Function: {codingTask.functionSignature}</span>
                  <span>Time: {codingTask.estimatedMinutes} minutes</span>
                </div>
                <div className="coding-requirements">
                  {codingTask.requirements.map((requirement) => <span key={requirement}>{requirement}</span>)}
                </div>
                <div className="code-editor">
                  <div className="code-editor-bar">
                    <span>{codingTask.language}</span>
                    <span>Practical check</span>
                  </div>
                  <textarea aria-label="Code editor" value={codeValue} onChange={(event) => setCodeValue(event.target.value)} spellCheck={false} />
                </div>
                <div className="coding-actions">
                  <button type="button" className="coding-run" onClick={runCodingTests}>Run checks</button>
                  <button type="button" className="coding-submit" onClick={saveCodingEvidence}>Use as interview evidence</button>
                </div>
                {codeEvaluation && (
                  <div className="code-results">
                    <div className="code-results-summary">
                      <strong>{codeEvaluation.passed}/{codeEvaluation.total} checks passed</strong>
                      <span>{codeEvaluation.executionMs}ms · checks complete</span>
                    </div>
                    {codeEvaluation.tests.map((test) => (
                      <div key={test.name} className={"code-test " + (test.passed ? "pass" : "fail")}>
                        <span>{test.passed ? "✓" : "×"}</span>
                        <span>{test.name}</span>
                        <small>{test.detail}</small>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            {/* Response Composer */}
            {!isDone && !codingMode && (
              <div className="composer-box">
                <div className="composer-label">Your Response</div>
                <textarea
                  id="answer-input"
                  ref={composerRef}
                  className="answer-ta"
                  placeholder="Type your technical response…"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={isLoading}
                  rows={4}
                />
                <div className="composer-footer">
                  <div className="composer-tools">
                    <button
                      type="button"
                      className={"voice-button " + voiceState}
                      onClick={toggleVoiceInput}
                      disabled={isLoading}
                      aria-label={voiceLabel}
                    >
                      <span className="voice-icon" aria-hidden="true">●</span>
                      <span>{voiceLabel}</span>
                      {voiceState === "recording" && <span>{recordingSeconds}s</span>}
                    </button>
                    <span className="kbd-hint">⌘/Ctrl Enter to submit</span>
                  </div>
                  {isLoading ? (
                    <button id="cancel-response-btn" className="btn-submit cancel" onClick={cancelRequest}>
                      Cancel
                    </button>
                  ) : (
                    <button
                      id="submit-response-btn"
                      className="btn-submit"
                      onClick={sendTurn}
                      disabled={!inputMessage.trim()}
                    >
                      Submit →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Final Feedback Report */}
            {isDone && feedback && (
              <section className="feedback-wrap report-wrap" aria-labelledby="report-title">
                <div className="fb-head">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--mint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Technical assessment complete
                </div>
                <div className="report-body">
                  <div className="report-intro">
                    <div className="report-kicker">Interview record</div>
                    <h2 id="report-title">{m.name}</h2>
                    <p>{m.jobRole} · Evidence captured from the live conversation</p>
                  </div>
                  <div className="report-summary">
                    <div>
                      <div className="fb-col-lbl b">Overall read</div>
                      <p className="fb-summary">{feedback.summary}</p>
                    </div>
                    <div className="report-signal">
                      <div className="fb-col-lbl g">Suggested next step</div>
                      <strong>{feedback.gaps.length > 0 ? "Targeted technical follow-up" : "Progress to the next stage"}</strong>
                      <span>Evidence confidence: {evidenceConfidence} · {reportTopics.length || "Live"} topic signal{reportTopics.length === 1 ? "" : "s"} available.</span>
                    </div>
                  </div>
                  <div className="report-section">
                    <div className="fb-col-lbl b">Observed topic signals</div>
                    {reportTopics.length > 0 ? (
                      <div className="report-topic-grid">
                        {reportTopics.map((topic) => (
                          <div className="report-topic" key={topic.day}>
                            <div className="report-topic-top">
                              <strong>{topic.topic}</strong>
                              <span className={obTagClass(topic.lastOutcome)}>{obLabel(topic.lastOutcome)}</span>
                            </div>
                            <div className="report-topic-track">
                              <span style={{ width: Math.round(topic.score * 100) + "%", background: mbFillColor(topic.score) }} />
                            </div>
                            <small>{Math.round(topic.score * 100)}% signal · {topic.attempts} response{topic.attempts === 1 ? "" : "s"}</small>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="report-empty">Live evidence is available in the assessment record.</p>
                    )}
                  </div>
                  {codingEvidence.length > 0 && (
                    <div className="report-section report-practical">
                      <div className="fb-col-lbl g">Practical evidence</div>
                      <ul className="fb-list">{codingEvidence.map((evidence) => <li key={evidence.taskId}>{evidence.title} · {evidence.passed}/{evidence.total} checks passed</li>)}</ul>
                    </div>
                  )}
                  <div className="fb-grid report-columns">
                    <div>
                      <div className="fb-col-lbl g">What stood out</div>
                      <ul className="fb-list">{feedback.strengths.map((strength, index) => <li key={index}>{strength}</li>)}</ul>
                    </div>
                    <div>
                      <div className="fb-col-lbl a">Areas to probe</div>
                      <ul className="fb-list">{feedback.gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul>
                    </div>
                  </div>
                  {feedback.next.length > 0 && (
                    <div className="report-section report-next">
                      <div className="fb-col-lbl b">Recommended follow-through</div>
                      <ul className="fb-list">{feedback.next.map((nextStep, index) => <li key={index}>{nextStep}</li>)}</ul>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* ─── SLIDE-OVER ASSESSMENT DRAWER (Progressive Disclosure) ─── */}
      {isDrawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} />
          <aside className="drawer-panel">
            <div className="drawer-head">
              <span className="drawer-title">Assessment</span>
              <button
                className="btn-close-drawer"
                onClick={() => setIsDrawerOpen(false)}
              >
                ✕
              </button>
            </div>

            {intelligence ? (
              <>
                {/* Current Topic */}
                <div className="drawer-sec">
                  <span className="drawer-eyebrow">Topic</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    {intelligence.currentTopic}
                  </div>
                </div>

                {/* Mastery Score */}
                {currentMasteryPct !== null && (
                  <div className="drawer-sec">
                    <span className="drawer-eyebrow">Mastery</span>
                    <div className="drawer-val-lg">{currentMasteryPct}%</div>
                    <div className="drawer-track">
                      <div
                        className="drawer-fill"
                        style={{
                          width: `${currentMasteryPct}%`,
                          backgroundColor: mbFillColor(currentMastery!.score),
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Latest Signal */}
                {latestEval && (
                  <div className="drawer-sec">
                    <span className="drawer-eyebrow">Latest Signal</span>
                    <span className={obTagClass(latestEval.outcome)}>
                      {obLabel(latestEval.outcome)} · {Math.round(latestEval.score * 100)}%
                    </span>

                    {latestEval.demonstratedConcepts.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <span className="drawer-eyebrow" style={{ fontSize: 9 }}>Evidence ({latestEval.demonstratedConcepts.length} concepts)</span>
                        <div className="clist" style={{ marginTop: 2 }}>
                          {latestEval.demonstratedConcepts.map((c, i) => (
                            <div key={i} className="ci"><span className="ci-g">✓</span><span>{c}</span></div>
                          ))}
                        </div>
                      </div>
                    )}

                    {latestEval.missingConcepts.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <span className="drawer-eyebrow" style={{ fontSize: 9 }}>Unresolved</span>
                        <div className="clist" style={{ marginTop: 2 }}>
                          {latestEval.missingConcepts.map((c, i) => (
                            <div key={i} className="ci"><span className="ci-a">~</span><span>{c}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {codingEvidence.length > 0 && (
                  <div className="drawer-sec">
                    <span className="drawer-eyebrow">Practical Evidence</span>
                    <div className="clist">
                      {codingEvidence.map((evidence) => (
                        <div key={evidence.taskId} className="ci"><span className="ci-g">✓</span><span>{evidence.title} · {evidence.passed}/{evidence.total} checks</span></div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Why this question */}
                <div className="drawer-sec">
                  <span className="drawer-eyebrow">Why this question</span>
                  <div className="why-box">
                    {parseWhy(intelligence.whyThisQuestion).map((r, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", display: "block" }}>{r.key}</span>
                        <span>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Breeth Memory */}
                <div className="drawer-sec">
                  <span className="drawer-eyebrow">Memory</span>
                  <div style={{ fontSize: 12, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                    <span>
                      {intelligence.masteryScores.length > 0
                        ? `${intelligence.masteryScores.length} topic${intelligence.masteryScores.length !== 1 ? "s" : ""} in session memory`
                        : "Session context available"}
                    </span>
                  </div>
                </div>

                {/* Interview Plan */}
                <div className="drawer-sec" style={{ marginTop: 8 }}>
                  <span className="drawer-eyebrow">Interview Plan</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                    {profileFocusAreas.map((fa, i) => (
                      <div key={fa.day} className="plan-item-drawer">
                        <span className="plan-num-drawer">{String(i + 1).padStart(2, "0")}</span>
                        <span>{fa.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="drawer-sec">
                <span className="drawer-eyebrow">Interview Plan</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                  {profileFocusAreas.map((fa, i) => (
                    <div key={fa.day} className="plan-item-drawer">
                      <span className="plan-num-drawer">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{fa.title}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{fa.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
