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

// ─── helpers ──────────────────────────────────────────────────────────────────

function obClass(o: ResponseOutcome | undefined) {
  if (!o) return "ob ob-unknown";
  if (o === "off_topic") return "ob ob-offtopic";
  return `ob ob-${o}`;
}

function obLabel(o: ResponseOutcome | undefined) {
  if (!o) return "—";
  if (o === "off_topic") return "Off topic";
  return o.charAt(0).toUpperCase() + o.slice(1);
}

function mbFill(s: number) {
  if (s >= 0.65) return "mb-fill mb-green";
  if (s >= 0.4) return "mb-fill mb-blue";
  return "mb-fill mb-red";
}

function mbColor(s: number): React.CSSProperties {
  if (s >= 0.65) return { color: "var(--green)" };
  if (s >= 0.4) return { color: "var(--blue)" };
  return { color: "#ef4444" };
}

/**
 * Clean human-readable parser for "Why This Question".
 * Parses raw intelligence signal strings into clean, concise labelled rows (Profile, Goal, Next).
 */
function parseWhy(raw: string): Array<{ key: string; val: string }> {
  const prefixes = [
    { match: "Profile signal", label: "Profile" },
    { match: "Previous answer", label: "Previous" },
    { match: "Current mastery", label: "Mastery" },
    { match: "Assessment strategy", label: "Next" },
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
        key: i === 0 ? "Profile" : i === 1 ? "Goal" : "Next",
        val: s.replace(/\.$/, "").trim(),
      }));
    }
    return [{ key: "Goal", val: raw }];
  }
  return parts;
}

function adaptChipClass(state: string) {
  const s = state.toLowerCase();
  if (s.includes("deep") || s.includes("advanced")) return "adapt-chip deep";
  if (s.includes("recovery") || s.includes("prerequisite")) return "adapt-chip recovery";
  if (s.includes("redirect") || s.includes("off")) return "adapt-chip redirect";
  return "adapt-chip";
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ProgressTrack({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="prog-track">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`prog-seg${i < filled ? " on" : ""}`} />
      ))}
    </div>
  );
}

function MasteryBar({ topic, score }: { topic: string; score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="mb-row">
      <div className="mb-meta">
        <span className="mb-topic" title={topic}>{topic}</span>
        <span className="mb-score" style={mbColor(score)}>{pct}%</span>
      </div>
      <div className="mb-track">
        <div className={mbFill(score)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EvalBlock({ ev }: { ev: NonNullable<InterviewIntelligenceState["latestEvaluation"]> }) {
  const off = ev.outcome === "off_topic";
  const pct = Math.round(ev.score * 100);
  return (
    <div className="eval-anim" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span className={obClass(ev.outcome)}>{obLabel(ev.outcome)}</span>
        {!off && (
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink-2)" }}>· {pct}%</span>
        )}
      </div>

      {off && ev.evidence && (
        <div className="ot-block">
          <div className="ot-head">Off-topic response</div>
          <div className="ot-body">{ev.evidence}</div>
        </div>
      )}

      {!off && ev.demonstratedConcepts.length > 0 && (
        <div>
          <span className="eyebrow" style={{ marginBottom: "4px" }}>Demonstrated</span>
          <div className="clist">
            {ev.demonstratedConcepts.slice(0, 4).map((c, i) => (
              <div key={i} className="ci"><span className="ci-g">✓</span><span>{c}</span></div>
            ))}
          </div>
        </div>
      )}

      {!off && ev.missingConcepts.length > 0 && (
        <div>
          <span className="eyebrow" style={{ marginBottom: "4px" }}>Still to cover</span>
          <div className="clist">
            {ev.missingConcepts.slice(0, 3).map((c, i) => (
              <div key={i} className="ci"><span className="ci-a">·</span><span>{c}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WhyBlock({ raw }: { raw: string }) {
  const rows = parseWhy(raw);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {rows.map((r, i) => (
        <div key={i} className="why-row">
          <div className="why-key">{r.key}</div>
          <div className="why-val">{r.val}</div>
        </div>
      ))}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

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

  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const startInterview = async () => {
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
        setIsStarted(true);
      }
    } catch (err) {
      console.error(err);
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
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((p) => [...p, { role: "interviewer", content: data.reply }]);
        if (data.intelligence) setIntelligence(data.intelligence);
        if (data.done) {
          setIsDone(true);
          if (data.feedback) setFeedback(data.feedback);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendTurn();
  };

  const m = selectedCandidate.member;
  const sig = selectedCandidate.signals;
  const totalTurns = 8;
  const currentTurn = intelligence?.progress?.turnCount ?? 0;

  // Header status text
  const dotClass = isStarted ? (isDone ? "live-dot done" : "live-dot active") : "live-dot";
  const liveText = isStarted ? (isDone ? "Completed" : "Live interview") : "Ready to start";

  // Current focus day from intelligence
  const currentDay = intelligence?.currentDay;

  // Mastery for current topic
  const currentMastery = intelligence?.masteryScores.find((ms) => ms.day === currentDay);
  const currentMasteryPct = currentMastery ? Math.round(currentMastery.score * 100) : null;

  /**
   * Candidate-specific recommended focus areas derived from the existing
   * generateCandidateProfile logic. Canonical source of truth.
   */
  const profileFocusAreas = useMemo(
    () => generateCandidateProfile(selectedCandidate).recommendedFocusAreas,
    [selectedCandidate]
  );

  return (
    <>
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <header className="hdr">
        <div className="hdr-inner">
          <div>
            <div className="brand-name">Autonomous Interviewer</div>
            <div className="brand-sub">Technical assessment</div>
          </div>
          <div className="hdr-right">
            {/* progress counter — visible once started */}
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
          </div>
        </div>
      </header>

      {/* ─── WORKSPACE ──────────────────────────────────────────────── */}
      <main className="workspace">

        {/* ── LEFT COLUMN ─────────────────────────────────────── */}
        <aside className="sticky" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Candidate card */}
          <div className="panel fade-swap">
            <div className="ps">
              <span className="eyebrow">Candidate</span>
              <div className="cand-name">{m.name}</div>
              <div className="cand-role">{m.jobRole}</div>
              <div className="cand-stats">
                <span>{m.yearsExperience} years experience · {m.education}</span>
                <span style={{ marginTop: 4 }}>
                  <strong>{sig.missionsCompleted}</strong> missions ·{" "}
                  <strong>{sig.missionsFirstTry}</strong> first-attempt passes ·{" "}
                  <strong>{sig.commitDays}</strong> active days
                </span>
              </div>
            </div>
          </div>

          {/* Interview plan */}
          {profileFocusAreas.length > 0 && (
            <div className="panel fade-swap">
              <div className="ps">
                <span className="eyebrow">Interview Plan</span>
                <div className="plan-list">
                  {profileFocusAreas.map((fa, i) => {
                    const isCurrent = isStarted && fa.day === currentDay;
                    return (
                      <div
                        key={fa.day}
                        className={`plan-item ${isCurrent ? "active" : i > 0 ? "passive" : ""}`}
                      >
                        <span className="plan-num">{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <div className="plan-day">Day {fa.day}</div>
                          <div className="plan-title">{fa.title}</div>
                          {isCurrent && <span className="plan-badge">Current</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ── CENTER COLUMN ───────────────────────────────────── */}
        <div className="center-col">

          {/* Progress strip */}
          {isStarted && (
            <div className="prog-strip">
              <div className="prog-top">
                <span className="prog-label">Technical Interview</span>
                <span className="prog-count">Question {currentTurn} of {totalTurns}</span>
              </div>
              {intelligence && (
                <div className="prog-topic">
                  <strong>Day {intelligence.currentDay}</strong>
                  {" · "}{intelligence.currentTopic}
                </div>
              )}
              <ProgressTrack filled={Math.min(currentTurn, totalTurns)} total={totalTurns} />
            </div>
          )}

          {/* Conversation / briefing */}
          <div className="convo-panel">
            {!isStarted ? (
              /* ── Assessment briefing (pre-interview) ── */
              <div className="briefing">
                <div className="briefing-label">Technical Interview</div>
                <div className="briefing-candidate">
                  {m.name}
                  <span className="briefing-role">{m.jobRole}</span>
                </div>
                <p className="briefing-desc">
                  8 questions based on your cohort progress and interview performance.
                  Questions will adjust as you answer.
                </p>
                <div className="briefing-meta">
                  <span>8 questions</span>
                  <span className="briefing-sep">·</span>
                  <span>4+ curriculum areas</span>
                </div>
                <button
                  id="start-interview-btn"
                  className="btn-start-main"
                  onClick={startInterview}
                  disabled={isLoading}
                >
                  {isLoading ? "Initializing…" : "Start interview →"}
                </button>
              </div>
            ) : (
              <div className="transcript" ref={transcriptRef}>
                {messages.map((msg, idx) => {
                  const isByInterviewer = msg.role === "interviewer";
                  const isLatest = isByInterviewer && idx === messages.length - 1 && !isLoading;
                  return (
                    <div
                      key={idx}
                      className={`t-msg${!isByInterviewer ? " t-cand" : ""}`}
                    >
                      <div className="t-who">
                        {isByInterviewer ? "Interviewer" : m.name}
                      </div>
                      <div className={`t-bubble${isLatest ? " highlight" : ""}`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="t-msg">
                    <div className="t-who">Interviewer</div>
                    <div className="loading-indicator">
                      <div className="ldots">
                        <div className="ldot" />
                        <div className="ldot" />
                        <div className="ldot" />
                      </div>
                      <span>Evaluating response…</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Answer area */}
          {isStarted && !isDone && (
            <div className="answer-area">
              <div className="answer-label">Your Response</div>
              <textarea
                id="answer-input"
                className="answer-ta"
                placeholder="Type your technical response…"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKey}
                disabled={isLoading}
                rows={4}
              />
              <div className="answer-row">
                <span className="answer-hint">⌘ Enter to submit</span>
                <button
                  id="submit-response-btn"
                  className="btn-submit"
                  onClick={sendTurn}
                  disabled={isLoading || !inputMessage.trim()}
                >
                  {isLoading ? "Evaluating…" : "Submit response →"}
                </button>
              </div>
            </div>
          )}

          {/* Final feedback */}
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
        </div>

        {/* ── RIGHT COLUMN — LIVE ASSESSMENT ─────────────────────── */}
        <aside className="sticky">
          <div className="panel intel-col">

            {!isStarted ? (
              /* ── Pre-interview Right Panel (Interview Plan & What to expect) ── */
              <>
                <div className="ps fade-swap">
                  <span className="eyebrow">Interview Plan</span>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 10 }}>
                    Based on {m.name.split(" ")[0]}&apos;s cohort progress
                  </div>
                  <div className="plan-list">
                    {profileFocusAreas.map((fa, i) => (
                      <div key={fa.day} className={`plan-item ${i > 0 ? "passive" : ""}`}>
                        <span className="plan-num">{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <div className="plan-day">Day {fa.day}</div>
                          <div className="plan-title">{fa.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="divider" />
                <div className="ps fade-swap">
                  <span className="eyebrow">What to Expect</span>
                  <div className="clist" style={{ gap: 6 }}>
                    <div className="ci"><span className="ci-g">·</span><span>8 questions</span></div>
                    <div className="ci"><span className="ci-g">·</span><span>Questions adjust based on your answers</span></div>
                    <div className="ci"><span className="ci-g">·</span><span>Your progress is tracked throughout the interview</span></div>
                    <div className="ci"><span className="ci-g">·</span><span>Previous answers can influence later questions</span></div>
                  </div>
                </div>
              </>
            ) : !intelligence ? null : (
              <>
                {/* Current focus */}
                <div className="ps">
                  <span className="eyebrow">Live Assessment</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)", marginBottom: 1 }}>
                    Day {intelligence.currentDay}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
                    {intelligence.currentTopic}
                  </div>
                  <span className={adaptChipClass(intelligence.difficultyState)}>
                    {intelligence.difficultyState}
                  </span>
                </div>

                {/* Mastery for current topic */}
                {currentMasteryPct !== null && (
                  <>
                    <div className="divider" />
                    <div className="ps">
                      <span className="eyebrow">Mastery</span>
                      <div className="mastery-num">{currentMasteryPct}%</div>
                      <div className="mastery-num-track">
                        <div
                          className={mbFill(currentMastery!.score)}
                          style={{ width: `${currentMasteryPct}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Latest answer */}
                {intelligence.latestEvaluation && (
                  <>
                    <div className="divider" />
                    <div className="ps">
                      <span className="eyebrow">Latest Answer</span>
                      <EvalBlock ev={intelligence.latestEvaluation} />
                    </div>
                  </>
                )}

                {/* All topic mastery bars */}
                {intelligence.masteryScores.length > 0 && (
                  <>
                    <div className="divider" />
                    <div className="ps">
                      <span className="eyebrow">Topic Mastery</span>
                      {intelligence.masteryScores.map((ms, i) => (
                        <MasteryBar key={`${ms.day}-${i}`} topic={ms.topic} score={ms.score} />
                      ))}
                    </div>
                  </>
                )}

                {/* Why this question */}
                <div className="divider" />
                <div className="ps">
                  <span className="eyebrow">Why This Question</span>
                  <WhyBlock raw={intelligence.whyThisQuestion} />
                </div>

                {/* Breeth memory context */}
                <div className="divider" />
                <div className="ps">
                  <span className="eyebrow">Memory</span>
                  <div className="breeth-row">
                    <span className="breeth-dot" />
                    <span className="breeth-name">Breeth Graph Memory</span>
                  </div>
                  <div className="breeth-count">
                    {intelligence.masteryScores.length > 0
                      ? `${intelligence.masteryScores.length} topic${intelligence.masteryScores.length !== 1 ? "s" : ""} in session memory`
                      : "Memory active"}
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </main>
    </>
  );
}
