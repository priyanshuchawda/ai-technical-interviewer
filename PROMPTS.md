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



## Implementation brief — opportunistic coding

CONTINUE DEVELOPMENT OF THE CURRENT AUTONOMOUS AI INTERVIEWER.

IMPORTANT:
Do NOT redesign the application.
Do NOT replace the existing interview engine.
Do NOT remove existing deterministic evaluation, adaptive questioning,
Breeth memory, voice, security, or final assessment functionality.

We are implementing ONE final major behavioral improvement:

MAKE CODING AN OPPORTUNISTIC PART OF THE TECHNICAL INTERVIEW, NOT A
PREDEFINED CODING TASK THAT APPEARS FOR EVERY RELEVANT CURRICULUM TOPIC.

The desired experience is:

    conversation
        ↓
    candidate technical answer
        ↓
    evidence evaluation
        ↓
    interviewer decides whether practical validation is useful
        ↓
    IF useful:
        "Let's make that concrete."
        ↓
    small contextual coding task
        ↓
    candidate implements
        ↓
    deterministic evaluation
        ↓
    coding evidence
        ↓
    interviewer discusses implementation
        ↓
    interview continues

Coding must feel like something a real technical interviewer would
introduce naturally.

============================================================
CURRENT PROBLEM
============================================================

The current UI can expose an "Implementation check" / "Open coding task"
for relevant curriculum topics.

This makes coding feel attached to the curriculum rather than attached
to the conversation.

For example:

Question:
"How would you design observability for an LLM application?"

Candidate:
"I'd use correlation IDs, distributed tracing, latency metrics..."

Current behavior may immediately expose:

"Implementation check
Test this concept in code
Optional · relevant to this topic"

We do NOT want coding to appear automatically simply because the topic
has a coding task.

Instead:

The interviewer should first evaluate the candidate's answer.

Then determine whether a practical implementation would provide useful
additional evidence.

============================================================
CORE PRODUCT PRINCIPLE
============================================================

CODING IS OPPORTUNISTIC, NOT MANDATORY.

The candidate should experience:

    technical conversation
        ↓
    challenge / follow-up
        ↓
    practical validation ONLY WHEN USEFUL

NOT:

    curriculum topic
        ↓
    coding task
        ↓
    curriculum topic
        ↓
    coding task

For a normal 8-question interview, approximately ONE coding assessment
is expected in a typical run, with zero being completely valid if the
conversation does not naturally justify one.

Do NOT force coding into every interview.

Do NOT force coding into every topic.

Do NOT show a coding task merely because a curriculum day has a coding
task associated with it.

============================================================
WHEN CODING SHOULD BE OFFERED
============================================================

A coding task should be considered when ALL/most of the following are
true:

1. The candidate has made a concrete technical claim.
2. The claim is practically testable.
3. Implementation would provide stronger evidence than another purely
   conversational question.
4. The task can be kept small and focused.
5. The task is directly connected to what the candidate just discussed.
6. The candidate has not already completed a coding assessment recently
   in the same interview unless there is a strong reason.

Examples:

OBSERVABILITY

Candidate:
"I'd use structured logging and correlation IDs to trace requests."

Possible interviewer behavior:

"That's a good approach. Let's make that concrete for a moment. Can you
instrument this small Python function to capture latency and failures?"

EMBEDDINGS

Candidate:
"I'd calculate cosine similarity between normalized vectors."

Possible practical check:

"Let's make that concrete. Can you implement cosine similarity for two
vectors?"

RAG

Candidate:
"I'd chunk documents based on semantic boundaries and overlap."

Possible practical check:

"Can you implement a small chunking function that preserves overlap
between chunks?"

RETRY / API DESIGN

Candidate:
"I'd use exponential backoff for transient failures."

Possible practical check:

"Can you implement a small retry wrapper with exponential backoff?"

KUBERNETES

Do NOT automatically create a large Kubernetes coding task.

Prefer a small implementation or configuration reasoning task only if
it genuinely provides useful evidence.

============================================================
WHEN CODING SHOULD NOT BE OFFERED
============================================================

Do NOT create a coding task when:

- The candidate's answer is purely conceptual and another question would
  better evaluate their reasoning.
- The topic is not meaningfully implementable in a small task.
- The candidate is struggling and needs a prerequisite/recovery question.
- The candidate is already being evaluated through a strong practical
  signal.
- A coding task would interrupt an important conversational thread.
- The interview has already gathered sufficient practical evidence.
- The task would require a large project or excessive setup.

For example:

Candidate:
"I'm not sure how distributed tracing works."

The interviewer should NOT immediately respond:

"Here's a coding task."

Instead:

"That's okay. Let's start simpler. What information would you want to
attach to a request so you could follow it across services?"

Recovery first.

============================================================
GEMINI'S ROLE
============================================================

Gemini should help generate contextual coding tasks when the interviewer
decides that practical validation is appropriate.

Gemini should NOT decide the final correctness of candidate code.

Gemini should generate a STRUCTURED coding-task specification.

Create a strict schema, validated with Zod, approximately:

{
  "title": string,
  "language": "python" | "javascript" | "typescript",
  "context": string,
  "whyThisTask": string,
  "instructions": string[],
  "starterCode": string,
  "functionSignature": string,
  "evaluationCriteria": string[],
  "difficulty": "basic" | "intermediate" | "advanced",
  "estimatedMinutes": number
}

The exact schema can be adjusted to fit the existing codebase.

The generated task MUST:

- be directly grounded in the current conversation
- test one technical concept
- be small enough for approximately 5–15 minutes
- have an explicit function/interface contract
- have deterministic evaluation criteria
- avoid arbitrary external dependencies
- avoid requiring internet access
- avoid requiring API credentials
- avoid requiring a large project
- be safe to run through the existing deterministic/static evaluator

============================================================
IMPORTANT: GEMINI MUST NOT GENERATE UNSAFE EXECUTION
============================================================

Do NOT introduce arbitrary remote code execution.

The existing deterministic/static coding evaluation architecture must
remain isolated.

Generated code must be evaluated through the existing safe mechanism.

Do not create a system where Gemini-generated code is blindly executed
on the Next.js server.

If a generated task cannot safely be evaluated deterministically,
reject it and use a known-good fallback task.

============================================================
TASK VALIDATION / FALLBACK
============================================================

Because Gemini-generated coding tasks can be malformed, implement a
validation pipeline:

Gemini
  ↓
Structured JSON
  ↓
Zod validation
  ↓
Task contract validation
  ↓
Evaluator compatibility validation
  ↓
Candidate UI

If generation fails, times out, returns malformed data, or creates a task
that cannot be deterministically evaluated:

    use an existing known-good coding task

The interview must never fail because coding-task generation failed.

Coding is optional.

============================================================
EXISTING CODING TASKS
============================================================

Do NOT delete the current predefined coding tasks.

Convert them into:

1. Known-good fallback tasks.
2. Regression fixtures.
3. Examples that help define the generated-task contract.

The existing tasks should remain deterministic and tested.

============================================================
CANDIDATE-FACING UX
============================================================

Remove the feeling that coding is permanently attached to every question.

Do NOT show:

"Implementation check
Test this concept in code
Optional · relevant to this topic"

on every relevant question.

Instead, only show a coding opportunity after the interviewer has
actually decided it is useful.

The interaction should feel like:

Interviewer:

"That's a good approach. Let's make that concrete for a moment."

Then a compact action/card:

    Practical check
    5–10 min · Python

    Instrument a production request

    Based on what you just described, implement the missing
    instrumentation around this function.

    [Start implementation]

The wording should feel like a real interviewer, not an AI product.

Avoid:

- "AI-powered"
- "Unlock your technical potential"
- "Mastery"
- "Assessment intelligence"
- "Let's test your knowledge"
- excessive badges
- excessive explanation
- generic AI marketing copy

============================================================
CODING TASK PRESENTATION
============================================================

When opened, the coding workspace should clearly explain:

1. WHY this task is being introduced.
2. WHAT the candidate needs to implement.
3. WHAT interface/function they should preserve.
4. WHAT technical behaviors are being evaluated.
5. HOW MUCH TIME it should approximately take.

Example:

--------------------------------------------------

Practical check

Instrument a production request

Why:
You mentioned structured logging and latency measurement. Let's make
that concrete with a small implementation.

Your task:
Add instrumentation around the provided process_request() function.

Requirements:
• Measure execution time.
• Emit a structured completion event.
• Record failures without swallowing the original exception.

Time:
5–10 minutes

Python

[ code editor ]

[Run checks]

--------------------------------------------------

Do NOT expose implementation details such as:

"deterministic runner"

"static analyzer"

"internal evaluator"

Those are system details, not candidate-facing content.

============================================================
FUNCTION CONTRACT
============================================================

This is important because a previous manual test exposed a bug where:

3/4 checks passed

✓ timing measurement
✓ structured event
✓ failure path
✗ function signature

The candidate had correctly implemented:

def process_request():

but the evaluator expected an undocumented signature.

This MUST NOT happen.

Every coding task must have an explicit contract.

If the evaluator checks a function signature:

- the starter code must contain it
- the candidate-facing instructions must make it clear
- the generated task schema must contain it
- the deterministic evaluator must use the same contract

Add regression tests ensuring a correct implementation of the displayed
task requirements passes all checks.

============================================================
DETERMINISTIC EVALUATION
============================================================

Keep deterministic evaluation as the source of truth for correctness.

Gemini may generate:

- task description
- context
- starter code
- evaluation criteria

But Gemini must NOT determine:

"candidate passed"

or

"candidate failed"

The deterministic evaluator determines:

- passed requirements
- failed requirements
- evidence
- implementation score
- missing concepts

Example:

Candidate implementation:

✓ latency measurement
✓ structured logging
✗ exception propagation

Result:

PARTIAL

Missing:
Exception propagation

This becomes structured interview evidence.

============================================================
CODING RESULT → INTERVIEW EVIDENCE
============================================================

This is one of the most important requirements.

A coding result must NOT remain a UI-only event.

When the candidate submits the coding task, create structured evidence
containing at minimum:

- task title
- concept tested
- language
- result
- score
- passed requirements
- failed requirements
- demonstrated concepts
- missing concepts
- execution/check metadata where useful

Store it in the interview session.

The next interviewer turn must have access to this evidence.

============================================================
CODING → FOLLOW-UP CONVERSATION
============================================================

After the coding task, the interviewer should naturally discuss the
implementation.

For example:

Candidate passes:

"Your implementation handles the request path correctly. How would you
change it if the telemetry backend became unavailable?"

Candidate misses exception handling:

"Your timing and logging are solid. One thing I'd change is the exception
path. How would you preserve the original failure after recording it?"

This should feel like a human interviewer reviewing the candidate's work.

Do NOT simply say:

"Your coding score is 67%."

The candidate should experience a conversation.

============================================================
ADAPTIVE ENGINE INTEGRATION
============================================================

Coding evidence must become another evidence source alongside:

- spoken answer evidence
- candidate history
- Breeth memory
- topic mastery
- previous evaluations

The adaptive engine can use coding evidence when selecting the next
question.

Example:

spoken answer
    ↓
candidate claims concept
    ↓
coding validation
    ↓
implementation passes
    ↓
concept becomes stronger evidence

OR:

spoken answer
    ↓
coding validation
    ↓
implementation fails
    ↓
concept remains partially demonstrated
    ↓
targeted follow-up

Do NOT automatically change curriculum topics because a coding task
exists.

Do NOT let coding override strong contradictory conversational evidence
without reason.

============================================================
CODING FREQUENCY
============================================================

Coding should be controlled by the interview state.

For an 8-turn interview:

- 0 coding tasks is valid.
- 1 coding task is typical.
- 2 may occur if strongly justified.
- Do not repeatedly offer coding every turn.

Add explicit state such as:

codingAssessmentsCompleted

or equivalent.

Prevent repeated coding offers for the same topic unless intentionally
requested by the adaptive engine.

============================================================
INTERVIEWER PROMPTING
============================================================

Improve interviewer prompts so coding is introduced conversationally.

Preferred:

"That's a good approach. Let's make that concrete for a moment."

"Can you implement a small version of that?"

"Rather than just discussing it, I'd like to see how you'd approach the
implementation."

Avoid:

"Let's test your knowledge with a coding assessment."

"Your next coding challenge is..."

"Now you must complete an implementation task."

============================================================
VOICE
============================================================

Preserve the existing voice-to-text system.

Coding must work equally well after a spoken answer.

Do not break:

- SpeechRecognition
- interim transcript
- editable transcript
- microphone permission handling
- error states
- manual submission

============================================================
ASSESSOR VIEW
============================================================

The assessor should be able to see coding evidence separately from
spoken-answer evidence.

For example:

PRACTICAL EVIDENCE

Instrument a production request
Python · 4/4 checks passed

Demonstrated:
✓ latency measurement
✓ structured logging
✓ failure handling

Confidence:
High

If partial:

2/4 checks passed

Missing:
• exception propagation

Do not expose unnecessary internal implementation details.

============================================================
FINAL FEEDBACK
============================================================

Coding evidence must feed into the existing evidence-backed feedback
generator.

The final report should be able to distinguish:

Spoken evidence

and

Practical evidence

A candidate should not be called strong at a concept merely because they
said the right words if the practical implementation contradicted that
claim.

Likewise, a coding failure should not erase strong conceptual knowledge.

The final assessment should synthesize both evidence types.

============================================================
TESTING
============================================================

Add focused tests.

At minimum:

1. Coding is NOT automatically offered for every relevant topic.

2. Strong conceptual answer can trigger a coding opportunity when
   practical validation is appropriate.

3. Weak/unknown answer does not immediately trigger coding when recovery
   is more appropriate.

4. Coding task is generated from the current conversation/topic.

5. Generated task passes Zod/schema validation.

6. Invalid Gemini-generated task falls back safely.

7. Coding task has an explicit function/interface contract.

8. Correct implementation passes deterministic evaluation.

9. Partial implementation produces partial evidence.

10. Coding evidence is stored in session state.

11. Coding evidence reaches the next interviewer prompt.

12. Successful coding evidence can support a deeper follow-up.

13. Failed coding evidence can trigger a targeted follow-up.

14. Coding is not repeatedly offered every turn.

15. Coding evidence appears in the assessor drawer.

16. Coding evidence appears correctly in final feedback.

17. Existing coding tasks still work as deterministic fallback fixtures.

18. No arbitrary candidate code is remotely executed.

============================================================
DO NOT BREAK EXISTING FEATURES
============================================================

Preserve all existing functionality:

- Candidate profiler
- Adaptive questioning
- Strong/partial/weak/unknown/off-topic classification
- Same-topic deep probing
- Recovery behavior
- Off-topic redirect
- Canonical curriculum mapping
- Topic mastery
- Breeth Graph Memory
- Gemini interviewer
- Evidence-backed feedback
- Voice transcription
- Security
- CSRF
- rate limiting
- session management
- coding workspace
- dark/light green theme
- assessor drawer
- final technical assessment
- Vercel deployment architecture

============================================================
IMPLEMENTATION PROCESS
============================================================

Before editing:

1. Inspect current codingTasks.ts.
2. Inspect current coding evaluator.
3. Inspect interviewEngine.ts.
4. Inspect interview state/types.
5. Inspect prompts.ts.
6. Inspect page.tsx coding UI.
7. Inspect existing coding tests.
8. Inspect existing adaptive trajectory tests.

Then design the smallest architecture that satisfies this specification.

Do NOT rewrite the entire application.

Do NOT introduce a new state-management library.

Do NOT introduce a new database.

Do NOT add arbitrary dependencies unless genuinely necessary.

============================================================
VALIDATION
============================================================

Run focused tests first.

Then:

npm run typecheck

Then:

npm run lint

Then:

npm run build

Only after focused tests are stable should you run the full test suite.

Do not make real Gemini/Breeth calls from deterministic unit tests.

Use mocks/fixtures.

If the full suite exceeds the environment timeout, report the exact
result rather than endlessly increasing timeouts.

============================================================
PROMPTS.MD
============================================================

Append this implementation brief to PROMPTS.md.

Do not put API keys, secrets, tokens, .env values, or credentials in
PROMPTS.md.

============================================================
GIT
============================================================

Do not reset or discard existing work.

Commit only the focused implementation changes.

Suggested commit:

feat: make coding adaptive to interview evidence

Push only if repository authentication is available.

If push fails, report the exact error.

============================================================
FINAL REPORT
============================================================

At the end report:

- files changed
- architecture implemented
- how coding decisions are made
- how Gemini-generated tasks are validated
- how deterministic evaluation works
- how coding evidence reaches the adaptive engine
- how coding affects follow-up questions
- tests added
- focused test results
- typecheck
- lint
- build
- git status
- commit hash
- push status

Do not claim success for anything you did not actually verify.
