# AI — 03 Retrieval and RAG

## Status: `Not Applicable` — No Retrieval, No RAG, No Vector Store

This project does **not** implement Retrieval-Augmented Generation, embeddings, a vector database, or any indexed retrieval corpus. This is verified, not assumed.

### Evidence

| Check | Result | Source |
|-------|--------|--------|
| Dependencies include `pinecone`, `weaviate`, `chroma`, `lancedb`, `pgvector`, `@langchain`, `langgraph`, `llamaindex`, `openai` embeddings (`embeddings.create`), `supabase` with vector | **Not Found** — `package.json:12-35` dev+dep list contains only `openai`, `d3`, `react`, `vite`, `dotenv`, `express`, `multer`, `pdf-parse`, `zod`, `three`, `framer-motion` + Tailwind dev deps | `package.json` |
| `server/index.js` calls `embeddings.create` or chunk/query a vector store | **Not Found** | `grep` on `server/index.js` for `embedding`, `vector`, `retriev`, `chroma`, `pinecone`, `pgvector` → no matches |
| On-disk or in-repo vector dump, embedding cache, or `_docs` collection | **Not Found** | No such directory; `Glob **/*` returned no embedding/README |
| Frontend references to `useRAG`, `Retrieval`, `SemanticSearch` | **Not Found** |  |
| `Tavily` search | **Optional, but not RAG** — Tavily is a **web search provider** whose live results are injected verbatim into the market-intel prompt as `searchResults`, not embedded/queried/re-ranked. See `18_External_Integrations.md:2` and `server/index.js:1383-1410`. | `server/index.js:1383-1410` |

---

## What the App Does Instead

- All prompts are **parametric**: the LLM responds from its in-model knowledge (training cutoff) plus the serialized `profile`/`roadmap`/`resume text` payload. See `01_AI_Architecture.md`.
- Market intel is the **only path that touches external knowledge beyond profile**: optionally enriched by a Tavily `fetch("https://api.tavily.com/search", { query: jobMarket+location+" 2026", max_results:5 })` — results are **concatenated** into the prompt context (`marketIntelligenceSchema` route), not embedded or grounded.
- Resume analysis uses **`pdf-parse`** (text extraction, not embedding) — first 3 pages capped to 10k chars (`server/index.js:1244-1253`). There are no embeddings over the extracted text.

---

## Implications

- **No grounding layer.** Market `avgSalary`, `trendingSkills`, `topCompanies` and listing `url`s are **LLM-generated with optional web grounding** — they are not fetched from a trusted job API. Their `url` fields are placeholder portal links (e.g., `https://internshala.com`) and must not be presented as verified.
- **No citation or provenance.** Responses have no `source` field. Do not document hallucination prevention from retrieval until implemented.
- **Do not add this doc's section header as a feature.** If future work adds embeddings/RAG, replace this `Not Applicable` statement with a real design and add a migration doc.

---

## If Retrieval Is Added Later

Add at minimum: chunking strategy, embedding model + version, vector store, index refresh cadence, latency/cost envelope, evaluation suite, and provenance UI. Until then, this file must stay `Not Applicable`.
