# 16 — Future Roadmap

## Split: Confirmed TODOs vs Proposed Improvements

Do not present proposed ideas as company-approved plans. Evidence first, then suggestion.

---

## A. Confirmed / Existing TODOs (grounded in repo)

| Source | Item | Location | Implication |
|--------|------|----------|-------------|
| Phase carryover | Replace preview tree with fully interactive D3 tree + bi-directional checklist ↔ tree sync | `docs/phase-notes.md:21-24` + implemented (verify `CareerMindmap.jsx` is now the primary viewer, not `DecisionTreeView.jsx`) | The `DecisionTreeView.jsx` / `DecisionTree.jsx` legacy components may be removable once the scaffold mindmap is the sole viewer — audit before deleting |
| Phase carryover | Alternate-path clicks should expand into a full alternate roadmap once real progress state + AI data are ready | `docs/phase-notes.md:25` | `alternatePaths` still render as cards; no downstream scaffold branch is generated from an alternate selection |
| Implicit (code comment) | Per-stage timeframes are prefix-mapped to `onboardingPhase` history (`roadmapHelpers.js:588-659` phase-to-milestone map) | `roadmapHelpers.js:588-659` | If stages add a "gap year" option, the history prefix concatenation order must be updated correspondingly |
| Implicit (prompt TODO in prose) | Budget-aware resource swapping: keep platform localization (NPTEL/SWAYAM, Internshala/Naukri, NASSCOM) in AI output — guardrail comments mark this as load-bearing | `server/index.js:376-394` | Future prompt iterations must preserve `guardrailsPrompt` localization bullets |

*No `// TODO` or `// FIXME` comments were found in `src/` at inspection time (quick `grep` yielded none), and no GitHub issues panel data is committed — the above is the full set of repo-confirmed TODOs.*

---

## B. Proposed Improvements (handover author's suggestions — not company roadmap)

Ranked by value-to-effort and handover risk.

### B.1 Immediate (before next handoff or user beta)

1. **Fix B-01 endpoint alias** — map `/api/init-roadmap` → `/api/generate-roadmap` or change the `App.jsx:60` string. Cost: one line. Value: unblocks real AI roadmaps. *(Reference: `12_Known_Issues_and_Limitations.md# B-01`.)*
2. **Add `.gitignore` + `.env.example`** (D-03/D-04). Cost: two files. Value: prevents secret leaks and `node_modules` commit churn. *(See `08_Environment_Configuration.md` template.)*
3. **Deduplicate `reevaluateStates`** (D-01) into `src/utils/mindmapStateMachine.js` with unit tests. Cost: one utility + two component refactors. Value: eliminates drift between Dashboard and Mindmap.
4. **Add `/health` + `helmet` + `express-rate-limit`** (`server/index.js`). Cost: three middlewares. Value: deployable hygiene before any expanded user base.

### B.2 Near-term (after product validation)

5. **Export / Import JSON snapshot** (`23_Data_Lifecycle_Backup_and_Recovery.md`) — let users take `career-gps:*` across devices. Include `storage-version` migrations.
6. **Server-side node-content caching** — memoize `/api/node-content` by `(nodeId,stage,field,completedGoals hash)` with a bounded LRU to avoid re-paying OpenAI tokens. Parallelize the eager prefetch (replace `for await` with `Promise.all` + concurrency cap).
7. **Rate limiting per-IP** on `/api/career-chat` and `/api/market-intelligence` to cap spend.
8. **CI gate**: GitHub Actions running `npm ci && npm run validate:phase1 && npm run build` on every PR.
9. **Surface `isMock:true` visibly** — banner in Dashboard/Mindmap header when responses are fallback mocks (silent `isMock` is a trust issue — see `12_Known_Issues_and_Limitations.md`).
10. **Lint/format** — add `eslint` + `prettier` to `package.json` and enforce in CI (currently absent).

### B.3 Longer-term (if product scales)

- **Embeddings / RAG** — ground market intel / course suggestions on crawled NPTEL/Internshala pages rather than LLM string generation (see `ai/03_Retrieval_and_RAG.md` = Not Applicable today).
- **Auth-gated cloud sync** — Postgres/Convex/Supabase multi-tenant store replacing `localStorage` for cross-device progress, with backup/restore procedures.
- **Observability** — Sentry for JS crashes, Vercel log drains or `pino` structured server logs, Web Vitals analytics.
- **Alternate-path branching in scaffold** — generate a full `buildAlternatePathScaffold` branch behind the alternate tiles (closes the phase-notes P2→P3 carryover).
- **D3 virtualization / lazy sub-tree** for huge school-stage trees; respect `prefers-reduced-motion` for the Three.js shader.

---

## How to Prioritize

- Anything under **B.1** should be treated as **handover-blocker fixes** — they prevent the docs from becoming stale or the deployment from leaking secrets.
- **B.2** is the next sprint backlog for whoever inherits the repo.
- **B.3** are not handover commitments — document or defer until business scope confirms them.

Maintain this split clearly in future edits.
