# Prompt Log

## Product evolution brief — speech input reliability
CONTINUE FROM THE CURRENT AUTONOMOUS AI INTERVIEWER PROJECT.

Repository:
https://github.com/priyanshuchawda/autonomous-ai-interviewer

Current production deployment:
https://interview-cyan-zeta.vercel.app

We are NOT rebuilding the product from scratch.

The underlying interview engine is already strong and must be preserved.

The goal of this task is to evolve the product from:

"an impressive AI interview hackathon dashboard"

into:

"a polished, believable technical assessment product that feels like a real
professional interviewer is conducting the interview."

This is a PRODUCT + UX + INTERACTION redesign, not just a CSS redesign.

============================================================
IMPORTANT WORKFLOW RULE
============================================================

This is a substantial implementation prompt.

Before making changes:

1. Inspect the existing project.
2. Understand the current architecture.
3. Preserve existing working functionality.
4. Append this full prompt to PROMPTS.md.
5. Do NOT log secrets, API keys, tokens, cookies, environment values,
   credentials, or private data in PROMPTS.md.
6. Do NOT overwrite existing PROMPTS.md entries.

At the end:

- run all relevant tests
- run typecheck
- run production build
- run lint
- manually verify the main interview flow
- git status
- commit the complete change
- push to:

https://github.com/priyanshuchawda/autonomous-ai-interviewer

Use a focused commit message such as:

feat: evolve interview experience

Do not claim success unless the validation actually passes.

============================================================
0. CORE PRODUCT PRINCIPLE
============================================================

The most important design principle for this iteration:

MAKE THE INTELLIGENCE INVISIBLE UNTIL IT IS USEFUL.

The candidate should feel like they are interacting with an excellent
technical interviewer.

They should NOT feel like they are operating an AI dashboard.

The system currently contains sophisticated intelligence:

- candidate profiling
- curriculum grounding
- adaptive questioning
- answer evaluation
- topic mastery
- off-topic detection
- Breeth Graph Memory
- evidence aggregation
- coding assessment
- voice input
- interview intelligence
- Gemini-powered dialogue

All of that should remain.

But most of it should NOT constantly appear on the candidate's screen.

The UI should communicate the result of the intelligence rather than exposing
the machinery behind it.

The experience should feel closer to a premium technical assessment product
than to a generic AI chatbot.

Design references in terms of philosophy, not direct copying:

- Linear
- Vercel
- Stripe
- Notion
- modern developer tools
- premium recruiting/assessment software
- editorial interfaces with strong typography and restraint

Do NOT copy any of these products literally.

============================================================
1. INFORMATION ARCHITECTURE
============================================================

Reorganize the product conceptually into two experiences:

A. CANDIDATE EXPERIENCE
B. ASSESSOR / DEMO EXPERIENCE

The candidate experience should be extremely focused.

The assessor experience can expose the sophisticated intelligence.

------------------------------------------------------------
CANDIDATE EXPERIENCE
------------------------------------------------------------

During an active interview, the candidate primarily needs:

1. Who is interviewing them / product identity
2. Progress
3. Current topic
4. Current question
5. Response composer
6. Voice input
7. Optional coding task when relevant
8. Minimal live state

Nothing else should compete with the question.

------------------------------------------------------------
ASSESSOR EXPERIENCE
------------------------------------------------------------

The assessor/judge should be able to inspect:

- candidate profile
- adaptive reasoning signals
- topic mastery
- evidence
- demonstrated concepts
- missing concepts
- why a question was selected
- interview trajectory
- Breeth memory status
- coding evidence
- final assessment

But this information should live in:

- an Assessment drawer
- Evidence panel
- expandable sections
- post-interview report

It should NOT permanently occupy the main interview stage.

============================================================
2. REMOVE UI NOISE
============================================================

Audit the current interface and remove/reduce unnecessary persistent content.

Specifically:

REMOVE from the main active interview stage:

- large candidate profile cards
- large candidate statistics
- mission counts
- commit-day statistics
- first-attempt pass counts
- permanent "Assessment Profile" panel
- permanent Breeth Graph Memory panel
- large mastery dashboard
- repeated curriculum descriptions
- "Why this question?" as a permanent large card
- internal scoring details
- internal difficulty state
- excessive badges
- duplicated assessment entry points
- decorative numbered watermarks
- unnecessary "Day XX" references in candidate-facing content
- repeated product name
- generic AI status labels

Do not delete the underlying data.

Move useful information into appropriate drawers/panels.

The main interview screen should feel calm.

============================================================
3. ACTIVE INTERVIEW LAYOUT
============================================================

Design the active interview around a strong central column.

Use a restrained maximum width.

Do NOT make the content stretch across the entire screen.

Recommended hierarchy:

------------------------------------------------------------

HEADER

Autonomous Interviewer
optional candidate identity

                      03 / 08
                      ● Live
                      Assessment

------------------------------------------------------------

TOPIC CONTEXT

OBSERVABILITY

small, quiet, uppercase/mono label

------------------------------------------------------------

INTERVIEWER QUESTION

The question is the hero.

Large but readable typography.

Maximum line length should be controlled.

Avoid huge text that forces excessive scrolling.

Example:

"How would you instrument a production LLM pipeline so you can
identify slow or failing requests?"

The question should occupy the visual center.

------------------------------------------------------------

OPTIONAL CONTEXT

Only show a small contextual line when useful.

Example:

"Let's make this concrete."

Do not show internal curriculum metadata.

------------------------------------------------------------

RESPONSE COMPOSER

Large but restrained composer.

Example:

┌─────────────────────────────────────────────┐
│ Type your answer...                         │
│                                             │
│                                             │
│                                             │
│ ─────────────────────────────────────────── │
│ 🎙 Speak                         Send →      │
└─────────────────────────────────────────────┘

The composer should feel like a premium communication tool.

------------------------------------------------------------

Do not add unnecessary cards around this structure.

============================================================
4. QUESTION PRESENTATION
============================================================

The interviewer question should be the most important object on screen.

Do NOT render questions as ordinary chatbot bubbles.

Do NOT use:

AI INTERVIEWER AGENT
--------------------
huge chat bubble
--------------------

Instead use editorial presentation.

Possible structure:

INTERVIEWER

Observability

How would you instrument a production
LLM pipeline so you can identify slow
or failing requests?

This should feel like a human asking a question,
not a chatbot displaying a message.

Use:

- strong typography
- subtle label
- generous whitespace
- restrained border/surface
- no excessive gradients
- no glassmorphism overload
- no floating AI blobs
- no neon effects

============================================================
5. HUMAN INTERVIEWER BEHAVIOR
============================================================

This is as important as the visual redesign.

The Gemini interviewer currently sounds too scripted.

Do NOT generate openings like:

"Welcome Sarah, it is great to have you here today to discuss your
background and technical expertise."

Do NOT repeatedly say:

"That's a solid answer."
"That's a comprehensive approach."
"That's a great explanation."
"That's a practical start."
"Let's dive straight into..."
"Let's pivot to Day XX..."

These phrases make the system sound AI-generated.

The interviewer should behave like an experienced senior engineer.

Rules:

1. Ask ONE meaningful technical question at a time.
2. Keep questions concise.
3. Do not enumerate every concept being evaluated.
4. Do not mention internal curriculum day numbers.
5. Do not mention internal scoring.
6. Do not mention mastery percentages.
7. Do not announce adaptive reasoning.
8. Do not expose Breeth.
9. Do not reveal chain-of-thought.
10. Do not constantly praise the candidate.
11. Use the candidate's previous answer to determine the next probe.
12. Prefer natural follow-ups over arbitrary topic changes.
13. Challenge assumptions.
14. Ask for trade-offs.
15. Ask failure-mode questions.
16. Ask implementation questions when appropriate.
17. Move on once enough evidence has been collected.

Example:

Candidate:

"I'd use Prometheus counters for failures and histograms for latency."

Interviewer:

"Makes sense. What would you put in the logs that you wouldn't
put in the metrics?"

Candidate answers.

Interviewer:

"Okay. Now imagine a request goes through retrieval, two tool calls,
and an LLM invocation. How would you trace that request end-to-end?"

This is the target conversational style.

Short.
Natural.
Context-aware.
Technical.

Do not over-explain.

============================================================
6. INTERVIEWER PROMPT REWRITE
============================================================

Update the Gemini interviewer prompt so that the model receives:

- candidate role
- relevant candidate history
- current assessment topic
- current question objective
- previous answer
- previous evaluation
- unresolved concepts
- demonstrated concepts
- interview trajectory
- relevant memory context

But instruct the model to transform this internal context into
natural conversation.

The internal reasoning context and candidate-facing language must be
strictly separated.

Internal:

"Candidate skipped this topic and has not demonstrated X."

Candidate-facing:

"Let's explore that area a little further."

Never:

"You skipped this mission, so I'm testing you here."

------------------------------------------------------------
FOLLOW-UP STRATEGY
------------------------------------------------------------

Use a hierarchy:

STRONG ANSWER
→ deeper technical probe
→ trade-off
→ edge case
→ practical implementation
→ move on

PARTIAL ANSWER
→ targeted clarification
→ fill missing concept
→ practical example
→ reassess

WEAK ANSWER
→ simpler prerequisite
→ concrete scenario
→ reassess

UNKNOWN
→ simplify
→ foundational question
→ reassess

OFF-TOPIC
→ politely redirect
→ do NOT pivot to the unrelated topic

The interviewer should feel like it is listening.

============================================================
7. REMOVE CURRICULUM LANGUAGE FROM CANDIDATE VIEW
============================================================

Internally keep:

Day 29
Monitoring, Logging & Observability

But candidate-facing:

Observability

or:

Production observability

Do not say:

"Let's move to Day 29."

Instead:

"Let's talk about observability."

Similarly:

Day 28:
→ Deployment

Day 7:
→ Embeddings

Day 12:
→ Prompt engineering

The curriculum is an internal assessment framework.

It should not dominate the candidate experience.

============================================================
8. PROGRESS INDICATOR
============================================================

Replace excessive progress UI with a subtle indicator.

Use something like:

03 / 08

or:

Question 3 of 8

Do NOT use:

- giant numbers
- duplicated progress counters
- "01" decorative watermarks
- multiple progress components

Optionally use a very subtle segmented progress line.

Example:

● ● ● ○ ○ ○ ○ ○

or:

━━━━━━━━━━●━━━━━━━━

Keep it visually quiet.

============================================================
9. ASSESSMENT DRAWER
============================================================

Create ONE canonical Assessment entry point.

There must never be two "Assessment" buttons.

Clicking Assessment opens a right-side drawer.

The drawer should contain:

CURRENT SIGNAL

Strong

TOPIC

Observability

MASTERY

74%

EVIDENCE

✓ Structured logging
✓ Latency metrics
✓ Request correlation

MISSING

• Alerting strategy

WHY THIS QUESTION

"Probing an unresolved observability concept."

MEMORY

Breeth
Context available

TRAJECTORY

Current:
Observability

Next:
Deployment

The drawer should be:

- compact
- scrollable
- visually quiet
- clearly separated from candidate content

It is primarily for judges/assessors.

The candidate should not need to interact with it.

============================================================
10. EVIDENCE VIEW
============================================================

Add an Evidence section inside the Assessment experience.

It should expose structured evidence without overwhelming the screen.

Example:

EVIDENCE

Observability
──────────────

Strong
78%

Demonstrated

✓ Structured logging
✓ Latency instrumentation
✓ Request correlation

Still unproven

○ Alerting
○ Failure recovery

Source:

Question 2
Candidate response

Do NOT show raw internal scoring algorithms.

Do NOT expose hidden reasoning.

Only show observable evidence.

============================================================
11. CANDIDATE PROFILE
============================================================

Before interview:

Show useful candidate context.

Example:

Sarah Johnson
Senior Data Engineer

9 years experience
MS Computer Science

30 missions
28 active days

This is appropriate on the briefing screen.

During the active interview:

Collapse it to:

Sarah Johnson
Senior Data Engineer

Do not keep a large profile panel consuming space.

Allow the assessor to open candidate details if necessary.

============================================================
12. BRIEFING SCREEN
============================================================

Redesign the start screen to feel like an assessment briefing.

Example:

Sarah Johnson

Senior Data Engineer

TECHNICAL ASSESSMENT

8 questions
Adaptive interview
Discussion + practical exercises

"Questions adjust based on your answers."

[ Begin interview → ]

Do not repeat:

"Autonomous AI Interviewer"

inside the card if it is already in the header.

Do not explain the entire AI architecture.

Do not show five panels before the interview starts.

============================================================
13. CODING TASK INTEGRATION
============================================================

Coding must NOT become a separate mode that interrupts the interview.

It should be an escalation inside the conversation.

Correct flow:

Conceptual question
→ candidate explains
→ interviewer detects opportunity
→ practical probe
→ coding task
→ implementation evidence
→ interviewer continues

Example:

Interviewer:

"How would you calculate similarity between two embedding vectors?"

Candidate answers.

Interviewer:

"Let's make that concrete. Implement the similarity calculation."

Then open coding workspace.

------------------------------------------------------------
CODING TASK UX
------------------------------------------------------------

Use a focused coding workspace.

Show:

TASK

Implement cosine similarity for two embedding vectors.

REQUIREMENTS

- handle valid vectors
- return a numeric similarity
- handle invalid input appropriately

EDITOR

[ code ]

RESULT

✓ Passed
or
× Failed

EVIDENCE

"Candidate implemented vector normalization and dot-product similarity."

[ Return to interview ]

Do not turn every interview question into a coding problem.

Coding should appear only when:

- the topic naturally supports implementation
- the candidate has demonstrated enough conceptual understanding
- the interview engine determines practical evidence would be useful

Target roughly 1–2 coding tasks in an 8-question interview,
not 4–5.

============================================================
14. CODING TASK TYPES
============================================================

Keep tasks small and practical.

Good examples:

Embeddings:
- cosine similarity
- vector normalization
- batching logic

RAG:
- document chunking
- retrieval ranking
- metadata filtering

Observability:
- structured logger
- metric instrumentation
- retry wrapper

APIs:
- validation
- error handling
- pagination

Deployment:
- configuration parsing
- health-check logic

Do NOT turn the interview into LeetCode.

The goal is engineering judgment and implementation ability.

============================================================
15. VOICE INTERACTION
============================================================

Voice input must feel first-class.

The response composer should have:

[ 🎙 Speak ]

When activated:

[ ● Listening 00:12 ]

Use a subtle waveform or activity indicator.

Do NOT use exaggerated animations.

States:

IDLE
→ Speak

LISTENING
→ Listening + timer

PROCESSING
→ Transcribing...

TRANSCRIBED
→ editable transcript

ERROR
→ "Couldn't access the microphone."

UNSUPPORTED
→ "Voice input isn't supported in this browser."

The transcript must remain editable.

Never auto-submit the transcription.

Candidate must explicitly submit.

------------------------------------------------------------
VOICE DESIGN
------------------------------------------------------------

The microphone button should be integrated into the composer.

Do not create a giant separate voice card.

When active:

- accent becomes green
- mic icon changes state
- subtle waveform
- timer appears
- button can stop recording

After transcription:

"Review your answer"

Then:

[ editable text ]

[ Send → ]

============================================================
16. RESPONSE COMPOSER
============================================================

Make the composer feel like a modern professional editor.

Structure:

┌──────────────────────────────────────────────┐
│                                              │
│ Type your answer...                          │
│                                              │
│                                              │
│                                              │
│──────────────────────────────────────────────│
│ 🎙 Speak                         Send →       │
└──────────────────────────────────────────────┘

Requirements:

- comfortable typing area
- good focus state
- keyboard shortcut
- clear disabled state
- clear submitting state
- voice integration
- accessible labels
- mobile-friendly behavior

Do not use a giant empty textarea surrounded by unnecessary labels.

============================================================
17. INTERVIEW TRAJECTORY
============================================================

Add a subtle internal trajectory representation.

Do not make it another giant dashboard.

Example:

03 / 08

Observability
      ↓
Deployment
      ↓
Embeddings
      ↓
RAG

Internally track:

- assessed
- current
- pending
- reinforced
- deep dive
- coding

Expose only a minimal representation to the candidate.

The detailed trajectory belongs in Assessment.

============================================================
18. LIVE STATES
============================================================

Introduce polished interaction states.

When Gemini is generating:

"Thinking..."

or:

"Preparing the next question..."

Use a subtle animated indicator.

Do not show:

"AI INTERVIEWER AGENT PROCESSING..."

When answer is being evaluated:

"Evaluating response..."

When coding is being evaluated:

"Checking implementation..."

When voice is processing:

"Transcribing..."

Keep each state short.

============================================================
19. MOTION SYSTEM
============================================================

Use motion sparingly.

The product should feel alive but not animated for the sake of animation.

Use:

- question fade/slide in
- response submission transition
- subtle panel transitions
- drawer slide
- mastery number transition
- progress transition
- voice waveform
- live status pulse
- button hover/press feedback

Avoid:

- bouncing cards
- excessive spring animations
- parallax
- floating blobs
- animated gradients everywhere
- glowing borders everywhere
- large decorative motion

All animations must support:

prefers-reduced-motion

When reduced motion is enabled:

- disable decorative animation
- preserve functionality
- use instant/short transitions

============================================================
20. VISUAL DESIGN
============================================================

Use the existing dark direction, but make it much more refined.

Primary theme:

Dark technical/editorial interface.

Palette should be restrained.

Approximate direction:

Background:
#080B0F

Surface:
#0E1319

Elevated:
#121922

Border:
#202832

Primary:
#F3F5F7

Secondary:
#8D98A6

Green accent:
#65E6A3

Use green primarily for:

- live
- active
- success
- listening
- completion
- positive evaluation

Do NOT turn every component green.

------------------------------------------------------------
REMOVE VISUAL NOISE
------------------------------------------------------------

Do NOT use:

- giant decorative circles
- random blobs
- excessive gradients
- glowing neon cards
- excessive glassmorphism
- giant shadows
- excessive rounded cards
- multiple competing accent colors

The design should feel engineered.

============================================================
21. TYPOGRAPHY
============================================================

Use a professional typography system.

Headings:

strong modern sans-serif

Body:

high readability

Technical labels:

optional mono font

Do NOT use mono everywhere.

Use uppercase/mono only for small metadata labels such as:

INTERVIEWER
OBSERVABILITY
03 / 08
LIVE

Do not turn every sentence into a technical label.

Avoid overly huge typography.

The question should be prominent but still fit naturally on normal laptop
screens.

============================================================
22. HEADER
============================================================

Keep the header extremely simple.

Left:

Autonomous Interviewer

optional:
Sarah Johnson · Senior Data Engineer

Center/right:

03 / 08
● Live
Candidate selector

Assessment

Only ONE Assessment entry point.

Do not have:

Assessment
Assessment

Do not show redundant status labels.

Do not display unnecessary navigation tabs unless they have actual behavior.

============================================================
23. REMOVE THE DECORATIVE ORB
============================================================

The large decorative circular/gradient shape currently appearing in the
upper-right area should be removed.

It does not contribute meaningfully to the product.

The visual identity should come from:

- typography
- spacing
- surfaces
- borders
- green accent
- subtle motion

not decorative shapes.

============================================================
24. RESPONSIVE DESIGN
============================================================

Desktop:

Primary centered interview workspace.

Assessment opens as right drawer.

Mobile/tablet:

- candidate details collapse
- assessment becomes full-screen drawer/modal
- question remains primary
- composer remains accessible
- coding editor becomes stacked
- header simplifies

Do not simply shrink the desktop layout.

Actually reflow the hierarchy.

============================================================
25. FINAL INTERVIEW REPORT
============================================================

Make the final assessment feel like a professional technical hiring report.

Do NOT generate generic AI prose.

Use:

SARAH JOHNSON
Senior Data Engineer

TECHNICAL ASSESSMENT

Overall:
Strong

------------------------------------------------

OBSERVABILITY
Strong
74%

PROMPT ENGINEERING
Strong
82%

DEPLOYMENT
Developing
61%

EMBEDDINGS
Strong
79%

------------------------------------------------

WHAT STOOD OUT

• Strong understanding of structured observability
• Good production trade-off reasoning
• Clear explanation of retrieval architecture

AREAS TO PROBE

• Alerting strategy
• Failure recovery
• Distributed tracing

PRACTICAL EVIDENCE

✓ Completed cosine similarity task
✓ Implemented structured logging
✓ Explained hybrid retrieval

RECOMMENDATION

Proceed to a deeper systems interview.

------------------------------------------------

Keep this concise.

Do not generate five paragraphs of generic AI feedback.

============================================================
26. ASSESSMENT CONFIDENCE
============================================================

If supported by the existing evidence model, expose a simple confidence
indicator in the assessor report.

Example:

Evidence confidence
High

This must be based on actual evidence coverage.

Do not invent confidence.

============================================================
27. BREETH MEMORY
============================================================

Preserve Breeth exactly as a backend intelligence capability.

Do NOT make Breeth a dominant candidate-facing UI element.

Candidate does not need to know:

"Breeth Graph Memory retrieved X nodes."

Instead, the result should simply be:

a more context-aware interviewer.

In the assessor drawer, it can be shown quietly:

MEMORY
Breeth
Context available

Do not expose API details.

============================================================
28. INTERVIEW ENGINE PRESERVATION
============================================================

Do NOT break or remove:

candidateProfiler
adaptiveQuestioning
responseClassifier
answerEvaluator
feedbackGenerator
curriculum mapping
Breeth memory
Gemini integration
coding tasks
voice input
CSRF
security headers
rate limiting
session storage
health endpoint
metrics endpoint

The redesign must consume the existing intelligence state rather than
duplicating it.

============================================================
29. COMPONENT ARCHITECTURE
============================================================

Before writing a giant page component, inspect the current structure.

Where appropriate, separate concerns into components such as:

InterviewHeader
InterviewProgress
QuestionStage
ResponseComposer
VoiceInput
CodingTask
AssessmentDrawer
EvidencePanel
CandidateBrief
InterviewReport
LiveStatus

Do not over-componentize trivial elements.

The goal is maintainability.

============================================================
30. STATE MANAGEMENT
============================================================

Do not create duplicated sources of truth.

The interview engine remains authoritative for:

- current question
- current day
- evaluation
- mastery
- trajectory
- coding evidence
- completion

UI state should only manage presentation concerns such as:

- drawer open/closed
- voice state
- composer state
- coding panel open/closed
- theme

============================================================
31. THEME
============================================================

Preserve the existing theme system.

Primary polished mode:

Dark

Accent:

Green

If Light mode exists, keep it functional.

Do not introduce a large number of theme variants.

The dark theme should be the strongest presentation for the hackathon demo.

============================================================
32. ACCESSIBILITY
============================================================

Ensure:

- keyboard navigation
- visible focus states
- proper button labels
- textarea labels
- voice controls accessible
- drawer can be closed with Escape
- sufficient contrast
- reduced motion support
- screen-reader friendly status messages

Do not sacrifice accessibility for aesthetics.

============================================================
33. PERFORMANCE
============================================================

Avoid:

- large animation libraries if unnecessary
- unnecessary re-renders
- polling
- repeated API calls
- duplicate Gemini calls
- unnecessary Breeth queries

Keep the current bounded timeouts and resilient external API behavior.

============================================================
34. TESTING
============================================================

Add/update tests for the new UX behavior.

At minimum verify:

1. Candidate briefing renders correctly.
2. Active interview renders only essential information.
3. Assessment drawer opens exactly once.
4. No duplicate Assessment buttons.
5. Curriculum day numbers are not exposed in candidate-facing interviewer
   dialogue.
6. Interviewer prompt enforces concise conversational behavior.
7. Voice states render correctly.
8. Transcript remains editable before submission.
9. Coding task only appears when relevant.
10. Coding evidence is incorporated into interview evidence.
11. Assessment drawer shows current evidence.
12. Interview trajectory updates correctly.
13. Final report renders structured evidence.
14. Reduced-motion mode works.
15. Existing adaptive interview tests still pass.
16. Existing security tests still pass.
17. Existing API tests still pass.
18. Existing coding tests still pass.

Do NOT weaken existing tests.

============================================================
35. MANUAL QA CHECKLIST
============================================================

After implementation, manually test:

A. OPENING

- Select Sarah Johnson.
- Opening briefing feels concise.
- No unnecessary panels.
- Start button is obvious.

B. INTERVIEW

- Start interview.
- Question is immediately understandable.
- No "Welcome Sarah..." generic filler.
- No curriculum day number in spoken interviewer text.
- Question feels like a real technical interview.

C. ANSWER

Type a strong answer.

Verify:

- natural follow-up
- no repetitive praise
- no unnecessary topic pivot

D. UNKNOWN

Answer:

"I don't know."

Verify:

- interviewer stays on topic
- asks simpler question
- does not punish or embarrass candidate

E. OFF TOPIC

Answer a logging question with an embeddings explanation.

Verify:

- system identifies mismatch
- interviewer redirects naturally
- does not switch to embeddings

F. STRONG ANSWER

Verify:

- interviewer deepens the topic
- does not immediately jump to a random curriculum day

G. VOICE

- click Speak
- microphone state appears
- timer/waveform works
- stop recording
- transcript appears
- edit transcript
- submit manually

H. CODING

Reach a relevant topic.

Verify:

- coding task appears naturally
- task is short
- implementation is relevant
- result becomes evidence
- interview continues afterward

I. ASSESSMENT

Open Assessment.

Verify:

- only one entry point
- drawer is clean
- evidence is useful
- mastery is visible
- why-question is concise
- memory is secondary

J. FINAL REPORT

Complete an interview.

Verify:

- report is concise
- evidence-backed
- strengths are grounded
- gaps are grounded
- coding evidence appears when applicable
- recommendation is useful

============================================================
36. DO NOT OVERDESIGN
============================================================

This is critical.

If you are uncertain whether a UI element should exist:

REMOVE IT.

The product should have fewer things visible,
not more.

Every element must answer:

"What decision does this help the user make?"

If the answer is "it shows that the AI is sophisticated,"
do not show it.

The sophistication should come from the interaction.

============================================================
37. SUCCESS CRITERIA
============================================================

The redesign is successful only if all of these are true:

1. The active interview has a clear visual hierarchy.
2. The question is the primary focus.
3. The candidate does not see internal AI machinery.
4. Assessment intelligence remains available to judges.
5. The interviewer sounds human.
6. Questions are concise.
7. Follow-ups respond to actual answers.
8. Curriculum grounding remains intact.
9. Coding feels like a natural practical extension.
10. Voice input feels native to the composer.
11. Green is used as an accent, not decoration.
12. Motion is subtle.
13. There is exactly one Assessment entry point.
14. There are no decorative number watermarks.
15. There is no giant decorative orb.
16. There are no redundant information panels.
17. The final report feels like hiring software.
18. The application works on laptop-sized screens without excessive scrolling.
19. Existing backend intelligence is preserved.
20. Existing security is preserved.
21. Existing tests remain green.
22. Production build remains successful.

============================================================
38. MOST IMPORTANT DESIGN TEST
============================================================

Before finishing, look at the application with this question:

"If I removed the words AI, Gemini, Breeth, adaptive, autonomous, and
curriculum from the interface, would this still look like a believable
professional technical assessment product?"

The answer should be YES.

The product should not need to advertise that it is AI-powered.

The interaction should prove it.

============================================================
39. PROMPTS.MD
============================================================

Append this complete implementation prompt to:

PROMPTS.md

Do not remove existing entries.

Do not include:

- API keys
- secrets
- tokens
- environment values
- cookies
- private credentials

Only log the substantial implementation prompt itself.

============================================================
40. FINAL VALIDATION + GIT
============================================================

Run:

npm test

npm run typecheck

npm run lint

npm run build

If Playwright is configured and practical:

npm run test:e2e

Then manually verify the complete interview.

Check:

git status

Then commit:

git add .
git commit -m "feat: evolve interview experience"

Then push:

git push origin main

Repository:

https://github.com/priyanshuchawda/autonomous-ai-interviewer

If push fails because of authentication/branch configuration, do NOT
pretend it succeeded. Report the exact failure.

============================================================
FINAL REPORT
============================================================

When finished, report:

1. UX architecture changes
2. Interviewer behavior changes
3. Assessment drawer changes
4. Voice changes
5. Coding-flow changes
6. Final report changes
7. Motion changes
8. Removed UI clutter
9. Tests
10. Typecheck
11. Lint
12. Build
13. E2E result if run
14. Commit hash
15. Push status

Do not provide a vague "UI improved" summary.

Explain exactly what changed.

