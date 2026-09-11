# 02 — Requirements

## Scope Note

This document enumerates requirements **derivable from implemented code, schemas, and UI**, plus stage-guardrail intent from `server/index.js:376-394` and `CAREER_GPS_OVERVIEW.md`. Each requirement is marked **Implemented**, **Partially Implemented**, **Not Implemented**, or **Not Applicable**. No requirement is invented without a code or doc source — unverifiable claims are labelled `Not Confirmed`.

Sources inspected: `src/schemas/roadmapSchemas.js`, `src/components/onboarding/OnboardingWizard.jsx`, `server/index.js`, `src/data/scaffoldBuilder.js`, `src/components/roadmap/*`, `src/components/pathforge/*`, `package.json`.

---

## 1. Functional Requirements

### 1.1 Onboarding & Profile

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| F-ON-01 | User enters name (non-empty, ≤100 chars after sanitization) | Implemented | `roadmapSchemas.js:8`, `server/index.js:35,81` |
| F-ON-02 | User selects stage from {CLASS_7_8, CLASS_9_10, CLASS_11_12, UNDERGRADUATE, POSTGRADUATE, WORKING} | Implemented | `roadmapSchemas.js:9`, `OnboardingWizard.jsx:16-23` |
| F-ON-03 | Age 12–40 (int) with stage defaults (12/14/16/18/22/24) | Implemented | `roadmapSchemas.js:10`, `OnboardingWizard.jsx:7-14` |
| F-ON-04 | Field in {TECH, SCIENCE, COMMERCE, ARTS, LAW, MEDICINE, DESIGN, OTHER}; OTHER requires customValue | Implemented | `roadmapSchemas.js:11-20` |
| F-ON-05 | Skills: ≥1; `None yet` exclusive; custom skills allowed | Implemented | `roadmapSchemas.js:21-24`, `OnboardingWizard.jsx:503-512` |
| F-ON-06 | For OTHER fields, suggest 6–8 domain skills via AI (`/api/suggest-skills`) with offline fallback | Implemented | `server/index.js:1152-1198`, `OnboardingWizard.jsx:94-124` |
| F-ON-07 | Goal type in {JOB_ROLE, STARTUP, HIGHER_STUDIES, NOT_SURE} + description; NOT_SURE auto-generates exploratory goal | Implemented | `roadmapSchemas.js:25-28`, `OnboardingWizard.jsx:550-553` |
| F-ON-08 | Goal follow-up prompts & suggestions adapt to goal type (role/startup/course) | Implemented | `OnboardingWizard.jsx:803-841` |
| F-ON-09 | Prep style (Self-study/Coaching/Hybrid/College-led) | Implemented | `OnboardingWizard.jsx:358-379` |
| F-ON-10 | Academic focus (Board-only / Entrance / Balanced) | Implemented | `OnboardingWizard.jsx:388-406` |
| F-ON-11 | Time commitment (Light 2-4h / Balanced 5-10h / Intensive 12h+) | Implemented | `OnboardingWizard.jsx:415-435` |
| F-ON-12 | Financial tier LOW/MEDIUM/HIGH | Implemented | `roadmapSchemas.js:29`, `OnboardingWizard.jsx:444-464` |
| F-ON-13 | Preferences multi-select {online, local, relocation, scholarship} | Implemented | `OnboardingWizard.jsx:59, 472-479` |
| F-ON-14 | Profile validated via `parseStudentProfile` before submission; errors inline | Implemented | `OnboardingWizard.jsx:586`, `roadmapSchemas.js:130` |

**Validation / business rule refs:** `server/index.js:11-78` (sanitization), `server/index.js:81-88` (profileSchema), `src/schemas/roadmapSchemas.js:7-47`.

### 1.2 Roadmap Generation

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| F-RM-01 | POST profile → generate roadmap (goals, courses, internships, certs, alternates, skillGap, decisionTree) | Implemented | `server/index.js:771-950`, `src/App.jsx:60` |
| F-RM-02 | Stage-specific timeframes (e.g., 14 milestones for CLASS_7_8, 10 for UNDERGRADUATE) mapped character-exact | Implemented | `server/index.js:399-522, 531-536` |
| F-RM-03 | Programmatic decisionTree built from milestones (not LLM-built) for structural integrity | Implemented | `server/index.js:230-309, 816-829` |
| F-RM-04 | Normalize roadmap: restamp timeframes by index, fix skillGap bridgingSteps, clean tiers | Implemented | `server/index.js:615-769` |
| F-RM-05 | High-fidelity offline mock if OpenAI unavailable or key missing | Implemented | `server/index.js:838-950`, `App.jsx:87-99` |
| F-RM-06 | Financial-tier tags on courses/internships/certs; filtered in UI | Implemented | `server/index.js:566-591`, `roadmapHelpers.js:1-3` |
| F-RM-07 | SkillGap: `have` (from profile) + `need` tied to `milestoneId` + `bridgingSteps` (≥1) | Implemented | `roadmapSchemas.js:111-118`, `server/index.js:600-607` |
| F-RM-08 | Persist profile + roadmap + financialTier in localStorage; restore on reload | Implemented | `services/localStorageService.js:66-88`, `App.jsx:37-52` |

**Endpoint split note:** `F-RM-01` — client onboarding posts to `POST /api/init-roadmap` (`App.jsx:60`, handler `server/index.js:2319` — lightweight 1-milestone init). `POST /api/generate-roadmap` (`server/index.js:771`) is the full stage-timeline contract. `App.jsx:88` `generateMockRoadmap` is an additional client-side fallback independent of the server distinction.

### 1.3 Mindmap Scaffold & Lazy Content

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| F-MM-01 | Structure-only scaffold (no goals/skills) per stage, tree + flat list | Implemented | `scaffoldBuilder.js:391-513` |
| F-MM-02 | Node types {root, stage, semester, selection, checkpoint, cert, internship, goal, alternate, skill, quarterly} | Implemented | `roadmapSchemas.js:242-245`, `scaffoldBuilder.js:14-28` |
| F-MM-03 | Node states {locked, unlocked, in_progress, completed} with cascade (reevaluateStates) | Implemented | `CareerMindmapView.jsx:89-199`, `RoadmapDashboard.jsx:151-250` |
| F-MM-04 | Selection nodes (board, UG tier, postgrad choice, masters) require user choice to unlock subtree | Implemented | `scaffoldBuilder.js:760-801`, `CareerMindmapView.jsx:332-365` |
| F-MM-05 | Lazy per-node content via `POST /api/node-content` (goals/skills/summary/reasons) cached in localStorage | Implemented | `server/index.js:2057-~2140`, `CareerMindmapView.jsx:297-329` |
| F-MM-06 | Checkpoints open synthesis narrative via `POST /api/checkpoint` | Implemented | `server/index.js:~2140-` (checkpoint handler), `CheckpointPanel.jsx` |
| F-MM-07 | Progress ring reflects completed goals over unlocked goals | Implemented | `scaffoldBuilder.js:571-609`, `CareerMindmapView.jsx:540-542` |
| F-MM-08 | Pan/zoom, legend, expanded nodes, zoom persistence | Implemented | `src/components/roadmap/CareerMindmap.jsx`, `services/localStorageService.js:138-160` |

### 1.4 Dashboard, Timeline & Deep Optimization

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| F-DB-01 | Dashboard section tabs + tier filter + milestone checklists + alternate selector | Implemented | `RoadmapDashboard.jsx:50-61,375-413` |
| F-DB-02 | Print / PDF export (full guide including expanded mindmap) | Implemented | `RoadmapDashboard.jsx:656-765` |
| F-DB-03 | Edit Profile / Restart clears storage and returns to Welcome | Implemented | `RoadmapDashboard.jsx:650-654`, `App.jsx:105-111` |
| F-TL-01 | Linear timeline view of roadmap + profile context | Implemented | `src/components/timeline/TimelineView.jsx`, `App.jsx:117-129` |
| F-DP-01 | Deep questions: `POST /api/generate-deep-questions` → 3 context-specific MCQs | Implemented | `server/index.js:1081-1112` |
| F-DP-02 | Deep roadmap: `POST /api/generate-deep-roadmap` → 6-week plan + 2 projects + advice | Implemented | `server/index.js:1114-1150` |
| F-DP-03 | Deep weeks have independent completion tracking | Implemented | `RoadmapDashboard.jsx:83,634-642` |

### 1.5 Ancillary Features

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| F-PF-01 | Resume analysis: PDF upload (≤10 MB, PDF only) → pdf-parse → OpenAI skills/experience/education/strengths/gaps/recs | Implemented | `server/index.js:174-184,1200-1351` |
| F-PF-02 | Market intelligence with optional Tavily live search + mock fallback | Implemented | `server/index.js:1353-1500` |
| F-PF-03 | Career chat (`Antigravity Career Advisor`) with profile+roadmap+resume context | Implemented | `server/index.js:1502-1597` |
| F-PF-04 | Suggest-skills for OTHER fields | Implemented | `server/index.js:1167-1198` |
| F-PF-05 | Reset clears all `career-gps:*` keys from localStorage + sessionStorage | Implemented | `services/localStorageService.js:162-179` |

### 1.6 Missing / Not Implemented (explicit)

| Area | Status | Note |
|------|--------|------|
| User accounts / auth / roles | Not Applicable — never designed; no claims in code | See `14_Admin_Guide.md` |
| Payments / subscriptions | Not Implemented |  |
| Email / notifications | Not Implemented |  |
| Analytics / telemetry | Not Implemented |  |
| Search / filtering beyond tier | Not Implemented |  |
| Export to calendar / LMS integration | Not Implemented |  |

---

## 2. Non-Functional Requirements

| Category | Required level (derived) | Implemented | Evidence / Gap |
|----------|-------------------------|-------------|----------------|
| Availability (offline-able) | App remains usable without OpenAI key (mock fallback) | Implemented | `server/index.js:192,782,1092,1192-1198` |
| Correctness | Zod-validated profile + roadmap; sanitize prompt injects | Partially Implemented | `roadmapSchemas.js`, `server/index.js:11-78,146-153` — LLM output still may hallucinate despite normalization |
| Localization | Indian platforms (NPTEL/SWAYAM/Internshala/Naukri/NASSCOM) in prompts | Prompt-level only | `server/index.js:378-383` — not enforced server-side beyond prompt |
| Performance | <3s initial load claim | Not Verified — no benchmarks | `CAREER_GPS_OVERVIEW.md:79` claim not measured |
| Accessibility | Keyboard / screen-reader | Not Confirmed — no axe/lighthouse checks; `focus-ring` classes present but not audited | `OnboardingWizard.jsx:593-` class usage |
| Security | API key never exposed to browser | Implemented | `server/index.js:190`, `docs/phase-notes.md:14-17` |
| Security | Input sanitization + Zod validation on every endpoint | Implemented | `server/index.js:11-78,146-153,771-1597` |
| Privacy | No DB; no user data leaves device except to OpenAI/Tavily via backend proxy | Implemented | `services/localStorageService.js`, `server/index.js:206-227` |
| Scalability | Multi-tenant / concurrent | Not Applicable — single-user local app; Express in-memory state |
| Observability | Logs, health checks, error tracking | Not Implemented | See `21_Operations_and_Monitoring.md` |
| Maintainability | Modular components, typed via Zod, documented | Partially Implemented | Good module boundaries; no unit tests, no CI |
| Test coverage | Strong coverage | Not Implemented | Only `validate:phase1` (`scripts/validatePhase1.mjs`) |

---

## 3. Validation & Constraints Summary

- **Profile schema:** `src/schemas/roadmapSchemas.js:7-47` is authoritative; backend mirrors with `profileSchema` at `server/index.js:81-88`. Frontend `parseStudentProfile` throws `ZodError` surfaced inline (`OnboardingWizard.jsx:587-589`); backend `validateRequest` returns `400 {error: "Invalid input data: ..."}`.
- **Roadmap schema:** `roadmapSchemas.js:49-128` and `server/index.js:615-769` normalization ensure milestone/college/internship/cert/alternate shapes stay valid even if LLM deviates.
- **Sanitization:** `sanitizeInput` strips null bytes, controls, backticks/braces, `###/---/===` and `System:/User:/Assistant:` markers, caps lengths (`server/index.js:11-78`).
- **File upload:** Multer `memoryStorage`, 10 MB limit, PDF-only MIME filter (`server/index.js:174-184`).
- **Constraints missed:** No rate limiting, no CORS config, no CSRF tokens, no persistent rate/credit metering — see `17_Security_and_Privacy.md`.

---

## 4. Traceability (Requirement → Implementation locator)

- Profile → `src/schemas/roadmapSchemas.js:7-47` + `server/index.js:81-88`
- Roadmap generation → `server/index.js:771-950` + `src/App.jsx:60`
- Mindmap scaffold → `src/data/scaffoldBuilder.js:391-513`
- Lazy node content → `server/index.js:1604-2130` (includes `AGE_CONTENT_RULES`)
- Dashboard → `src/components/roadmap/RoadmapDashboard.jsx`
- Mindmap view → `src/components/roadmap/CareerMindmapView.jsx` + `src/components/roadmap/CareerMindmap.jsx`
- Deep optimization → `server/index.js:1000-1150`, `src/components/roadmap/DeepOptimizationWizard.jsx`
- Resume / Market / Chat → `server/index.js:1200-1597`, `src/components/pathforge/*`

---

## 5. Gaps to Call Out

1. **Endpoint naming drift** — client/server mismatch (`/api/init-roadmap` vs `/api/generate-roadmap`) is a functional requirement violation currently hidden by fallback.
2. **No non-functional SLAs** exist; performance claim is marketing text, not a requirement with acceptance criteria.
3. **No accessibility requirement** is formally defined; `focus-ring` usage is informal.
