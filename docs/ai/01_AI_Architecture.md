# AI — 01 Architecture

## Provider & Model

| Item | Value | Evidence |
|------|-------|----------|
| **Provider** | OpenAI API (Chat Completions) | `server/index.js:2,206-227` (`openai ^4.77.0` via `package.json:22`) |
| **Default model** | `gpt-4o-mini` (rapid, structured JSON native) | `server/index.js:200` (`const OPENAI_MODEL = process.env.OPENAI_MODEL \|\| "gpt-4o-mini"`) |
| **Override** | `OPENAI_MODEL` env → e.g., `gpt-4o` for higher quality | Same line, comment `server/index.js:199` |
| **Auth** | `OPENAI_API_KEY` env | `server/index.js:190` |
| **Mode toggle** | If `!OPENAI_CONFIGURED` (`BOOLEAN(OPENAI_API_KEY) && !== "YOUR_ACTUAL_OPENAI_API_KEY"`), `genAI = null` → every route runs mock path | `server/index.js:191-227` |

Legacy naming: handlers still reference `genAI` / `cleanGeminiJsonResponse` / `generationConfig: {responseMimeType:"application/json"}` lineage, but the live wire is OpenAI `response_format:{type:"json_object"}` (`server/index.js:215`).

---

## Adapter

`createAIClient(apiKey)` (`server/index.js:206-224`) preserves the previous provider call shape:

```js
getGenerativeModel({model}).generateContent(prompt) → { response:{ text():string } }
```

Internally it calls:

```js
client.chat.completions.create({
  model,
  messages:[{ role:"user", content: prompt }],
  response_format:{ type:"json_object" },
  temperature:0.2
})
```

Every route (`/api/generate-roadmap`, deep, chat, node-content, checkpoint, market, suggest-skills, resume) builds a **monolithic prompt string** and posts it as that single `user` message. No system prompt, no tool calling, no history beyond what's serialized into the prompt.

**Temperature:** `0.2` on every generation — low randomness, high determinism.

---

## Which Surfaces Use AI vs Deterministic Code

| Surface | AI used? | Deterministic counterpart | Where |
|---------|---------|---------------------------|-------|
| Roadmap milestones + courses/internships/certs/alternates/skillGap | Yes | `buildTreeFromGoals` (programmatic tree) + `normalizeRoadmapData` + inline mock fallback | `server/index.js:230-309,615-769,838-948` |
| Deep optimization quiz questions (3) | Yes | `fallbackQuestions:953-971` | `1081-1112` |
| Deep 6-week plan + projects | Yes | `fallbackDeepRoadmap:974-998` | `1114-1150` |
| Suggest-skills (OTHER field) | Yes | `getFallbackSkills` in `src/utils/roadmapHelpers.js:312-341` | `1167-1198` |
| Resume analysis | Yes (+ `pdf-parse`) | Hardcoded mock analysis | `1200-1351` |
| Market intelligence (demand/salary/skills/listings/insights) | Yes (+ optional Tavily) | Hardcoded mock intel | `1353-1500` |
| Career chat (Antigravity Advisor) | Yes | Mock markdown response + `suggestedActions` | `1502-1597` |
| Mindmap per-node content (goals/skills/summary) | Yes (+ `AGE_CONTENT_RULES`) | `getOfflineMockNodeContent` deterministic per `(stage, fieldType, nodeId)` | `1604-2055,2057-~2260` |
| Checkpoint synthesis | Yes | Deterministic achievements in offline node-content checkpoint branch | `~2140+` |
| Scaffold tree structure | **No — deterministic code only** | `buildMindmapScaffold` computes nodes/colors/labels from `profile.stage` without any AI call | `src/data/scaffoldBuilder.js:391-513` |
| Decision tree hierarchy | **No — deterministic only** | `buildTreeFromGoals` links milestones linearly | `server/index.js:230-309` |
| Onboarding skill suggestions display | No (AI supplies list) | UI chips (`OnboardingWizard.jsx:245-276`) | — |

---

## Configuration

Pass-through model selection lives in one place:

- `server/index.js:199-200` — comment + const
- `.env` → `OPENAI_MODEL=gpt-4o-mini` (`08_Environment_Configuration.md`)

No `max_tokens`, `top_p`, `presence_penalty`, or per-route temperature override exists — all routes share `temperature:0.2`. No token metering or cost dashboard.

---

## Data Sent vs Not Sent

| Sent to OpenAI | Not sent |
|----------------|---------|
| Sanitized `profile` (full onboarding dict), `roadmap.goalsToAchieve.description` snippet, resume text (≤10k, first 3 pages), `userSelections`, `allCompletedGoals` list, `jobTitle/field/location` for market intel, chat `messages` | Any binary (PDF bytes directly), any external URL content except Tavily enrichment for market intel |

Sanitization caps: `sanitizeInput(field, maxLen)` per `server/index.js:31-77` before prompt interpolation.

---

## Reliability

- **Single attempt per endpoint** — no retry wrapper around `client.chat.completions.create`.
- **Failure path:** `catch` → log `console.error("[Backend Error] ...")` → return `isMock:true` mock with HTTP `200` so the frontend's happy-path code needs no error branch.
- **Endpoint correctness load-bearing:** `normalizeRoadmapData` re-stamps timeframes by index to fix LLM hallucinations (`server/index.js:636-638`).

See `02_Prompt_Architecture.md` for per-prompt shapes and `05_AI_Limitations_and_Guardrails.md` for failure taxonomy.
