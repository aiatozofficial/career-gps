# 06 — Folder and Codebase Guide

## Repository Root

| Path | Purpose | Safe to modify? |
|------|---------|-----------------|
| `package.json` | Dependencies + scripts (`dev`, `build`, `preview`, `validate:phase1`) | Yes (keep `type:module` and Vite proxy) |
| `package-lock.json` | Locked dependency graph | Modified by `npm install` only |
| `vite.config.js` | Vite + `@` alias (`@ → src`), dev proxy `/api` → `localhost:5000` | Yes (proxy & alias are load-bearing) |
| `vercel.json` | Build + rewrites: `/api/*` → `/api` (serverless), else → `index.html` SPA | Yes (keep rewrites) |
| `tailwind.config.js` | Design tokens (`ink/mist/sage/ocean/coral/soft`), Graphik font | Yes |
| `postcss.config.js` | Tailwind + autoprefixer wiring | Low-risk |
| `index.html` | Vite entry — mounts `<div id="root">`, loads `src/main.jsx` | Yes (titles/fonts) |
| `public/` | Static assets served verbatim | Yes |
| `api/index.js` | Vercel serverless adapter: `import app from "../server/index.js"; export default app` | Do not delete — required for Vercel |
| `server/index.js` | **Authoritative backend** — all 8 endpoints, validation, sanitization, prompts, fallbacks (~2300 lines) | Modify carefully — see High-risk below |
| `src/` | Frontend SPA | Yes — see sub-tree |
| `docs/phase-notes.md` | Legacy carryover notes (retained verbatim) | Reference only; canonical docs are `docs/00_*`–`25_*` |
| `r.pdf` | Sample resume PDF at repo root | Safe to remove/move if not needed as fixture |
| `start-career-gps.bat` | Windows launcher (spawns backend + Vite) | Safe to update paths if structure changes |

**Missing conventional files:** No `.gitignore` was present when audited (untracked files will appear in `git status`); no `.env.example` committed. `08_Environment_Configuration.md` provides the example. See `12_Known_Issues_and_Limitations.md`.

---

## `src/` — Frontend

```
src/
├── App.jsx                          # View state machine: WELCOME → ONBOARDING → GENERATING → MINDMAP/ROADMAP/TIMELINE
├── main.jsx                         # createRoot(<App>) + GlobalErrorBoundary (localStorage.clear on fatal)
├── components/
│   ├── onboarding/OnboardingWizard.jsx   # 12-step wizard; inline skill suggestions for OTHER fields
│   ├── roadmap/
│   │   ├── RoadmapDashboard.jsx          # Primary UI: tier filter, checklists, prints, deep wizard, pathforge tabs
│   │   ├── CareerMindmapView.jsx         # Mindmap shell: scaffold + reevaluateStates + lazy node fetches
│   │   ├── CareerMindmap.jsx            # D3 owns SVG, zoom, pan, node clicks (empty SVG ref)
│   │   ├── MindmapNodePopover.jsx       # Right-sidebar popover per node (goals/skills/summary)
│   │   ├── CheckpointPanel.jsx          # Checkpoint synthesis panel (POST /api/checkpoint)
│   │   ├── DeepOptimizationWizard.jsx   # 3 questions → 6-week plan flow
│   │   ├── DecisionTree*.jsx            # Legacy/alternate tree viewers (DecisionTreeView.jsx, DecisionTree.jsx)
│   │   ├── ProgressRing.jsx             # Circular progress ring in mindmap header
│   │   └── ReOnboardingWizard.jsx       # Re-onboarding path
│   ├── timeline/{TimelineView,TimelineNode,TimelineDetailPanel}.jsx
│   ├── pathforge/{ResumeAnalyzer,MarketIntelligence,CareerChat,SkillMap}.jsx
│   ├── ui/{gradient-background,web-gl-shader,holographic-card,liquid-glass-button}.jsx
│   ├── WelcomePage.jsx, GeneratingScreen.jsx, ErrorBoundary.jsx, RoadmapPreview.jsx
├── data/
│   ├── scaffoldBuilder.js               # STRUCTURE-ONLY mindmap builder (all stage paths), colors, selection options
│   ├── mindmapTreeBuilder.js            # Related tree helper (check usage before removing)
│   ├── mockRoadmap.js                   # Static validated roadmap for phase 1
│   ├── mockRoadmapGenerator.js          # Client-side generator (App.jsx fallback)
│   └── onboardingDescriptions.js        # Tooltip/hover descriptions for stages/fields/skills
├── schemas/roadmapSchemas.js            # AUTHORITATIVE: Zod schemas for profile, roadmap, nodes, checkpoints
├── services/
│   ├── localStorageService.js           # All career-gps:* keys, safeParse, quota recovery
│   └── resumeService.js                 # Resume upload helper consumed by ResumeAnalyzer
├── utils/
│   ├── roadmapHelpers.js                # filterByTier, progress, inferDegree, processRoadmapForHistory, degree suggestors
│   ├── timelineTransformer.js           # Maps milestones → timeline nodes
│   └── ../lib/utils.js                 # cn() etc. (clsx + tailwind-merge)
└── styles/index.css                    # Global CSS + custom classes (.link-flow, .card-emerald-glow …)
```

Notable details:

- **`@/components` alias** resolves via `vite.config.js:12-14` (`@ → src`). Used in `OnboardingWizard.jsx:5`.
- **`RoadmapDashboard.jsx` and `CareerMindmapView.jsx` each duplicate `reevaluateStates`** — same recursive lock propagation, independent copies. Changing the algorithm requires editing both files (drift risk — see `12_Known_Issues_and_Limitations.md`).
- **`DecisionTreeView.jsx` / `DecisionTree.jsx`** appear superseded by `CareerMindmap.jsx` but are retained; inspect before deleting (`App.jsx` does not import them in current view).
- **`src/App.jsx:60`** posts to `/api/init-roadmap` (server expects `/api/generate-roadmap`) — see known issue.

---

## `server/index.js` — Section Map

The single backend file is organized as:

| Lines | Section | What to know before editing |
|-------|---------|-----------------------------|
| 1-9 | Imports (`express`, `openai`, `dotenv`, `multer`, `pdf-parse`, `zod`) | Adding deps must update `package.json` |
| 11-78 | `sanitizeInput`, `sanitizeProfile` | Prompt-injection guardrails; length caps per field |
| 81-153 | Zod schemas (`profileSchema`, `generateDeep*`, `nodeContentSchema`, `checkpointSchema`, `careerChatSchema`, `marketIntelligenceSchema`, `suggestSkillsSchema`) + `validateRequest` middleware | Any new field must be added to BOTH this schema and `src/schemas/roadmapSchemas.js` |
| 155-163 | `cleanGeminiJsonResponse` | Strips ``` fences from LLM JSON |
| 165-184 | `dotenv.config(override:true)` + Multer config | `override:true` ensures `.env` wins over shell env |
| 186-227 | Express init (`PORT`, `OPENAI_CONFIGURED`, `OPENAI_MODEL`, `createAIClient` adapter) | `genAI === null` when key missing → triggers mock path |
| 230-309 | `buildTreeFromGoals`, `inferCollegeDegree` | Tree is programmatic, not LLM-built |
| 362-613 | `constructPrompt` (+ `stageRulesPrompt`, `guardrailsPrompt`, `milestoneTimeframes`) | **Most editable prompt area** — stage-specific timeframes are canonical |
| 615-769 | `normalizeRoadmapData` | Restamps timeframes by index, fixes bridgingSteps, coerces IDs — load-bearing |
| 771-950 | `POST /api/generate-roadmap` handler + inline mock fallback | See endpoint mismatch note |
| 953-1112 | `fallbackQuestions`, `fallbackDeepRoadmap`, `constructDeepQuestionsPrompt`, `POST /api/generate-deep-questions` | |
| 1114-1198 | `constructDeepRoadmapPrompt`, `POST /api/generate-deep-roadmap`, `constructSuggestSkillsPrompt`, `POST /api/suggest-skills` |  |
| 1200-1351 | `POST /api/analyze-resume` (Multer+pdf-parse+prompt) | |
| 1353-1597 | `POST /api/market-intelligence` (+ optional Tavily) and `POST /api/career-chat` |  |
| 1604-2055 | `AGE_CONTENT_RULES`, `getOfflineMockNodeContent` | Offline node mapping rules |
| 2057-~2260 | `POST /api/node-content` (+ age+checkpoint branches), `POST /api/checkpoint` |  |

**High-risk edits:** changing `constructPrompt` canonical timeframes without updating the restamp in `normalizeRoadmapData:636-638` will produce mismatched milestone labels.

---

## `scripts/`

| File | Purpose | Invocation |
|------|---------|------------|
| `scripts/validatePhase1.mjs` | Validates a sample `UNDERGRADUATE/TECH/MEDIUM` profile against `roadmapSchemas.js` and that `validatedMockRoadmap` contains milestones | `npm run validate:phase1` (`package.json:10`) |

No other scripts, linters, or test runners are configured.

---

## `dist/`

Local Vite build output (`index.html` + `assets/`). Not intended to be committed (no `.gitignore` present — consider adding). `vercel.json:4` sets `outputDirectory: dist`.

---

## Assets

| Path | Content |
|------|---------|
| `docs/assets/diagrams/` | Mermaid sources / exported PNGs (architecture flow) — placeholder dir created by handover docs |
| `docs/assets/images/` | Screenshots for `13_User_Guide.md` (add `onboarding-step.png`, `mindmap-hover.png`, `dashboard-tier.png`) |

---

## Dependency Graph (key import edges)

```
App.jsx
  ├─ services/localStorageService        (all storage)
  ├─ schemas/roadmapSchemas              (parseStudentProfile, parseRoadmap)
  ├─ data/mockRoadmapGenerator           (generateMockRoadmap) [fallback]
  ├─ utils/roadmapHelpers                (processRoadmapForHistory)
  └─ components/* (OnboardingWizard, RoadmapDashboard, CareerMindmapView, TimelineView, WelcomePage)

RoadmapDashboard.jsx / CareerMindmapView.jsx
  ├─ services/localStorageService        (nodeCache, nodeStates, completedGoals, selections)
  ├─ data/scaffoldBuilder                (buildMindmapScaffold, flattenScaffold, calculateProgress)
  ├─ utils/roadmapHelpers                (filterByFinancialTier, getProgressStats, inferCollegeDegree)
  └─ components/pathforge/*

server/index.js
  ├─ openai (SDK)
  ├─ zod
  ├─ multer + pdf-parse
  └─ dotenv
```

---

## Modification Guidance

**Safe areas:** `src/components/ui/*` visual polish, `src/styles/index.css` custom classes, `docs/*` (this directory), adding new static helpers under `src/utils/` if imported shallowly.

**Medium-risk:** onboarding step copy or field options in `OnboardingWizard.jsx` (must keep Zod forward-compatible), `scaffoldBuilder.js` color/type enums (must stay in sync with `roadmapSchemas.js:NODE_TYPES`).

**High-risk (change both sides):**

- Profile shape (`roadmapSchemas.js:7-47` + `server/index.js:81-88` + `sanitizeProfile:31-78`)
- Roadmap shape (`roadmapSchemas.js:120-128` + `server/index.js:615-769` validation/normalization)
- Node states cascade (`CareerMindmapView.jsx:89-199` + `RoadmapDashboard.jsx:151-250`)
- Prompt canonical timeframes (`constructPrompt:396-522` + `normalizeRoadmapData:636-638` + `scaffoldBuilder.js:188-257` which implicitly encodes expected stages)
