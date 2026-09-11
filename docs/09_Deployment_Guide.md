# 09 — Deployment Guide

*Verified from `vercel.json`, `api/index.js`, `package.json:9`, `vite.config.js`, `server/index.js:171`.*

## Build Process

**Command:** `npm run build` (`package.json:9` → `vite build`)

- Emits to `dist/` (Vite default; matches `vercel.json:4` `outputDirectory: dist`).
- Output: `dist/index.html` + `dist/assets/*.js` + `dist/assets/*.css` + static files from `public/`.
- No SSR, no DB migrations, no pre-deploy scripts.

```bash
npm ci            # reproducible install (respects package-lock.json)
npm run build
# verify
ls dist/
# dist/index.html, dist/assets/, dist/favicon.{png,svg}
npm run preview -- --host 127.0.0.1  # smoke-test built artifacts locally
```

**Prerequisite:** `npm install` completed (missing deps produce `Cannot find module` at build time).

---

## Platforms

### Supported & Configured: Vercel

`vercel.json` is the authoritative deployment config:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- `api/index.js` re-exports the Express `app` (`import app from "../server/index.js"; export default app;`) so Vercel deploys **isomorphic**: the same `server/index.js` runs as a serverless Node function.
- Frontend is static `dist/`; backend is the `api` function handling all `/api/(.*)` routes, with SPA fallback to `index.html`.

### Deploy Steps (Vercel)

1. **Connect repo:**
   ```bash
   npm i -g vercel
   vercel link   # select aiatozofficial/career-gps or your fork
   ```
   Or via Vercel Dashboard → Import Git Repository → `aiatozofficial/career-gps`.

2. **Set environment variables** (Vercel → Project Settings → Environment Variables):

   | Variable | Required for live AI | Scope |
   |----------|----------------------|-------|
   | `OPENAI_API_KEY` | Yes | Production + Preview |
   | `OPENAI_MODEL` | No (defaults `gpt-4o-mini`) | All |
   | `TAVILY_API_KEY` | Optional (enriches market intel) | All |
   | `PORT` | No — Vercel sets it | — |

   `OPENAI_API_KEY` must **not** be prefixed `VITE_`.

3. **Deploy:**

   ```bash
   vercel --prod
   # or push to main → auto-deploy if Vercel Git integration is enabled (no workflow file was found, so auto-deploy depends on Vercel settings)
   ```

4. **Verify:**

   ```bash
   # Health-ish (server validates)
   curl -X POST https://{your-deployment}.vercel.app/api/generate-roadmap -H "Content-Type: application/json" -d '{}'
   # expect 400: "Invalid input data: ..."  (confirms function is live)

   # Frontend
   open https://{your-deployment}.vercel.app
   # onboarding → Build roadmap → mindmap renders
   # With no OPENAI_API_KEY: roadmap still generates via mock (isMock:true) — do not mistake for success
   ```

### Not Configured: Docker, Traditional VPS, Netlify, Render

No `Dockerfile`, `docker-compose.yml`, `Procfile`, or other hosting configs were found. To deploy elsewhere, you would:

- **VPS/PM2:** `PORT=5000 node server/index.js` + static-file server (Nginx) serving `dist/` and proxying `/api` → `localhost:5000` (same setup as `vite.config.js:19` for dev).
- **Netlify/Render:** reuse `api/index.js` pattern if the platform supports serverless functions; otherwise split into static + API host.

`Not Applicable` — no instructions invented beyond what the repo demonstrates.

---

## Required Configuration (Production Checklist)

- [ ] `OPENAI_API_KEY` set in hosting env (or accept mock mode)
- [ ] `OPENAI_MODEL` set if you want `gpt-4o` (else defaults)
- [ ] `TAVILY_API_KEY` set if market intelligence live search is desired
- [ ] No `.env` committed; values live in hosting secrets, not repo
- [ ] `api/index.js` present (Vercel function)
- [ ] `dist/` is the build output (not committed locally — built in CI/Vercel)

No database migrations, seeds, or worker processes exist.

### Deployment Order

No dependency order — frontend `dist/` and API function are stateless and independent. There is no staging/production promotion flow beyond Vercel's Preview → Production.

---

## Health Checks & Monitoring (what actually exists)

- **No `GET /health` JSON endpoint.** Local `server/index.js:2482-2489` serves `express.static(dist)` and `GET /{*path}` → `dist/index.html` SPA catch-all; verify via any `POST /api/*` with an empty body → `400` proves the function is bound (that is the JSON health signal). Vercel deploys surface the same `POST /api/*` probe via `api/index.js`.
- **No CloudWatch/Datadog.** See `21_Operations_and_Monitoring.md` — monitoring is `Not Implemented`.
- **Logs:** Vercel → Project → Deployments → Functions → runtime logs (Express `console.log` lines from `server/index.js`, e.g. `[Backend] Generating real OpenAI roadmap...`). Local logs are `node server/index.js` stdout.

---

## Rollback

| Scenario | Rollback procedure |
|----------|--------------------|
| Vercel deployment regression | Vercel Dashboard → Deployments → select previous deployment → **Promote to Production** (Vercel handles `dist`+`api` atomically) |
| Bad build produced but not deployed | Re-run `npm run build` locally and `npm run preview` before pushing; or revert commit then `vercel --prod` |
| Bad env var change | Revert in Vercel → Environment Variables and redeploy |

There is **no in-app database to roll back** and **no migration history**.

---

## Common Deployment Failures

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `404 Not Found` for all `/api/*` routes on Vercel | `api/index.js` missing or not deployed | Ensure `api/index.js` exists with `export default app`; check Vercel Functions list |
| Frontend loads but roadmap is always mock (`isMock:true` in response) | `OPENAI_API_KEY` not set or set as `VITE_OPENAI_API_KEY` | Set `OPENAI_API_KEY` (server var) in Vercel env, not `VITE_*` |
| `500` from serverless function on Vercel | Real OpenAI key quota/rate limit or invalid key | Check Vercel function logs for `[Backend Error]`; rotate key; verify billing |
| `ECONNREFUSED` locally but works on Vercel | Backend not running on `PORT=5000` during local preview | Start `node server/index.js` alongside `npm run preview` |
| Blank page after SPA deploy | Missing rewrite `/(.*)` → `/index.html` | Ensure `vercel.json` rewrites are present and deployed |

---

## Secrets Handling

- The only secret is `OPENAI_API_KEY` (load-bearing). Rotate via hosting env; `.env` should be in `.gitignore` (there is no `.gitignore` currently — see `12_Known_Issues_and_Limitations.md`).
- Do not echo API keys in CI logs. Vercel env values are masked.
