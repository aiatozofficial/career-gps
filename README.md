# 🗺️ CareerGPS: Smart Career Guidance Engine

CareerGPS is a premium, interactive web application that acts as a real-time, adaptive career compass. Using OpenAI, it generates tailored study goals, project ideas, and certifications aligned to your current education stage, target career path, and financial budget.

---

## 🚀 Key Features

* **Kickresume-Style Premium Onboarding**: A beautiful glassmorphic multi-step onboarding wizard capturing stage, target goal, strengths, and weekly availability.
* **Interactive D3.js Career Mindmap**: Drag to pan, scroll to zoom, and click nodes to view details, mark goals complete, or select choices.
* **Flowing Mindmap Visuals**: Bezier connectors, marching dash-offset link flow animations (`.link-flow`), scale transitions, and DOM element raising on card hover.
* **Budget Resource Swapping**: A 3-tier financial selector (Free Only, Affordable, Self-Funded) that instantly swaps out resource suggestions, certifications, and course suggestions.
* **Bespoke 6-Week Study Schedule**: Grafts a custom weekly study and portfolio project building plan directly into your mindmap using OpenAI quizzes.
* **Bi-Directional Goal Synchronization**: Checking goals on the Dashboard checklist instantly updates the Mindmap states (unlocked, in_progress, completed) and progress percentages in real-time.
* **Gold Milestone Checkpoints**: Checkpoint nodes (Grade 10/12 Checkpoint, UG Semester Checkpoints) render achievements and milestones in gold cards without checklist checkboxes.

---

## 💻 Tech Stack

* **Frontend**: React 18.3.1 (package.json verified; see docs/00_Project_Overview.md discrepancy note), Vite, D3.js (Mindmap Visualization), Framer Motion, Vanilla CSS + Tailwind.
* **Backend Proxy**: Node.js, Express 5, dotenv, openai SDK, multer, pdf-parse, Zod.
* **AI Service**: OpenAI gpt-4o-mini (Structured JSON outputs), optional Tavily web search for market intel.

---

## 📚 Handover Documentation

This repository ships with a **production-grade handover documentation system** under [`docs/`](docs/README.md) — verified against source code, with `file:line` references.

**New developer?** Start at [`docs/README.md`](docs/README.md) (command center) → [`docs/00_Project_Overview.md`](docs/00_Project_Overview.md) → [`docs/07_Local_Setup_Guide.md`](docs/07_Local_Setup_Guide.md).

| Track | Path |
|-------|------|
| Non-technical stakeholder | `docs/00_*` → `01_Product_and_Business_Overview.md` → `13_User_Guide.md` |
| Developer / Future maintainer | `docs/00_*` → `03_System_Architecture.md` → `06_Folder_and_Codebase_Guide.md` → `20_Development_and_Contribution.md` |
| DevOps | `03_System_Architecture.md` → `08_Environment_Configuration.md` → `09_Deployment_Guide.md` |

> ℹ️ Two roadmap endpoints exist: `POST /api/init-roadmap` (lightweight init, used by `src/App.jsx:60`) and `POST /api/generate-roadmap` (full stage-timeline generation) — both verified at `server/index.js:771,2319`. See [`docs/05_API_Documentation.md`](docs/05_API_Documentation.md). Withdrawn mismatch note: `12_Known_Issues_and_Limitations.md# B-01` marks the earlier drift claim as verified-present.

---

## ⚡️ Quick Start

### Prerequisites
* Node.js (v18 or higher)
* An OpenAI API Key — **optional**: the app runs in offline mock mode without it

### Configuration
Create a `.env` file at the repo root (next to `package.json` — the backend loads `../.env` with `override:true` — see `docs/08_Environment_Configuration.md`):
```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
# Optional — live web search for POST /api/market-intelligence
# TAVILY_API_KEY=tvly-...
# Do NOT set VITE_OPENAI_API_KEY — Vite exposes VITE_* vars in the browser bundle
```

### Installation & Run

1. Install dependencies at the root level:
   ```bash
   npm install
   ```

2. Boot up both the Express Backend Proxy (port 5000) and the Vite development server (port 5173):
   * **Windows**: Simply double-click the [start-career-gps.bat](start-career-gps.bat) script at the root.
   * **macOS / Linux / Manual Windows**: Open two terminal windows and run:
      ```bash
      # Terminal 1: Backend
      node server/index.js

      # Terminal 2: Frontend
      npm run dev -- --port 5173
      ```

3. Open http://127.0.0.1:5173/ in your browser.

Verify: `npm run validate:phase1` should print `Phase 1 validation passed`. Full reproducible steps and diagnostics: [`docs/07_Local_Setup_Guide.md`](docs/07_Local_Setup_Guide.md).

---

## 🚀 Deployment (Vercel)

Build is `npm run build` → `dist/` (`vercel.json:3`). API rewrites to a serverless function `api/index.js` re-exporting `server/index.js`. Set `OPENAI_API_KEY` (server var, not `VITE_*`) in Vercel env. See [`docs/09_Deployment_Guide.md`](docs/09_Deployment_Guide.md).

---

## 📜 License
MIT © kaxshxk
