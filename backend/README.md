# CRM Backend

Spring Boot backend for the multi-tenant AI-native CRM platform.

## Current Scope

The backend now includes:
- workspace-aware authentication and dedicated tenant database routing
- scoped RBAC with permission-based guards
- core CRM modules for leads, contacts, companies, deals, tasks, email, documents, quotes, invoices, and contracts
- workflow and automation foundations
- campaign management, segmentation, and nurture journeys
- support case management with SLA and queue operations
- customer data governance and merge flows
- field service work orders
- workspace operations summary and automation observability

## Runtime

Primary local runtime is Docker Compose from [docker-compose.run.yml](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend\docker-compose.run.yml).

Key host endpoints:
- Backend API: `http://localhost:8080`
- Swagger: `http://localhost:8080/swagger-ui.html`
- Actuator health: `http://localhost:8080/actuator/health`
- AI service health: `http://localhost:8000/health`
- RabbitMQ UI: `http://localhost:15672`

## Prerequisites

- Docker Desktop / Docker Engine with Compose support
- Java 17+
- Maven 3.9+ if you want to run backend tests outside Docker

Note:
- there is currently no Maven wrapper checked into this repo
- use `mvn` directly or the Docker build/runtime paths

## Environment

Use [\.env.example](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend\.env.example) as the backend template.

Important backend notes:
- `TENANCY_DATABASE_CREDENTIALS_KEY` now supports plain values plus `env:`, `file:`, and `base64:` references
- Docker Compose uses [\.env](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend\.env) for the local stack
- email delivery now expects a real SMTP provider configuration via `MAIL_*` environment variables

## Start The Stack

From [backend](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend):

```bash
docker compose -f docker-compose.run.yml up -d --build
```

Check health:

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8000/health
```

## Backend Verification

Run backend smoke from the repo root:

```bash
npm run smoke
```

Skip AI checks when only backend verification matters:

```bash
CRM_SMOKE_SKIP_AI=true npm run smoke
```

See [SMOKE_TESTING.md](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\docs\SMOKE_TESTING.md) and [BACKEND_TESTING_READINESS.md](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\docs\BACKEND_TESTING_READINESS.md).

## Main API Areas

- `/api/v1/auth`
- `/api/v1/leads`
- `/api/v1/contacts`
- `/api/v1/companies`
- `/api/v1/deals`
- `/api/v1/tasks`
- `/api/v1/documents`
- `/api/v1/emails`
- `/api/v1/campaigns`
- `/api/v1/cases`
- `/api/v1/contracts`
- `/api/v1/field-service/work-orders`
- `/api/v1/data-governance`
- `/api/v1/workflows`
- `/api/v1/automation-rules`
- `/api/v1/workspace`
- `/api/v1/dashboard`

## Backend Testing Focus

For thorough QA, prioritize:
- auth, tenant routing, and permissions
- lead to deal flow
- campaign to lead attribution and nurture progression
- case SLA, queue assignment, and service dashboards
- contract lifecycle and CPQ guardrails
- data governance duplicate detection and merge
- field service work order lifecycle
- workspace ops and automation history

## Reference Docs

- [SMOKE_TESTING.md](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\docs\SMOKE_TESTING.md)
- [DEPLOYMENT.md](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\docs\DEPLOYMENT.md)
- [CI_CD.md](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\docs\CI_CD.md)
- [TENANCY_RBAC_NEXT.md](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\docs\TENANCY_RBAC_NEXT.md)
