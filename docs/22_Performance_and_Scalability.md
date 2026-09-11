# 22 — Performance and Scalability

*No benchmarks were found in repo; do not invent millisecond/second claims. This document separates **Observed** (code-evident) from **Potential Risks**.*

## Scaling Model (Actual)

| Dimension | Model |
|-----------|-------|
| **Users** | Single-user per browser. No shared state or DB — concurrent local users do not interact. |
| **Backend** | Stateless Express `app` run as Vercel serverless function (`api/index.js`) — scales by Vercel concurrency (no provisioned server). Local dev is a single `node` process. |
| **Storage** | In-memory: request buffers + localStorage on client. No DB index/connection concern. |
| **AI** | OpenAI `gpt-4o-mini` per request — cost is API tokens, not server cores. No caching layer for prompts. |

---

## Known Expensive Operations (from code)

| Operation | Cost driver | Where |
|-----------|-------------|-------|
| **OpenAI roadmap generation** (`constructPrompt` + `normalizeRoadmapData` + `buildTreeFromGoals`) | Large prompt (stage rules + JSON schema 15+ milestone defs) → long LLM latency; synchronous `await` with no timeout. A single call drives the primary onboarding UX | `server/index.js:362-769,771-834` |
| **Per-node content (`/api/node-content`)** | Up to N OpenAI calls as user explores the mindmap; eagerly prefetches *every* unlocked node in serial loop (`for ... await fetchNodeContent`) in `CareerMindmapView.jsx:243-294` and `RoadmapDashboard.jsx:315-364` → latency grows linearly with unlocked nodes | `CareerMindmapView.jsx:243-294`, `RoadmapDashboard.jsx:315-364`, `server/index.js:2057-~2260` |
| **Resume parsing** (`pdfParse(buf,{max:3})` + sanitization + OpenAI analysis) | PDF text extraction is CPU-bound on serverless function; blocking until parse + LLM complete | `server/index.js:1244-1314` |
| **Market intelligence with Tavily** (`fetch tavily.com` then OpenAI) | Adds an extra network hop before the LLM call; no parallelization | `server/index.js:1388-1464` |
| **Scaffold `reevaluateStates`** | Recursive walk of ~50-100 scaffold nodes per goal tick; state is held in duplicate across `CareerMindmapView.jsx` and `RoadmapDashboard.jsx` (`reevaluateStates` defined in both) → recomputed on every `completedGoals`/`userSelections`/`nodeCache` change | `scaffoldBuilder.js`, `CareerMindmapView.jsx:89-199`, `RoadmapDashboard.jsx:151-259` |
| **D3 rendering** | SVG nodes/links/transitions + `three` WebGL shader in `WebGLShader` running continuously | `src/components/roadmap/CareerMindmap.jsx`, `src/components/ui/web-gl-shader.jsx` |
| **Print export (`handlePrint`)** | Builds entire printable career guide HTML inline (all milestones, mindmap nodes, deep plan) and spawns `window.open` → large DOM/string | `RoadmapDashboard.jsx:656-765` |

---

## Observed / Verifiable Characteristics

- No bundle splitting beyond Vite defaults; `openai`, `pdf-parse`, `three` inflate `dist/` (inspect `dist/assets/*.js` size after `npm run build`).
- No code-splitting (`React.lazy` / dynamic `import()`) found.
- `Vite` provides HMR fast in dev; `CAREER_GPS_OVERVIEW.md:79` claims "less than 3 seconds" but **no Lighthouse/Web Vitals measurement** was found — mark as `Not Confirmed`.
- `localStorage` quota (~5 MB) + large `nodeCache` growth can hit `QuotaExceededError`; mitigated by trimming cache/history (`services/localStorageService.js:42-62`) at the expense of re-fetching node content.

---

## Potential Risks

| Risk | Impact | Mitigation (if pursued) |
|------|--------|-------------------------|
| **API quota / cost spike** — every onboarding, node exploration, deep plan, market/chat call hits OpenAI with no dedup or caching | Cost; quota throttling degrades UX to mocks without clear warning | Cache `POST /api/generate-roadmap` by `(stage, field, skills hash)` (even in-memory LRU); cache `node-content` server-side; throttle chat; cap per-IP/day via `express-rate-limit` |
| **Serverless concurrency spike** (e.g., batch classroom demo) | Cold starts + sequential node fetches → user-perceived latency | Batch node-content fetches (`Promise.all` instead of `for ... await`), add `AbortController` timeouts (`19_Error_Handling_and_Resilience.md`) |
| **PDF cold-start CPU** | Function timeout on large PDFs (even capped at 10 MB / 3 pages) | Offload parse to client worker or enforce stricter page/size checks before forward |
| **D3 large-tree jank** | Pan/zoom can jank on mobile with many nodes/layers | Limit rendered nodes to visible viewport + `requestAnimationFrame` batching |
| **Three.js background anim** | GPU/battery burn on low-end devices | Respect `prefers-reduced-motion`, lazy-load `web-gl-shader.jsx` behind a flag |
| **SAST/BOM blow-up** — `three`, `openai`, `pdf-parse` bundled client/server | Unnecessary client bundle size if `openai` were ever accidentally imported client-side | Confirm no client import of `openai` (currently safe: only `server/index.js` imports it) |

---

## Concurrency Assumptions

- **Frontend:** single-threaded React render loop; D3 zoom/pan runs on UI thread (no Web Workers).
- **Backend:** Node single-threaded; Express `app` handles requests concurrently via event loop but prompt generation is blocking `await`. No locks needed since there is no shared mutable state beyond per-request locals.
- **No DB transactions** to reason about — all mutations are localStorage writes serialized by the event loop.

---

## Token / Cost Considerations (see also `ai/05_AI_Limitations_and_Guardrails.md`)

- Model default `gpt-4o-mini` is low-cost; `gpt-4o` is higher cost if `OPENAI_MODEL` overridden.
- No token caps or `max_tokens` set in `createAIClient` (`server/index.js:206-220`) — completions are bounded only by the `response_format: json_object` shape and the LLM's own limits.
- Repeated deep optimization + market/chat loops are the highest potential spenders; consider explicit per-route rate limiting before exposing broadly.

---

## What to Measure When Adding Measurements

Before claiming improvements, add:

```bash
# Build size
npm run build && ls -lh dist/assets/

# Lighthouse (when app is running)
npx lighthouse http://127.0.0.1:5173 --only-categories=performance --chrome-flags="--headless"

# Backend latency (time per endpoint)
time curl -s -X POST http://localhost:5000/api/generate-roadmap -H "Content-Type: application/json" -d @sample-profile.json | jq .
```

Record results in `22_Performance_and_Scalability.md` (add an "Observed Benchmarks" table once measured).
