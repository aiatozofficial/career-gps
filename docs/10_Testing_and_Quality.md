# 10 — Testing and Quality

## Overview

Career GPS has **minimal automated testing**. This document accurately records what exists, what does not, and what a new maintainer should add.

---

## What Exists

### Framework

- **No test framework installed.** `package.json` dev `dependencies` contain only `autoprefixer`, `postcss`, `tailwindcss`. No `vitest`, `jest`, `@testing-library`, `cypress`, `playwright`, or `eslint` are present.

### Command

| Command | Defined in | What it does | How to run |
|---------|------------|--------------|------------|
| `npm run validate:phase1` | `package.json:10` → `node scripts/validatePhase1.mjs` | Validates one sample `UNDERGRADUATE/TECH/MEDIUM` profile against `parseStudentProfile` and asserts that `validatedMockRoadmap` has ≥1 milestone | `npm run validate:phase1` |

**Script source:** `scripts/validatePhase1.mjs:1-29`

```js
import { validatedMockRoadmap } from "../src/data/mockRoadmap.js";
import { parseStudentProfile } from "../src/schemas/roadmapSchemas.js";

const sampleProfile = {
  name: "Aarav",
  stage: "UNDERGRADUATE",
  age: 19,
  field: { type: "TECH", customValue: "" },
  skills: ["Python", "Excel", "Communication"],
  goal: { type: "JOB_ROLE", description: "I want to become a data analyst at a startup." },
  financialTier: "MEDIUM",
  preferences: ["Prefer online"],
};
// asserts parseStudentProfile(sampleProfile) does not throw
// asserts validatedMockRoadmap.goalsToAchieve.milestones.length > 0
```

Expected output:

```
Phase 1 validation passed
Profile: Aarav, UNDERGRADUATE, MEDIUM
Mock milestones: 7
```

### What Else Is Tested

- Zod schema shape is **self-validating** at runtime (profile, roadmap, node content) — invalid states throw `ZodError` rather than rendering bad data (`roadmapSchemas.js:130,159,188,193,263-268`). There are no tests exercising those Zod failures.

---

## What Does NOT Exist

| Category | Status | Evidence |
|----------|--------|----------|
| Unit tests | **Not Implemented** — zero test files (`*test*`, `*spec*`, `__tests__`) found | Glob returned no matches under `src/` |
| Integration tests (API) | Not Implemented — no fetch/mock tests for `server/index.js` endpoints | No test file, no Supertest |
| End-to-end (E2E) | Not Implemented — no Playwright/Cypress harness or fixtures | No config found |
| Linting (`eslint`) | Not Implemented | Not in `package.json` |
| Type checking (`tsc`) | Not Implemented — project is vanilla JSX/JS with JSDoc-free Zod schemas as the type layer | No `tsconfig.json` |
| Formatting (`prettier`) | Not Implemented | No config |
| CI checks | Not Confirmed — no `.github/workflows`, no `ci.yml` | No workflow files found |
| Test data / fixtures | Only `src/data/mockRoadmap.js` + `r.pdf` sample PDF exist, but not exercised as assertions beyond validate |  |
| Build validation beyond Vite | Not Implemented — no `tsc --noEmit` or bundle-size check |  |

**Explicitly: no claim of strong test coverage should be made.** The project is **not** production-hardened by automated tests.

---

## How to Verify Quality Locally (Today)

### Minimal manual verification (what reviewers actually do)

1. **Schema sanity:**
   ```bash
   npm run validate:phase1
   ```

2. **Build:**
   ```bash
   npm run build
   # exit 0, no Vite errors, dist/ emits
   ```

3. **Runtime smoke (requires running backend + frontend):**
   - Onboarding through `Build roadmap` → mindmap node hover/click → goal checkbox cascades → tier toggle → Deep optimization wizard → resume upload (use `r.pdf`) → market intel query → chat send.
   - Vary stages (`CLASS_7_8`, `WORKING`) and tiers (`LOW`, `HIGH`) for the filter-guardrail paths.

4. **API-level (no credentials needed, mock path exercised):**
   ```bash
   # with no .env OpenAI key, every endpoint returns isMock:true mock payloads
   curl -X POST http://localhost:5000/api/generate-roadmap -H "Content-Type: application/json" -d @sample-profile.json | jq .goalsToAchieve.milestones | head
   curl -X POST http://localhost:5000/api/node-content -H "Content-Type: application/json" -d '{"profile":{"name":"Aarav","stage":"UNDERGRADUATE","age":19,"field":{"type":"TECH","customValue":""},"skills":["Python"],"goal":{"type":"JOB_ROLE","description":"Data analyst"},"financialTier":"MEDIUM","preferences":[]},"nodeType":"semester","nodeId":"node-sem-1","nodeLabel":"Sem 1: Campus & Academic Adaptation"}' | jq .goals
   ```

### What would constitute adequate coverage (recommended — not yet implemented)

A new team intending to maintain this app should prioritize:

1. **Schema unit tests** — `roadmapSchemas.js` with boundary values (age 11/12/40/41, missing goal description, `None yet` combinatorics).
2. **API contract tests** — Supertest against `server/index.js` for all 8 endpoints, mocking `genAI` (verify `400` vs `200` + shape, sanitization).
3. **Scaffold builder tests** — per-stage `buildMindmapScaffold` snapshot + state propagation (`reevaluateStates`) tests.
4. **Frontend smoke E2E** — Playwright: Welcome → Wizard → Roadmap generates → Mindmap checklist tick → selection choice → localStorage persisted.
5. **Lint + Type + CI** — `eslint`, `prettier`, `tsc --noEmit` (or at least `zod` strict), GitHub Actions running `validate:phase1` + `npm run build`.

Do not treat these recommendations as "existing coverage."

---

## Manual Testing Notes

- **Test data:** `r.pdf` (root) can be used as the resume fixture.
- **Stages to cover:** `CLASS_7_8`, `CLASS_11_12`, `UNDERGRADUATE`, `WORKING` all have distinct scaffold branches and distinct prompt timeframes — testing one does not cover another.
- **Tiers to cover:** `LOW` (stipend-guaranteed filter), `MEDIUM`, `HIGH`.

---

## Result Assessment

| Criterion | Assessment |
|-----------|------------|
| Build validation | Exists (`vite build`) |
| Contract validation | Partial (`Zod` at runtime + `validate:phase1`) |
| Automated tests | Not present |
| CI gate | Not present |
| Confidence for refactors | Low — rely on `validate:phase1` + manual mindmap flows |

*Do not claim production readiness based on tests.*
