# Operations

## Deploy

- **Vercel:** connect this repo, set env vars in the project settings, deploy `main`. Use `SESSION_STORE=upstash` plus Upstash REST credentials so interviews survive cold starts.
- **Node host:** `npm ci && npm run build && npm start`. Use `SESSION_STORE=file` for a single node, or Upstash/Redis REST for multiple replicas.
- Liveness: `GET /api/health` (always 200 if the process is up).
- Readiness: `GET /api/health?ready=1` (503 when auth or the session store is misconfigured).
- Metrics: `GET /api/metrics` (JSON) or `GET /api/metrics?format=prom`. Protected when auth is required.

## Secrets

Store keys in the platform secret manager or host env, never in git:

- `GEMINI_API_KEY`
- `BREETH_API_KEY`
- `INTERVIEW_API_KEY` (required in production for external API clients; also signs the UI cookie if `UI_SESSION_SECRET` is unset)
- `UI_SESSION_SECRET` (optional dedicated cookie secret)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` when using the durable store

Rotate leaked keys immediately. Local files such as `.env.local` stay gitignored.

## Production checklist

1. Set `INTERVIEW_API_KEY` or `UI_SESSION_SECRET`. Production fails closed without one of them.
2. Set `GEMINI_API_KEY` (and usually `BREETH_API_KEY`) for live interviews. The engine still falls back if a provider is down.
3. Pick a session store: `memory` only for local, `file` for one VM, `upstash` for Vercel / multi-instance.
4. Confirm `GET /api/health?ready=1` returns 200 before sending traffic.
5. Point the load balancer health check at `/api/health?ready=1`.

## SLOs (initial)

- Availability: `/api/health?ready=1` returns 200
- Interview turn p95: under 20s when Gemini is healthy
- Fallback: interview still completes if Gemini/Breeth fail

Live provider checks are optional and run from **Actions → Provider smoke** (`workflow_dispatch`) when `GEMINI_API_KEY` / `BREETH_API_KEY` secrets exist. Default PR CI stays offline.

## Runbook

1. Check `GET /api/health?ready=1` and recent structured logs (`interview.turn`, `interview.failed`, `auth.denied`, `config.invalid`).
2. If Gemini fails, interviews continue with static fallback prompts.
3. If Breeth search times out, interviews continue without memory.
4. 401 = missing/wrong `INTERVIEW_API_KEY` or UI cookie. 429 = rate limit. 413 = payload too large. 503 + `INTERVIEW_MISCONFIGURED` = missing production auth secret.
5. Rotate provider keys, then restart or redeploy so new env values load.
6. If sessions reset on deploy, the store is still `memory`. Switch to `file` or `upstash`.
