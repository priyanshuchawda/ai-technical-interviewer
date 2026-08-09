"use client";

import React, { useState, useRef, useEffect } from "react";
import { CandidateProfile, InterviewFeedback, InterviewIntelligenceState, ResponseOutcome } from "@/types/interview";
import candidatesData from "../../candidates.json";

const candidatesList: CandidateProfile[] = (candidatesData as { candidates: CandidateProfile[] }).candidates;

// ─── Outcome helpers ──────────────────────────────────────────────────────────

function outcomeClass(outcome: ResponseOutcome | undefined): string {
  if (!outcome) return "";
  return `outcome-${outcome}`;
}

function outcomeLabel(outcome: ResponseOutcome | undefined): string {
  if (!outcome) return "—";
  if (outcome === "off_topic") return "OFF TOPIC";
  return outcome.charAt(0).toUpperCase() + outcome.slice(1);
}

function masteryFillClass(score: number): string {
  if (score >= 0.65) return "mastery-fill-strong";
  if (score >= 0.40) return "mastery-fill-mid";
  return "mastery-fill-weak";
}

function masteryScoreColor(score: number): React.CSSProperties {
  if (score >= 0.65) return { color: "var(--green)" };
  if (score >= 0.40) return { color: "var(--blue)" };
  return { color: "var(--red)" };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressSegments({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="progress-track">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`progress-segment ${i < filled ? "filled" : ""}`}
        />
      ))}
    </div>
  );
}

function MasteryBars({ scores }: { scores: InterviewIntelligenceState["masteryScores"] }) {
  if (scores.length === 0) return null;
  return (
    <div className="mastery-bars">
      {scores.map((m, idx) => (
        <div key={`${m.day}-${idx}`} className="mastery-bar-row">
          <div className="mastery-bar-meta">
            <span className="mastery-bar-topic" title={`Day ${m.day}: ${m.topic}`}>
              {m.topic}
            </span>
            <span className="mastery-bar-score" style={masteryScoreColor(m.score)}>
              {Math.round(m.score * 100)}%
            </span>
          </div>
          <div className="mastery-bar-track">
            <div
              className={`mastery-bar-fill ${masteryFillClass(m.score)}`}
              style={{ width: `${Math.round(m.score * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EvaluationBlock({ evaluation }: { evaluation: NonNullable<InterviewIntelligenceState["latestEvaluation"]> }) {
  const { outcome, score, demonstratedConcepts, missingConcepts, evidence } = evaluation;
  const isOffTopic = outcome === "off_topic";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* Outcome + score */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <span className={`outcome-badge ${outcomeClass(outcome)}`}>
          {outcomeLabel(outcome)}
        </span>
        {!isOffTopic && (
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>
            {Math.round(score * 100)}%
          </span>
        )}
      </div>

      {/* Off-topic notice */}
      {isOffTopic && evidence && (
        <div className="off-topic-block">
          <div className="off-topic-title">Off-topic response</div>
          <div className="off-topic-desc">{evidence}</div>
        </div>
      )}

      {/* Demonstrated */}
      {!isOffTopic && demonstratedConcepts.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "4px" }}>
            Demonstrated
          </div>
          <div className="concept-list">
            {demonstratedConcepts.slice(0, 4).map((c, i) => (
              <div key={i} className="concept-item">
                <span className="concept-icon-green">✓</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing */}
      {!isOffTopic && missingConcepts.length > 0 && (
        <div>
          <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "4px" }}>
            Missing
          </div>
          <div className="concept-list">
            {missingConcepts.slice(0, 3).map((c, i) => (
              <div key={i} className="concept-item">
                <span className="concept-icon-amber">·</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InterviewPage() {
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile>(candidatesList[0]);
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ role: "interviewer" | "candidate"; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [intelligence, setIntelligence] = useState<InterviewIntelligenceState | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const startInterview = async () => {
    setIsLoading(true);
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: newSessionId, candidate: selectedCandidate }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages([{ role: "interviewer", content: data.reply }]);
        if (data.intelligence) setIntelligence(data.intelligence);
        setIsStarted(true);
      }
    } catch (err) {
      console.error("Error starting interview:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTurn = async () => {
    if (!inputMessage.trim() || isLoading || isDone) return;

    const userText = inputMessage;
    setInputMessage("");
    setMessages((prev) => [...prev, { role: "candidate", content: userText }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: userText }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "interviewer", content: data.reply }]);
        if (data.intelligence) setIntelligence(data.intelligence);
        if (data.done) {
          setIsDone(true);
          if (data.feedback) setFeedback(data.feedback);
        }
      }
    } catch (err) {
      console.error("Error sending turn:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      sendTurn();
    }
  };

  const m = selectedCandidate.member;
  const sig = selectedCandidate.signals;

  // Progress: turn-based, cap at 8
  const totalTurns = 8;
  const currentTurn = intelligence?.progress?.turnCount ?? 0;

  // Live status text
  const liveText = isStarted ? (isDone ? "Completed" : "Live Interview") : "Ready";
  const liveDotClass = isStarted ? (isDone ? "live-dot done" : "live-dot active") : "live-dot";

  return (
    <>
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <span className="app-brand-name">Autonomous Interviewer</span>
            <span className="app-brand-sub">Adaptive technical assessment</span>
          </div>

          <div className="app-header-right">
            <div className="live-indicator">
              <span className={liveDotClass} />
              <span>{liveText}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="candidate-select-label">Candidate</span>
              <select
                className="candidate-select"
                disabled={isStarted}
                value={selectedCandidate.member.id}
                onChange={(e) => {
                  const found = candidatesList.find((c) => c.member.id === e.target.value);
                  if (found) setSelectedCandidate(found);
                }}
                id="candidate-selector"
              >
                {candidatesList.map((c) => (
                  <option key={c.member.id} value={c.member.id}>
                    {c.member.name} — {c.member.jobRole}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN THREE-COLUMN LAYOUT ───────────────────────────────── */}
      <main className="app-main">

        {/* ── LEFT: CANDIDATE CONTEXT ──────────────────────────── */}
        <aside className="left-col panel-sticky" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

          {/* Candidate card */}
          <div className="panel">
            <div className="panel-section">
              <div className="section-label">Candidate</div>
              <div className="candidate-name">{m.name}</div>
              <div className="candidate-role">{m.jobRole}</div>
              <div className="candidate-meta">
                <div className="candidate-meta-row">
                  <span className="meta-key">Experience</span>
                  <span className="meta-val">{m.yearsExperience} years</span>
                </div>
                <div className="candidate-meta-row">
                  <span className="meta-key">Education</span>
                  <span className="meta-val" style={{ fontSize: "12px", textAlign: "right", maxWidth: "55%" }}>{m.education}</span>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <div className="candidate-meta">
                <div className="candidate-meta-row">
                  <span className="meta-key">Missions completed</span>
                  <span className="meta-val">{sig.missionsCompleted}</span>
                </div>
                <div className="candidate-meta-row">
                  <span className="meta-key">Commit days</span>
                  <span className="meta-val">{sig.commitDays}</span>
                </div>
                <div className="candidate-meta-row">
                  <span className="meta-key">First-try passes</span>
                  <span className="meta-val">{sig.missionsFirstTry}</span>
                </div>
              </div>
            </div>

            {/* Start button (only before interview) */}
            {!isStarted && (
              <div className="start-btn-wrap">
                <button
                  className="start-btn"
                  onClick={startInterview}
                  disabled={isLoading}
                  id="start-interview-btn"
                >
                  {isLoading ? "Initializing…" : "Start Technical Interview"}
                </button>
              </div>
            )}
          </div>

          {/* Focus areas (only after start) */}
          {isStarted && intelligence && intelligence.focusAreas.length > 0 && (
            <div className="panel">
              <div className="panel-section">
                <div className="section-label">Interview Focus Areas</div>
                <div className="focus-areas">
                  {intelligence.focusAreas.slice(0, 4).map((fa, i) => (
                    <div key={i} className="focus-area-item">
                      <span className="focus-area-day">Day {fa.day}</span>
                      {" · "}{fa.title}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ── CENTER: INTERVIEW AREA ────────────────────────────── */}
        <div className="interview-panel">

          {/* Progress header */}
          {isStarted && (
            <div className="progress-header">
              <div className="progress-meta">
                <span className="progress-title">Technical Interview</span>
                <span className="progress-count">
                  Turn {currentTurn} of {totalTurns}
                </span>
              </div>

              {intelligence && (
                <div className="progress-day-label">
                  <span>Day {intelligence.currentDay}</span>
                  {" · "}{intelligence.currentTopic}
                </div>
              )}

              <ProgressSegments
                filled={Math.min(currentTurn, totalTurns)}
                total={totalTurns}
              />
            </div>
          )}

          {/* Conversation / empty state */}
          <div className="panel conversation-panel">
            {!isStarted ? (
              <div className="conversation-empty">
                <div className="empty-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <div className="empty-title">Ready to begin</div>
                  <div className="empty-sub">Select a candidate and click Start Technical Interview to begin the adaptive assessment.</div>
                </div>
              </div>
            ) : (
              <div className="conversation-transcript" ref={transcriptRef}>
                {messages.map((msg, idx) => {
                  const isInterviewer = msg.role === "interviewer";
                  const isLatestInterviewer = isInterviewer && idx === messages.length - 1 && !isLoading;

                  return (
                    <div
                      key={idx}
                      className={`transcript-msg ${!isInterviewer ? "msg-candidate-wrap" : ""}`}
                    >
                      <div className="msg-label">
                        {isInterviewer ? "Interviewer" : m.name}
                      </div>
                      <div
                        className={
                          isInterviewer
                            ? `msg-interviewer${isLatestInterviewer ? " latest" : ""}`
                            : "msg-candidate"
                        }
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="transcript-msg">
                    <div className="msg-label">Interviewer</div>
                    <div className="loading-row">
                      <div className="loading-dots">
                        <div className="loading-dot" />
                        <div className="loading-dot" />
                        <div className="loading-dot" />
                      </div>
                      <span>Evaluating response…</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Answer input area */}
          {isStarted && !isDone && (
            <div className="answer-area">
              <textarea
                id="answer-input"
                className="answer-textarea"
                placeholder="Type your technical response…"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={4}
              />
              <div className="answer-actions">
                <span className="answer-hint">⌘ Enter to submit</span>
                <button
                  id="submit-response-btn"
                  className="btn btn-primary"
                  onClick={sendTurn}
                  disabled={isLoading || !inputMessage.trim()}
                >
                  {isLoading ? "Evaluating…" : "Submit Response"}
                </button>
              </div>
            </div>
          )}

          {/* Final feedback panel */}
          {isDone && feedback && (
            <div className="feedback-panel">
              <div className="feedback-header">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="feedback-header-title">Interview Complete — Assessment Feedback</span>
              </div>
              <div className="feedback-body">
                <p className="feedback-summary">{feedback.summary}</p>

                <div className="feedback-grid">
                  <div>
                    <div className="feedback-col-label green">Key Strengths</div>
                    <ul className="feedback-list">
                      {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="feedback-col-label amber">Identified Gaps</div>
                    <ul className="feedback-list">
                      {feedback.gaps.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  </div>
                </div>

                {feedback.next.length > 0 && (
                  <div>
                    <div className="feedback-col-label blue">Recommended Next Steps</div>
                    <ul className="feedback-list">
                      {feedback.next.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: INTERVIEW INTELLIGENCE ────────────────────── */}
        <aside className="right-col panel-sticky">
          <div className="panel intelligence-panel">

            {!isStarted ? (
              <div className="panel-section">
                <div className="section-label">Interview Intelligence</div>
                <p className="intel-empty">
                  Live assessment signals will appear here once the interview begins.
                </p>
              </div>
            ) : intelligence ? (
              <>
                {/* Current focus */}
                <div className="panel-section">
                  <div className="section-label">Interview Intelligence</div>
                  <div style={{ marginBottom: "var(--space-1)" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Day {intelligence.currentDay}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
                    {intelligence.currentTopic}
                  </div>
                  <span className="diff-chip">{intelligence.difficultyState}</span>
                </div>

                {/* Latest evaluation */}
                {intelligence.latestEvaluation && (
                  <div className="panel-section">
                    <div className="section-label">Latest Evaluation</div>
                    <EvaluationBlock evaluation={intelligence.latestEvaluation} />
                  </div>
                )}

                {/* Mastery scores */}
                {intelligence.masteryScores.length > 0 && (
                  <div className="panel-section">
                    <div className="section-label">Topic Mastery</div>
                    <MasteryBars scores={intelligence.masteryScores} />
                  </div>
                )}

                {/* Why this question */}
                <div className="panel-section why-section">
                  <div className="section-label">Why This Question?</div>
                  <p className="why-body">{intelligence.whyThisQuestion}</p>
                </div>
              </>
            ) : null}
          </div>
        </aside>
      </main>
    </>
  );
}
