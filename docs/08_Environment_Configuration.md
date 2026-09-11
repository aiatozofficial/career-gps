# 08 — Environment Configuration

## Overview

Career GPS has **three runtime-scoped environment variables** plus one **frontend-time Vite proxy target** that is hardcoded. No `.env.example` is committed (verified by absence); this document is the authoritative reference.

**Loading:** `server/index.js:171`
```js
dotenv.config({ path: path.join(__dirname,'../.env'), override: true });
```
- File must be at **project root** (`../.env` relative to `server/index.js`).
- `override:true` means `.env` values override any existing shell env — prevents stale global `OPENAI_API_KEY` leaks.

Vite does **not** load `.env` for the backend — only `server/index.js` does.

---

## Variables

### `PORT`

| Field | Value |
|-------|-------|
| **Purpose** | Port the Express backend listens on |
| **Required** | No — defaults to `5000` (`const PORT = process.env.PORT || 5000` at `server/index.js:189`) |
| **Where consumed** | `server/index.js:189`, `vite.config.js:19` (proxy target `http://localhost:5000`) |
| **Type / format** | Integer 1–65535, e.g. `5000` |
| **Safe example** | `PORT=5000` |
| **Risk if changed** | If you change `PORT` without updating `vite.config.js:19` proxy target, frontend `fetch("/api/*")` will get `ECONNREFUSED`. Update both together. |

### `OPENAI_API_KEY`

| Field | Value |
|-------|-------|
| **Purpose** | Authenticates all AI generation (roadmap, deep questions/roadmap, skills, resume, market intel, chat, node-content, checkpoint) |
| **Required** | No — app works in **mock fallback** without it (`OPENAI_CONFIGURED` check at `server/index.js:191`) |
| **Where consumed** | `server/index.js:190-191`, `createAIClient(OpenAI)` at `206-227`, creation of `genAI` at `227` |
| **Type / format** | `sk-...` or `sk-proj-...` (64–164 chars) |
| **Safe example** | `OPENAI_API_KEY=sk-proj-REPLACE_WITH_YOUR_KEY` (never commit a real key) |
| **Behavior when absent** | Server logs `[Backend] OPENAI_API_KEY is not configured. Server starting in local fallback (mock) mode.` and sets `genAI = null`. Every endpoint returns `isMock:true` mock data (`server/index.js:782,1092,1128,1176,1235,1364,1513,2072`) |
| **Behavior when set to placeholder** | Same as absent if `=== "YOUR_ACTUAL_OPENAI_API_KEY"` (`server/index.js:191`) |
| **Security** | Must never be prefixed `VITE_` — `VITE_*` vars are inlined into the browser bundle. Store only server-side via `.env` or Vercel env (`docs/phase-notes.md:12-16`) |

### `OPENAI_MODEL`

| Field | Value |
|-------|-------|
| **Purpose** | Model used for every completion |
| **Required** | No — defaults to `gpt-4o-mini` (`const OPENAI_MODEL = process.env.OPENAI_MODEL \|\| "gpt-4o-mini"` at line 200) |
| **Where consumed** | `server/index.js:200-221` (passed to `getGenerativeModel({model})` on each route) |
| **Type / format** | OpenAI model id, e.g. `gpt-4o-mini`, `gpt-4o` (comment at `server/index.js:199`) |
| **Safe example** | `OPENAI_MODEL=gpt-4o-mini` |
| **Trade-off** | `gpt-4o` higher quality but higher latency/cost; `gpt-4o-mini` is the configured default and is what prompts were tuned for |

### `TAVILY_API_KEY` *(optional, ancillary)*

| Field | Value |
|-------|-------|
| **Purpose** | Enables live web search enrichment for `/api/market-intelligence` only |
| **Required** | No — if absent, the handler falls back to OpenAI's training knowledge (`server/index.js:1411-1412`) |
| **Where consumed** | `server/index.js:1383-1412` |
| **Type / format** | `tvly-...` |
| **Safe example** | `TAVILY_API_KEY=tvly-REPLACE_WITH_YOUR_KEY` |
| **When to set** | Only if you want market listings/insights grounded in current web results rather than LLM knowledge cutoff |

---

## Environment File Template

Copy this to `.env` at the project root. **Do not commit it.**

```env
# ── Required for live AI (delete or leave blank for offline mock mode) ──
PORT=5000
OPENAI_API_KEY=sk-proj-...your real key...
OPENAI_MODEL=gpt-4o-mini

# ── Optional — live web search for market intelligence ──
# TAVILY_API_KEY=tvly-...

# ── DO NOT add VITE_OPENAI_API_KEY — Vite exposes VITE_* vars in browser ──
```

For Vercel, set the same variables in **Project Settings → Environment Variables** (not in a committed file). No other variables are required.

---

## Variable Usage Matrix

| Variable | `server/index.js` lines | Routed via Vite? | Vercel env needed? |
|----------|------------------------|------------------|--------------------|
| `PORT` | 189 | Yes (`vite.config.js:19` proxy) | No (Vercel sets `PORT` itself) |
| `OPENAI_API_KEY` | 190,206 | No | Yes (for live AI) |
| `OPENAI_MODEL` | 200 | No | Optional |
| `TAVILY_API_KEY` | 1383 | No | Optional |

No `VITE_*` variable is expected — verified by grep of `src/` (no `import.meta.env` or `VITE_` refs found).

---

## Precedence & Overrides

1. `.env` wins over shell env due to `override:true` (`server/index.js:171`). This prevents `export OPENAI_API_KEY=old` from shadowing your fresh `.env` after key rotation.
2. If `.env` is missing, `process.env.*` fallbacks apply (PORT 5000, OPENAI miss → mock, MODEL gpt-4o-mini, no Tavily).

---

## Verifying Configuration

```bash
# 1 — With .env present
node -e "require('dotenv').config({path:'./.env',override:true}); console.log({port:process.env.PORT, hasKey:!!process.env.OPENAI_API_KEY, model:process.env.OPENAI_MODEL})"

# 2 — Backend startup log line confirms mode
node server/index.js
#   With key:    "[Backend] Generating real OpenAI roadmap for: ..."
#   Without key: "[Backend] OPENAI_API_KEY is not configured. Server starting in local fallback (mock) mode."

# 3 — Endpoint probe confirms live vs mock
curl -s -X POST http://localhost:5000/api/generate-roadmap -H "Content-Type: application/json" -d @sample-profile.json | jq .isMock
#   null or absent  → live AI
#   true            → mock fallback (check server logs)
```
