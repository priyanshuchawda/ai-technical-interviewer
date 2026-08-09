# Autonomous AI Technical Interviewer Agent

![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

An enterprise-grade, stateful, multi-turn AI Technical Interviewer built with Next.js App Router, TypeScript, and Breeth Graph Memory integration. The agent conducts realistic technical interviews for learners based on their journey through the 31-day AI Cohort curriculum.

---

## 🌟 Key Features

- **Multi-turn Technical Evaluation**: Conducts adaptive multi-turn conversations evaluating candidate understanding across curriculum topics.
- **Dynamic Questioning & Memory**: Dynamically selects questions based on completed, skipped, or multi-attempt missions, syncing conversation turns into **Breeth Graph Memory** (`https://api.thebreeth.com/v1`).
- **Strict Compliance with API Contract**: Exposes standard `POST /api/interview` matching the technical specification (`sessionId`, `candidate`, `message`, `done`, `feedback`).
- **Structured Feedback Synthesis**: Generates actionable, structured post-interview reports detailing `summary`, `strengths`, `gaps`, and `next` steps.
- **Modern Glassmorphism UI**: High-fidelity dark mode dashboard with live status indicators and real-time candidate assessment tools.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Next.js App Router (React 19)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Vanilla CSS Design Tokens (Glassmorphic dark aesthetic)
- **Memory Engine**: Breeth Graph SDK Integration (`breth_sdk.md`)
- **Testing**: Automated end-to-end integration tests using `tsx`

---

## 🚀 Getting Started

### 1. Installation

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local`:

```env
BREETH_API_KEY=""
BREETH_API_URL="https://api.thebreeth.com"
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Live Verification & Testing

Run the automated API integration test script:

```bash
npx tsx src/scripts/test-api.ts
```

Build and lint verification:

```bash
npm run lint
npm run build
```

---

## 📄 License

MIT License.
