# 11 — Troubleshooting

## How to Use This Guide

Each entry is: **Problem → Likely Cause → How to Diagnose → Solution → How to Verify the Fix**. All entries are derived from actual repo behavior, not generic advice. Reference lines cite source.

---

### 1. `OPENAI_API_KEY is not configured. Server starting in local fallback (mock) mode.`

**Problem:** Roadmap looks generic / `isMock:true` in response.

**Likely Cause:** No `.env` at project root or key set to placeholder `YOUR_ACTUAL_OPENAI_API_KEY`.

**Diagnosis:**
```bash
node -e "require('dotenv').config({path:'./.env',override:true}); console.log(!!process.env.OPENAI_API_KEY)"
# false → key absent
tail server/index.js -n +189 | head -n 15   # shows check at 191-197
```

**Solution:** Create `.env` at root per `08_Environment_Configuration.md`; restart `node server/index.js`.

**Verify:** Backend logs no warning; a test `curl -X POST http://localhost:5000/api/generate-roadmap ...` returns a response without `isMock`.

---

### 2. `ECONNREFUSED /api/*` from the frontend (Vite)

**Problem:** Frontend shows "Gemini API unavailable — using offline Career Roadmap generator" (`src/App.jsx:85`) or mindmap content never loads.

**Likely Cause:** Backend not running on `PORT=5000` (or different PORT without updated proxy).

**Diagnosis:**
```bash
curl -i http://localhost:5000/api/generate-roadmap -X POST -H "Content-Type: application/json" -d '{}'
# refused → backend down
curl -i http://127.0.0.1:5173/api/generate-roadmap -X POST -H "Content-Type: application/json" -d '{}'
# should proxy — if first succeeds but second fails, proxy misconfigured
Get-Content vite.config.js | Select-String "target"
```

**Solution:** Start `node server/index.js` (terminal 1) + `npm run dev -- --port 5173` (terminal 2). If `PORT` customized, update `vite.config.js:19` target.

**Verify:** `curl http://127.0.0.1:5173/api/generate-roadmap` returns `400 Invalid input data...` (not `ECONNREFUSED`).

---

### 3. Fatal crash: `Career GPS Encountered a Fatal Error` with stack trace

**Problem:** Full-screen error `GlobalErrorBoundary` (`src/main.jsx:26-79`).

**Likely Cause:** Corrupt/truncated `localStorage` JSON or schema drift (e.g., old cached roadmap from earlier schema version). Evidence in message at `main.jsx:42-44`.

**Diagnosis:** Open DevTools → Console → look for `Fatal Crash Caught:` or `Stored Career GPS data failed validation and will be ignored.` (`App.jsx:49`).

**Solution:** Click **Clear Stored Data & Reset App 🚀** (`main.jsx:58` → `localStorage.clear(); window.location.reload();`). Or manually: DevTools → Application → Local Storage → delete keys prefixed `career-gps:`.

**Verify:** Welcome page reloads, onboarding starts fresh.

---

### 4. `MulterError: Only PDF files are supported for resume analysis.`

**Problem:** Resume upload rejected with `400`.

**Likely Cause:** Uploaded file MIME is not `application/pdf` (`server/index.js:178-183`).

**Diagnosis:** Browser Network → `POST /api/analyze-resume` → Response preview shows the error string from `server/index.js:181` or multer handler `1201-1211`.

**Solution:** Export as PDF, upload `r.pdf` from repo root as test. Ensure `<input accept="application/pdf">` client-side.

**Verify:** Response is `200` with `{ skills:[...], isMock?:true }` — or, if OpenAI unavailable, still `200` with mock analysis at `1318-1349`.

---

### 5. `File size limit exceeded. Max size allowed is 10MB.`

**Problem:** Large resume rejected.

**Likely Cause:** `multer limits.fileSize = 10 * 1024 * 1024` (`server/index.js:176`).

**Diagnosis:** Network → response JSON at `1204`.

**Solution:** Compress or down-sample images in PDF, or split to <10 MB.

**Verify:** Re-upload smaller PDF → `200`.

---

### 6. Roadmap is always single-milestone `init-roadmap` vs full stage-timeline `generate-roadmap`

**Problem:** User expects a full stage-timeline (8–14 milestones) but onboarding produces only `node-root-ms-1` (`timeframe: NOW`), or vice versa: a spot expects the lightweight init while the full handler is being hit directly.

**Likely Cause:** `src/App.jsx:60` uses `POST /api/init-roadmap` (`server/index.js:2319` — minimal 1-milestone scaffold init, onboarding entry). `POST /api/generate-roadmap` (`server/index.js:771`) is the full stage-timeline contract (stage-specific `milestoneTimeframes` 6–14 milestones). Confusing the two yields the wrong cohort size.

**Diagnosis:**
```bash
# lightweight init — should return 1 milestone, validate on profile vs 400
curl -i -X POST http://localhost:5000/api/init-roadmap -H "Content-Type: application/json" -d '{}'
# full roadmap — same 400 shape but heavier prompt contract
curl -i -X POST http://localhost:5000/api/generate-roadmap -H "Content-Type: application/json" -d '{}'
# with a real profile each returns { goalsToAchieve:{milestones: [...]}, isMock?:true }
Select-String -Pattern "init-roadmap|generate-roadmap" -Path "src\App.jsx","server\index.js"
```

**Solution:** Keep both contracts. Onboarding should use `/api/init-roadmap`; any flow needing the full timeline should target `/api/generate-roadmap`. Both share `profileSchema` validation; `05_API_Documentation.md` documents the distinction. On drift suspicion, confirm the running server binary is `server/index.js:2319` and `771`.

**Verify:** `init-roadmap` response has `goalsToAchieve.milestones.length == 1` (possibly mock-skeleton when `OPENAI_API_KEY` absent); `generate-roadmap` response has `length` matching `constructPrompt` canonical `milestoneTimeframes` for the `stage`. With `OPENAI_API_KEY` set, neither returns `isMock:true`.

---

### 7. Mindmap shows locked nodes but goals never load (empty popover)

**Problem:** Node popover spins or shows no goals.

**Likely Cause:** `fetch("/api/node-content")` failing due to CORS/network or backend down; eager fetch loop at `CareerMindmapView.jsx:243-294` silently logs `console.error`.

**Diagnosis:** DevTools → Network → filter `/api/node-content` → check status (should be `200` with `{ goals:[...], skills:[...] }`). Console for `Failed to eagerly fetch...`.

**Solution:** Fix backend connectivity (symptom 2). For faster feedback, `CareerMindmapView.jsx:243` fetches serially — a temporary workaround is to hard-reload after backend starts so the eager pre-fetch retriggers.

**Verify:** Hover → popover shows 3 goals + skills.

---

### 8. `ZodError` on profile submit: `Invalid input data: name: ...`

**Problem:** Validation error red box in wizard.

**Likely Cause:** Empty name, missing `goal.description` (especially if wizard step skipped), age out of range.

**Diagnosis:** Check `OnboardingWizard.jsx:587-589` + `server/index.js:146-153` message. Frontend schema `roadmapSchemas.js:8,10,27-28` enumerates constraints.

**Solution:** Complete all steps; ensure `goal.description` is filled even when `NOT_SURE` (auto-generated at `OnboardingWizard.jsx:551`). Age is set via slider 12–40.

**Verify:** Error box disappears; wizard proceeds to `GENERATING`.

---

### 9. QuotaExceededError silently trimming cache

**Problem:** Node content re-fetches repeatedly after reload.

**Likely Cause:** `localStorage` full (~5 MB) — `safeSetItem:42-62` silently clears `nodeCache` then `chatHistory`.

**Diagnosis:** DevTools Console → `localStorage length` warns `Quota exceeded. Attempting recovery...` (`localStorageService.js:46,52`).

**Solution:** Clear `career-gps:node-content-cache` manually or reduce stored analysis/market intel. Long-term: server-side caching of node content (see `22_Performance_and_Scalability.md`).

**Verify:** `localStorage.getItem('career-gps:node-content-cache')` length decreases; app can store again.

---

### 10. Vercel deployment: frontend works but `/api/*` returns 404

**Problem:** All API calls 404 on deployed site.

**Likely Cause:** `api/index.js` not deployed or not exporting correctly; `vercel.json:7` rewrite missing.

**Diagnosis:** Visit `/api` directly should hit the function; check Vercel Dashboard → Deployments → Functions — `api` should be listed.

**Solution:** Ensure `api/index.js:1-2` exists as `import app from "../server/index.js"; export default app;` and `vercel.json:6-9` rewrites are committed and redeployed.

**Verify:** `curl -X POST https://{deployment}.vercel.app/api/generate-roadmap -H "Content-Type: application/json" -d '{}'` → `400`.

---

### 11. Vite dev proxy does not forward `/api` after PORT change

See symptom 2. Solution is co-changing `PORT` in `.env` and `vite.config.js:19` target + restarting.

---

### 12. `start-career-gps.bat` leaves orphan backend windows

**Problem:** Closing the Vite window doesn't close the spawned backend cmd window.

**Solution:** Manually close the backend cmd window titled with `node server/index.js`, or run `taskkill /F /IM node.exe` if misbehaved. Prefer two-terminal workflow for dev.
