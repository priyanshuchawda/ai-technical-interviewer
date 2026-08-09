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
