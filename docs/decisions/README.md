# Architecture Decision Records (ADRs)

*Lightweight ADRs derived from repository evidence. If the original reason cannot be established from code/comments/docs, this is called out as `Reason not confirmed ...` — no history is invented.*

---

## ADR-001: Thin Express Proxy Instead of Client-Side OpenAI Call

**Decision:** Route all OpenAI calls through `server/index.js` (`POST /api/*`) rather than calling OpenAI from the browser.

**Context:** OpenAI keys are sensitive; `VITE_*` Vars are inlined into the browser bundle and leak.

**Decision:** Implement an Express proxy that accepts `profile` and forwards a `constructPrompt(profile)` to OpenAI; sanitize + validate before forwarding. Preserve this regardless of LLM.

**Consequences:**
- (+) `OPENAI_API_KEY` never exposed to client — see `docs/phase-notes.md:12-16`.
- (+) Zod validation + sanitization in one place (`server/index.js:11-78,146-153`).
- (-) Stateless; adds latency hop. Avoid re-introducing `VITE_OPENAI_API_KEY`.

**Evidence:** `server/index.js:171,190-227`, `api/index.js:1-2`, `docs/phase-notes.md:12-16`.

---

## ADR-002: Structure-Only Scaffold + Lazy Node Content

**Decision:** `src/data/scaffoldBuilder.js:391-513` builds the full mindmap shape (nodes, colors, labels, selection points, checkpoints) deterministically, **without** calling OpenAI. Per-node content (goals/skills/summary) is fetched lazily via `POST /api/node-content` when each node becomes eligible, and cached in `career-gps:node-content-cache`.

**Context:** Prompting the LLM to emit the whole tree structure produced nesting errors that violated Zod (`CAREER_GPS_OVERVIEW.md:88-90` "Bulletproof Decision Trees").

**Decision:** Generate tree structure programmatically; delegate only per-node semantics to the LLM, constrained by `AGE_CONTENT_RULES`.

**Consequences:**
- (+) Tree validity is never hallucinated — `decisionTreeNodeSchema:98-109` always passes.
- (+) Mindmap renders even with no OpenAI key (scaffold alone is enough for the UI skeleton).
- (-) Content requires N lazy fetches; eager prefetch loop is serial today (see `12_Known_Issues# D-07`).

**Evidence:** `src/data/scaffoldBuilder.js:391`, `server/index.js:1604-1611,1613-2055,2057-...`.

---

## ADR-003: Programmatic DecisionTree Instead of LLM-Generated

**Decision:** Build `decisionTree` via `buildTreeFromGoals(goalText, goalsToAchieve, courses, internships, certs, alternatePaths)` at `server/index.js:230-309`, rather than asking the LLM for a `decisionTree` JSON subtree.

**Context:** See `CAREER_GPS_OVERVIEW.md:88-90` and comment at `server/index.js:229` — "programmatically build the decision tree nodes linearly from milestones to ensure absolute Zod compliance."

**Consequences:** Supplementary cert/alternate nodes are pushed under milestones (`milestones[2]`, `milestones[4]` etc.); linear linked list (`milestones[i].children.push(milestones[i+1])`) is deterministic.

**Evidence:** `server/index.js:230-309,816-829,932-944`.

---

## ADR-004: Local-Storage Persistence (No Database)

**Decision:** Persist all user state as per-origin `localStorage`/`sessionStorage` keys via `src/services/localStorageService.js:1-21` and `src/schemas/roadmapSchemas.js` schemas, with no backend database.

**Context:** Zero infra cost for a demo-grade deployment; instant offline fallback; no auth layer to design.

**Consequences:**
- (+) Zero host cost, instant Vercel deploy, no auth/data-leak surface.
- (-) No multi-device sync, no backup, no import/export (see `23_Data_Lifecycle_Backup_and_Recovery.md`), quota fragility (`QuotaExceededError` recovery at `localStorageService.js:42-62`).
- (-) Schema drift clears user data silently (`GlobalErrorBoundary`, `App.jsx:49`).

**Reason not confirmed from repository evidence** whether a DB was explicitly decided against for business reasons vs pragmatism — treat this as a later migration decision.

**Evidence:** absence of any DB driver/migration, `services/localStorageService.js`, `23_Data_Lifecycle_Backup_and_Recovery.md`.

---

## ADR-005: Vite + React SPA + D3 Mindmap (React Owns Empty SVG, D3 Owns Draw)

**Decision:** Use React rendering for the app shell and an empty `<svg ref>`; D3 owns pan/zoom, node/link drawing, transitions, and click handling (boundary noted in `docs/phase-notes.md:22`).

**Context:** D3's imperative DOM and React's declarative render conflict on the same nodes.

**Decision:** Keep the boundary strict; re-evaluate states via React state that triggers D3 re-renders rather than mutating React nodes imperatively from D3.

**Evidence:** `src/components/roadmap/CareerMindmap.jsx`, `src/components/roadmap/CareerMindmapView.jsx`, `docs/phase-notes.md:21-24`.

---

## ADR-006: Mock-Fallback on Every Endpoint Instead of Failing Hard

**Decision:** Every `POST /api/*` handler `catch`-returns an `isMock:true` high-fidelity mock with HTTP `200` so the frontend's happy path keeps rendering when OpenAI is misconfigured or throttled (and silent `generateMockRoadmap` client-side fallback in `src/App.jsx:87-99`).

**Context:** Demo deployments need to remain functional without billing/quota.

**Consequences:**
- (+) App is usable offline/first-load even with no key (product requirement).
- (-) Users can be fooled into thinking a real AI roadmap was generated (`isMock` is only in JSON, not a visible banner — see `16_Future_Roadmap.md: B.1`).

**Evidence:** `server/index.js:192-197,837-950,1090-1597,1613-2055`; `src/App.jsx:84-99`.

---

## ADR-007: Single-file Backend `server/index.js` (+ Adapter `createAIClient`)

**Decision:** Keep all 8 endpoints, sanitization, prompts, fallbacks, and the adapter in one file (~2300 lines), with `createAIClient` wrapping the OpenAI SDK to preserve legacy `getGenerativeModel(...).generateContent` shape (`server/index.js:206-227`).

**Context:** Small team; adapter eases LLM provider migration.

**Consequences:**
- (+) Provider portability; single-file grep discoverability.
- (-) File length ergonomics; considering split-by-route later (`16_Future_Roadmap.md`).

**Evidence:** `server/index.js:206-227,771-1597`, `api/index.js:1-2`.

---

## Template for Future ADRs

When adding a new ADR, copy:

```md
## ADR-00N: <Title>

**Decision:** One sentence.

**Context:** What problem it addresses.

**Decision:** What was chosen.

**Consequences:** Benefits, costs, trade-offs.

**Evidence:** `file:line`.

**Status:** Accepted | Superseded by ADR-XYZ

<!-- If the original reason cannot be established: -->
**Reason not confirmed from repository evidence.**
```
