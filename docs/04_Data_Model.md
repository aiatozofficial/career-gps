# 04 — Data Model

## Overview

Career GPS has **no database** (`Not Applicable` — no Postgres, Mongo, SQLite, or any persistence layer was found; 0 migration files, 0 ORM configs). All durable state is **browser storage** driven by Zod schemas in `src/schemas/roadmapSchemas.js` (authoritative) and mirrored by backend normalization in `server/index.js:615-769`.

This document describes the **logical data model** that a new developer must understand to modify features safely.

---

## Storage Medium

| Layer | Mechanism | Quota | Evidence |
|-------|-----------|-------|---------|
| Primary | `localStorage` | ~5 MB per origin (browser) | `src/services/localStorageService.js:1-21` |
| Transient UI | `sessionStorage` (mindmap zoom + expanded IDs) | ~5 MB, cleared on tab close | `localStorageService.js:138-160` |
| Transient server | `multer.memoryStorage()` buffers | 10 MB per upload, RAM only | `server/index.js:174-176` — never written to disk |

`localStorageService.js:42-62` handles `QuotaExceededError` by clearing `nodeCache` then `chatHistory` as recovery.

---

## localStorage Keys (`src/services/localStorageService.js:1-21`)

| Key | Type | Purpose | Read/write sites |
|-----|------|---------|------------------|
| `career-gps:student-profile` | JSON `StudentProfile` | User onboarding answers | `App.jsx:39,55`, `localStorageService.js:66-72` |
| `career-gps:roadmap` | JSON `Roadmap` | Generated roadmap (milestones, courses, internships, certs, alternates, tree, skillGap) | `App.jsx:40,81`, `localStorageService.js:74-80` |
| `career-gps:financial-tier` | string `LOW\|MEDIUM\|HIGH` | Persisted tier override (separate from profile.financialTier) | `App.jsx:45`, `CareerMindmapView.jsx:44`, `localStorageService.js:82-88` |
| `career-gps:completed-milestones` | JSON `string[]` | Legacy milestone IDs (RoadmapDashboard still uses) | `RoadmapDashboard.jsx:79,129,606` |
| `career-gps:completed-deep-weeks` | JSON `string[]` | Deep plan weeks checked | `RoadmapDashboard.jsx:83,102-104,634` |
| `career-gps:deep-roadmap` | JSON `DeepRoadmapDetails` | 6-week plan + projects + advice | `RoadmapDashboard.jsx:80,107,112` |
| `career-gps:resume-analysis` | JSON `ResumeAnalysis` | Last resume analysis result | `RoadmapDashboard.jsx:81,115` |
| `career-gps:market-intel` | JSON `MarketIntelligence` | Last market intel result | `localStorageService.js:122-128` |
| `career-gps:chat-history` | JSON `ChatMessage[]` | Chat turn history | `localStorageService.js:130-136` |
| `career-gps:node-content-cache` | JSON `Record<nodeId, NodeContent>` | Lazy AI content per mindmap node | `RoadmapDashboard.jsx:100,185`, `CareerMindmapView.jsx:47` |
| `career-gps:node-states` | JSON `Record<nodeId, NodeState>` | Per-node lock state | `RoadmapDashboard.jsx:101,198`, `CareerMindmapView.jsx:48` |
| `career-gps:completed-goals-list` | JSON `string[]` | Goal-text checklist (mindmap) | `RoadmapDashboard.jsx:99`, `CareerMindmapView.jsx:49` |
| `career-gps:user-selections` | JSON `Record<selectionNodeId, optionText>` | Board/stream/UG/Masters choices | `RoadmapDashboard.jsx:102`, `CareerMindmapView.jsx:50` |
| `career-gps:sel-progression-*` | string per-profile | Workforce progression (SENIOR/MANAGER/EXECUTIVE) | `localStorageService.js:235-241` |
| `career-gps:sel-masters-tier-*` | string per-profile | Masters tier | `localStorageService.js:243-248` |
| `career-gps:mindmap-expanded` (session) | JSON `string[]` | Expanded node IDs (mindmap) | `localStorageService.js:138-148` |
| `career-gps:mindmap-zoom` (session) | JSON `{x,y,k}` | D3 zoom transform | `localStorageService.js:150-160` |

`clearCareerGpsStorage()` wipes every `career-gps:*` key in both storages (`localStorageService.js:162-179`). This is called on `Edit Profile / Restart` and on fatal parse errors (`App.jsx:50,106`).

---

## Core Entities (Zod Schemas — `src/schemas/roadmapSchemas.js`)

### StudentProfile (`studentProfileSchema:7-47`)

```ts
{
  name: string (trim, ≥1)
  stage: "CLASS_7_8" | "CLASS_9_10" | "CLASS_11_12" | "UNDERGRADUATE" | "POSTGRADUATE" | "WORKING"
  age: int 12–40
  field: { type: "TECH"|"SCIENCE"|"COMMERCE"|"ARTS"|"LAW"|"MEDICINE"|"DESIGN", customValue?:string }
       | { type:"OTHER", customValue: string(≥1) }
  skills: string[] (≥1, exclusive "None yet")
  goal: { type: "JOB_ROLE"|"STARTUP"|"HIGHER_STUDIES"|"NOT_SURE", description: string(≥1) }
  financialTier: "LOW"|"MEDIUM"|"HIGH"
  preferences: string[]
  onboardingPhase?: 1–4
  academicFocus?, timeCommitment?, tenthPath?, streamElectives?, prepStyle?,
  collegeDegree?, collegeEnvironment?, collegeFocus?, postCollegeChoice?,
  mastersPreference?, enableLongTerm?, startedInPhase1/2/3?, startStage?: string
}
```

Backend mirrors this as `profileSchema` with `passthrough()` at `server/index.js:81-88`.

### Roadmap (`roadmapSchema:120-128`)

```ts
{
  goalsToAchieve: { description:string, milestones: Milestone[] (≥1) }
  collegeCourses: CollegeCourse[]
  internships: Internship[]
  certifications: Certification[]
  alternatePaths: AlternatePath[]
  decisionTree: DecisionTreeNode   // programmatic, see below
  skillGap: { have: string[], need: {skill:string,milestoneId:string}[], bridgingSteps: string[] (≥1) }
  // optional non-validated transport flags
  isMock?: boolean
  warning?: string
}
```

### Milestone (recursive, `49-56`)

```ts
{ id:string, title:string, detail:string, phase:"shortTerm"|"longTerm"|"certifications"|"internships"|"goalsToAchieve",
  timeframe:string, prerequisites?: Milestone[] }
```

When generated via `generateMockRoadmap` or OpenAI, `phase` is always `"goalsToAchieve"` and `timeframe` is stage-specific (see `server/index.js:396-543` mapping).

### Tiered Items (all carry `financialTiers: ("LOW"|"MEDIUM"|"HIGH")[]`)

| Entity | Fields |
|--------|--------|
| `CollegeCourse` (`69-73`) | `id, name, semester, reason, financialTiers` |
| `Internship` (`75-80`) | `id, role, when, platforms[], stipendNote, financialTiers` |
| `Certification` (`82-88`) | `id, name, platform, cost, duration, impact, financialTiers` |

### AlternatePath (`90-96`)

```ts
{ id, title, salaryRange, skillOverlap: 0–100, pivotRequired }
```

### DecisionTreeNode (recursive, `98-109`)

```ts
{ id, label, type:"milestone"|"decision"|"goal"|"alternate",
  month, detail, financialTiers[], status:"not_started"|"in_progress"|"done",
  children: DecisionTreeNode[] }
```

Built programmatically by `buildTreeFromGoals` at `server/index.js:230-309` (root `"You are here"` → `"Goals Path"` → linear milestone chain with optional cert/alternate children). Also rebuilt in history layer at `src/utils/roadmapHelpers.js:662-676`.

### ScaffoldNode (mindmap, `247-261`)

```ts
{ id, label, type:"root"|"stage"|"semester"|"selection"|"checkpoint"|…,
  state:"locked"|"unlocked"|"in_progress"|"completed", depth:int, parentId:string|null,
  isSelectionPoint, isCheckpoint, isCurrentStage, isFinalGoal, color?, children:ScaffoldNode[] }
```

Bridge between roadmap's `decisionTree` (static) and mindmap's scaffold (interactive).

### Node & Checkpoint Content (lazy AI, `200-236`)

```ts
NodeContent = {
  goals: string[]
  skills: string[]
  achievements?: string[]
  milestones: {id, title, detail, timeframe}[]
  summary: string
  goal_reasons: Record<string,string>
  stageGoals?: string[]
  collegeCourses?, internships?, certifications?, alternatePaths?, options?, recommended_option?
  isMock?: boolean
}
CheckpointContent = {
  narrative: string, skills_earned: string[], certifications: string[],
  internships: string[], mini_resume: string, isMock?: boolean
}
```

### Deep Optimization (`172-186`)

```ts
DeepQuestions = { questions: {id, questionText, options:string[≥2]}[≥3] }
DeepRoadmapDetails = {
  weeklyStudyPlan: {week, topic, resource, actionItem}[≥3] // usually 6
  targetProjects: {title, techStack, description, phases:string[≥2]}[≥2]
  strategicAdvice: string
}
```

---

## Relationships & Lifecycle

```mermaid
erDiagram
  StudentProfile ||--|| Roadmap : generates
  Roadmap ||--o{ Milestone : contains
  Milestone ||--o{ Milestone : prerequisites
  Roadmap ||--o{ CollegeCourse : recommends
  Roadmap ||--o{ Internship : recommends
  Roadmap ||--o{ Certification : recommends
  Roadmap ||--o{ AlternatePath : suggests
  Roadmap ||--|| SkillGap : analyzes
  Roadmap ||--|| DecisionTreeNode : embeds
  DecisionTreeNode ||--o{ DecisionTreeNode : children
  StudentProfile ||--|| ScaffoldTree : scaffoldBuilder
  ScaffoldTree ||--o{ ScaffoldNode : flattens
  ScaffoldNode ||--|| NodeContent : lazy cache 1:1
  ScaffoldNode ||--|| CheckpointContent : if checkpoint
  DeepQuestions ||--|| DeepRoadmapDetails : via answers
```

- **Create:** Onboarding → `parseStudentProfile` → `POST /api/generate-roadmap` → `normalizeRoadmapData` → `buildTreeFromGoals` → `processRoadmapForHistory` → `parseRoadmap` → `saveStudentProfile + saveRoadmap`.
- **Read:** `loadStudentProfile/LoadRoadmap` on `App.jsx` mount with cycle removal via `removeCycles` (`roadmapSchemas.js:134-155`) to handle the deliberately linked milestone chain.
- **Update:** Mindmap goal checkboxes → `completedGoals` set + `nodeStates` recalculation; selection choices → `userSelections` + re-evaluation; deep weeks → `completedDeepWeeks`; chat/market/resume each overwrite their key.
- **Delete:** `clearCareerGpsStorage()` or `GlobalErrorBoundary.handleReset` (`src/main.jsx:21`).
- **Indexes:** None — linear scans over small in-memory arrays (tens of nodes).

---

## Important Field Notes

- **Timeframe is not free text:** Must match the canonical list from `constructPrompt:398-415` (e.g., `CLASS_7_8` → 14 entries). Backend forcibly restamps by index (`server/index.js:636-638`) to fix LLM hallucinations.
- **Milestone IDs:** After history processing they become `p{N}-{originalId}` to keep phases distinct; `skillGap.need[].milestoneId` is also prefixed (`roadmapHelpers.js:683-689`).
- **Financial tier tags:** `isMock: true` + `warning` fields appear on fallback payloads (`server/index.js:944-946`).
- **Resume/Market/Chat payloads** are not constrained by `roadmapSchema` — they have separate shapes defined inline in `server/index.js` and pathforge components.
- **No foreign keys, no migrations, no indexes** — all integrity is Zod-level.

---

## What Is NOT Persisted

- Resume PDF bytes — parsed as text in-memory, discarded.
- Tavily search raw results — serialized only transitively as prompt context, not stored.
- OpenAI completions beyond the nested objects above (tokens/cost not tracked).
