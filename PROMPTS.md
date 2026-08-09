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
