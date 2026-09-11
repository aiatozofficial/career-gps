# 25 — Documentation Maintenance

*Maintain the docs the same rigor as code — otherwise handover value rots within one sprint.*

## Principles

- **`docs/` is the single source of truth** for handover. Do not let `README.md` diverge — the root `README.md` is a summary; detailed facts live here.
- **Accuracy > volume.** Never pad a doc to satisfy a section header — mark `Not Applicable` / `Not Confirmed` instead.
- **Trace claims to `file:line`.** See `06_Folder_and_Codebase_Guide.md` — locators make audits cheap.
- **Audit on every release.** Adopt the lightweight cycle recommended in `24_Release_and_Versioning.md`: bump `package.json:5` → tag → verify → update `15_Change_Log.md`.

---

## Which Docs Are Canonical vs Legacy

| Path | Role | How to treat on edits |
|------|------|----------------------|
| `docs/README.md` | Command center, navigation, warnings, checklist | Update when doc index or handover status changes |
| `docs/00_*` → `docs/25_*` | Numbered handover docs (this system) | Update incrementally with each feature/bug fix |
| `docs/ai/*` | AI-specific depth | Update when prompts/models/RAG/Tavily behavior changes |
| `docs/decisions/README.md` | ADRs | Append ADR on major stack/pattern choices, don't rewrite history |
| `docs/phase-notes.md` | **Legacy carryover** (retained verbatim) | Reference only; do not edit as canonical doc — migrate any still-relevant notes into the numbered docs |
| `CAREER_GPS_OVERVIEW.md` (root) | Original product vision doc | Keep as vision source, not handover ground truth — update only when vision materially changes |
| `README.md` (root) | Project front-door + `→ docs/README.md` link | Update Quick Start + Links when entry points/commands/env change |

---

## When to Update Which Doc

| Code change | Docs to touch | Why |
|-------------|---------------|-----|
| New/changed `POST /api/*` route in `server/index.js` | `05_API_Documentation.md`, `18_External_Integrations.md` (if new external), `08_Environment_Configuration.md` (if env var added) | API contract is handover-critical |
| Env var added/renamed (`server/index.js:171,189,200,1383`) | `08_Environment_Configuration.md`, `07_Local_Setup_Guide.md`, `09_Deployment_Guide.md` | `.env` is the launch key |
| Profile/roadmap schema change (`roadmapSchemas.js`, `server/index.js:81-144`) | `04_Data_Model.md`, `02_Requirements.md`, `06_Folder_and_Codebase_Guide.md`, `20_Development_and_Contribution.md` (Dangerous Areas) | Shared contract — stale schemas cause Zod mismatch |
| Scaffold/progress state machine edit (`scaffoldBuilder.js`, `CareerMindmapView.jsx:89-199`) | `03_System_Architecture.md`, `12_Known_Issues_and_Limitations.md` (Debt), `11_Troubleshooting.md` | Lock-cascade correctness |
| Prompt / guardrails edit (`server/index.js:362-613,1604-1611`) | `ai/02_Prompt_Architecture.md`, `ai/05_AI_Limitations_and_Guardrails.md` | AI correctness |
| Build/deploy infra (`vercel.json`, `api/index.js`, `package.json:6-10`) | `09_Deployment_Guide.md`, `07_Local_Setup_Guide.md`, `00_Project_Overview.md` | Setup/deployment is the #1 handover failure mode |
| `.gitignore` / `lint` / `ts` / CI added | `20_Development_and_Contribution.md`, `10_Testing_and_Quality.md`, `15_Change_Log.md` | Process debt closure |
| New known bug or limitation discovered | `12_Known_Issues_and_Limitations.md`, `11_Troubleshooting.md` (add a diagnosis entry), `00_Project_Overview.md` warnings | Handover value is honest known-issues, not marketing |

---

## Ownership

| Doc | Suggested owner |
|-----|----------------|
| `03_System_Architecture.md`, `04_Data_Model.md`, `05_API_Documentation.md`, `06_Folder_and_Codebase_Guide.md` | Whoever last edited `server/index.js` or `roadmapSchemas.js` |
| `07_Local_Setup_Guide.md`, `08_Environment_Configuration.md`, `09_Deployment_Guide.md` | Deploy/release manager |
| `ai/*` | Engineer owning OpenAI prompts / Tavily |
| `11_Troubleshooting.md`, `12_Known_Issues_and_Limitations.md` | Support / QA |
| `15_Change_Log.md`, `25_Documentation_Maintenance.md` | Release manager |

Until formal ownership is assigned, **the author of a PR must update every doc listed in the table above** for their change scope.

---

## Review Ritual (Every PR and Every Release)

On every PR touching `src/`, `server/`, `vercel.json`, `package.json`, `.env`, or `.gitignore`:

1. **Cross-check the doc delta** against the code delta — if a contract changed, the doc for that contract must travel with the PR.
2. **Re-verify one claim** in the touched doc by opening the cited `file:line`. If the citation no longer matches, patch the doc.
3. **Run** `npm run validate:phase1 && npm run build` and paste output in the PR description.

On every tagged release (`24_Release_and_Versioning.md`):

1. Audit `docs/README.md` checklist — are any boxes newly false?
2. Audit `12_Known_Issues_and_Limitations.md` — did any `Bug` rows get fixed and need moving to `15_Change_Log.md`?
3. Bump `package.json:5` + update the `Last audited` line in `docs/README.md`.

---

## Preventing Documentation Rot

- **Prefer concrete refs** (`server/index.js:771`) over vague "backend handles X" — concrete refs survive refactors as greppable evidence and break visibly if a line moves.
- **Label unknowns honestly** — `Not Confirmed`, `TODO`, `Assumption` — instead of hiding gaps.
- **Do not create placeholder AI docs** for retrieval/RAG if not implemented (`ai/03_Retrieval_and_RAG.md` correctly marks it `Not Applicable`).
- **Do not duplicate** the same content across `README.md`, `00_Project_Overview.md`, and `docs/README.md` verbatim — keep the root `README.md` short with a pointer to `docs/README.md`.

---

## Tooling

- **Mermaid diagrams live inside markdown** — `03_System_Architecture.md`, `04_Data_Model.md` need no export step. If you add `assets/diagrams/*.mmd`, keep the in-markdown diagrams as the source and the PNGs as derived (prevents drift).
- **No generated doc site is planned** — add one (e.g., VitePress, Docusaurus) only if the repo grows beyond a handover docs set.
