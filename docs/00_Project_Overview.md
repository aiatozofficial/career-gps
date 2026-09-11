# 00 — Project Overview

## What is Career GPS?

**Career GPS** is a browser-based, AI-powered career guidance application. It turns a short onboarding questionnaire (stage, field, skills, budget, goal) into a personalized, interactive roadmap — a hierarchical mindmap, a linear timeline, and a dashboard — that adapts to the user's budget and progress. The app's tagline from `CAREER_GPS_OVERVIEW.md:5` is: *"a real-time, adaptive career compass"* that replaces static PDFs with a living roadmap.

**Evidence:** `src/App.jsx`, `src/components/onboarding/OnboardingWizard.jsx`, `src/data/scaffoldBuilder.js`, `server/index.js:362-613` (prompt construction).

---

## Problem it Solves

From `CAREER_GPS_OVERVIEW.md:8-12`: generic career advice is (1) non-contextual, (2) static, (3) budget-blind. Career GPS addresses this by:

- Tailoring milestones to the user's **education stage** (Class 7-8 through Working) — `server/index.js:396-522`.
- Generating **financial-tier-filtered** resources (LOW/MEDIUM/HIGH) — `src/utils/roadmapHelpers.js:1-3`, `server/index.js:386-394`.
- Making the roadmap **progress-aware** (checklist completions cascade and re-lock downstream) — `src/data/scaffoldBuilder.js:518-531`, `src/components/roadmap/CareerMindmapView.jsx:89-199`.

---

## Who Uses It

| User type | Needs | How Career GPS helps |
|-----------|-------|----------------------|
| College students | Academic alignment, internships, semester pacing | Semester-based scaffold (`scaffoldBuilder.js:188-257`) + NPTEL/SWAYAM course suggestions |
| Career switchers (Working) | Efficient bridging, quarterly pacing | Quarterly scaffold (`scaffoldBuilder.js:262-304`) + leadership/manager tracks |
| Self-taught / low-budget learners | Free-first resources, verifiable projects | `financialTier=LOW` guardrail forces stipend/internship filtering (`server/index.js:386-389`) |

*Non-technical stakeholder note:* Think of Career GPS as a personalized study planner that draws your path as an interactive map, not a document.

---

## Major Capabilities (Implemented)

1. **Onboarding wizard** — 12-step glassmorphic flow collecting name, stage, age, field, skills, goal type + follow-up, prep style, academic focus, time commitment, financial tier, preferences. `src/components/onboarding/OnboardingWizard.jsx:141-482`.
2. **AI roadmap generation** — Two endpoints: `POST /api/init-roadmap` (lightweight 1-milestone init used by `src/App.jsx:60`, `server/index.js:2319`) and `POST /api/generate-roadmap` (full multi-milestone roadmap with stage-specific timeframes, `server/index.js:771-950`). Both produce `goalsToAchieve`, `collegeCourses`, `internships`, `certifications`, `alternatePaths`, `skillGap`, `decisionTree`; both fall back to high-fidelity mock if OpenAI unavailable.
3. **Scaffold mindmap** — Structure-only tree built *without* AI; content loaded lazily per node via `POST /api/node-content` (`scaffoldBuilder.js:391`, `server/index.js:2057`).
4. **Dashboard** — Section tabs (goals, courses, internships, certs, alternates, skill gap, resume, market intel, chat, deep insights), financial tier filter, milestone checklist, progress ring, print/PDF export (`src/components/roadmap/RoadmapDashboard.jsx`).
5. **Timeline view** — Linear chronological view of milestones (`src/components/timeline/TimelineView.jsx`).
6. **Deep optimization** — Phase-2 wizard generating 3 quiz questions (`POST /api/generate-deep-questions`) then a 6-week study plan + 2 target projects (`POST /api/generate-deep-roadmap`).
7. **Resume analysis** — PDF upload → `pdf-parse` → OpenAI analysis (`POST /api/analyze-resume`).
8. **Market intelligence** — Role/market insights with optional Tavily live search (`POST /api/market-intelligence`).
9. **Career chat** — Context-aware advisor (`POST /api/career-chat`).
10. **Skill suggestions** — Field-specific skills via OpenAI (`POST /api/suggest-skills`).

---

## Technology Summary

| Layer | Technology | Version evidence |
|-------|------------|------------------|
| Frontend framework | React | `package.json:24` → `^18.3.1` (README claims React 19 — **discrepancy**, see below) |
| Build / dev server | Vite | `package.json:28` → `^7.0.0`, `vite.config.js` |
| Mindmap viz | D3 | `^7.9.0` |
| Animation | Framer Motion | `^11.15.0` |
| 3D background | Three.js | `^0.184.0` |
| Styling | Tailwind CSS + Vanilla CSS | `tailwind.config.js`, `src/styles/index.css` |
| Validation | Zod (frontend + backend) | `^3.23.8`, `src/schemas/roadmapSchemas.js`, `server/index.js:81-153` |
| Backend | Express | `^5.2.1`, `server/index.js:1` |
| AI | OpenAI SDK | `^4.77.0`, `server/index.js:2,199-227` |
| File upload | Multer | `^1.4.5-lts.1`, `server/index.js:174` |
| PDF parsing | pdf-parse | `^1.1.1` |
| Deployment | Vercel (serverless wrapper `api/index.js`) | `vercel.json` |

**Runtime:** `package.json` requires Node ≥18 (README says v18+). Verified via `engine` not pinned — **Assumption: Node 18/20 works; not enforced by `package.json` `engines` field**.

---

## Current Implementation Status

| Area | Status |
|------|--------|
| Core onboarding → roadmap → dashboard → mindmap loop | **Implemented** and usable end-to-end (mock fallback ensures offline usability) |
| Per-node lazy AI content | **Implemented** (`/api/node-content`) |
| Checkpoint insights | **Implemented** (`/api/checkpoint` — `POST` handler at `server/index.js:~2140`) |
| Resume / market / chat / deep optimization | **Implemented** |
| Auth, DB, payments, email, analytics, multi-user | **Not Applicable** — not present, explicitly documented |
| Tests | **Partially Implemented** — only `npm run validate:phase1` (`scripts/validatePhase1.mjs`) |
| CI/CD | **Not Confirmed** — no workflow files found |
| Monitoring / logging infra | **Not Implemented** |

---

## Important Limitations (Headlines)

- No persistence beyond browser storage — data loss on clear.
- No authentication — single local user.
- Init and full roadmap are separate endpoints (`/api/init-roadmap` = 1-milestone init; `/api/generate-roadmap` = full stage timeline) — frontend `App.jsx:60` uses `init-roadmap` (see `05_API_Documentation.md` for the difference).
- No formal test coverage, no CI, no backup. Health check is `GET /{*path}` serving `dist/index.html` SPA catch-all (`server/index.js:2487`) — no dedicated `/health` JSON endpoint.
- AI output quality depends on OpenAI; no retrieval/RAG or grounding.

Full list: `12_Known_Issues_and_Limitations.md`.

---

## Repository Structure (Top Level)

```
career-gps/
├── api/index.js                  # Vercel serverless adapter → server/index.js
├── server/index.js               # Express app + 9 API routes + static serving + SPA catch-all (~2501 lines)
├── src/
│   ├── App.jsx                   # View router (welcome/onboarding/generating/timeline/roadmap/mindmap)
│   ├── main.jsx                  # React root + GlobalErrorBoundary
│   ├── components/               # onboarding/, roadmap/, timeline/, pathforge/, ui/
│   ├── data/                     # scaffoldBuilder.js, mindmapTreeBuilder.js, mockRoadmap*.js, onboardingDescriptions.js
│   ├── schemas/roadmapSchemas.js # Zod schemas for profile + roadmap (authoritative data model)
│   ├── services/                 # localStorageService.js, resumeService.js
│   ├── utils/                    # roadmapHelpers.js, timelineTransformer.js, lib/utils.js
│   └── styles/index.css
├── docs/
│   ├── README.md                 # Command center (you are here’s parent)
│   ├── 00_* … 25_*               # Numbered handover docs
│   ├── ai/                       # AI-specific docs
│   ├── decisions/                # ADRs
│   └── phase-notes.md            # Legacy carryover notes
├── public/ + index.html          # Vite static entry
├── vercel.json, vite.config.js, tailwind.config.js, postcss.config.js
├── package.json, package-lock.json
├── r.pdf                         # Sample file in repo root (appears to be a sample resume PDF)
└── start-career-gps.bat          # Windows double-click launcher
```

See `06_Folder_and_Codebase_Guide.md` for per-directory responsibilities and safe-to-edit guidance.

---

## Quick-Start Path (Developer)

1. Ensure **Node 18+** (`node -v`) and npm.
2. `npm install`
3. Create `.env` at repo root (see `08_Environment_Configuration.md` for template).
4. `node server/index.js`  (terminal 1, port 5000)
5. `npm run dev -- --port 5173` (terminal 2, via Vite proxy `/api` → 5000)
6. Open `http://127.0.0.1:5173`
7. Verify: onboarding completes → mindmap renders; or run `npm run validate:phase1`.

Windows users can double-click `start-career-gps.bat` (starts both servers). Detailed guide: `07_Local_Setup_Guide.md`.

---

## How to Navigate This Documentation

- **New developer:** Read this file → `03_System_Architecture.md` → `06_Folder_and_Codebase_Guide.md` → `07_Local_Setup_Guide.md`.
- **PM / non-technical:** This file → `01_Product_and_Business_Overview.md` → `13_User_Guide.md`.
- **QA / handover reviewer:** Use the checklist in `docs/README.md`.

---

## Discrepancies Noted During Inspection

1. **React version:** `README.md:20` and `CAREER_GPS_OVERVIEW.md:55` claim React 19; `package.json:24` pins `^18.3.1`. Implemented = 18.3.1.
2. **Build output:** `vercel.json:4` says `outputDirectory: dist` — matches `vite.config.js` default; confirmed `dist/` exists in working tree (local build artifact, not committed).
3. **Deployment target wiring:** `server/index.js:2482-2489` serves `dist/` statically and catch-alls `GET /{*path}` → `dist/index.html` when not on Vercel (`if (!process.env.VERCEL)` at `2491`); Vercel uses `api/index.js` serverless wrapper instead (`vercel.json:7`). Both are verified but not a single unified deploy.
