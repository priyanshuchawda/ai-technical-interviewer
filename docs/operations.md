# Operations

## Deploy

- **Vercel:** connect this repo, set env vars in the project settings, deploy `main`.
- **Node host:** `npm ci && npm run build && npm start`.
- Health check: `GET /api/health`.

## Secrets

Store keys in the platform secret manager or host env, never in git:

- `GEMINI_API_KEY`
- `BREETH_API_KEY`
- `INTERVIEW_API_KEY` (optional; if set, `/api/interview` requires `x-api-key` or `Authorization: Bearer`)

Rotate leaked keys immediately. Local files such as `.env.local` stay gitignored.

## SLOs (initial)

- Availability: `/api/health` returns 200
- Interview turn p95: under 20s when Gemini is healthy
- Fallback: interview still completes if Gemini/Breeth fail

## Runbook

1. Check `GET /api/health` and recent structured logs (`interview.turn`, `interview.failed`).
2. If Gemini fails, interviews continue with static fallback prompts.
3. If Breeth search times out, interviews continue without memory.
4. 401 = missing/wrong `INTERVIEW_API_KEY`. 429 = rate limit. 413 = payload too large.
5. Rotate provider keys, then restart or redeploy so new env values load.
