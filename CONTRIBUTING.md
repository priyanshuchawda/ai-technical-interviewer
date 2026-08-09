# Contributing

## Local setup

```bash
git clone https://github.com/priyanshuchawda/ai-technical-interviewer.git
cd ai-technical-interviewer
cp .env.example .env.local
npm install
npm run dev
```

Add real keys only in `.env.local`. Never commit secrets, `.env*`, or API keys in docs.

## Checks before opening a PR

```bash
npm test
npm run lint
npm run build
```

## Branch + PR flow

1. Open or pick an issue.
2. Create a focused branch (`feat/...`, `fix/...`, `docs/...`).
3. Keep the PR scoped to one change.
4. Link the issue with `Closes #N`.
5. Wait for CI to pass, then squash-merge and delete the branch.
