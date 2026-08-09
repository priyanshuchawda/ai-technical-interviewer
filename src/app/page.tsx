"use client";

import React, { useState } from "react";
import { CandidateProfile, InterviewFeedback } from "@/types/interview";
import candidatesData from "../../candidates.json";

const candidatesList: CandidateProfile[] = (candidatesData as { candidates: CandidateProfile[] }).candidates;

export default function InterviewDashboard() {
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile>(candidatesList[0]);
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ role: "interviewer" | "candidate"; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);

  const startInterview = async () => {
    setIsLoading(true);
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: newSessionId,
          candidate: selectedCandidate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages([{ role: "interviewer", content: data.reply }]);
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
        body: JSON.stringify({
          sessionId,
          message: userText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "interviewer", content: data.reply }]);
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

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 16px" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", background: "linear-gradient(90deg, #38bdf8, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Autonomous AI Interview Agent
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>
            Multi-turn technical interviewer powered by Breeth Graph Memory & AI Cohort Curriculum
          </p>
        </div>
        <div className="glass-panel" style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="pulse-indicator"></div>
          <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--accent-emerald)" }}>
            {isStarted ? (isDone ? "INTERVIEW COMPLETED" : "LIVE INTERVIEW ACTIVE") : "READY TO START"}
          </span>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px" }}>
        {/* Left Sidebar: Candidate Profile */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--accent-cyan)" }}>Select Candidate</h2>
            <select
              disabled={isStarted}
              value={selectedCandidate.member.id}
              onChange={(e) => {
                const found = candidatesList.find((c) => c.member.id === e.target.value);
                if (found) setSelectedCandidate(found);
              }}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e293b", color: "#fff", border: "1px solid var(--accent-indigo)" }}
            >
              {candidatesList.map((c) => (
                <option key={c.member.id} value={c.member.id}>
                  {c.member.name} ({c.member.jobRole})
                </option>
              ))}
            </select>
          </div>

          <div className="glass-panel" style={{ padding: "20px" }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "12px", color: "var(--accent-purple)" }}>Candidate Overview</h2>
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div><strong>Name:</strong> {selectedCandidate.member.name}</div>
              <div><strong>Role:</strong> {selectedCandidate.member.jobRole}</div>
              <div><strong>Experience:</strong> {selectedCandidate.member.yearsExperience} years</div>
              <div><strong>Education:</strong> {selectedCandidate.member.education}</div>
              <div><strong>Missions Completed:</strong> {selectedCandidate.signals.missionsCompleted}</div>
              <div><strong>Commit Days:</strong> {selectedCandidate.signals.commitDays}</div>
            </div>
          </div>

          {!isStarted && (
            <button className="glow-btn" onClick={startInterview} disabled={isLoading} style={{ width: "100%", padding: "14px" }}>
              {isLoading ? "Initializing..." : "Start Technical Interview"}
            </button>
          )}
        </div>

        {/* Right Main Panel: Conversation & Feedback */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", height: "650px" }}>
          {!isStarted ? (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--text-muted)" }}>
              <h3>Select a candidate profile and click &quot;Start Technical Interview&quot; to begin.</h3>
            </div>
          ) : (
            <>
              {/* Chat Stream */}
              <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {messages.map((m, idx) => (
                  <div key={idx} className={m.role === "interviewer" ? "chat-bubble-interviewer" : "chat-bubble-candidate"}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>
                      {m.role === "interviewer" ? "AI Interviewer Agent" : selectedCandidate.member.name}
                    </div>
                    <div style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>{m.content}</div>
                  </div>
                ))}
                {isLoading && (
                  <div className="chat-bubble-interviewer" style={{ opacity: 0.7 }}>
                    <em>Interviewer is evaluating response and searching Breeth graph memory...</em>
                  </div>
                )}
              </div>

              {/* Feedback Summary Card */}
              {isDone && feedback && (
                <div style={{ marginTop: "16px", padding: "16px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--accent-emerald)", borderRadius: "12px" }}>
                  <h3 style={{ color: "var(--accent-emerald)", marginBottom: "8px" }}>Interview Completed - Assessment Feedback</h3>
                  <p style={{ fontSize: "0.9rem", marginBottom: "8px" }}>{feedback.summary}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
                    <div>
                      <strong style={{ color: "var(--accent-cyan)" }}>Key Strengths:</strong>
                      <ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                    <div>
                      <strong style={{ color: "var(--accent-purple)" }}>Identified Gaps:</strong>
                      <ul>{feedback.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              {!isDone && (
                <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                  <input
                    type="text"
                    placeholder="Type your technical response..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendTurn()}
                    disabled={isLoading}
                    style={{ flex: 1, padding: "14px", borderRadius: "8px", background: "#1e293b", border: "1px solid var(--accent-indigo)", color: "#fff" }}
                  />
                  <button className="glow-btn" onClick={sendTurn} disabled={isLoading || !inputMessage.trim()}>
                    Submit Response
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
