# 13 — User Guide

*For non-technical end users. Read `01_Product_and_Business_Overview.md` before the technical docs.*

## What You Can Do

- Answer onboarding questions → get a tailored career roadmap.
- Explore it as a **mindmap** (pan/zoom, click nodes for checklists) and a **timeline** and a **dashboard**.
- Check goals → see progress update live in both mindmap and dashboard.
- Swap between three **budget tiers** (Free only / Affordable / Self-funded) to filter courses/internships/certs.
- Run **Deep insights** quiz → get a 6-week study plan + projects.
- **Analyze your resume** (upload PDF), inspect **Market intel** for a role, and **chat** with the embedded advisor.

All of this lives in your **browser storage** — clearing browser data resets progress (no login required).

---

## Step-by-Step Workflows

### Start a New Career GPS session (first time)

1. Open the app (`http://127.0.0.1:5173` or the Vercel URL).
2. On the **Welcome** page click **Get Started**.
3. **Onboarding wizard** (12 steps) — answer each step and press **Next**:
   - **Name** → type your name.
   - **Where are you right now?** → choose *Class 7-8 / 9-10 / 11-12 / Undergraduate / Postgraduate / Working*.
   - **How old are you?** → slider 12–40 (defaults by stage).
   - **What field are you drawn to?** → *Tech / Science / Commerce / Arts / Law / Medicine / Design* or *Other* (type your field). For *Other*, AI will suggest specific skills.
   - **Pick skills you already have** → click chips; `None yet` cannot combine with other skills. For *Other* fields, AI suggests 6–8 skills after this step.
   - **What's your dream direction?** → *Job role / Entrepreneurship / Higher studies / Not sure yet*.
   - **Follow-up** → role/startup/course name or suggestion buttons; *Not sure* auto-generates an exploratory goal.
   - **How do you prefer to study?** → Self-study / Coaching / Hybrid / College-led.
   - **Main academic focus** → Boards only / Entrance rank / Academic-skill balance.
   - **Spare time weekly** → Light (2–4h) / Balanced (5–10h) / Intensive (12h+).
   - **Budget** → *Free only / Affordable / Self-funded* — affects which courses/internships/certs are shown later.
   - **Constraints** → optional multi-select (online, local, relocation, scholarship) or skip.

4. Press **Build roadmap** on the final step → generating screen appears.

**Expected:** Mindmap appears with nodes shaped by your stage (e.g., `CLASS_7_8` shows grades 7→Goal; `WORKING` shows quarterly blocks).

**Common mistakes:**
- `None yet` + other skills selected → the wizard enforces exclusivity; deselect one.
- Leaving the `OTHER` field text empty → wizard stays disabled on the next step — type the actual field name.

---

### Use the Mindmap

| Action | What happens | Common mistake |
|--------|--------------|----------------|
| Scroll or drag | Pan/zoom the tree (`CareerMindmap.jsx` — D3 owns zoom) | On mobile, two-finger drag can feel sluggish — use deliberate single drag |
| Hover a node | Preview card appears on hover; typing lock (click-open) preserves it | Hovering a `selection`/`choice` node does not open goals — use click |
| Click a node | Right-sidebar opens `MindmapNodePopover` with **Goals / Skills / Milestones** and checkboxes | Clicking a locked node shows no goals — complete the preceding node's goals first to unlock it |
| Checkpoint node (gold) | Opens **Checkpoint Panel** with `narrative / skills earned / certifications / internships / mini-resume` | Checkpoint progress is synthesized from your checked goals — incomplete nodes show less earned |
| `choice` nodes (cyan `→`) | `Confirm →` triggers branch choice (e.g., Board → Stream → Degree); selection clears downstream if changed | Confirming a different branch after checking goals will re-lock the alternative branch's milestones |
| Check a goal box | Progress ring and node states cascade downstream | Unchecking the last goal in a node will re-lock downstream selections that depended on completion |
| Tier toggle (top bar) | Filters `courses / internships / certs` matching `LOW/MEDIUM/HIGH` | Free-only tier may hide legitimate `MEDIUM/HIGH`-only cards — toggle to inspect |

**Legend:** `You (Start)` purple → `Academic Path` blue → `Semester Phase` emerald → `Choice Point` cyan → `Checkpoint Node` gold.

### Use the Dashboard

Open **Dashboard** via the header back button or route.

1. **Financial tier** chips at top → pick `Free only / Affordable / Self-funded`.
2. **Section tabs:** `Goals / Courses / Internships / Certifications / Alternate Paths / Skill Gap / Resume Analyzer / Market Intel / AI Career Chat / Deep Insights`.
3. In **Goals**: check milestones. Warning: there are **two goal trackers** — the classic `Goals to Achieve` milestones (legacy validated roadmap) and the mindmap's per-node `Goals` (lazy AI). Both have independent checklists; progress numbers will differ slightly.
4. **Download PDF** → spawns new tab with full career guide (mindmap expanded goals + all sections) and triggers print (`window.open` → `window.print()`).
5. **Edit Profile / Restart** → clears **all** `career-gps:*` storage and returns to Welcome. *There is no undo*.

### Use the Timeline

Header → **Journey Timeline**. Shows milestones linearly with `phase`/`timeframe` badges and detail panels — a read-only view of `roadmap.goalsToAchieve.milestones`.

### Deep Insights (6-week plan)

Dashboard → **Deep Insights** → **Launch wizard**:

1. Answer **3 multiple-choice** questions (context-tailored to your profile + roadmap).
2. Received `weeklyStudyPlan` (Weeks 1–6 with topic/resource/action) + `targetProjects` (2) + `strategicAdvice` (3–4 sentences).
3. Check each week as you complete it — stored as `career-gps:completed-deep-weeks`.

### Resume Analyzer

Dashboard → **Resume Analyzer**:

1. Click **Upload** → select a PDF ≤10 MB (use `r.pdf` in repo as a test fixture).
2. Expected: `skills` with match% + `experience` (≤3) + `education` (≤2) + `strengths`/`gaps`/`recommendations` (3 each). Mock fallback renders the same shape if OpenAI unavailable.

**Caveat:** scanned-image PDFs yield empty extraction → analysis is profile-only (the result prompt substitutes a sentinel string — `server/index.js:1252-1253`).

### Market Intelligence

Dashboard → **Market Intel**:

1. Enter `jobTitle` (+ optional `field`, `location`).
2. Expected: `demandLevel` (LOW/MEDIUM/HIGH/VERY_HIGH), `avgSalary`, `trendingSkills[5]`, `topCompanies[3]`, `jobListings[2]` with generic portal `url`s, `marketInsights` paragraph.
3. If your host configured `TAVILY_API_KEY`, results are grounded with live web searches (silently); otherwise LLM knowledge only. In either case listings are placeholder portal links, not verified live jobs.

### Career Chat

Dashboard → **AI Career Chat**:

1. Send any career query ("How can I improve my SQL?").
2. The response is tailored to your `profile + roadmap + resumeAnalysis` (passed as system-like context) and rendered as markdown with 2–3 suggested follow-ups.
3. History is persisted to `career-gps:chat-history`; quota full clears it silently as recovery.

---

## What Data Is Saved (and How to Remove It)

Your onboarding answers + roadmap + checklists + chat are saved as browser `localStorage` keys prefixed `career-gps:*` (`services/localStorageService.js`). There is:

- **No upload** to Career GPS servers beyond the ephemeral AI proxy (your profile data is forwarded to OpenAI per prompt, but not persisted server-side — `17_Security_and_Privacy.md`).
- **No login** — anyone with device access can view or reset it.
- **No cloud backup** — exporting is `Download PDF`; re-import is not implemented. To "move" data, re-onboard on the new device (or copy localStorage via DevTools → Application).

**To reset:** Dashboard → **Edit Profile / Restart**, or the fatal-crash screen's **Clear Stored Data & Reset App 🚀**. Both wipe all `career-gps:*`.

---

## Troubleshooting for Users (self-help)

| Symptom | Fix |
|---------|-----|
| Page shows a giant red error with "Clear Stored Data & Reset App" | That's `GlobalErrorBoundary` after a storage schema mismatch — click the clear button, re-onboard |
| Resume upload says `Only PDF files ...` | Your file isn't a PDF — export your resume as PDF (10 MB limit) |
| Mindmap node is grey/locked with no checklist | Complete earlier nodes' goals first — downstream unlocks cascade |
| Changing Board/Stream branched into a new subtree and my goals reset | Intended — a new branch selection re-locks the alternative branch's milestones |
| Deep insights quiz never loads questions | Backend or proxy down — a fallback set of 3 questions should still appear |
| Market intel salary looks stale / listing link is generic (`internshala.com`) | Expected — without `TAVILY_API_KEY` it's LLM-knowledge; listing `url` fields are placeholder portals, not live recruiter links — verify externally |
| Chat suggestion loops or generic answer | That's the `High-Fidelity AI Mock Mode` fallback when the API key/quota is missing — contact the deployer to verify `OPENAI_API_KEY` |

---

## Tips for Getting a Better Roadmap

- Be specific in the **goal follow-up**: `Data analyst at a health-tech startup using SQL/Python` beats `Data analyst`.
- For school students (`CLASS_7_8`), don't expect bootcamps — prompts intentionally cap goals to curiosity/hobby logic at that stage (`ai/05_AI_Limitations_and_Guardrails.md`).
- If you're targeting a *different stream* than selected (e.g., Medical goal but MPC board), the app can warn — `checkCourseMatch`/`checkStreamMatch` exist (`utils/roadmapHelpers.js:201-808`) and surface in some dashboard flows.
