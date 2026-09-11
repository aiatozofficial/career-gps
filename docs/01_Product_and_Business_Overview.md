# 01 — Product and Business Overview

*Written for non-technical stakeholders first; technical annotations are in bracketed evidence refs.*

## What the Product Does

Career GPS is an **interactive career planner** delivered as a website. A user answers ~12 quick onboarding questions about their education stage, field, skills, budget, and goal. The system then generates a **personalized roadmap** — shown as:

- a **dashboard** (checklists for goals, courses, internships, certifications, alternate paths, skill gaps),
- a **career mindmap** (pan/zoom tree where each node holds lazily loaded AI content), and
- a **timeline** (linear chronological progression).

The roadmap **changes in real time**: checking a goal updates the mindmap node state (locked → unlocked → in_progress → completed) and cascades unlocks downstream (`src/data/scaffoldBuilder.js:518-531`). A **financial tier** toggle (Free only / Affordable / Self-funded) instantly filters courses/internships/certs (`src/utils/roadmapHelpers.js:1-3`).

**Evidence:** `src/App.jsx`, `src/data/scaffoldBuilder.js`, `server/index.js:771-950`.

---

## Why It Exists

From `CAREER_GPS_OVERVIEW.md:8-17`: standard career counseling fails because it is generic, static, and budget-blind. Career GPS's vision statement (same file:15-17) is:

> *"To democratize elite, bespoke career strategy — a customized, visually stunning, and financially aligned blueprint that breathes and evolves as the user learns, builds, and progresses."*

The value proposition versus static roadmaps (`CAREER_GPS_OVERVIEW.md:134-142`) is customization, financial awareness, progress tracking, deep 6-week study planning, and a premium interactive experience.

**Distinguished as:** `Not Confirmed` whether this vision reflects validated business outcomes or metrics — no analytics, KPIs, or user research artifacts were found in the repository.

---

## Who Uses It

| Segment | Stage value | Primary need | Pain point | Career GPS answer |
|---------|-------------|--------------|------------|-------------------|
| College students | `UNDERGRADUATE`, `POSTGRADUATE` | Semester pacing, internships, placements | Lack of project guidance | Semesters 1–8 with checkpoints, NPTEL/SWAYAM course suggestions, Internshala/Naukri internships (`server/index.js:377-383`) |
| Career switchers | `WORKING` | Quarterly pacing, leadership tracks | Fear of restarting, time constraints | Quarterly blocks + Junior → Mid → Senior → Goal chain (`scaffoldBuilder.js:262-304`) |
| Self-taught learners | `CLASS_7_8`–`CLASS_11_12` with `LOW` tier | Free resources, milestones | High bootcamp costs | Free-tier guardrail forces stipend/internship filtering (`server/index.js:386-389`) |

*Non-technical note:* The same app adapts from a 14-year-old middle-schooler to a 24-year-old working professional — the tree's shape changes by stage.

---

## Major User Types (System Perspective)

There is **one effective user role**: the **local browser user**. The app has:

- `Implemented`: No roles/permissions, no admin, no multi-user. Everyone who opens the app sees the same features and can create a profile.
- `Not Applicable`: Authentication, authorization, tenant isolation — none exist and none are claimed.

See `14_Admin_Guide.md` and `17_Security_and_Privacy.md` for explicit `Not Applicable` statements.

---

## Primary User Journeys

### Journey 1 — First-time onboarding → roadmap

1. **Welcome** (`src/components/WelcomePage.jsx`) → click "Get Started".
2. **OnboardingWizard** 12 steps (`src/components/onboarding/OnboardingWizard.jsx:141-482`): name → stage → age → field → skills (with optional AI suggestions for `OTHER` fields) → goal type → goal description follow-up → prepStyle → academicFocus → timeCommitment → financialTier → preferences.
3. **Validation** via `parseStudentProfile` (`src/schemas/roadmapSchemas.js:7-47`) — errors surface inline.
4. **Generating** (`src/components/GeneratingScreen.jsx`) while `POST /api/generate-roadmap` runs (or mock fallback).
5. **Mindmap** (`src/components/roadmap/CareerMindmapView.jsx`) — interactive scaffold renders immediately.
6. **Dashboard / Timeline** accessible via header buttons (`src/App.jsx:120-143`).

### Journey 2 — Explore mindmap, complete goals

1. Mindmap header shows **progress ring** (`CareerMindmapView.jsx:674`) and tier toggle.
2. **Hover** a node → preview card; **click** to lock-open a popover (`MindmapNodePopover.jsx`); checkpoint nodes open `CheckpointPanel.jsx`.
3. Content for each node is fetched lazily from `POST /api/node-content` on first open (`CareerMindmapView.jsx:297-329`) and cached in `localStorage` (`services/localStorageService.js:185-192`).
4. Checking a **goal checkbox** toggles `completedGoals` and triggers `reevaluateStates` which may mark the node `completed` and unlock children (`CareerMindmapView.jsx:439-477`).
5. **Selection nodes** (board, UG tier, postgrad choice, masters) require choosing a branch; confirming unlocks the downstream subtree (`CareerMindmapView.jsx:369-413`).

### Journey 3 — Deep optimization (6-week plan)

1. From Dashboard → **Deep Insights** section → launch `DeepOptimizationWizard.jsx`.
2. `POST /api/generate-deep-questions` returns 3 tailored multiple-choice questions.
3. User answers → `POST /api/generate-deep-roadmap` returns `weeklyStudyPlan` (6 weeks) + 2 `targetProjects` + `strategicAdvice`.
4. Weeks have independent checkboxes persisted as `career-gps:completed-deep-weeks` (`localStorageService.js:98-104`).

### Journey 4 — Resume analysis / Market intel / Chat

- **Resume:** Upload PDF in Dashboard → `POST /api/analyze-resume` (Multer + pdf-parse) → strengths/gaps/recommendations panel (`pathforge/ResumeAnalyzer.jsx`).
- **Market intel:** Enter job title + optional field/location → `POST /api/market-intelligence` (optionally enriches via Tavily) → demand/salary/skills/companies/listings (`pathforge/MarketIntelligence.jsx`).
- **Chat:** Conversation history `POST /api/career-chat` → `Antigravity Career Advisor` persona (profile + roadmap + resume context) (`pathforge/CareerChat.jsx`).

---

## Major Features (by Dashboard Section)

| Section | Source of truth | What the user sees |
|---------|-----------------|--------------------|
| Goals to Achieve | `roadmap.goalsToAchieve.milestones` (AI or mock) | Expandable milestone cards with prerequisites and completion checkboxes |
| Courses | `roadmap.collegeCourses` filtered by `financialTier` | Course name, semester, reason; suppressed for CLASS_7_8/9_10 stages (`RoadmapDashboard.jsx:383`) |
| Internships | `roadmap.internships` filtered | Role, when, platforms, stipend note |
| Certifications | `roadmap.certifications` filtered | Name, platform, cost, duration, impact |
| Alternate paths | `roadmap.alternatePaths` | Title, salary, overlap%, pivotRequired |
| Skill gap | `roadmap.skillGap` | Have / need / bridgingSteps |
| Resume Analyzer | `/api/analyze-resume` result | Skills with match%, experience, education, strengths/gaps/recs |
| Market Intel | `/api/market-intelligence` | Demand level, salary, trending skills, companies, listings, insights |
| AI Chat | `/api/career-chat` | Markdown responses + suggested follow-ups |
| Deep Insights | `/api/generate-deep-roadmap` | 6-week plan weeks + 2 projects + strategic advice |

---

## Business Rules (Implemented, with evidence)

| Rule | Implemented | Evidence |
|------|-------------|----------|
| Age 12–40 enforced; stage-specific default ages | Yes | `roadmapSchemas.js:10`, `OnboardingWizard.jsx:7-14` |
| Skills: `None yet` exclusive (cannot combine) | Yes | `roadmapSchemas.js:21-24`, `OnboardingWizard.jsx:503` |
| Financial tier enum LOW/MEDIUM/HIGH required | Yes | `roadmapSchemas.js:3,29` |
| `"Free only"` hides MEDIUM/HIGH-only internships/certs/courses | Yes | `roadmapHelpers.js:2`, `RoadmapDashboard.jsx:375` |
| Courses/internships/certs hidden for CLASS_7_8/9_10 | Yes | `RoadmapDashboard.jsx:383-388` |
| Board selection (CBSE/State/Diploma) after Grade 10 checkpoint | Yes | `scaffoldBuilder.js:329-339` |
| UG degree selection after Grade 12 checkpoint | Yes | `scaffoldBuilder.js:341-355` |
| Postgrad: Workforce vs Masters selection | Yes | `scaffoldBuilder.js:112-183` |
| Goal type NOT_SURE auto-generates exploratory goal | Yes | `OnboardingWizard.jsx:550-553, 857` |
| Domain guardrails: NPTEL/SWAYAM, Internshala/Naukri, NASSCOM localization | Yes (prompt-level, not hard-enforced) | `server/index.js:376-384` |
| LOW tier forces stipend-guaranteed internships | Prompt-level | `server/index.js:386-390` |
| Offline mock fallback ensures app remains usable without OpenAI | Yes | `server/index.js:837-950`, `App.jsx:87-99` |

---

## Expected Value (Claimed vs Verifiable)

| Claimed (CAREER_GPS_OVERVIEW.md) | Verifiable in repo |
|----------------------------------|-------------------|
| Equity: free 6-week plan with verified free links | `Not Confirmed` — links are AI-generated strings, not verified URLs |
| Interactive proof-of-work portfolios | `Partially Implemented` — project templates are generated, but no portfolio hosting |
| Reduced analysis paralysis via visual checkoffs | UI exists; outcome metrics do not |
| Business/monetization/SLA metrics | `Not Found` — no analytics, payments, or SLAs |

Do not present unverified business outcomes as fact. Mark them `Not Confirmed`.

---

## Current Limitations (Non-Technical Summary)

- No login — anyone clearing browser data loses progress.
- No verified pricing, payments, or hiring integrations — job listings are AI-generated placeholders (URLs point to generic portals).
- No human advisor — AI chat quality depends on OpenAI and is not fact-checked against live data unless Tavily is configured.
- Middle-school paths use lightweight placeholders; college/working paths are richer.

See `12_Known_Issues_and_Limitations.md` for the technical detail.
