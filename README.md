# AI Technical Interviewer

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![CI](https://github.com/priyanshuchawda/ai-technical-interviewer/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/License-MIT-green)

An enterprise-grade, stateful, multi-turn AI technical interviewer built with Next.js App Router, TypeScript, Breeth Graph Memory, and Gemini. The agent conducts realistic technical interviews for learners based on their journey through the 31-day AI Cohort curriculum.

## Key features

- **Multi-turn technical evaluation** across curriculum topics
- **Adaptive questioning** based on completed, skipped, or multi-attempt missions
- **Breeth Graph Memory** for contextual follow-ups
- **Structured answer evaluation** with mastery tracking
- **Evidence-backed feedback** (`summary`, `strengths`, `gaps`, `next`)
- **Interview intelligence UI** for live assessment state
- **`POST /api/interview`** matching the technical specification (`sessionId`, `candidate`, `message`, `done`, `feedback`)

## Architecture

- **Framework**: Next.js App Router (React 19)
- **Language**: TypeScript (strict)
- **Styling**: vanilla CSS design tokens
- **Memory**: Breeth Graph API
- **LLM**: Gemini for dynamic turns and feedback synthesis
- **Testing**: Vitest unit tests + API integration script

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the example env file:

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

```env
BREETH_API_KEY=""
BREETH_API_URL="https://api.thebreeth.com"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.5-flash-lite"
```

Production vars are listed in `.env.example` (`INTERVIEW_API_KEY`, session store, rate limits). Never commit `.env.local` or real API keys.

See [docs/operations.md](docs/operations.md) for deploy, auth, durable sessions, metrics, and runbook notes.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx tsx src/scripts/test-api.ts
```

The API test expects the dev server to be running.

## License

MIT
