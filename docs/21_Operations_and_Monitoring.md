# 21 — Operations and Monitoring

*Verified from `server/index.js` (console logs only), `vercel.json`, absence of `.github/workflows`, `package.json` scripts.*

## Operational Model (Actual)

Career GPS is a **stateless, serverless-friendly app with no DB**. Operations burden is intentionally minimal: a static build (`dist/`) and a single Express function (`api/index.js`). There is no staging, no migration runbook, no worker fleet, and no infrastructure-as-code beyond `vercel.json`.

---

## What Exists

| Concern | Implementation | Evidence |
|---------|----------------|----------|
| **Logs** | `console.log / console.warn / console.error` stdout from Express (`[Backend] Generating ...`, `[Backend Error]`, `[Backend] OPENAI_API_KEY is not configured ...`) | `server/index.js:192-196,785,808,836,1095,1133,1181,1239,1316,1380,1531,1580` |
| **Runtime log sink (production)** | Vercel → Project → Deployments → Functions → Runtime logs capture the Express stdout | `vercel.json` (Vercel host) |
| **Local logs** | Node stdout in terminal running `node server/index.js` |  |
| **Error boundary (frontend)** | `GlobalErrorBoundary` in `src/main.jsx:6-84` plus per-view `<ErrorBoundary onReset>` in `src/App.jsx:119-156` | Prevents blank screens on storage corruption |
| **Manual smoke check** | `POST /api/generate-roadmap` with empty body → `400` proves function live; onboarding flow end-to-end | `07_Local_Setup_Guide.md`, `05_API_Documentation.md` |

---

## What Does NOT Exist

| Concern | Status | Evidence of absence |
|---------|--------|--------------------|
| **Dedicated `/health` JSON endpoint** | Not Implemented — server exposes `GET /{*path}` at `server/index.js:2487` (`app.get("/{*path}")` → `dist/index.html`) as SPA catch-all, and `express.static(dist)` (`2482`). No `GET /health` JSON probe exists. Use `POST /api/generate-roadmap` → `400` as the JSON health signal. | `server/index.js:2482-2489` |
| **Structured logging** / JSON logs / log levels | Not Implemented | Raw `console.*` only |
| **Metrics / APM** (latency, throughput, error rate) | Not Implemented | No `prom-client`, `datadog`, `opentelemetry` imports |
| **Tracing** | Not Implemented |  |
| **Error tracking** (Sentry, Bugsnag) | Not Implemented | Not in `package.json` |
| **Alerting** (PagerDuty / Slack webhook) | Not Implemented |  |
| **Uptime monitor** (synthetic check) | Not Implemented |  |
| **Dashboards** | Not Implemented |  |
| **Audit trail** (who changed what, when) | Not Implemented | No DB — no audit table |
| **Runbooks** (incident/rollback scripts beyond Vercel promote) | Not Implemented | Only doc is this file + `09_Deployment_Guide.md` rollback note |
| **Operational scripts** | Not Implemented | Only `scripts/validatePhase1.mjs` + `start-career-gps.bat` |
| **Cron / background workers** | Not Applicable — none exist |  |
| **Incident response process** | Not Confirmed | No doc |

**Explicit decree:** Do not document `health checks`, `monitoring`, `alerting`, or `rollback` as automated/operational until added. Current rollback is **manual Vercel Dashboard → Promote previous deployment** (`09_Deployment_Guide.md`).

---

## Commands a Maintainer Actually Has

| Intent | Command / Location |
|--------|-------------------|
| Start backend + frontend locally | `node server/index.js` + `npm run dev -- --port 5173` or `start-career-gps.bat` (`07_Local_Setup_Guide.md`) |
| Build locally | `npm run build` |
| Check logs locally | Read stdout of `node server/index.js` |
| Check logs on Vercel | Vercel Dashboard → Deployments → Functions → logs |
| Clear a corrupt local state on a user's machine | Instruct user to click **Clear Stored Data & Reset App 🚀** (`src/main.jsx:58`) or browser DevTools → Application → Storage → Clear |
| Invalidate a bad deploy | Vercel → Deployments → promote previous deployment (`09_Deployment_Guide.md`) |
| Rotation of `OPENAI_API_KEY` | Update env in Vercel + local `.env` and redeploy (`08_Environment_Configuration.md`) |

---

## Recommendations (if this scales beyond a demo)

In priority order:

1. **Add `GET /health`** returning `{ status:"ok", hasOpenAI: OPENAI_CONFIGURED, hasTavily: !!TAVILY_API_KEY }` (200).
2. **Add `helmet` + `express-rate-limit`** and structured `pino` JSON logging to `server/index.js`.
3. **Hook Sentry** on both `server/index.js` (Express error handler) and `src/main.jsx:GlobalErrorBoundary` for frontend crashes.
4. **Add a GitHub Actions workflow** running `npm ci && npm run validate:phase1 && npm run build` as a CI gate (see `10_Testing_and_Quality.md`).
5. **Add Vercel's Analytics/Web Vitals** or a lightweight event log (if business needs require).

Until then, be honest that Career GPS operates in **"stdout-and-Vercel" monitoring mode**.
