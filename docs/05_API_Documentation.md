# 05 — API Documentation

## Overview

All endpoints live in **`server/index.js`** (Express 5). Re-exported as a Vercel serverless function via **`api/index.js`** (`import app from "../server/index.js"`). Every `POST` body is validated via **`validateRequest(Zod)`** (`server/index.js:146-153`) and sanitized (`sanitizeInput`/`sanitizeProfile`, lines 11-78). Dev proxy rewrites `/api/*` → `http://localhost:5000` (`vite.config.js:17-23`).

**Base URLs:**
- Local dev: `http://localhost:5000` (backend) via Vite proxy `http://127.0.0.1:5173/api/*`
- Vercel: `{deployment}/api/*`

**Auth:** `None Applicable` — no authentication on any endpoint, no API keys required from the client. The server's own `OPENAI_API_KEY` is never exposed to the client.

**Common behavior:** If `genAI === null` (no `OPENAI_API_KEY` configured) or the OpenAI call throws, every handler returns a **high-fidelity mock** (`isMock:true` + `warning` string) with HTTP `200`, except `analyze-resume` upload errors which return `400`. LLM outputs are cleaned via `cleanGeminiJsonResponse` (strip ` ``` ` fences, lines 155-163). Production static serving is `express.static(dist)` + SPA catch-all `GET /{*path}` → `dist/index.html` (`server/index.js:2482-2489`); on Vercel (`VERCEL` env) the catch-all uses `api/index.js` wrapper instead.

---

## `POST /api/init-roadmap` — Lightweight Init (Frontend Entry Point)

**Handler:** `server/index.js:2319-2479` • **Validation:** `profileSchema:81-88` • **Caller:** `src/App.jsx:60` `fetch("/api/init-roadmap")`

**Purpose:** Minimal 1-milestone scaffold used to initialize the mindmap immediately. Returns `{ goalsToAchieve:{milestones:[1×{id:"node-root-ms-1",title:"Initial Stage: {stage} Focus", timeframe:"NOW"}]}, collegeCourses:[1?], certifications:[1?], alternatePaths:[1?], skillGap:{have:skills, need:[1 skill→node-root-ms-1]}, decisionTree:{id:"node-root", label:"You Are Here", … children:[] } }`. Mock returns bare skeleton with empty courses/internships/certs. This endpoint's response still passes `parseRoadmap` but has `children:[]` (no linked chain) — the linked scaffold is supplied separately by `src/data/scaffoldBuilder.js` in the frontend.

Distinct from `POST /api/generate-roadmap` (below) which builds the full stage-timeline.

## `POST /api/generate-roadmap` — Full Stage-Timeline Roadmap

- **Handler:** `server/index.js:771-950`
- **Validation schema:** `profileSchema:81-88` (via `validateRequest(profileSchema)`)

**Purpose:** Canonical full roadmap entry-point producing `goalsToAchieve` (6–14 milestones per stage, canonical timeframes), `collegeCourses[≤3]`, `internships[≤3]`, `certifications[≤4]`, `alternatePaths[≤3]`, `skillGap`, and the programmatic `decisionTree` (linear `buildTreeFromGoals` chain). `init-roadmap` above is the onboarding entry; `generate-roadmap` is the full-generation contract.

**Auth:** None

**Request body** (`application/json`):

```json
{
  "name": "Aarav",
  "stage": "UNDERGRADUATE",
  "age": 19,
  "field": { "type": "TECH", "customValue": "" },
  "skills": ["Python", "Excel"],
  "goal": { "type": "JOB_ROLE", "description": "I want to become a data analyst" },
  "financialTier": "MEDIUM",
  "preferences": ["Prefer online"],
  "academicFocus": "Balanced",
  "timeCommitment": "Balanced"
  // … any additional profile keys via .passthrough()
}
```

Required: `name`, `stage`, `goal.type`, `goal.description`. Other fields sanitized and optional.

**Validation errors (400):**

```json
{ "error": "Invalid input data: name: Profile name is required" }
{ "error": "Invalid profile data provided. Profile name and goal description are required." }
```

**Success response (200):**

```json
{
  "goalsToAchieve": { "description": "...", "milestones": [ { "id":"goal-1", "title":"...", "detail":"...", "timeframe":"...", "phase":"goalsToAchieve", "prerequisites":[...] } ] },
  "collegeCourses": [{ "id":"course-1", "name":"...", "semester":"...", "reason":"...", "financialTiers":["LOW","MEDIUM","HIGH"] }],
  "internships": [{ "id":"intern-1", "role":"...", "when":"...", "platforms":["Internshala"], "stipendNote":"...", "financialTiers":[...] }],
  "certifications": [{ "id":"cert-1", "name":"...", "platform":"Coursera", "cost":"Free", "duration":"4-6 weeks", "impact":"...", "financialTiers":[...] }],
  "alternatePaths": [{ "id":"alt-1", "title":"...", "salaryRange":"₹...", "skillOverlap":65, "pivotRequired":"..." }],
  "skillGap": { "have":["Python"], "need":[{ "skill":"SQL", "milestoneId":"goal-1" }], "bridgingSteps":["..."] },
  "decisionTree": { "id":"root-now", "label":"You are here", "type":"decision", "month":"Now", "detail":"Start from ...", "financialTiers":["LOW","MEDIUM","HIGH"], "status":"in_progress", "children":[...] },
  "isMock": true,            // only on fallback
  "warning": "OpenAI API error (Rate Limit/Invalid Key/Quota). ..."
}
```

**On error (OpenAI failure):** Same shape with mock milestones/courses, `isMock:true` (`server/index.js:838-948`).

**Implementation refs:** prompt `constructPrompt:362-613`, normalize `normalizeRoadmapData:615-769`, tree `buildTreeFromGoals:230-309`, mock `838-948`.

---

## `POST /api/generate-deep-questions`

Generate 3 personalized multiple-choice questions to feed the deep optimization wizard.

- **Handler:** `server/index.js:1081-1112`
- **Validation schema:** `generateDeepQuestionsSchema:90-93`

**Auth:** None

**Request:**

```json
{ "profile": { "...StudentProfile" }, "roadmap": { "...Roadmap" } }
```

**Success (200):**

```json
{
  "questions": [
    { "id":"q1", "questionText":"Which specific focus area matches your interest best?", "options":["Technical Core & Engineering", "Data, Metrics & Analytics", "Product Strategy & Operations"] },
    { "id":"q2", "questionText":"How many hours per week can you realistically dedicate?", "options":["3-5 hours", "6-12 hours", "15+ hours"] },
    { "id":"q3", "questionText":"What type of employer environment ...?", "options":["Agile Early-Stage Startups", "Established Corporations & Brands", "Freelancing / Independent Remote Work"] }
  ]
}
```

**On OpenAI failure (200, not error):** Returns `fallbackQuestions:953-971`.

**Error (400):** Missing `profile` or `roadmap` → `{ "error": "Profile and roadmap data are required." }`.

---

## `POST /api/generate-deep-roadmap`

Produce the 6-week study plan and 2 target projects.

- **Handler:** `server/index.js:1114-1150`
- **Validation schema:** `generateDeepRoadmapSchema:95-103`

**Auth:** None

**Request:**

```json
{
  "profile": { "...StudentProfile" },
  "roadmap": { "...Roadmap" },
  "answers": [
    { "questionId":"q1", "questionText":"Which focus area ...?", "answerText":"Data, Metrics & Analytics" }
  ]
}
```

Requires `answers` array ≥1; each `answerText` trimmed ≥1.

**Success (200):**

```json
{
  "weeklyStudyPlan": [
    { "week":"Week 1", "topic":"Workspace Configuration & Core Fundamentals", "resource":"freeCodeCamp & MDN Guides", "actionItem":"Configure local dev environment and run a basic prototype." }
    // ... Weeks 2-6
  ],
  "targetProjects": [
    { "title":"Interactive Professional Portfolio", "techStack":"React.js, TailwindCSS, GitHub Pages", "description":"...", "phases":["Phase 1: ...", "Phase 2: ...", "Phase 3: ..."] }
    // ... 2 projects
  ],
  "strategicAdvice": "Consistency is your greatest advantage..."
}
```

**On OpenAI failure (200):** Returns `fallbackDeepRoadmap:974-998` (Weeks 1-6 + 2 projects).

**Error (400):** `{ "error": "Profile, roadmap, and answers are required." }` or Zod validation string.

---

## `POST /api/suggest-skills`

Suggest 6–8 domain-specific skills for custom `OTHER` fields.

- **Handler:** `server/index.js:1167-1198`
- **Validation schema:** `suggestSkillsSchema:141-144`

**Auth:** None

**Request:**

```json
{ "fieldType": "OTHER", "customFieldValue": "Culinary Arts" }
```

**Success (200):**

```json
{ "skills": ["Knife skills", "Food safety", "Plating techniques", "Menu planning", "Garde manger", "Baking/Pastry"] }
```

**On OpenAI failure / missing key (200):** `{ "skills": [] }` (frontend then falls back to `getFallbackSkills` at `OnboardingWizard.jsx:116-121`).

---

## `POST /api/analyze-resume`

Parse a resume PDF and compare against the user's profile/goal.

- **Handler:** `server/index.js:1200-1351`
- **Upload:** `multer.memoryStorage()`, 10 MB limit, MIME `application/pdf` only (`174-184`), field name `resume`.
- **Profile validation:** `profileSchema.safeParse` on `req.body.profile` JSON string (`1215-1225`).

**Auth:** None

**Request (`multipart/form-data`):**

| Field | Type | Notes |
|-------|------|-------|
| `resume` | file | PDF, ≤10 MB, required |
| `profile` | string (JSON) | Serialized `StudentProfile`, required; validated with same `profileSchema` |

**Success (200):**

```json
{
  "skills": [{ "name":"Python", "match":85 }, { "name":"SQL", "match":70 }],
  "experience": [{ "role":"Junior Developer Intern", "company":"Software Lab", "duration":"6 Months" }],
  "education": [{ "degree":"B.Tech Computer Science", "field":"Software Engineering", "school":"National Institute", "year":"2024" }],
  "strengths": ["Solid understanding of Python scripting.", "..."],
  "gaps": ["Lacks advanced SQL optimization.", "..."],
  "recommendations": ["Prioritize advanced SQL on Swayam/NPTEL.", "..."],
  "isMock": true, "warning": "..."   // only on fallback
}
```

**Errors:**

- `400 { "error": "Only PDF files are supported for resume analysis." }` — multer fileFilter
- `400 { "error": "File size limit exceeded. Max size allowed is 10MB." }`
- `400 { "error": "No resume file uploaded." }`
- `400 { "error": "Invalid profile data: ..." }`
- `400 { "error": "Invalid JSON format in profile data." }`

**PDF caveats:** `pdfParse(file.buffer, {max:3})` (`1244`) extracts first 3 pages, then `sanitizeInput(...,10000)` caps text. Unreadable PDFs yield a sentinel string substituted into the prompt (`1252-1253`).

---

## `POST /api/market-intelligence`

Market demand/salary/skills for a job title.

- **Handler:** `server/index.js:1353-1500`
- **Validation schema:** `marketIntelligenceSchema:135-139`

**Auth:** None

**Request:**

```json
{ "jobTitle": "Data Analyst", "field": "TECH", "location": "Bengaluru" }
```

**Success (200):**

```json
{
  "demandLevel": "HIGH",                           // LOW | MEDIUM | HIGH | VERY_HIGH
  "avgSalary": "₹6,00,000 - ₹11,00,000 per annum",
  "trendingSkills": ["Python", "SQL", "Git", "React.js", "Docker"],
  "topCompanies": ["TCS", "Infosys", "Wipro", "Cognizant", "Tech Mahindra"],
  "jobListings": [{ "title":"Junior Python Developer Intern", "company":"Cognizant", "location":"Bengaluru (Hybrid)", "salary":"₹15,000/month", "url":"https://internshala.com" }],
  "marketInsights": "Hiring velocity remains high ...",
  "isMock": true, "warning":"..." // only on fallback / no key
}
```

Optional **Tavily** enrichment: if `TAVILY_API_KEY` is set, the handler POSTs to `https://api.tavily.com/search` for the query `"... job market ... 2026"` and injects results into the OpenAI prompt (`1384-1410`).

**Error (400):** `{ "error": "jobTitle is required." }`

---

## `POST /api/career-chat`

Interactive context-aware career advisor.

- **Handler:** `server/index.js:1502-1597`
- **Validation schema:** `careerChatSchema:125-133`

**Auth:** None

**Request:**

```json
{
  "messages": [{ "role":"user", "content":"How can I improve my SQL?" }],
  "profile": { "...StudentProfile" },
  "roadmap": { "...Roadmap" | null },
  "resumeAnalysis": { "...ResumeAnalysis" | null }
}
```

`role` enum: `user | assistant | model | system`. ≥1 message, each `content` trimmed ≥1.

**Success (200):**

```json
{
  "response": "Hello! I am currently operating in **High-Fidelity AI Mock Mode** ...\n\n- Point 1\n- Point 2",
  "suggestedActions": ["How can I improve my skills for my target role?", "What projects should I host on GitHub?", "Curate a list of free certifications"],
  "isMock": true, "warning":"..." // when genAI null or OpenAI error
}
```

On failure the mock `response` is markdown-formatted (as above). Real responses are also markdown inside `response`.

**Error (400):** `{ "error": "messages array is required." }` or Zod validation details.

---

## `POST /api/node-content`

Lazy per-node AI content (goals/skills/summary). Opens when a mindmap node reaches ~80% parent completion semantics (frontend eager + click).

- **Handler:** `server/index.js:2057-~2260`
- **Validation schema:** `nodeContentSchema:105-114`

**Auth:** None

**Request:**

```json
{
  "profile": { "...StudentProfile" },
  "nodeType": "semester",
  "nodeId": "node-sem-3",
  "nodeLabel": "Sem 3: Core Fields & Tool Mastery",
  "parentNodeLabel": "Sem 2: Foundations & First Skills",
  "completedMilestones": ["Goal 1", "Goal 2"],        // optional
  "userSelections": { "node-board-select": "CBSE - Science (MPC)" }, // optional
  "allCompletedGoals": ["Master the key concepts..."]  // optional
}
```

**Success (200):**

```json
{
  "goals": ["Master the key concepts and tools...", "Build a practical mini-project ...", "Document your progress ..."],
  "skills": ["SQL Databases", "Git & GitHub", "Database Design"],
  "achievements": [],                 // only for checkpoints
  "milestones": [{ "id":"node-sem-3-ms-1", "title":"Complete Sem 3 objectives", "detail":"Lay down solid foundations ...", "timeframe":"Sem 3: ..."}],
  "summary": "Semester 3 is about database management systems ...",
  "goal_reasons": { "Master the key concepts...": "Achieving this goal helps you build the necessary foundation ..." },
  "stageGoals": ["Master ...", "Build ..."],
  "isMock": true                      // when OpenAI unavailable / offline mapping used
}
```

**Offline mapping:** `getOfflineMockNodeContent(nodeId, nodeLabel, profile)` at `1613-2055` — maps `goal-N` IDs to stages/semesters by profile.stage, checkpoint branches to achievements, and field-aware goals.

**Age guardrails:** `AGE_CONTENT_RULES:1604-1611` (e.g., `CLASS_7_8` never suggests SQL/APIs; `CLASS_9_10` not advanced frameworks).

**Errors (400):** `{ "error": "profile, nodeId, and nodeType are required." }`.

---

## `POST /api/checkpoint`

Synthesize a checkpoint review narrative from completed milestones/skills.

- **Handler:** starts ~line 2140 in `server/index.js` (checkpoint handler — after node-content)
- **Validation schema:** `checkpointSchema:116-123`

**Request:**

```json
{
  "profile": { "...StudentProfile" },
  "checkpointLabel": "Year 2 Checkpoint",
  "completedGoals": ["..."],
  "completedSkills": ["SQL", "Git"],
  "completedCerts": ["NPTEL Python"],
  "completedInternships": ["Junior Developer Intern"]
}
```

**Success (200):**

```json
{
  "narrative": "You have completed ...",
  "skills_earned": ["SQL Databases", "Git & GitHub"],
  "certifications": ["NPTEL Python"],
  "internships": ["Junior Developer Intern"],
  "mini_resume": "...",
  "isMock": true
}
```

Matched by frontend `CheckpointPanel.jsx` via `handleCheckpointClick` in `CareerMindmapView.jsx:482-531`.

---

## Shared Validation & Error Contract

Every endpoint shares:

| Concern | Implementation |
|---------|----------------|
| Input sanitization | `sanitizeInput(val,maxLength)` strips null bytes, control chars, backticks/braces, markdown fences, `System:/User:` markers (`server/index.js:11-29`); `sanitizeProfile` applies per field (`31-78`) |
| Validation | `validateRequest(schema)` → `400 {error:"Invalid input data: path: message, ..."}` (`146-153`) |
| JSON fence cleanup | `cleanGeminiJsonResponse` → strip ``` wrappers (`155-163`) |
| Fallback on AI error | Most handlers `catch` → `res.json(fallback/mock)` with `200` (intentionally — keeps UX alive) |
| Transport | JSON (`application/json`) except `analyze-resume` (`multipart/form-data`) |

No endpoint requires headers beyond `Content-Type`. No rate limiting or API key auth.

---

## Testing Endpoints Locally

```bash
# Health-ish (if server has a GET root — currently no GET routes are configured;
# any POST endpoint can be probed; a 400 with "Invalid input data" confirms the server is up)
curl -X POST http://localhost:5000/api/generate-roadmap -H "Content-Type: application/json" -d '{}'

# With a valid profile
curl -X POST http://localhost:5000/api/generate-roadmap -H "Content-Type: application/json" -d @profile.json

# Resume (multipart)
curl -X POST http://localhost:5000/api/analyze-resume -F "resume=@r.pdf" -F 'profile={"name":"Aarav","stage":"UNDERGRADUATE","age":19,"field":{"type":"TECH","customValue":""},"skills":["Python"],"goal":{"type":"JOB_ROLE","description":"Data analyst"},"financialTier":"MEDIUM","preferences":[]}'

# Node content
curl -X POST http://localhost:5000/api/node-content -H "Content-Type: application/json" -d '{"profile":{"name":"Aarav","stage":"UNDERGRADUATE","age":19,"field":{"type":"TECH","customValue":""},"skills":["Python"],"goal":{"type":"JOB_ROLE","description":"Data analyst"},"financialTier":"MEDIUM","preferences":[]},"nodeType":"semester","nodeId":"node-sem-1","nodeLabel":"Sem 1: Campus & Academic Adaptation"}'
```
