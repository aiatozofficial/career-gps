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

* **Frontend**: React 19, Vite, D3.js (Mindmap Visualization), Framer Motion, Vanilla CSS.
* **Backend Proxy**: Node.js, Express, dotenv, openai SDK.
* **AI Service**: OpenAI gpt-4o-mini (Structured JSON outputs).

---

## ⚡️ Quick Start

### Prerequisites
* Node.js (v18 or higher)
* An OpenAI API Key

### Configuration
Create a `.env` file at the root of the project:
```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Installation & Run

1. Install dependencies at the root level:
   ```bash
   npm install
   ```

2. Boot up both the Express Backend Proxy (port 5000) and the Vite development server (port 5173):
   * **Windows**: Simply double-click the [start-career-gps.bat](file:///C:/Users/valle/Documents/WORK/careergpsxpathforge/start-career-gps.bat) script at the root.
   * **macOS / Linux / Manual Windows**: Open two terminal windows and run:
     ```bash
     # Terminal 1: Backend
     node server/index.js

     # Terminal 2: Frontend
     npm run dev -- --port 5173
     ```

3. Open http://127.0.0.1:5173/ in your browser.

---

## 📜 License
MIT © kaxshxk
