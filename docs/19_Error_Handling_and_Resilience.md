# 19 — Error Handling and Resilience

*Evidence: `server/index.js` (validation/sanitization/fallbacks), `src/services/localStorageService.js`, `src/main.jsx`, `src/App.jsx`, `src/schemas/roadmapSchemas.js`.*

## Strategy (What the App Actually Does)

Career GPS prioritizes **"app stays usable"** over surfacing errors:

1. **Reject malformed input early** (Zod `400` before prompts).
2. **Sanitize before prompt injection** (strip `System:/User:` markers).
3. **If AI fails or key missing, return `isMock:true` mock with HTTP 200** — keep the UX path alive rather than breaking onboarding.
4. **On the frontend, guard localStorage parsing and catch fetch failures** — fall back to deterministic `generateMockRoadmap`.
5. **Fatal data corruption (e.g., truncated localStorage) → GlobalErrorBoundary → auto-clear + reload**.

This means **most resilience is implemented**, while **retry/circuit-breaker/timeouts are not**.

---

## Validation

| Layer | Implementation | Error returned | Evidence |
|-------|---------------|----------------|----------|
| Backend every POST | `validateRequest(Zod)` middleware → `safeParse` → early `return 400` | `400 { error: "Invalid input data: path: message, ..." }` | `server/index.js:146-153` |
| Resume `profile` JSON string | `profileSchema.safeParse(JSON.parse(req.body.profile))` + JSON parse try/catch | `400 { error: "Invalid profile data: ..." }` or `Invalid JSON format` | `1214-1226` |
| Frontend profile | `parseStudentProfile(validated)` throws `ZodError` → inline `setError(validationError.issues[0].message)` | Rendered as red error box | `OnboardingWizard.jsx:587-589`, `roadmapSchemas.js:130` |
| Roadmap restore | `removeCycles` + `roadmapSchema.parse` → on failure `clearCareerGpsStorage()` | Logged warn, reset to welcome | `App.jsx:42-51`, `roadmapSchemas.js:134-160` |
| Node content | `parseNodeContent`/`parseCheckpointContent` strict | If mock path, the inline object is crafted to pass Zod | `roadmapSchemas.js:263-268` |
| Age, tier, field enums | `z.enum` in `studentProfileSchema` and `financialTierSchema` | Zod rejects illegal values | `roadmapSchemas.js:3,9` |

**What validation does NOT cover:** No content validation of LLM JSON beyond `JSON.parse(cleanGeminiJsonResponse(...))` (`server/index.js:798-804`). LLM hallucinations are fixed by **`normalizeRoadmapData`** (restamps timeframes by index, fixes bridgingSteps, default IDs, tiers — lines 615-769) rather than by rejecting and retrying.

---

## Error Handling by Surface

### Onboarding & Roadmap Generation

```
Invalid profile → 400 { error:"Invalid input data:..." } ← validateRequest(profileSchema)
   ↓ (frontend) App.jsx:69-74 parses errData.details||errData.error into thrown Error
   ↓ catch → use generateMockRoadmap() → still renders MINDMAP (App.jsx:84-94)
   ↓ fallback itself can fail → alert("... Resetting onboarding.") → handleReset() (App.jsx:95-99)
```

- On page reload, corrupted `career-gps:student-profile` or `career-gps:roadmap` that fails `parseStudentProfile/parseRoadmap` is **silently discarded** and `clearCareerGpsStorage()` is called (`App.jsx:49-51`). This prevents lockout but silently loses the user's data.

### Per-Endpoint AI Fallbacks

| Endpoint | Fallback trigger | Fallback behavior | Evidence |
|----------|------------------|------------------|----------|
| `/api/generate-roadmap` | `genAI===null` or OpenAI throw/JSON parse throw | Inline `mockGoalsToAchieve`/courses/internships/certs/alternates/skillGap + `buildTreeFromGoals` → `200 { ..., isMock:true, warning:"..." }` | `782,838-948` |
| `/api/generate-deep-questions` | same | `res.json(fallbackQuestions)` | `1090-1111` |
| `/api/generate-deep-roadmap` | same | `res.json(fallbackDeepRoadmap)` | `1128-1149` |
| `/api/suggest-skills` | same | `res.json({skills:[]})` | `1176-1198` (frontend then `getFallbackSkills`) |
| `/api/analyze-resume` | `genAI===null` or prompt/parse error | `res.json({ skills:[...], experience:[...], strengths:[...], isMock:true })` | `1235,1316-1351` |
| `/api/market-intelligence` | same | hardcoded mock intel + `isMock:true` | `1364-1378,1469-1499` |
| `/api/career-chat` | same | markdown mock `response` + `suggestedActions` | `1513-1528,1579-1597` |
| `/api/node-content` | same | `getOfflineMockNodeContent(nodeId,label,profile)` deterministic per stage/field | `2071-2073,1613-2055` |
| `/api/checkpoint` | same | Offline checkpoint synthesis | checkpoint handler fallback |

All fallbacks use **HTTP 200**, intentionally, so the frontend's happy-path code does not need error branching.

### File Upload

| Error | Response | Evidence |
|-------|----------|----------|
| Non-PDF MIME | `400 { error: "Only PDF files are supported ..." }` | `server/index.js:181,1201-1211` |
| >10 MB | `400 { error: "File size limit exceeded. Max size allowed is 10MB." }` | `1204` |
| No file | `400 { error: "No resume file uploaded." }` | `1231` |
| Unreadable PDF | Not an error — `pdfParse` catch → sentinel text + profile-only prompt → still `200` | `1244-1253` |

### localStorage / sessionStorage

| Concern | Handling | Evidence |
|---------|----------|----------|
| Corrupt JSON (truncated write, extension, quota overflow) | `safeParse(raw, fallback)` → returns fallback, warns | `localStorageService.js:28-37` |
| QuotaExceeded | On `safeSetItem`, clears `nodeCache`, retries; then clears `chatHistory`, retries | `localStorageService.js:42-62` |
| Fatal corruption on mount | `GlobalErrorBoundary` catches render, suggests `localStorage.clear` + reload; `App.jsx` fallback also clears | `main.jsx:6-84`, `App.jsx:49-51` |
| Session unavailable (e.g., private mode throttled) | `try/catch` silently swallows | `localStorageService.js:141,147,152,158` |

### Frontend Network Errors

- `App.jsx:84-99`: `fetch("/api/init-roadmap")` failure (including the known 404 from endpoint name drift) → `generateMockRoadmap(nextProfile)` from `src/data/mockRoadmapGenerator.js` → `processRoadmapForHistory` → `parseRoadmap` → render MINDMAP. User sees no error toast for this path.
- `CareerMindmapView.jsx:297-329` + `RoadmapDashboard.jsx:315-364` eagerly fetch `node-content` for unlocked nodes. Each fetch failure is `console.error` and skipped — node stays without goals (treated as incomplete until fetched).

### Global Crash Handler

`src/main.jsx:6-84` — `GlobalErrorBoundary` around `<App>`:

- Catches uncaught render errors (often from corrupted storage parsing).
- Logs `Fatal Crash Caught:`.
- UI shows "Clear Stored Data & Reset App 🚀" button → `localStorage.clear(); window.location.reload();`.
- There is also a `componentDidCatch` boundary in `ErrorBoundary.jsx` + per-view `ErrorBoundary` wrappers in `App.jsx:119-156`.

---

## Retries, Timeouts, & Circuit Breakers

| Mechanism | Status | Evidence |
|-----------|--------|----------|
| Automatic retry on OpenAI failure | **Not Implemented** — single attempt then fallback. No exponential backoff, no retry count. | `await client.chat.completions.create` at 212 with no retry wrapper |
| Request timeout on `fetch` to OpenAI/Tavily | Missing — raw `fetch` at `1388` and `client.chat.completions.create` have no timeout | Confirmed by absence of `AbortController`/timeout config |
| Circuit breaker | Not Implemented |  |
| Fallback retry (try mock generation after AI fails) | Implemented — but not recursive | See table above |

`Not Applicable` to claim retry/circuit-breaker exists.

---

## User-Facing Errors (what the user actually sees)

| Surface | Shown to user | Evidence |
|---------|---------------|----------|
| Onboarding validation errors | Red box `validationError.issues[0].message` below wizard steps | `OnboardingWizard.jsx:652` |
| Roadmap generation API error (subset) | Often none — falls through to mock; only the hard `alert("... Resetting onboarding.")` on double-failure | `App.jsx:97` |
| Stored data failed validation | Not surfaced — warn + clear + reset to WELCOME | `App.jsx:49` |
| Resume upload non-PDF/too large | Multer `400` string shown by `ResumeAnalyzer.jsx` (inspect `services/resumeService.js` integration) | `server/index.js:1201-1211` |
| Fatal crash | Full-screen "Career GPS Encountered a Fatal Error" with stack + reset button | `main.jsx:39-79` |
| Quota exceeded | Silent — cache/history trimmed without user notification | `localStorageService.js:42-62` |
| Toast/notification system | **Not Found** — no global toast library configured | No dependency |

---

## Logging

| Layer | Log behavior | Evidence |
|-------|-------------|----------|
| Backend | `console.log` for started generation + `[Backend Error]` on failure + `console.warn` for fallback mode | `server/index.js:192-196,785,808,836,1095,1133,1181,1239,1316,1380,1531,1580` |
| Frontend | `console.warn` for stored data failures and fallback paths; `console.error` for node-content eager fetch fails | `App.jsx:49,85,96`; `CareerMindmapView.jsx:287,359,381` |
| Persistent logging / aggregation | **Not Implemented** — stdout only; Vercel runtime logs capture but no structured logger, no PII redaction |  |
| Stack exposure | Not to client; error stacks go to server console/Vercel logs only; client `warning` fields are sanitized strings |  |

---

## Recovery Mechanisms (Summary)

| Failure | Recovery |
|---------|----------|
| Validation error on input | Client fix → retry submit |
| OpenAI transient error | Immediate fallback to mock (no user retry needed) |
| Corrupt localStorage | `safeParse` fallback + `GlobalErrorBoundary` clear+reload |
| Quota error | Trim cache/history and retry write |
| Double-fallback failure | `alert` + reset to WELCOME |
| No mechanism for | Retry-with-backoff, timeout, alerting, rollback of a bad deployed commit beyond Vercel redeploy |

Resilience is **high for the happy path (mock ensures uptime)**, **low for accurate AI correctness** (incorrect AI output is post-fixed rather than retried, and embeddings/RAG not used).

---

## Recommendations

1. Add `AbortController` timeouts (e.g., 30s) to OpenAI and Tavily calls.
2. Surface `isMock:true` clearly in the UI (toast/banner) rather than silent mock.
3. Add storage-space indicator and explicit quota-full user message instead of silent cache trim.
4. Wrap the top-level `await model.generateContent` in a retry helper (e.g., 2 attempts, 1s → 4s) before falling back to mock.
