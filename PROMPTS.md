# Prompt Log

## Candidate Intelligence Profiling Implementation Prompt
```
Inspect the current autonomous-ai-interviewer codebase.

Implement only the first step of the adaptive interview system: a deterministic candidate intelligence profile derived from the supplied candidates.json.

For the selected candidate, calculate structured signals from:
- role
- years of experience
- education
- passed missions
- failed missions
- skipped missions
- attempt counts
- commitDays
- missionsCompleted
- missionsFirstTry

The profile should identify:
1. strong areas
2. weak areas
3. skipped/unknown areas
4. high-attempt topics
5. candidate seniority/context
6. a small set of recommended interview focus areas

Do NOT redesign the UI yet.
Do NOT change the API contract.
Do NOT add a new database.
Do NOT invent curriculum knowledge.

Use the existing project architecture and keep the implementation small and typed.

VALIDATION:
- run the existing tests/build
- verify Sarah Johnson produces sensible profile signals
- verify at least one other candidate with substantially different history produces a different profile
- verify the existing interview flow still works

GIT:
- commit the changes with:
  feat: add candidate intelligence profiling
- push the commit to:
  https://github.com/priyanshuchawda/autonomous-ai-interviewer
```

## Profile-Driven Adaptive Questioning Implementation Prompt
```
Now implement the second incremental step: make the interview question selection use the candidate intelligence profile created in the previous commit.

Inspect the current interviewEngine.ts, prompts.ts, candidateProfiler.ts, curriculum data, and existing tests before changing anything.

Requirements:

1. At interview initialization, use the candidate profile to choose an initial focus area instead of selecting a topic generically.

2. Prefer recommendedFocusAreas from the candidate profile, while still respecting the supplied curriculum and the requirement to cover at least 4 curriculum days over the full interview.

3. When generating a question, include the relevant curriculum day/title/objectives as grounding context. Do not invent curriculum objectives.

4. Track the current interview topic/day in the existing session state.

5. After a candidate answer, classify the response into a small structured outcome:
   - strong
   - partial
   - weak
   - unknown

   Keep this classification simple for now. Do not build the full mastery system yet.

6. For this step, change the behavior when the candidate says "I don't know", "no idea", "nope", or gives an equivalent unknown response:
   - do NOT immediately jump to an unrelated topic
   - generate a simpler prerequisite question related to the current topic/day
   - keep the conversation on the same concept long enough to test whether the candidate can recover

7. For a strong answer, allow the next question to increase difficulty or move to a related objective.

8. For a weak/unknown answer, prefer a prerequisite or simpler question before changing topics.

9. Keep the existing POST /api/interview contract unchanged.

10. Do not add a database or rewrite the UI.

11. Preserve the Breeth integration. Do not remove or bypass it.

12. Add focused tests for:
   - candidate profile influencing initial topic selection
   - unknown answer causing a same-topic/prerequisite follow-up
   - strong answer allowing progression
   - curriculum grounding being present in generated question context
   - existing interview/session tests remaining valid

VALIDATION:
- run npm test
- run npm run build
- verify Sarah's interview no longer immediately jumps to an unrelated topic after "dont know"
- verify a strong answer can progress the interview
- verify the existing API still works

GIT:
- commit the changes with:
  feat: add profile-driven adaptive questioning
- push to:
  https://github.com/priyanshuchawda/autonomous-ai-interviewer
```

## Breeth Graph Memory Integration into Adaptive Decision Loop Implementation Prompt
```
Implement the next incremental feature: make Breeth Graph Memory part of the adaptive interview decision loop.

Inspect the existing breethClient.ts and interviewEngine.ts before modifying anything.

Current behavior already sends candidate turns to Breeth using addEpisode(). Keep that behavior.

Add contextual memory retrieval using the existing Breeth searchMemory() helper.

On each candidate turn:
1. Store the candidate's latest response in Breeth as it already does.
2. Retrieve a small number of relevant memories using the current interview topic/day and the candidate's latest response as the search context.
3. Pass only the retrieved memory summaries into the interview decision/generation prompt.
4. Use the memories to help the interviewer reference demonstrated knowledge from earlier in the interview instead of treating every turn as isolated.
5. Keep Breeth retrieval best-effort: if the API fails, times out, or returns nothing, the interview must continue normally.
6. Do not expose Breeth credentials to the client.
7. Do not change POST /api/interview or the response contract.
8. Do not redesign the UI.
9. Do not add a database.
10. Do not replace the existing candidate profile or adaptive-questioning logic; Breeth should augment it.

Add focused tests for:
- Breeth memories being included when available
- interview continuing when Breeth search fails
- no Breeth credential being exposed in generated client code
- existing adaptive questioning tests remaining valid

Do not make the system dependent on Breeth for correctness; it should improve contextual awareness rather than become a single point of failure.

VALIDATION:
- run npm test
- run npm run build
- verify Breeth retrieval is actually called during a multi-turn interview
- verify the interview still works if Breeth is unavailable
- verify the existing adaptive behavior remains intact

SECURITY:
- inspect the repository for accidentally committed API credentials
- ensure Breeth credentials remain server-side/environment-only
- do not print or expose the credential in logs, tests, prompts, or client bundles

GIT:
- commit with:
  feat: use Breeth memory for contextual interviewing
- push to:
  https://github.com/priyanshuchawda/autonomous-ai-interviewer
```

## Structured Answer Evaluation and Per-Topic Mastery Evidence Implementation Prompt
```
Implement the next incremental feature: structured answer evaluation and per-topic mastery evidence.

Inspect the current candidateProfiler, responseClassifier, interviewEngine, prompts, curriculum data, and Breeth integration before modifying anything.

Do not redesign the UI or API contract.

For each substantive candidate response, have the interviewer produce a small structured evaluation containing:

- outcome: strong | partial | weak | unknown
- score: 0 to 1
- demonstratedConcepts: string[]
- missingConcepts: string[]
- evidence: short string

The evaluation must be grounded in the current curriculum day and its objectives. Do not invent objectives or claim mastery of concepts that were not actually demonstrated.

Add an interview-level mastery state keyed by curriculum day/topic. It should accumulate evidence across turns instead of treating a single answer as definitive mastery.

Example:

{
  "day": 10,
  "topic": "The Retrieval & Matching Engine",
  "score": 0.62,
  "attempts": 2,
  "demonstratedConcepts": ["SQL vs vector retrieval"],
  "missingConcepts": ["hybrid retrieval"]
}

Use this state to improve the existing adaptive questioning behavior:
- strong evidence can increase difficulty
- partial evidence should target missing concepts
- weak/unknown evidence should trigger prerequisite recovery
- do not permanently label a candidate as incapable based on one answer

Keep the existing candidate intelligence profile as the prior/background signal. The new interview evidence should represent current demonstrated ability and should eventually be able to contradict the historical profile.

Keep Breeth integration intact. If Breeth memories are available, they may provide additional context, but the answer evaluator must primarily evaluate the actual current response against the supplied curriculum objectives.

Do not add a database.
Do not change POST /api/interview.
Do not expose hidden chain-of-thought.
Store only concise structured evaluation/evidence.

Add focused tests for:
1. a strong answer producing demonstrated concepts
2. a partial answer producing missing concepts
3. an unknown answer not falsely receiving mastery
4. mastery state accumulating across multiple answers on the same topic
5. current interview evidence being able to differ from historical candidate profile
6. existing adaptive questioning tests remaining valid
7. Breeth failure still leaving evaluation functional
```

## Interview Intelligence UI Panel Implementation Prompt
```
Implement the next incremental feature: add a compact "Interview Intelligence" panel to the existing interviewer UI.

Do not redesign the existing interview experience. Preserve the current visual style and layout as much as practical.

Expose the structured state that the backend already maintains:

1. Current curriculum day/topic
2. Current question number / interview progress
3. Current difficulty or progression state if already available
4. Candidate focus areas
5. Live topic mastery scores
6. Demonstrated concepts from the latest evaluated answer
7. Missing concepts from the latest evaluated answer
8. Current response outcome (strong/partial/weak/unknown)
9. A short "Why this question?" explanation based on structured state

The "Why this question?" explanation must be concise and based on observable structured signals such as:
- candidate profile focus area
- current curriculum objective
- previous answer outcome
- missing concepts
- mastery state
- skipped/high-attempt history

Do NOT expose chain-of-thought or hidden reasoning.

Use labels such as:
"Profile signal", "Curriculum objective", "Previous answer", and "Current mastery" where useful.

Important:
- Keep the existing POST /api/interview contract compatible.
- If additional response fields are needed, add them in a backward-compatible way.
- Do not add a database.
- Do not add another LLM call just for the UI.
- Do not remove Breeth integration.
- Do not change the core adaptive-questioning behavior.

The panel should make the system's adaptive behavior demonstrable to a hackathon judge without overwhelming the candidate-facing experience.

Add focused tests for any new serialization/API state required by the panel.
```

## Evidence-Backed Final Interview Feedback Implementation Prompt
```
Implement the next incremental feature: evidence-backed final interview feedback.

Inspect the current interview state, answer evaluation, mastery state, candidate profile, curriculum data, Breeth integration, and intelligence payload before modifying anything.

When the interview reaches its existing completion condition, generate structured final feedback using the evidence accumulated during the actual interview.

The final feedback must contain exactly the required conceptual fields:
- summary
- strengths
- gaps
- next

Keep the existing API contract compatible.

Feedback requirements:

1. SUMMARY
Provide a concise assessment of the candidate's demonstrated technical performance during this interview.

2. STRENGTHS
Select only concepts/topics supported by actual interview evidence.
Use demonstrated concepts and strong/partial evaluations.
Do not call a topic a strength merely because the candidate passed that cohort mission.

3. GAPS
Identify concepts that were weak, unknown, or repeatedly missing during the interview.
Use current mastery and missing concepts.
Skipped or high-attempt historical topics may be used as supporting context, but must not by themselves be treated as current interview weaknesses.

4. NEXT
Produce concise, actionable curriculum-grounded recommendations.
Reference relevant curriculum days/topics where useful.
Recommendations should follow directly from identified gaps.

5. HISTORICAL VS CURRENT EVIDENCE
Keep these conceptually separate:
- candidate history = prior learning signal
- interview evidence = current demonstrated ability

A candidate's interview evidence must be able to contradict their historical profile.

6. Do not expose hidden chain-of-thought.
Feedback should contain conclusions and short evidence-based explanations only.

7. If there is insufficient evidence for a strong conclusion, say so rather than inventing one.

8. Preserve the existing Breeth integration and intelligence panel.

9. Do not redesign the UI in this step.
Do not add a database.
Do not add another required external API call solely for feedback.

Prefer deterministic aggregation of the structured mastery/evaluation state. If the existing architecture already uses the LLM for final wording, constrain it with the structured evidence and validate the returned fields.

Add focused tests for:
- strengths coming from strong demonstrated interview concepts
- gaps coming from weak/unknown/missing concepts
- historical high-attempt data not automatically becoming an interview gap
- next steps mapping to curriculum topics
- all four required feedback fields being present
- existing API contract remaining valid
- existing tests continuing to pass
```

## Relevance-First Answer Evaluation Layer Implementation Prompt
```
We found a critical behavioral bug during manual testing.

A candidate was asked a Day 29 structured logging question but answered with an explanation of embeddings. The system incorrectly classified the answer as technically strong and then pivoted to an embeddings/vector-database question.

Fix this before adding any new features.

Inspect the current answerEvaluator.ts, responseClassifier.ts, interviewEngine.ts, prompts.ts, curriculum data, and related tests.

Implement a relevance-first answer evaluation layer.

Requirements:

1. Before awarding technical mastery for a candidate response, determine whether the response actually addresses the current question.

2. Add a structured outcome:
   - strong
   - partial
   - weak
   - unknown
   - off_topic

3. An off-topic response must NOT:
   - increase mastery for the current curriculum topic
   - be counted as a demonstrated concept for the current question
   - cause the interviewer to pivot to the unrelated concept mentioned in the answer
   - be described as a strong technical answer

4. For an off-topic response, the interviewer should remain on the current curriculum topic and politely redirect the candidate.

5. The current question's curriculum day/objectives must be the primary reference for relevance and evaluation.

6. Do not award mastery simply because the candidate mentions a technically valid concept that belongs to another curriculum day.

7. Preserve the existing strong/partial/weak/unknown behavior for answers that are actually relevant to the question.

8. Make the relevance check deterministic where practical. Do not simply rely on keyword overlap.

9. If an answer contains concepts from another curriculum topic but does not answer the current question, classify it as off_topic rather than strong.

10. Update the intelligence payload so the latest evaluation can display "OFF TOPIC" and a concise explanation such as:
"Response discussed embeddings, but the current question tested structured logging."

11. Keep the historical candidate profile separate from current answer relevance. A candidate can be strong in embeddings while still being off-topic for a logging question.

12. Do not redesign the UI. Make the smallest UI change necessary to represent the new outcome clearly.

13. Do not remove Breeth integration.

14. Do not change POST /api/interview or break the existing sessionId flow.

15. Do not expose chain-of-thought.
```

## Canonical Curriculum Day Mapping Fix Implementation Prompt
```
We found a critical curriculum-state mapping bug during manual testing. Do not add any new features until this is fixed.

The interview conversation is asking reasonable questions, but curriculum day IDs and topic names are becoming mismatched in the intelligence state.

Observed example:

- Day 7 should be Embeddings Explained
- Day 12 should be Prompt Engineering Fundamentals
- Day 28 should be Docker & Kubernetes Deployment
- Day 29 should be Monitoring, Logging & Observability

However, the UI currently displayed mappings such as:
- Day 29: Prompt Engineering Fundamentals
- Day 12: Docker & Kubernetes Deployment
- Day 28: Embeddings Explained

This indicates that some state is using an array/index/iteration position instead of the actual curriculum day identifier, or otherwise mixing day metadata.

Inspect the entire curriculum-day data flow, especially:
- candidateProfiler.ts
- interviewEngine.ts
- answerEvaluator.ts
- feedbackGenerator.ts
- prompts.ts
- dataService.ts
- interview.ts types
- intelligence payload construction
- masteryState construction
- recommendedFocusAreas
- any curriculum lookup helpers

Find the root cause rather than patching the three displayed values individually.

Requirements:

1. Establish one canonical curriculum lookup mechanism where the actual curriculum `day` number is the source of truth.

2. Never derive a curriculum day number from an array index.

3. Ensure every curriculum reference preserves its actual:
   - day number
   - title
   - module
   - objectives
   - topics/tools where applicable

4. Ensure masteryState keys represent the actual curriculum day number.

5. Ensure currentDay/currentTopic always refer to the same curriculum record.

6. Ensure candidate recommendedFocusAreas use the actual curriculum day number.

7. Ensure answer evaluation receives the actual current curriculum record rather than a record selected by positional index.

8. Ensure intelligence UI serialization uses the canonical curriculum record.

9. Ensure final feedback recommendations use the actual curriculum day number and title.

10. Preserve the existing adaptive behavior.

11. Do not redesign the UI.

12. Do not remove Breeth.

13. Do not change POST /api/interview or the sessionId contract.
```

## Enterprise UI Redesign Implementation Prompt
```
Redesign the ENTIRE frontend UI of the Autonomous AI Interview Agent into a polished, modern enterprise technical-assessment product.

IMPORTANT: This is a UI/UX redesign only. The existing backend intelligence and interview behavior are valuable and MUST be preserved.

The current interface feels like generic AI-dashboard design because of excessive gradients, purple/blue glow, glassmorphism, dense bordered cards, small typography, and too much visual decoration.

The new design should feel like: Linear, Vercel, Stripe, Karat / professional technical interview software. Use a LIGHT interface.

Color system:
- Page background: very light neutral gray/off-white (#f5f5f5)
- Main surfaces: white
- Primary text: dark charcoal / near-black (#111827)
- Secondary text: muted gray (#374151)
- Borders: subtle neutral gray (#e5e7eb)
- Primary accent: restrained blue (#2563eb)
- Success: green (#16a34a)
- Warning/off-topic: amber (#d97706)
- Error: red (#dc2626)

Avoid: purple gradients, cyan/purple glow, neon effects, gradient backgrounds, glowing borders, glassmorphism, decorative blobs, excessive pills, excessive rounded cards, unnecessary animations.

Typography: Inter. Body ~14px. Metadata ~12px. Question text ~19-22px. Hierarchy through weight and spacing, not color and borders.

OVERALL INFORMATION ARCHITECTURE:
1. Interview / current question (most prominent)
2. Candidate identity and interview progress
3. Answer input
4. Interview Intelligence
5. Supporting metadata

Desktop three-column layout: LEFT candidate context, CENTER interview + answer, RIGHT intelligence panel.

The intelligence panel must expose: current curriculum day/topic, difficulty/adaptive state, candidate focus areas, live mastery bars, latest evaluation (outcome, score, demonstrated/missing concepts), why-this-question explanation.

Evaluation states: strong (green), partial (blue), weak (red), unknown (neutral), off_topic (amber).

IMPORTANT FUNCTIONALITY TO PRESERVE:
POST /api/interview, sessionId, candidate selection, multi-turn conversation, adaptive questioning, Breeth Graph Memory, answer evaluation, off-topic detection, mastery state, canonical curriculum mappings, evidence-backed feedback, loading/error handling.

Do not add new AI features, databases, APIs, or libraries.

TESTING: run npm test and npm run build.

GIT: git commit -m "feat: redesign interviewer interface" and push to https://github.com/priyanshuchawda/autonomous-ai-interviewer
```

## Interview Workspace UI Refinement Prompt
```
Redesign the CURRENT Autonomous AI Interviewer frontend based on the existing implementation and the current UI.

This is a visual/UX refinement pass, NOT a backend rewrite.

The current redesign is much better than the original, but it still feels like a plain admin dashboard.
The goal: "An intelligent technical interview workspace with visible adaptive intelligence."

CURRENT UI PROBLEMS TO FIX:
1. The central question area is unnecessarily tall and creates a large amount of dead space.
2. The interview question does not have enough visual hierarchy.
3. The candidate sidebar contains too much metadata and competes with the interview itself.
4. The Interview Intelligence panel is too empty despite the backend providing substantial intelligence.
5. "Why this question?" is rendered as a long backend-style sentence rather than structured product information.
6. Interview Focus Areas look like a list of unrelated buttons instead of a prioritized assessment plan.
7. Interview progress is not prominent enough.
8. The UI currently looks like three cards placed next to each other rather than one cohesive interview workspace.
9. Breeth Graph Memory is not visually apparent even though it is an important differentiating part of the system.
10. The overall UI is clean but too generic. It needs a stronger product identity.

DESIGN DIRECTION: Light theme, warmer neutrals, one restrained blue accent, semantic green/amber/red.
No purple, no gradients, no glow, no glassmorphism.

KEY IMPLEMENTATION REQUIREMENTS:
- Compress left candidate panel; show name, role, compact stats in one line
- Transform focus areas into a numbered assessment plan with current-day highlight
- Center column is the visual hero: progress strip, then transcript, then answer area, immediately adjacent
- Intelligence panel: current mastery big number, full eval block, all topic mastery bars, structured WhyBlock parser, Breeth memory section
- WhyBlock: parse "Profile signal:", "Previous answer:", "Assessment strategy:" etc. into labelled rows
- Breeth: show dot indicator + "Breeth Graph Memory" + session memory count
- Adaptive state chip: styled differently for deep/recovery/redirect states
- Progress 00/08 counter in header when live

ALL BACKEND STATE PRESERVED: POST /api/interview, sessionId, candidate selection, adaptive questioning, Breeth, off-topic, mastery, canonical curriculum mappings, evidence feedback.

GIT: git commit -m "feat: refine interview workspace UI" and push.
```

## Pre-Interview Focus Area Regression Fix Prompt
```
The latest UI redesign introduced a regression. For Sarah Johnson, the pre-interview UI
displayed Day 7, Day 8, Day 10, Day 12, Day 16 (raw mission list order) instead of her
actual recommendedFocusAreas: Day 29, Day 12, Day 28, Day 7.

ROOT CAUSE: The pre-interview fallback used selectedCandidate.missions.slice(0, 5)
instead of generateCandidateProfile().recommendedFocusAreas.

FIX:
1. Import generateCandidateProfile from @/lib/candidateProfiler in page.tsx.
2. Compute profileFocusAreas via useMemo from selectedCandidate.
3. Use profileFocusAreas everywhere (left panel + right panel pre-interview).
4. Post-interview: highlight the current active day from intelligence.currentDay.
5. Remove the missions.slice(0,5) fallback entirely.

ADDITIONAL IMPROVEMENTS (same commit):
- Replace empty center placeholder with a proper assessment briefing: candidate
  name, role, description, meta, and a prominent Start CTA button.
- Right panel pre-interview: Assessment Profile showing profileFocusAreas with
  numbered priority list + Adaptive Assessment description (no fake data).

DATA INTEGRITY: Never hardcode candidate names or day numbers. profileFocusAreas
derives entirely from generateCandidateProfile which is the same function the
backend uses. Changing the selected candidate immediately updates focus areas.

DO NOT CHANGE: candidateProfiler.ts, interviewEngine.ts, POST /api/interview,
Breeth, mastery, curriculum mapping, final feedback, off-topic handling.

GIT: git commit -m "fix: restore personalized assessment focus UI"
```

## Product Copy & Motion System Polish Implementation Prompt
```
Perform a final product-polish pass on the CURRENT Autonomous AI Interviewer frontend.

This task has TWO goals:
1. Make all visible product copy feel natural, human, and professional rather than AI-generated.
2. Add a restrained, smooth motion system that makes the interface feel premium and responsive.

DO NOT redesign the current visual system.

COPY/UX LANGUAGE CHANGES:
- Header: Subtitle -> "Technical assessment", status -> "Ready to start" / "Live interview".
- Candidate panel: `${yearsExperience} years experience · ${education}`, `${missionsCompleted} missions · ${missionsFirstTry} first-attempt passes · ${commitDays} active days`.
- Assessment Plan eyebrow: "INTERVIEW PLAN".
- Pre-interview briefing: "8 questions based on your cohort progress and interview performance. Questions will adjust as you answer.", button -> "Start interview →".
- Pre-interview right panel: "INTERVIEW PLAN", "Based on [Candidate]'s cohort progress", "WHAT TO EXPECT" (8 questions, Questions adjust based on your answers, Your progress is tracked throughout the interview, Previous answers can influence later questions).
- During interview right panel: "LIVE ASSESSMENT", "LATEST ANSWER", "STILL TO COVER", "WHY THIS QUESTION" (Profile, Goal, Next), "MEMORY" (Breeth Graph Memory).

MOTION SYSTEM:
- Entrance animation for workspace (`workspace-entrance` keyframes, 380ms ease-out).
- Smooth cross-fade transition on candidate switch.
- Transcript message entrance (`msg-fade-in` keyframes, 280ms).
- Evaluation block pop/fade (`eval-pop` keyframes, 250ms).
- Smooth interpolation on mastery bar fills and numeric values.
- Hover & active press states for buttons (`btn-start-main`, `btn-submit`).
- `@media (prefers-reduced-motion: reduce)` support for accessibility.

PRESERVE: All backend behavior, API contracts, candidateProfiler, Breeth integration, mastery logic, canonical curriculum mappings.

GIT: git commit -m "feat: polish interview UI copy and motion"
```

## Dark Developer Assessment Workspace Redesign Implementation Prompt
```
Redesign the Autonomous Interviewer UI as a dark, high-density professional developer assessment workspace. Use Linear's current information hierarchy and restrained navigation as the primary visual inspiration, Raycast's compact keyboard-oriented interaction model for controls and tabs, and the focused technical-interview experience of Karat as the product UX reference. Do not copy any product's UI.

Use a deep charcoal background, slightly lighter panels, subtle 1px borders, muted secondary text, and one restrained blue accent. No gradients, glassmorphism, glowing borders, neon colors, oversized rounded cards, excessive shadows, decorative AI graphics, or "AI slop" visual language.

Structure the application as a desktop workspace with three regions: a narrow left candidate/interview-plan sidebar, a dominant center interview workspace, and a narrow right assessment/evidence sidebar. Use thin dividers and grouped sections instead of putting every section inside a rounded card.

Add compact top-level tabs: Interview, Evidence, Candidate, Notes. The Interview tab is the default and contains the current question, transcript, response composer and progress. Evidence contains concept mastery, demonstrated/missing concepts and confidence. Candidate contains cohort history and profile signals. Notes contains interviewer notes. Tabs should look like compact desktop application tabs rather than large pill buttons.

Keep the center interview area visually dominant. Present each interviewer question as a clean assessment prompt with curriculum day/topic metadata above it. Candidate responses should appear as understated transcript entries rather than colorful chat bubbles.

Make the right sidebar an Assessment Console. Show current day, topic, mastery, latest signal, evidence coverage, unresolved concepts, next decision, and Breeth memory status. Use concise professional terminology such as "Assessment", "Evidence", "Latest signal", "Next decision", "Coverage", and "Memory". Avoid phrases like "AI Interviewer Agent", "AI Intelligence", "Deep-Dive / Advanced", and other marketing-style AI language.

The interface should feel like software built for engineers evaluating engineers: precise, quiet, dense, functional and trustworthy.

Add subtle motion only: 150–250ms transitions, smooth tab switching, question/response entrance, progress movement and mastery score transitions. Respect prefers-reduced-motion. No flashy animation.

Add keyboard-first interactions: Cmd/Ctrl+Enter to submit, Cmd/Ctrl+1–4 to switch tabs, Escape to cancel/close transient UI.

Preserve all existing interview functionality, API contracts, Breeth integration, adaptive engine, answer evaluation, mastery tracking and feedback generation. This is a visual/interaction redesign, not a rewrite of the assessment engine.

Before finishing, verify the UI at normal 100% browser zoom on a 1440px desktop viewport and ensure the primary interview question and response area remain immediately visible without excessive scrolling.

After implementation, run the full test suite and production build. If both pass, commit the changes with an appropriate conventional commit message and push to https://github.com/priyanshuchawda/autonomous-ai-interviewer.
```

## Product Simplicity & Information Hierarchy Redesign Implementation Prompt
```
Redesign the Autonomous Interviewer UI again, but this time prioritize PRODUCT SIMPLICITY and INFORMATION HIERARCHY over showing every piece of available data.

The current UI feels like an admin dashboard. I do NOT want that.
The product should feel like a real, premium technical interview application: focused, quiet, professional, developer-oriented, and extremely clean.

Think: modern developer tool, technical interview workspace, Linear-level restraint, IDE/editor-level focus, professional assessment software.
The interview itself is the product. Everything else is supporting information.

KEY ARCHITECTURAL CHANGES:
1. REMOVE INFORMATION OVERLOAD: Use progressive disclosure. Assessment intelligence lives in a compact right-side slide-over Assessment drawer.
2. STATE A — BEFORE THE INTERVIEW: Minimal start briefing (Candidate name, role, 8 questions · Adaptive technical assessment, Start interview button). No dashboard cards or statistics.
3. STATE B — ACTIVE INTERVIEW: Single focused workspace occupying 85-90% of the viewport width.
4. ELEGANT PROGRESS: Segmented line track below curriculum topic + Header progress counter (03 / 08).
5. PROMINENT QUESTION HERO: Large prominent typography (20-24px), plain INTERVIEWER label (no avatars or glowing chatbot bubbles).
6. EDITORIAL TRANSCRIPT: Understated transcript rows with subtle left borders for candidate responses.
7. COMFORTABLE COMPOSER: Large textarea, ⌘ Enter to submit, compact blue CTA button.
8. ASSESMENT DRAWER: Toggled by [Assessment] button in header. Contains topic, mastery %, latest signal, evidence coverage, next decision, Breeth memory, and interview plan.
9. COLOR PALETTE: Dark Linear-inspired theme (#0B0D10 background, #111419 surface, #15181E raised, #252A32 borders, #E7E9ED text, #4F8CFF accent blue).
10. PRESERVE FUNCTIONALITY: All backend logic, candidateProfiler, adaptive questioning, Breeth memory, answer evaluation, mastery tracking, feedback generation, and API contracts remain untouched.

GIT: git commit -m "refactor: simplify interview workspace ui"
```
