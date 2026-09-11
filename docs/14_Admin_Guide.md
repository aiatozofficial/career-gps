# 14 — Admin Guide

## Status: `Not Applicable` — No Admin Role or Admin Surface Exists

Career GPS has **no administrative interface, no admin role, no user management, no multi-tenant controls, and no background jobs**. The repository contains:

- `Implemented (single user)`: anyone visiting the deployed URL (or local `http://127.0.0.1:5173`) can use every feature.
- `Not Applicable (admin)`: all of the following are absent and intentionally not claimed.

| Admin concern | Implemented? | Evidence |
|---------------|--------------|----------|
| Admin login / dashboard | Not Applicable | No route, component, or endpoint for `/admin`, `adminApi`, or role check exists (`grep admin` returned no handler) |
| User/tenant management | Not Applicable | No DB or auth (`04_Data_Model.md` — storage is per-browser `localStorage`) |
| Roles/permissions | Not Applicable | `src/schemas/roadmapSchemas.js` defines exactly one actor: the onboarding user |
| Configuration panel | Not Applicable | Config is code + `.env` + Vercel env (`08_Environment_Configuration.md`) |
| Audit log / analytics admin view | Not Applicable | `21_Operations_and_Monitoring.md` — no logging SaaS |
| Content moderation (resume/job/chat) | Not Applicable | Sanitization + Zod validation only (`server/index.js:11-78,146-153`) |

---

## What an "Operator" Can Do Instead

If you are operating the deployment (closest analogue to an admin), these are the relevant procedures:

| Task | Where to handle | Procedure |
|------|----------------|-----------|
| Change AI model or pricing tier | Env config | Update `OPENAI_MODEL` in `.env` or Vercel env, redeploy (`08_Environment_Configuration.md`) |
| Rotate secrets | Env config | Rotate `OPENAI_API_KEY` / `TAVILY_API_KEY` in Vercel + local `.env` (`17_Security_and_Privacy.md`) |
| Deploy or roll back | Deployment | `vercel --prod` or Vercel → Deployments → Promote previous (`09_Deployment_Guide.md`) |
| Clear a user's corrupted state | User self-help | Instruct user to click **Clear Stored Data & Reset App 🚀** or `DevTools → Application → Clear Storage` (`11_Troubleshooting.md` symptoms 3 & 12) |
| Content model change | Code | Edit `server/index.js:362-613` prompts or `roadmapSchemas.js` schemas, then `npm run build` |
| Analytics / business reporting | `Not Confirmed` — none exists | Add Vercel Analytics or an event pipeline if needed |

---

## If an Admin Surface Is Added Later

When a genuine admin role is required (e.g., to manage tenants, billing, or moderation), follow the handover guidelines in `20_Development_and_Contribution.md` and `17_Security_and_Privacy.md`:

1. Introduce auth (session/JWT) before any admin route; do not leave `/api/admin/*` unguarded.
2. Gate feature flags via env, not hardcoded constants.
3. Add audit logging for any destructive operator action (clearing user data, changing prompts, rotating keys).

Until such features are verified, this document must stay as `Not Applicable` — do not invent admin capabilities during handover.
