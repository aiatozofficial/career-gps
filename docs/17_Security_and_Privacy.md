# 17 — Security and Privacy

*Evidence base: `server/index.js` (sanitization, schemas, env handling), `src/schemas/roadmapSchemas.js`, `src/main.jsx`, `src/services/localStorageService.js`, `vercel.json`, `docs/phase-notes.md`.*

## Threat Model (what this app actually faces)

- Single-user, browser-local, no database — the attack surface is **prompt injection → LLM**, **malicious file upload**, **client-side storage tampering**, and **accidental key exposure**.
- There is no multi-tenant data leak surface because there is no cross-user storage.

---

## Implemented Security Controls

| Control | Implemented | Evidence |
|---------|-------------|---------|
| **API key never in browser** — `OPENAI_API_KEY` server-only | Yes | `server/index.js:190-227`, `docs/phase-notes.md:12-16` explicitly warns not to use `VITE_OPENAI_API_KEY` |
| **.env overrides shell env** (prevents stale key leaks) | Yes | `dotenv.config({path:../.env, override:true})` at `server/index.js:171` |
| **Input sanitization** (null bytes, controls, backticks/braces, markdown fences, `System:/User:/Assistant:` markers) | Yes | `sanitizeInput:11-29`, `sanitizeProfile:31-78`; applied before prompts |
| **Zod validation on every POST** → `400` with details | Yes | `validateRequest:146-153` + schemas `81-144`; reused in resume's `profileJson` check `1215-1225` |
| **Length caps in sanitization** (profile fields 100-500, pdf text 10k) | Yes | calls like `sanitizeInput(name,100)`, `sanitizeInput(pdfText,10000)` |
| **File upload hardening** — PDF-only MIME, 10 MB memory limit, `memoryStorage` (never persisted) | Yes | `multer` config `174-184` |
| **Global error boundary clearing corrupt storage** | Yes | `src/main.jsx:20-23` (`localStorage.clear` + reload on fatal Zod parse) |
| **Safe localStorage parsing** with corrupt-JSON guard | Yes | `safeParse:28-37` in `localStorageService.js` |
| **Express error-catch → mock** (no stack leak to client — JSON warning only) | Yes | All handlers `catch` → `res.json({isMock:true, warning:"..."})` |

---

## Missing / Recommended Controls

| Control | Status | Risk | Recommendation |
|---------|--------|------|----------------|
| **Authentication / Authorization** | Not Applicable — app is intentionally single-user | — | Add only if multi-user is scoped; then add session/JWT + route guards |
| **Rate limiting** on API endpoints | Missing | Prompt-budget exhaustion via spam; OpenAI quota burn | Add `express-rate-limit` per IP per endpoint (especially `/api/career-chat`) |
| **CORS allowlist** | Missing — Express defaults to `allow-all` | No immediate XSS risk beyond defaults, but looseness is poor posture | Add `cors({origin: allowedOrigins})` when deploying to known domains |
| **CSRF tokens** | Not Applicable — no cookies/session/auth | — | Needed only if cookie auth added |
| **Content Security Policy (CSP)** | Missing | Could mitigate XSS if future code injects HTML | Deploy CSP header from Vercel (`vercel.json` headers) or Express `helmet` |
| **`helmet` headers** (`HSTS`, `X-Frame-Options`, etc.) | Missing | Standard hardening gap | Add `helmet` middleware in `server/index.js` |
| **Output escaping for markdown** from LLM | Partial — chat/analysis outputs render markdown; prompts bound via template interpolation without escaping | LLM could emit HTML/JS if rendered unsafely (components appear to use React text/markdown safely — verify if `dangerouslySetInnerHTML` is used) | Audit `pathforge/CareerChat.jsx` rendering path; sanitize markdown-to-HTML if raw HTML rendered |
| **API key rotation + audit** | Manual only | `Not Found` — no rotation log | Document rotation runbook in `25_Documentation_Maintenance.md` |
| **Server-side logging redaction** | Missing | Keys could be logged if env is dumped | Ensure no `console.log(process.env)` |

Do not claim compliance with SOC2/GDPR/ISO — **Not Confirmed**.

---

## Secrets Handling (current practice)

| Secret | Where stored | Safe pattern | Evidence |
|--------|--------------|--------------|----------|
| `OPENAI_API_KEY` | Local `.env` (ignored if `.gitignore` fixed) or Vercel env | Never log, never prefix `VITE_`, rotate on exposure | `server/index.js:190-227` |
| `TAVILY_API_KEY` (optional) | Same as above | Same | `server/index.js:1383` |
| No other secrets exist | — | — | Verified — no DB creds, webhooks, or payment keys in repo |

There is **no `.gitignore`** file in the repo (audited — `Test-Path .gitignore` returned no file). There is also **no `.env.example`** committed. Until `.gitignore` adds `.env` / `.vercel` / `dist/`, there is a risk a maintainer commits a real `.env`. **Fix recommended** (see `12_Known_Issues_and_Limitations.md`).

### Evidence of no leaked keys in repo

`server/index.js:190` pattern `YOUR_ACTUAL_OPENAI_API_KEY` placeholder check was audited; no real key strings were found in committed files. But local `.env` must be managed externally.

---

## Privacy — What Data Leaves the Device

| Data | Destination | When | Minimization |
|------|-------------|------|--------------|
| All `profile` fields (name, stage, age, field, skills, goal, preferences, etc.) | OpenAI (via `server/index.js` prompt construction) | Every roadmap / chat / node call | Full profile sent — necessary for personalization |
| `roadmap` summary (goals description) | OpenAI (deep questions/roadmap, node-content, chat, checkpoint) | On demand when those features are used | Minimal subset forwarded |
| Resume extracted text (sanitized, ≤10k chars) | OpenAI only | On `POST /api/analyze-resume` | First 3 pages via `pdf-parse` `max:3` |
| Job title + field + location (market intel) | OpenAI + optionally Tavily Search API | On `POST /api/market-intelligence` when invoked | Only query terms |
| Nothing else persisted server-side | — | — | No DB — server does not store any PII across requests |

The browser cache stores everything locally (see `04_Data_Model.md`). Clearing `career-gps:*` wipes all PII from device storage.

---

## Sensitive Data in Storage

- Names, goal descriptions, resume skills — stored as plaintext JSON in `localStorage` (`services/localStorageService.js`). This is **by-design** for a no-backend app but means a device compromise exposes it. No at-rest encryption.
- OpenAI may retain completions per its data-use policy — **Not Confirmed** from repo. If privacy-sensitive, consider adding a disclaimer in `13_User_Guide.md`.

---

## Recommendations for Hardening (priority order)

1. **Add `.gitignore`** with `.env`, `.vercel`, `dist/`, `node_modules/` (prevents secret leak).
2. **Add `express-rate-limit` + `helmet`** to `server/index.js`.
3. **Add explicit `cors` config** on `app` when deploying to Vercel under a fixed domain.
4. **Audit markdown rendering** in `CareerChat.jsx` and resume analysis display for unsanitized HTML injection.
