# Phase 9 AI RAG Indexing QA

Phase 9 expands semantic retrieval from manual lead/deal/contact embedding into batch indexing for richer CRM knowledge.

## What This Phase Covers

- Batch RAG indexing endpoint for documents, emails, support cases, tasks, leads, deals, and contacts.
- Tenant-scoped embedding writes using the authenticated user's backend token.
- Idempotent embedding storage without relying on a missing unique constraint.
- Semantic search across a single entity type or all indexed entity types.
- RAG index status counts by entity type.
- AI Governance UI controls for viewing index coverage and refreshing the core knowledge index.
- Audit capture for RAG indexing runs.

## Run The Eval

```bash
npm run eval:ai-rag-index
```

Optional environment overrides:

```bash
CRM_RAG_INDEX_EVAL_EMAIL=takudzwa@gmail.com
CRM_RAG_INDEX_EVAL_PASSWORD=@ukta0022.
CRM_RAG_INDEX_EVAL_WORKSPACE=
CRM_API_URL=http://localhost:8080
CRM_AI_URL=http://localhost:8000
npm run eval:ai-rag-index
```

## Endpoints

```http
POST /rag/index
GET /rag/index/status
POST /search/semantic?query=...&entity_type=task&limit=5
```

Example:

```json
{
  "domains": ["documents", "emails", "cases", "tasks"],
  "limit": 100
}
```

## Expected Result

The eval should pass these checks:

- Governance capabilities expose RAG indexing support.
- Batch indexing completes with at least one indexed record.
- Index status reports stored embedding counts.
- Semantic search retrieves an indexed task/case/document/email record.
- RAG indexing audit events are recorded.

## QA Notes

- The eval expects seeded CRM data in at least one indexed knowledge domain.
- Semantic search is tenant scoped and uses the authenticated user's JWT for backend reads.
- Cost and latency are still tracked through the governance audit layer from prior phases.
