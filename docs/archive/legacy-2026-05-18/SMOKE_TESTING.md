# Smoke Testing

Run the live smoke suite from the repo root:

```bash
npm run smoke
```

The smoke runner validates major live backend and AI flows, including:
- backend actuator health
- AI service health
- JWT login and permission payload
- scoped RBAC access behavior
- leads, deals, documents, email, and revenue ops
- campaign CRUD, segmentation, journeys, and nurture progression
- support cases, SLA automation, assignment queue, and service dashboard
- customer data governance merge flow
- contract lifecycle and CPQ guardrails
- workspace database settings and workspace operations summary
- field service work-order lifecycle
- AI chat, forecasting, reports, and lead scoring unless AI is skipped

Environment variables:
- `CRM_API_URL`
  - default: `http://localhost:8080`
- `CRM_AI_URL`
  - default: `http://localhost:8000`
- `CRM_SMOKE_EMAIL`
  - default: `john@example.com`
- `CRM_SMOKE_PASSWORD`
  - default: `Codex123!`
- `CRM_SMOKE_SKIP_AI`
  - set to `true` to skip AI endpoint checks
- `CRM_SMOKE_TIMEOUT_MS`
  - request timeout in milliseconds
- `CRM_SMOKE_WORKSPACE`
  - optional workspace slug for tenant-aware login

Examples:

```bash
npm run smoke
```

```bash
CRM_SMOKE_EMAIL=admin@example.com CRM_SMOKE_PASSWORD=secret npm run smoke
```

```bash
CRM_SMOKE_SKIP_AI=true npm run smoke
```

For a backend-focused verification pass, use:

```bash
CRM_SMOKE_SKIP_AI=true npm run smoke
```
