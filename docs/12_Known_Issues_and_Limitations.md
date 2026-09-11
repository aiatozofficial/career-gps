# 12 — Known Issues and Limitations

*Brutally honest. Every entry cites evidence. Marked: `Bug` (breaks behavior), `Debt` (hard to maintain), `Limitation` (capability boundary), `Missing` (infrastructure gap).*

## Load-Bearing Bugs

| ID | Severity | Description | Evidence | Workaround until fixed |
|----|----------|-------------|---------|------------------------|
| B-01 | **Withdrawn — verified present:** `POST /api/init-roadmap` exists at `server/index.js:2319` (lightweight 1-milestone init, `App.jsx:60` caller) distinct from `POST /api/generate-roadmap` at `771` (full stage timeline). Ensure `05_API_Documentation.md` dual-endpoint distinction is preserved; no mismatch fix needed. | `App.jsx:60`, `server/index.js:771,2319` | Retain both contracts — `init-roadmap` for onboarding init, `generate-roadmap` for full generation |
| B-02 | **Low (visual/hardening)** | Miscomputed `progressStats` in `Dashboard`: `progressStats` closure references undefined `baseStats`/`deepPercentage` at lines 588-603, likely triggering render-throw in `GlobalErrorBoundary` when `deepRoadmap` is loaded | `src/components/roadmap/RoadmapDashboard.jsx:588` (`byPhase: [...baseStats.byPhase, {phase:"deepStudy", ...deepPercentage}]`) vs `mmStats` just computed at 568 | Patch to use `mmStats`/`deepPercentage` from `deepWeeks` calc, or remove deep-inline merge; verify via `npm run build` not catching it |
| B-03 | **Low (UX)** | `Dashboard.handlePrint` & print-view branches reference `getProgressStats` guard in dead code at `Dashboard.jsx:833` but mix two progress sources (`roadmap.goalsToAchieve` milestone checks vs `mindmap.calculateProgress`). Numbers can diverge. | `RoadmapDashboard.jsx:565-604` vs `CareerMindmapView.jsx:540-542` | Unify progress definition around `calculateProgress(root, nodeCache, nodeStates, completedGoals)` |

## Technical Debt & Fragile Areas

| ID | Description | Why it hurts | Where |
|----|-------------|--------------|-------|
| D-01 | **Duplicated `reevaluateStates`** — near-identical recursive state cascade exists in BOTH `CareerMindmapView.jsx:89-199` and `RoadmapDashboard.jsx:151-250`. Same walk + selection + checkpoint + cache logic. | Divergence risk; fixing board/UG selection semantics requires touching both; already diverged in small details (e.g., selection branch expansion timing with `setTimeout`) | Both files |
| D-02 | **`scaffoldBuilder.js` length/complexity** — 802 lines, mixes path-building, selection wiring, color enum, nodeFactory, progress, `getSelectionOptions` mapping, tier parser. High cognitive load & unit-test gap. | Any new stage (e.g., gap year) requires careful edits across `buildMindmapScaffold` + `buildSchoolToCollegePath` + selection handlers | `src/data/scaffoldBuilder.js` |
| D-03 | **No `.gitignore` committed** — `Test-Path .gitignore` returned no file. | Risk committing `.env`, `dist/`, `node_modules/` artifacts; contributor `git status` polluted | Repo root |
| D-04 | **No `.env.example`** committed | New developer has no canonical secret list beyond `08_Environment_Configuration.md` | Repo root |
| D-05 | **`roadmapHelpers.js` triple inference** — `inferCollegeDegree`, `getSuggestionsForGoal`, `checkCourseMatch`, `checkStreamMatch`, `processRoadmapForHistory` encode overlapping domain heuristics with slightly different rule sets | Prompt + frontend heuristics can contradict user-facing messages (stream vs course mismatch warnings) | `src/utils/roadmapHelpers.js` |
| D-06 | **Progress split** — `roadmap.goalsToAchieve.milestones` (static AI roadmap) vs `nodeCache[ nodeId ].goals` (lazy mindmap goals) are two independent goal sets with separate completion keys (`career-gps:completed-milestones` vs `career-gps:completed-goals-list`). Dashboard & mindmap show separate completions that do not reconcile. | User can feel "progress not moving" when one tracker changes but the other doesn't | `services/localStorageService.js:12,18` + dashboard + mindmap |
| D-07 | **Eager node-content fetch is serial** — `for (const node of unfetched) { await fetch }` loops; frontend will not render downstream content until prior nodes resolve. | N-node latency grows linearly; user waiting on an early node blocks later ones | `CareerMindmapView.jsx:243-294`, `RoadmapDashboard.jsx:315-364` |
| D-08 | **Hard-coded Indian platform naming** is prompt-text, not an enum — strings drift (NPTEL vs SWAYAM, Internshala/Naukri/spurious Coursera/Google in mocks) | AI outputs can ignore prompt guardrails and still invent Western platforms — mitigated only by post-normalization | `server/index.js:379-383` |

## Missing Infrastructure

| ID | Missing | Risk | Evidence |
|----|---------|------|---------|
| M-01 | **Tests** — no jest/vitest/cypress, no CI | Refactors have no net — schema and scaffold regressions undetectable except `validate:phase1` | `package.json:31` devDeps has no test tooling |
| M-02 | **CI/CD workflows** — no `.github/workflows` | No automated gate on PR | No workflow files found |
| M-03 | **Lint/format/typecheck** — no `eslint`, `prettier`, `tsconfig` | Style drift; Vite/React 18 → 19 bump unverified | `package.json:6-35` |
| M-04 | **Dedicated `/health` endpoint** — `GET /health` JSON missing. Server serves `GET /{*path}` (`server/index.js:2487`) as SPA catch-all → `dist/index.html`, not a JSON health probe. Production is monitorable via the SPA response but synthetic POST checks (`POST /api/generate-roadmap` → `400`) remain the only JSON health signal. | `server/index.js:2487` `app.get("/{*path}", ...)` |
| M-05 | **Monitoring/alerting/error tracking** | No Sentry/Datadog; outages rely on user reports + Vercel function logs | `21_Operations_and_Monitoring.md` |
| M-06 | **Rate limiting** | `/api/career-chat` and node-content loops are cheap to abuse; OpenAI quota can be burned per IP | No `express-rate-limit` |
| M-07 | **CORS/Helmet** | Loose posture | No `cors`, `helmet` in `package.json` |
| M-08 | **Backup/restore** | User data is localStorage; clear = loss (no cloud sync, no export file) | `23_Data_Lifecycle_Backup_and_Recovery.md` |
| M-09 | **`.gitignore` / env pinning** | Secret-leak risk | D-03 |
| M-10 | **CI env gating** | PR could merge without `npm run build` passing | M-02 |

## Behavioral Limitations

| ID | Limitation | User-visible? | Evidence |
|----|-----------|--------------|---------|
| L-01 | **No multi-device sync** — profile/roadmap not portable between devices/browsers | Yes — progress on laptop does not follow to mobile | `localStorageService.js` (all storage is per-origin) |
| L-02 | **No auth / shared ownership** — `clearCareerGpsStorage()` wipes local user's data; another local profile overwrites prior | Yes | `App.jsx:105-111` |
| L-03 | **Job listings are AI placeholders** (`https://internshala.com`, `https://naukri.com` bare URLs) — not live feeds | Yes — links can be stale/404 | `server/index.js:1370-1373,1482-1486` |
| L-04 | **Resume analysis uses ≤10k chars from 3 pages** — long resumes truncated, scanned-image PDFs yield empty extraction + profile-only analysis | Yes — gaps may miss content | `server/index.js:1244-1253` |
| L-05 | **Market intel without Tavily is LLM-knowledge cutoff** — no live salary/demand verification unless `TAVILY_API_KEY` configured | Yes — numbers could be stale | `server/index.js:1401-1412` |
| L-06 | **No verified outbound links** — course/cert URLs, if emitted, are not verified `fetch`able | Yes — "free links" are not verified in code | `CAREER_GPS_OVERVIEW.md` claim re: "verified free links" → `Not Confirmed` |
| L-07 | **No i18n / localization** — English/INR-centric | Yes |  |
| L-08 | **Accessibility audit not performed** — `focus-ring` exists but no `axe-core`/lighthouse check | Not confirmed — mark as `Not Confirmed` | `OnboardingWizard.jsx:593-` classes exist |

## Security Limitations

| ID | Issue | Severity | Evidence |
|----|-------|----------|---------|
| S-01 | No rate limiting | Medium (cost) | `17_Security_and_Privacy.md` M-06 |
| S-02 | No CORS allowlist | Low (posture) | M-07 |
| S-03 | LLM markdown output rendered without explicit sanitization (potential if `dangerouslySetInnerHTML` used in chat) | Medium if HTML passthrough | Inspect `pathforge/CareerChat.jsx` rendering path |
| S-04 | No secret rotation doc or enforced `.env` ignore | Low-medium | D-03 |

## AI Limitations

See `ai/05_AI_Limitations_and_Guardrails.md` for the full list; headline issues:

- No RAG / embeddings / vector DB — advice is parametric (training data) unless Tavily injected.
- No hallucination grounding, token metering, or fact-checking for platform costs.
- `normalizeRoadmapData` post-fixes LLM timeframe hallucinations by restamping — effective but masks whether the LLM is drifting.
- Mock fallbacks use `isMock:true` + `warning` but are **silent** in the UI; users may not notice they're on fallback data.

## What a New Maintainer Should Prioritize

1. **Resolve B-01 documentation (done)** — `init-roadmap` vs `generate-roadmap` contracts are verified; align `README.md` and `00_Project_Overview.md` notes accordingly.
2. **Add `.gitignore` + `.env.example`** — unblocks safe collaboration.
3. **Deduplicate `reevaluateStates`** into a shared utility under `src/utils/` with unit tests (D-01).
4. **Add CI** — GitHub Actions running `npm ci && npm run validate:phase1 && npm run build`.
5. **Add `/health` + `helmet` + `express-rate-limit`** before exposing broadly.

## How Not to Use This Document

Do not treat missing items as "planned" — items listed under **Missing** are not roadmap commitments; they are gaps observed during inspection. See `16_Future_Roadmap.md` for the confirmed-vs-proposed split.
