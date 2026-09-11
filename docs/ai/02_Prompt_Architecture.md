# AI — 02 Prompt Architecture

*All prompts are monolithic user-role strings assembled server-side and sent as a single `messages:[{role:"user", content: prompt}]` completion (`server/index.js:212-215`). No multi-turn system prompt, no tool calling, no history (except serialized into the prompt itself).*

## Inventory

| Prompt builder | Handler | Word count (approx) | Lines |
|----------------|---------|---------------------|-------|
| `constructPrompt(profile)` (+ `constructPrompt → milestoneTimeframes` mapping) | `POST /api/generate-roadmap` | ~900 | `362-613` |
| `constructDeepQuestionsPrompt(profile, roadmap)` | `POST /api/generate-deep-questions` | ~220 | `1000-1043` |
| `constructDeepRoadmapPrompt(profile, roadmap, answers)` | `POST /api/generate-deep-roadmap` | ~160 | `1045-1079` |
| `constructSuggestSkillsPrompt(fieldType, customFieldValue)` | `POST /api/suggest-skills` | ~70 | `1152-1165` |
| Inline (resume analysis) | `POST /api/analyze-resume` | ~300 | `1261-1308` |
| Inline (market intelligence + Tavily) | `POST /api/market-intelligence` | ~300 + optional injected `searchResults` JSON | `1419-1460` |
| Inline (career chat — Antigravity Career Advisor) | `POST /api/career-chat` | ~260 + chat history tail | `1539-1572` |
| Per-node (uses `AGE_CONTENT_RULES`, `getOfflineMockNodeContent`) | `POST /api/node-content` | ~400 | `2057-~2140` |
| Checkpoint synthesis | `POST /api/checkpoint` | ~200 | checkpoint handler |

All demand `"Return only the JSON object. Do not wrap in \`\`\`json ... \`\`\`"` and `response_format: json_object`.

---

## `constructPrompt(profile)` — Core Roadmap (`362-613`)

### Inputs serialized into the prompt

- `profile.name`, `profile.stage` (×6 stage variants), `profile.age`, `fieldLabel` (`OTHER → customValue` else `type`), `profile.skills.join(", ")`, `goal.type`, `goal.description`, `profile.financialTier`, `profile.preferences.join(", ")`
- Derived: `degree` via `inferCollegeDegree(profile)` (`311-360`), `collegeEnv` / `collegeFocus` / `timeCommit` / `longTerm` flags

### Variant branches

| Stage | Milestone timeframes (canonical) | Stage instruction (`stageRulesPrompt`) |
|-------|----------------------------------|----------------------------------------|
| `CLASS_7_8` | 14 entries: `Grade 8 (Months 1-6)` → `Year 10+ (Lead/Specialist)` | Hobby/curiosity, no tools (`399-424`) |
| `CLASS_9_10` | 12 entries: `Grade 9` → `Year 10+` | Board prep, no internships in early years (`426-448`) |
| `CLASS_11_12` | 10 entries: `Grade 11` → `Year 10+` | Stream adaptation, college entrance (`450-469`) |
| `UNDERGRADUATE` | 8 entries: `College Year 1` → `Year 10+` | GPA → internship → capstone progression (`470-488`) |
| `POSTGRADUATE` | 6 entries: `Postgrad Year 1` → `Year 8+` | Research/specialization → junior transition (`489-504`) |
| `WORKING` | 6 entries: `Working Year 1` → `Year 8+` | Upskilling, portfolio, lateral transitions (`506-522`) |

`goalsToAchieveInstructions` (`530-543`) requires *exactly* `milestoneTimeframes.length` milestones, each with `id, title, detail, timeframe, phase:"goalsToAchieve", prerequisites[2-3]`. A **CRITICAL TIMEFRAME RULE** directive demands that `timeframe` is copied character-exact from the list — mitigated post-hoc by `normalizeRoadmapData:636-638` forcibly restamping `timeframe` by index to fix hallucinated `Month 12 (Board Focus)` etc.

### Guardrails injected into every prompt

```text
1. Prerequisite Chronology Rule — foundations (statistics, Excel) before advanced frameworks (Pandas/SQL/databases)
2. Regional Platform Standardization — College:NPTEL/SWAYAM, Internships:Internshala/Naukri, Certs:NASSCOM/FutureSkills/SWAYAM
3. Current Skill Adaptation — if they already possess foundational skills, start at an appropriately advanced level
4. LOW-tier Stipend Rule (financialTier===LOW) — Every internship MUST be stipend-guaranteed, listed on Internshala/Naukri
   else: Stipend Guidance matching budget tier
```

At `376-394`.

### JSON schema demanded

```
goalsToAchieve: { description:string, milestones: {id,title,detail,timeframe,phase,prerequisites:{id,title,detail,phase,timeframe,prerequisites:[]}[]}[] }
collegeCourses: {id,name,semester,reason,financialTiers}[3]
internships: {id,role,when,platforms[],stipendNote,financialTiers}[3]
certifications: {id,name,platform,cost,duration,impact,financialTiers}[4]
alternatePaths: {id,title,salaryRange,skillOverlap:0-100,pivotRequired}[3]
skillGap: { have:string[], need:{skill,milestoneId}[], bridgingSteps:string[3] }
( decisionTree NOT asked — built programmatically )
```

At `562-607`.

### Sanitization + post-processing

- Before interpolation: `sanitizeProfile` (`31-78`) caps each user field (100–500 chars) and strips `System:`, `###`, backticks.
- After parse: `cleanGeminiJsonResponse` (`155-163`) strips ``` fences; `JSON.parse` catch → `[Backend] Failed to parse JSON` → mock fallback (`798-805`).
- Normalization: `normalizeRoadmapData(data, milestoneTimeframes)` (`615-769`) — forcibly restamps every `milestone.timeframe` by index, fixes bridgingSteps empties, normalizes tier fallbacks, skillOverlap strings, and `skillGap.need[].milestoneId` validation against `validMilestoneIds`.

---

## Deep Questions Prompt (`1000-1043`)

Template: `The user named ${name} ... has onboarded with Stage/Age/Field/Skills/Goal/Budget. We generated ... roadmap summary "${goalsToAchieve.description}". Generate exactly 3 personalized multiple-choice questions (sub-specialization, time commitment/learning style, employer/industry). Output must be JSON `{ questions: [{id:"q1", questionText, options:[4]}×3] }` (no markdown).`

Real prompt uses roadmap description snippet only — not the full course/internship list. `temperature:0.2`.

## Deep Roadmap Prompt (`1045-1079`)

Template: `User ${name} (Stage, Goal) completed Phase 2 with answers:` \n\n `Question: ...\nAnswer Selected: ...` ×3 \n\n `Based on these + original roadmap + budget tier, construct a Deep Optimization Study & Project Plan.`

Demanded JSON:

```json
{
  "weeklyStudyPlan": [{ "week":"Week 1", "topic":"...", "resource":"...", "actionItem":"..." }×6],
  "targetProjects": [{ "title":"...", "techStack":"...", "description":"...", "phases":["Phase 1 ...","Phase 2 ...","Phase 3 ..."] }×2],
  "strategicAdvice": "3–4 sentences of coaching advice"
}
```

Fallback: `fallbackDeepRoadmap` (`974-998`) — Weeks 1–6 covering workspace → API → Git → UI → tests → deploy; two projects (Portfolio, Task Board).

## Suggest-Skills Prompt (`1152-1165`)

Template: `User selected discipline "${fieldLabel}". Suggest 6–8 domain-specific, modern skills (1–2 words), domain-only not soft skills. JSON { skills: ["..."] }.`

Culinary example embedded; expressly forbids `Communication, Teamwork`.

## Resume Analysis Prompt (`1261-1308`)

Template:

```
You are an expert HR recruiter. Candidate Profile: Name/Stage/Field/GoalType/GoalDescription/CurrentSkills.
Resume Extracted Text: """ ${pdfText} """

Identify: 1) skills[≤12] with match% 2) experience[≤3] 3) education[≤2] 4) strengths[3] 5) gaps[3] 6) recommendations[3].
JSON schema described at 1288-1308.
```

`pdfText` is the first 3 pages, sanitized to ≤10k chars; unreadable PDF substitutes `"[Failed to parse PDF file ...]"`.

## Market Intelligence Prompt (`1419-1460`)

Template:

```
You are a job market research analyst. Analyze current market for "${jobTitle}" in "${field}" ${location? Focus on location:}.
${searchResults? "Here is live web search: \"\"\"" + results + "\"\"\"": "Utilize up-to-date knowledge."}
Generate { demandLevel, avgSalary, trendingSkills[5], topCompanies[3], jobListings[2 with title/company/location/salary/url], marketInsights: "3–4 sentence paragraph" }.
```

Tavily enrichment injected only when `TAVILY_API_KEY` is configured (`1383-1410`); raw results are JSON-stringified and embedded verbatim.

## Career Chat Prompt (`1539-1572`)

Persona: `You are "Antigravity Career Advisor", a helpful, empathetic, highly knowledgeable career guide.`  
Context block serializes:

- `Name, Stage, Field, GoalType, GoalDescription, Current Skills`
- `Roadmap summary (goalsToAchieve.description) if present`
- `Resume skills/strengths/gaps if present`

Then: `Conversation History: ${messages.map(m => "User:/Advisor: content").join("\n")}`

Demanded output:

```json
{ "response": "markdown-formatted message with bolding/lists", "suggestedActions": ["question 1","question 2"] }
```

`response` renders as markdown in `pathforge/CareerChat.jsx`. `suggestedActions` is exactly 2–3 quick-reply chips. `messages` each `sanitizeInput(...,2000)` capped before interpolation.

## Per-Node Content Prompt (`2057-~2140`)

Uses `AGE_CONTENT_RULES:1604-1611` (age-banded guardrails):

```
CLASS_7_8:  "12–14: ONLY curiosity, puzzles, math, hobby projects, reading, Scratch/Excel. NEVER SQL/APIs/frameworks/internships/certs."
CLASS_9_10: "14–16: reasoning, beginner tools, career exploration. NEVER advanced frameworks/real internships/pro certs."
CLASS_11_12: "16–18: intermediate concepts, board prep, NPTEL/SWAYAM free tier, first small portfolio. NEVER production projects/paid internships."
UNDERGRADUATE: "18–22: Yr1-2 beginner-intermediate + first internship prep ..."
POSTGRADUATE: "22–24: research depth, publications ..."
WORKING: "22+: leadership, portfolio refinement ..."
```

Plus `stageFocusRules` for `sem-`/`semester`/`goal-` nodes, selection values (`node-board-select`, `node-ug-select`, `node-masters-select`, `node-postgrad-select`), `completedMilestones`/`allCompletedGoals` tails (duplicate repetition prevention), and `isCheckpointType` flag gating achievements vs goals.

Offline path: `getOfflineMockNodeContent` (`1613-2055`) — stage → `goal-N` numeric remap + checkpoint achievements vs regular goals, field-aware branches (`TECH/SCIENCE` vs `COMMERCE`), and `goal_reasons` synthesis.

## Common Prompt Hygiene

- Every prompt demands **"Return only the JSON object. Do not wrap in markdown code blocks."** plus `response_format: json_object` server-side and post-hoc `cleanGeminiJsonResponse` fence stripping.
- Sanitization cap prevents `promptText` blow-up beyond field limits, but **no truncation warning** is returned to the client — overlong inputs are silently sliced.
- No token count is emitted per generation; budget control is prompt-length discipline plus the single shared `temperature:0.2`.
