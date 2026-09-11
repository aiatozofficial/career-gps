# 18 — External Integrations

*Verified from `server/index.js`, `package.json`, `src/services/resumeService.js`, `src/components/pathforge/*`.*

---

## 1. OpenAI — AI Generation (Primary)

| Field | Value |
|-------|-------|
| **Service** | OpenAI Chat Completions API |
| **SDK** | `openai ^4.77.0` (`package.json:22`) |
| **Model** | `gpt-4o-mini` default, overridable via `OPENAI_MODEL` (`server/index.js:200`); comment notes `gpt-4o` as higher-quality alternative |
| **Auth** | `OPENAI_API_KEY` env (`server/index.js:190`) via `new OpenAI({apiKey})` |
| **Integration points** | Every `POST /api/generate-*`, `/api/suggest-skills`, `/api/analyze-resume`, `/api/market-intelligence`, `/api/career-chat`, `/api/node-content`, `/api/checkpoint` |
| **Call shape** | Adapter `createAIClient` (`server/index.js:206-224`) preserves legacy `getGenerativeModel({model}).generateContent(prompt) → {response:{text()}}` with `response_format:{type:"json_object"}`, `temperature:0.2` |
| **Data sent** | User `profile` (sanitized), roadmap summaries, resume extracted text (≤10k), node context, chat history |
| **Data received** | Structured JSON (roadmap, questions, deep plan, skills list, analysis, intel, chat markdown+suggestions, node content) |
| **Failure behavior** | Every handler `catch` → mock fallback with `isMock:true` + `warning` (e.g., `server/index.js:837-948`). `genAI === null` when key missing → skips the OpenAI call and returns mock directly (e.g., `778-783`, `1090-1092`) |
| **Dependency risk** | High — most features degrade gracefully to mocks, but roadmap quality is mock-level when OpenAI unavailable; quota/rate-limit errors also fall back rather than surfacing to user |
| **Cost token controls** | `Not Found` — no token caps, truncation (except sanitization caps), or cost metering. Prompts are long (stage × guardrails × JSON schema); see `ai/05_AI_Limitations_and_Guardrails.md` |

No vector DB / embedding / RAG retrieval is used — see `ai/03_Retrieval_and_RAG.md`.

---

## 2. Tavily — Live Web Search (Optional)

| Field | Value |
|-------|-------|
| **Service** | `https://api.tavily.com/search` (REST POST) |
| **Auth** | `TAVILY_API_KEY` env (`server/index.js:1383`) — only if set |
| **Scope** | Enriches **`POST /api/market-intelligence`** only (`server/index.js:1383-1426`) |
| **Query** | `current job market demand salary trend top skills hiring companies for "${jobTitle}" ${location || "India"} 2026` |
| **Params** | `{ search_depth:"basic", max_results:5 }` |
| **Data sent** | `jobTitle`, `field`, `location` |
| **Data received** | `data.results[]` (search snippets) injected into the OpenAI prompt as `searchResults` |
| **Failure behavior** | If key absent → silently skips search, relies on OpenAI knowledge (`server/index.js:1410-1412`). If fetch fails → logs warn, still queries OpenAI (`1383-1410`) |
| **Dependency risk** | Low — app fully functional without it; market intel quality is lower (LLM knowledge cutoff) but still returns mock/live intel |
| **SDK** | Raw `fetch` (no Tavily SDK dependency in `package.json`) |

---

## 3. pdf-parse + Multer — Resume Parsing

| Field | Value |
|-------|-------|
| **Packages** | `multer ^1.4.5-lts.1`, `pdf-parse ^1.1.1` (`package.json:21,23`) |
| **Scope** | `POST /api/analyze-resume` (`server/index.js:174-184,1200-1351`) |
| **Config** | `multer.memoryStorage()` (RAM only), `limits:10 MB`, `fileFilter: application/pdf` only |
| **Library** | `pdfParse(buffer, {max:3})` (first 3 pages) → `sanitizeInput(..., 10000)` caps text |
| **Data sent** | No external call — parsed locally, then truncated resume text forwarded to OpenAI |
| **Failure behavior** | PDF parse error → soft fallthrough with sentinel `"[Failed to parse PDF file. ...]"` injected into prompt (`1244-1253`). Empty text → sentinel `"[No selectable text extracted ...]"` |
| **Dependency risk** | Low — malformed PDFs degrade gracefully to profile-only analysis; mock analysis fallback still renders |

---

## 4. Platform References (Not Integrations)

These are **named in prompts/suggestions**, but the app has **no API integrations** with them:

| Named platform | Usage | Integration? |
|----------------|-------|--------------|
| **NPTEL / SWAYAM** | Course suggestions (`server/index.js:380`) | **No API** — string suggestion in AI output |
| **Internshala / Naukri** | Internship platforms (`server/index.js:381`) | **No API** — strings/Demo URLs (`https://internshala.com`, `https://naukri.com` embedded as placeholder `url` fields in mock intel) |
| **NASSCOM / FutureSkills Prime** | Cert suggestions (`server/index.js:383`) | No API — string suggestion |
| **Coursera / Google / Microsoft** | Also appear in mock `certifications` | No API |
| **LinkedIn / Glassdoor / Wellfound** | Market intel `platforms` slot (`server/index.js:579`) | No API — strings |
| **GitHub** | Portfolio hosting in `fallbackDeepRoadmap` resource hints | No API |

**Important:** Job listing `url` fields returned by market intel are **AI-generated placeholder URLs** (e.g., `https://internshala.com`), not fetched or verified listings. Do not present them as real job feeds.

---

## 5. No Other Integrations

| Candidate | Found? |
|-----------|--------|
| Email, payments, analytics, logging SaaS | Not Found |
| Vector DB, embedding provider | Not Found (`ai/03_Retrieval_and_RAG.md` = Not Applicable) |
| Authentication provider | Not Found |
| Storage / CDN beyond Vercel static hosting | Not Found |

---

## Configuration & Operational Notes

- **If OpenAI quota exhausted:** all endpoints return mock; the app stays functional but the top-right warning/diffuse indication is minimal — users may not notice they're on mock data (see `12_Known_Issues_and_Limitations.md`).
- **To prove Tavily is active:** Vercel function logs emit `[Backend] Searching Tavily for live market data on: ...` and `[Backend] Tavily search successful with N results.` (lines 1387,1403).
- **Adding a new integration:** follow the pattern in `server/index.js:1502-1597` (Zod schema → `sanitize*` → optional external fetch → OpenAI prompt → JSON parse → mock catch). Keep validation + sanitization in front of any external call.
