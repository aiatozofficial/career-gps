# 15 — Change Log

## Approach

The authoritative history is **git log**. This document supplements it with dated human-readable entries and explicitly marks where the log is incomplete (e.g., no version tags).

**Repo:** `origin https://github.com/aiatozofficial/career-gps.git` — 4 commits on `main` at time of this handover.

```bash
git log --oneline -20
git log --stat -5
```

---

## Commits (chronological)

| Hash | Date (git) | Message | Notable content |
|------|-----------|---------|-----------------|
| `58e7816` | — | `Fix deployment and update application configuration` | Early app config wiring |
| `0996d93` | — | `Send the changes to the github` | Bulk commit (likely includes early onboarding/mindmap pieces) |
| `f0f9706` | — | `fix: restore package.json and add Vercel deployment support (vercel.json, api wrapper, server export)` | Added `vercel.json`, `api/index.js` re-export, repaired `package.json` dependency manifest |
| `7f75ad1` | Latest | `node_modules are updated` | Dependency lock update — noisy diff (avoid squashing `node_modules/` in future commits; see `20_Development_and_Contribution.md`) |

> Exact timestamps and diff lines were truncated by the `git log --oneline` tool output under this Windows PowerShell handover session. Verify author dates locally with `git log --pretty=fuller -n 10`.

**`.gitignore` gaps:** No `.gitignore` was found, so `node_modules/` is likely tracked (evidenced by the `7f75ad1` message). That bloats every clone and diff.

---

## Manual Handover Audit (2026-09-11) — Baseline

This handover documentation capture establishes the baseline for future changes.

| Item | State at audit |
|------|----------------|
| Frontend version | `package.json:5` → `0.1.0` (private, unversioned releases) |
| Core flows verified | Onboarding → mock roadmap → mindmap scaffold → node lazy content → dashboard → deep insights all runnable (see `07_Local_Setup_Guide.md` verification) |
| Backend endpoints | 8 POST endpoints in `server/index.js` with OpenAI + mock fallbacks (see `05_API_Documentation.md`) |
| Deployment config | `vercel.json` + `api/index.js` wrapper present |
| Tests | Only `scripts/validatePhase1.mjs` (`npm run validate:phase1`) |
| Env | No `.env.example` committed; `server/index.js:171` loads `.env` at root |
| Known high bug | B-01 endpoint name drift (`/api/init-roadmap` vs `/api/generate-roadmap`) — see `12_Known_Issues_and_Limitations.md` |

No `r.pdf` sample, `docs/phase-notes.md`, or `CAREER_GPS_OVERVIEW.md` amendments were required as part of this baseline.

---

## Changelog (Maintain from Here Onward)

Future maintainers: append entries here with date, scope, and `file:line` trace.

```md
## [Unreleased]
### Added
- Export/import JSON snapshot for career-gps:* stores (services/localStorageService.js:XX, components/roadmap/RoadmapDashboard.jsx:XX).

### Fixed
- Aliased `POST /api/init-roadmap` to `POST /api/generate-roadmap` (src/App.jsx:60, server/index.js:771).

### Changed
- Bumped Node engine to 20 and pinned `engines` in package.json.

## [0.1.0] — 2026-09-11 — Handover baseline
- See commit 7f75ad1.
```

Follow the guidance in `24_Release_and_Versioning.md` for when to cut a tagged release and update this log.
