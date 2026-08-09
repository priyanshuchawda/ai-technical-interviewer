"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  CandidateProfile,
  InterviewFeedback,
  InterviewIntelligenceState,
  ResponseOutcome,
} from "@/types/interview";
import { generateCandidateProfile } from "@/lib/candidateProfiler";
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
  if (s >= 0.65) return "var(--green)";
  if (s >= 0.4) return "var(--blue)";
  return "var(--red)";
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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function InterviewPage() {
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile>(candidatesList[0]);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "interviewer" | "candidate"; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [intelligence, setIntelligence] = useState<InterviewIntelligenceState | null>(null);
  const [requestError, setRequestError] = useState("");

  // Drawer state for progressive disclosure
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const csrfReady = useRef<Promise<void> | null>(null);

  useEffect(() => {
    csrfReady.current = fetch("/api/csrf", { credentials: "same-origin" }).then(() => undefined);
  }, []);

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

  const startInterview = async () => {
    setIsLoading(true);
    setRequestError("");
    abortRef.current?.abort();
    const sid = crypto.randomUUID();
    setSessionId(sid);
    abortRef.current = new AbortController();
    try {
      await csrfReady.current;
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId: sid, candidate: selectedCandidate }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages([{ role: "interviewer", content: data.reply }]);
        if (data.intelligence) setIntelligence(data.intelligence);
        setIsStarted(true);
      } else {
        setRequestError(data.error || `Request failed (${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setRequestError("Could not start the interview. Retry in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendTurn = async () => {
    if (!inputMessage.trim() || isLoading || isDone) return;
    const text = inputMessage;
    setInputMessage("");
    setMessages((p) => [...p, { role: "candidate", content: text }]);
    setIsLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await csrfReady.current;
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sessionId, message: text }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((p) => [...p, { role: "interviewer", content: data.reply }]);
        if (data.intelligence) setIntelligence(data.intelligence);
        if (data.done) {
          setIsDone(true);
          if (data.feedback) setFeedback(data.feedback);
        }
      } else {
        setRequestError(data.error || `Request failed (${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setRequestError("Could not send the answer. Retry in a moment.");
    } finally {
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

  // History before the latest interviewer message
  const previousTurns = useMemo(() => {
    if (messages.length <= 1) return [];
    return messages.slice(0, messages.length - 1);
  }, [messages]);

  const latestEval = intelligence?.latestEvaluation;

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
            <div>
              <div className="start-cand-name">{m.name}</div>
              <div className="start-cand-role">{m.jobRole}</div>
            </div>
            <p className="start-desc">
              8 questions · Adaptive technical assessment
            </p>
            <p className="start-subtext">
              Questions adapt to your cohort progress and interview performance.
            </p>
            <button
              id="start-interview-btn"
              className="btn-start-main"
              onClick={startInterview}
              disabled={isLoading}
            >
              {isLoading ? "Initializing…" : "Start interview →"}
            </button>
            {requestError ? <p className="start-subtext">{requestError}</p> : null}
          </div>
        ) : (
          /* ── STATE B: ACTIVE INTERVIEW WORKSPACE ── */
          <>
            {/* Topic Header & Segmented Progress Track */}
            {intelligence && (
              <div className="topic-header">
                <div className="topic-meta">
                  <span>Day {intelligence.currentDay}</span>
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

            {/* Previous Transcript Entries (Editorial Style) */}
            {previousTurns.length > 0 && (
              <div className="transcript-list">
                {previousTurns.map((msg, idx) => {
                  const isByInterviewer = msg.role === "interviewer";
                  return (
                    <div key={idx} className="t-row">
                      <div className={`t-author${!isByInterviewer ? " cand" : ""}`}>
                        {isByInterviewer ? "Interviewer" : m.name}
                      </div>
                      <div className={`t-content${isByInterviewer ? " interviewer" : ""}`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
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
                <span>Evaluating response…</span>
              </div>
            )}

            {/* Response Composer */}
            {!isDone && (
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
                  <span className="kbd-hint">⌘ Enter to submit</span>
                  {isLoading ? (
                    <button
                      id="cancel-response-btn"
                      className="btn-submit"
                      onClick={() => {
                        abortRef.current?.abort();
                        setIsLoading(false);
                      }}
                    >
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
              <div className="feedback-wrap">
                <div className="fb-head">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--green-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Interview Complete — Assessment Feedback
                </div>
                <div className="fb-body">
                  <p className="fb-summary">{feedback.summary}</p>
                  <div className="fb-grid">
                    <div>
                      <div className="fb-col-lbl g">Key Strengths</div>
                      <ul className="fb-list">{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                    <div>
                      <div className="fb-col-lbl a">Identified Gaps</div>
                      <ul className="fb-list">{feedback.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
                    </div>
                  </div>
                  {feedback.next.length > 0 && (
                    <div>
                      <div className="fb-col-lbl b">Recommended Next Steps</div>
                      <ul className="fb-list">{feedback.next.map((n, i) => <li key={i}>{n}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)" }}>
                    Day {intelligence.currentDay} · {intelligence.currentTopic}
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

                {/* Next Decision */}
                <div className="drawer-sec">
                  <span className="drawer-eyebrow">Next Decision</span>
                  <div className="why-box">
                    {parseWhy(intelligence.whyThisQuestion).map((r, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-3)", display: "block" }}>{r.key}</span>
                        <span>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Breeth Memory */}
                <div className="drawer-sec">
                  <span className="drawer-eyebrow">Memory</span>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }} />
                    <span>
                      {intelligence.masteryScores.length > 0
                        ? `${intelligence.masteryScores.length} topic${intelligence.masteryScores.length !== 1 ? "s" : ""} in session memory`
                        : "Breeth Graph Memory active"}
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
                        <span>Day {fa.day} — {fa.title}</span>
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
                        <div style={{ fontWeight: 600 }}>Day {fa.day} — {fa.title}</div>
                        <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{fa.reason}</div>
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
