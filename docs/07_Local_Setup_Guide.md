# 07 — Local Setup Guide

*Reproducible steps verified against `package.json`, `server/index.js:171,189,200`, `vite.config.js`, `README.md:27-58`, and `start-career-gps.bat`.*

---

## Prerequisites

| Tool | Required version | Evidence | Check |
|------|------------------|----------|-------|
| Node.js | ≥18 (README says v18+) | `README.md:30`; no `engines` pin in `package.json` | `node -v` |
| npm | Bundled with Node | `package-lock.json` present | `npm -v` |
| OpenAI API key | Optional — app works in mock mode without it | `server/index.js:191-197,782` | See Environment |
| OS | Windows (batch launcher) or macOS/Linux (two terminals) | `start-career-gps.bat` |  |

No database, Docker, or additional services are required.

---

## Clone & Install

```bash
git clone https://github.com/aiatozofficial/career-gps.git
cd career-gps
npm install
```

Verify install succeeded:

```bash
npm ls --depth=0 2>&1 | head -n 30
# must include express, openai, multer, pdf-parse, zod, vite, react, d3, framer-motion, three
```

---

## Environment Configuration

Create `.env` at the **project root** (next to `package.json` — not inside `server/`). The backend loads it via `dotenv.config({ path: path.join(__dirname,'../.env'), override:true })` (`server/index.js:171`).

```env
PORT=5000
OPENAI_API_KEY=sk-proj-...your real key...
OPENAI_MODEL=gpt-4o-mini
# Optional — enrich market intelligence with live search
# TAVILY_API_KEY=tvly-...
```

See `08_Environment_Configuration.md` for the complete variable reference, including what happens when each is absent.

> Do **not** set `VITE_OPENAI_API_KEY` — `VITE_*` vars are bundled into the browser. The key must stay server-only per `docs/phase-notes.md:14-17`.

If you leave `OPENAI_API_KEY` unset or set to `YOUR_ACTUAL_OPENAI_API_KEY`, the server starts in **local fallback (mock) mode** (`server/index.js:191-197`) and every feature still works with deterministic data — ideal for offline dev or CI.

---

## Starting the App

### Windows — double-click

Double-click **`start-career-gps.bat`** at the repo root. It does:

```bat
start cmd /k "node server/index.js"
npm.cmd run dev -- --port 5173
```

- Leaves a backend console open (port 5000).
- Starts Vite in the current console (port 5173 at `http://127.0.0.1:5173`).

Keep **both** windows open. Close them to stop.

### macOS / Linux / Manual Windows — two terminals

**Terminal 1 — backend (port 5000):**

```bash
node server/index.js
# expected: no warning if OPENAI_API_KEY set; otherwise:
# "[Backend] OPENAI_API_KEY is not configured. Server starting in local fallback (mock) mode. ..."
```

**Terminal 2 — frontend (port 5173, proxies `/api` → 5000):**

```bash
npm run dev -- --port 5173
# Vite prints:  Local: http://127.0.0.1:5173/
```

Open **`http://127.0.0.1:5173/`** in your browser. (`localhost:5173` also works; proxy target is `localhost:5000` per `vite.config.js:19`.)

---

## Verification Checklist

1. **Backend up:**
   ```bash
   curl -X POST http://localhost:5000/api/generate-roadmap -H "Content-Type: application/json" -d '{}' 
   # expect 400: "Invalid input data: ..."
   ```
   If the backend is down: `curl` will refuse to connect.

2. **Proxy up:**
   ```bash
   curl -X POST http://127.0.0.1:5173/api/generate-roadmap -H "Content-Type: application/json" -d '{}'
   # same 400 — confirms vite.config.js proxy is working
   ```

3. **Frontend renders:** visit `http://127.0.0.1:5173` → **Welcome** page (`src/components/WelcomePage.jsx`) → click **Get Started** → 12-step wizard → **Build roadmap** → **Career Mindmap**.

4. **Mindmap lazy load:** hover a node → popover appears; an "unlocked" node's content is fetched via `POST /api/node-content` (check browser DevTools Network).

5. **Offline path:** temporarily set `OPENAI_API_KEY` to empty and restart backend; roadmap still generates via `isMock:true` payload — confirms fallback.

6. **Validate script:**
   ```bash
   npm run validate:phase1
   # expected:
   # Phase 1 validation passed
   # Profile: Aarav, UNDERGRADUATE, MEDIUM
   # Mock milestones: 7
   ```
   Defined in `package.json:10` → `scripts/validatePhase1.mjs:1-29`.

7. **Build:**
   ```bash
   npm run build
   # → dist/index.html + dist/assets/*.js + dist/assets/*.css
   npm run preview -- --host 127.0.0.1
   # serves dist/ for smoke-test
   ```

---

## Commands Reference (from `package.json:6-10`)

| Command | What it runs | Verified |
|---------|--------------|----------|
| `npm run dev` | `vite --host 127.0.0.1` | Yes |
| `npm run dev -- --port 5173` | Vite on 5173 + proxy `/api` | Yes (`README.md:57`) |
| `node server/index.js` | Express backend | Yes (`README.md:53`, `start-career-gps.bat:4`) |
| `npm run build` | `vite build` → `dist/` | Yes (`vercel.json:3`) |
| `npm run preview` | `vite preview --host 127.0.0.1` | Yes |
| `npm run validate:phase1` | `node scripts/validatePhase1.mjs` | Yes (only test) |

No other scripts (lint, test, format) exist.

---

## Common Setup Failures

| Symptom | Cause | Fix | Doc ref |
|---------|-------|-----|---------|
| `Error: Cannot find module 'express'` | Ran `node server/index.js` before `npm install` | `npm install` | — |
| Backend warns `OPENAI_API_KEY is not configured` and roadmap looks generic | Key missing or set to placeholder — intentional mock mode | Add `OPENAI_API_KEY` to `.env`, restart `node server/index.js` | `08_Environment_Configuration.md` |
| `ECONNREFUSED /api/generate-roadmap` at `http://127.0.0.1:5173` | Backend not running or wrong port | Start backend on `PORT=5000` (default `server/index.js:189`) | `03_System_Architecture.md` |
| Frontend shows "Old incompatible local storage" fatal crash | Previous `localStorage` schema changed | Click **Clear Stored Data & Reset App** in the error screen (`src/main.jsx:58`) or DevTools → Application → Clear Storage | `11_Troubleshooting.md` |
| Vite `port already in use` (5173) | Two dev servers running | `npx kill-port 5173` or `npm run dev -- --port 5174` |  |
| `MulterError: Only PDF files ...` when testing resume | Non-PDF uploaded | Upload `r.pdf` from repo root as a fixture | `05_API_Documentation.md` |

See `11_Troubleshooting.md` for the full Problem → Cause → Diagnosis → Fix table.

---

## Next Steps

- **`08_Environment_Configuration.md`** — full env var docs.
- **`05_API_Documentation.md`** — try each endpoint with `curl`.
- **`10_Testing_and_Quality.md`** — what is (and isn't) tested.
