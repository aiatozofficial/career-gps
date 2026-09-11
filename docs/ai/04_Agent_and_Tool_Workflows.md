# AI — 04 Agent and Tool Workflows

## Overview

Career GPS has **light agentic patterns** but does **not** implement tool calling, autonomous agents, planner loops, or function-execution traces. This document distinguishes which patterns are present (so a new maintainer does not inadvertently delete them) vs absent (so handover does not over-claim).

---

## What Exists

### Chat-style persona with history tail

`POST /api/career-chat` (`server/index.js:1502-1597`) is the closest to "agentic":

- **Persona:** `You are "Antigravity Career Advisor"` (`1539`) with profile + roadmap + resume context prepended as a context block.
- **History:** `messages.map(m => "User:/Advisor: content").join("\n")` is serialized into the prompt tail (`1538-1572`). No summary compression — every prior turn is included verbatim (each `content` sanitized to ≤2000 chars).
- **Output contract:** `{ response: "markdown ...", suggestedActions: ["action 1","action 2"] }` (`1562-1568`). `suggestedActions` are rendered as quick-reply chips in `pathforge/CareerChat.jsx` and act as the only lightweight "follow-up planning" loop the app has.

This is a **prompt-context chat**, not an agent with tools.

### Market-intelligence web-grounded path (optional)

`POST /api/market-intelligence` (`1383-1410`) conditionally does:

```
if TAVILY_API_KEY:
  POST https://api.tavily.com/search { query:"job market 2026 for {jobTitle}/{location}", depth:"basic", max:5 }
  searchResults = JSON.stringify(data.results)
  inject into OpenAI prompt as: "Here is live web search: \"\"\" ${searchResults} \"\"\""
else:
  rely on OpenAI training knowledge
```

This is **one deterministic external fetch → prompt concatenation**, not a planner/tool loop. There is no re-search, no critique, no ranking, and no tool-choice on the model's side.

### Resume analysis "tool" (local + LLM)

`POST /api/analyze-resume` (`1200-1351`) runs `pdfParse(buffer,{max:3})` locally, then forwards the truncated text + profile to the LLM prompt (`1261-1308`). `pdf-parse` is invoked as a **local library call**, not as an LLM tool call.

---

## What Does NOT Exist

| Pattern | Status | Evidence |
|---------|--------|----------|
| LLM `tool calling` / `function calling` / `tool_choice` | **Not Implemented** — `createAIClient` never passes `tools` or `function` blocks; only `messages + response_format: json_object` | `server/index.js:206-220` |
| Agent planner / loop (ReAct, chain-of-thought, multi-step executor) | Not Implemented | No loop or tool-response round-trip in any handler |
| Memory beyond the chat turn window | Not Applicable — memory is the prompt string, not an external store; `TAVILY` injection is stateless per request |  |
| Vector-store tool (query embeddings) | Not Applicable | See `03_Retrieval_and_RAG.md` |
| Autonomous scheduling / background agents / cron | Not Applicable | No workers |
| User-defined agent workflow configuration | Not Applicable |  |

Do not document a "Career GPS agent architecture" or autonomous agent behavior — claims of agents, planners, or tool-use are **not verified** beyond the two single-step fetch→prompt patterns above.

---

## Workflow Diagram (Actual)

```mermaid
flowchart TB
  U[User]
  FE[React pathforge/CareerChat.jsx\n+ ResumeAnalyzer / MarketIntel]
  BE[Express server/index.js]
  OAI[(OpenAI gpt-4o-mini\nsingle json_object completion)]
  TAV[(Tavily POST\nonly on market intel)]

  U -- resumes /\
       asks chat /\
       queries market --> FE
  FE -->|POST JSON/multipart| BE

  subgraph BE single-turn
    B[Zod validate +\nsanitizeProfile]
    B --> P[Assemble monolithic prompt\n+ optional Tavily fetch]
    P --> OAI --> J[clean + JSON.parse\n(+ normalize / offline-mock fallback)]
  end

  TAV -. only market-intel .-> P
  J --> FE --> U
```

No loop back from OAI to TAV — the "search" is **before** the LLM call, not invoked **by** the LLM.

---

## Evidence Per Surface

| Surface | Workflow type | Lines |
|---------|--------------|-------|
| `POST /api/career-chat` | Prompt-context chat + suggestedActions quick-replies | `1502-1597` |
| `POST /api/market-intelligence` | Conditional `fetch(tavily)` → prompt inject → LLM → JSON | `1353-1500` |
| `POST /api/analyze-resume` | Local `pdfParse` → prompt inject → LLM → JSON | `1200-1351` |
| All other routes | Single monolithic prompt → LLM → JSON (or mock) | `771-1198,2057-~2260` |

If an agent/tool framework is added later, keep this document as the delta baseline and add a new ADR under `decisions/README.md` for that choice.
