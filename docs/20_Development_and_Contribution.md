# 20 — Development and Contribution Guide

*Verified from `package.json`, `server/index.js:11-78,146-153`, `vite.config.js:12-14`, absence of `.github/workflows`, `.gitignore`, and `eslint`/`prettier`/`tsc` configs.*

## Branch & Workflow Expectations

| Area | Current practice (discoverable) | Guidance |
|------|---------------------------------|----------|
| Branch name | Single `main` on `origin` (4 commits) | Follow `feature/<scope>`, `fix/<bug>` branching off `main`; do not force-push `main` |
| Commit style | Ad-hoc (e.g., `7f75ad1 node_modules are updated`) | Prefer `type(scope): message` (Conventional) and reference the doc section or bug ID (e.g., `fix(api): alias /api/init-roadmap` — ref B-01) |
| PR process | `Not Confirmed` — no `.github/workflows`, `PULL_REQUEST_TEMPLATE`, `CODEOWNERS`, or branch protection rules are committed | Require `npm ci && npm run validate:phase1 && npm run build` passing before merge (add GitHub Action — see `10_Testing_and_Quality.md`) |
| Reviews | Verified none via repo inspection | Require one reviewer; flag changes to `server/index.js:81-78,362-613,771-834` and `roadmapSchemas.js` for double review |
| Versioning | `package.json:5` → `0.1.0`, no git tags | See `24_Release_and_Versioning.md` — no formal tagging yet |
| Env sharing | `.env` not committed, no `.env.example` | Commit only the example (no real keys); see `08_Environment_Configuration.md` template |

---

## Local Development Process (today's loop)

```bash
npm install                 # once
# terminal 1 — backend (stateless proxy, no DB)
node server/index.js        # PORT=5000, reads ../.env with override:true
# terminal 2 — frontend (HMR + proxy /api → 5000)
npm run dev -- --port 5173  # http://127.0.0.1:5173
# verify
npm run validate:phase1
npm run build               # exit 0; check dist/
```

- **Windows shortcut:** `start-career-gps.bat` (spawns both processes — close both windows to stop).
- **Frontend reload:** HMR auto-reloads on any `src/` edit (Vite).
- **Backend reload:** `node server/index.js` is not watched — restart after editing `server/index.js`. (Consider `nodemon` if added as a dev dep.)
- **Mock mode:** Without `OPENAI_API_KEY`, `server/index.js:191-197` starts in mock mode and all endpoints still verify. Use this for rapid UI iteration without incurring API cost.

---

## Coding Conventions

| Concern | Convention (or lack thereof) | What to adopt |
|---------|-----------------------------|---------------|
| Language | ES modules (`"type":"module"`) everywhere; JSX for React, JS (no TS) for backend | Keep ESM — `import`/`export` only, no CommonJS `require` except where helper already uses it (`__filename` shim at `server/index.js:165-167`) |
| Styling | Vanilla CSS + `styles/index.css` + Tailwind utility strings (`tailwind.config.js:22-28` tokens) | Prefer `cn()` from `src/lib/utils.js` (clsx + tailwind-merge) to compose classes; place design tokens in `tailwind.config.js` rather than hard-coding hex everywhere |
| Aliases | `@ → src` via `vite.config.js:12-14` | Use `@/components/...` consistently (e.g., `OnboardingWizard.jsx:5` does; some files use `../../`) — unify at your team's preference |
| Naming | `PascalCase` components, `camelCase` helpers, `SNAKE_CASE` enums (`CLASS_7_8`, `LOW/MEDIUM/HIGH`) | Keep the enums verbatim — they feed prompts + Zod + scaffold logic simultaneously |
| Validation | Zod schemas are the shared contract: `src/schemas/roadmapSchemas.js` and `server/index.js:81-144` | Treat those schemas as the single source of truth; change `field`/`stage`/`goal` enums only after updating sanitization (`server/index.js:11-78`), prompts (`constructPrompt`), scaffold (`scaffoldBuilder.js`), and helpers (`roadmapHelpers.js`) |
| Sanitization | Every user string passes `sanitizeInput` (strips injections, caps length) | Extend to any new POST body field; do not relax caps without reviewing prompt-injection risk |
| Components vs data | `data/` holds scaffold/mocks/**descriptions** (`onboardingDescriptions.js` provides hover metadata) | Keep data-generation helpers pure and testable |

---

## Safe Areas to Modify (low risk)

- `src/components/ui/*` and `src/styles/index.css` (visual polish only).
- `docs/*` (this directory) — improving docs never blocks runtime.
- Adding read-only helpers under `src/utils/` if shallowly imported.
- New static `fieldSkills` entries in `OnboardingWizard.jsx:37-46` or description text in `onboardingDescriptions.js`.

---

## Dangerous Areas / High-Risk Changes (edit both sides)

| Area | Files coupled | Risk |
|------|---------------|------|
| Profile shape | `roadmapSchemas.js:7-47` + `server/index.js:81-88` + `sanitizeProfile:31-78` + `OnboardingWizard.jsx` steps | Validation drift → 400 mismatches or prompt-injection gaps |
| Roadmap shape | `roadmapSchemas.js:120-128` + `server/index.js:615-769` (`normalizeRoadmapData`) | LLM output censorship failure → Zod crash user-visible |
| Prompt canonical timeframes | `server/index.js:396-522` + `server/index.js:636-638` restamp | LLM timeline hallucination masking breaks |
| Mindmap lock cascade | `CareerMindmapView.jsx:89-199` + `RoadmapDashboard.jsx:151-250` (`reevaluateStates`) + `scaffoldBuilder.js:391-513` | Lock/unlock inconsistencies between dashboard and mindmap |
| History prefixing | `src/utils/roadmapHelpers.js:560-711` (`processRoadmapForHistory`) | Milestone-ID collisions if phase enum reordering without prefix update |
| Build/deploy path | `vite.config.js:17-23` proxy + `vercel.json:6-9` rewrites + `api/index.js` | Local proxy vs Vercel diverge produces `404`/`ECONNREFUSED` (see `11_Troubleshooting.md`) |

---

## Quality Gates Before Merging

1. **`npm run validate:phase1`** — must print `Phase 1 validation passed` (the only automated assertion in the repo).
2. **`npm run build`** — must exit `0` with `dist/` emitting.
3. **Manual smoke** (until E2E exists) — onboarding → roadmap renders → checklist tick cascades → tier toggle filters → `POST /api/analyze-resume` with `r.pdf` → `POST /api/market-intelligence` small query → `POST /api/career-chat` one turn. Vary `CLASS_7_8` vs `WORKING`.
4. **Do not commit** `dist/`, `node_modules/`, or `.env` (fix `.gitignore` — see D-03).

---

## What Quality Gates Are Missing (honest)

| Missing | Dependency | Evidence |
|---------|-----------|----------|
| Linting (`eslint`) | eslint + `.eslintrc` + `npm run lint` | Not in `package.json` (besides Vite) |
| Formatting (`prettier`) | `prettier` + CI `check` | Not found |
| Type checking (`tsc --noEmit`) | `tsconfig.json` | No TS setup |
| Unit/integration harness | `vitest` + `__tests__` | Not found — see `10_Testing_and_Quality.md` |
| CI runner | `.github/workflows/ci.yml` | Not found |
| Branch protection | GitHub Settings → branch protection rule | Not committed |

Add these incrementally per `16_Future_Roadmap.md: B.1–B.2` rather than claiming they exist.

---

## Pull Request Expectations

- Title references the bug/section (e.g., `fix(api): alias /api/init-roadmap → /api/generate-roadmap (B-01)`).
- Description: **What, Why, Evidence** ( cite `file:line` ), plus **Verification** (`npm run validate:phase1`, `npm run build`, manual checklist).
- Tags reviewers; require double review on changes under `server/index.js:362-613` (prompts) due to guardrail risk.
- Keep PRs small — one logical change. Do not mix doc updates with runtime schema changes in a single commit unless both are needed for the same contract.
