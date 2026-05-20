`# CRM Backend

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
- MinIO API: `http://localhost:9010`
- MinIO console: `http://localhost:9011`

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
- document uploads use S3-compatible object storage by default in Docker through MinIO; Postgres stores document metadata and object keys, not file bytes

## Document Storage

The documents module stores uploaded file bytes in object storage and keeps metadata in Postgres.

Local Docker defaults:

```bash
FILE_STORAGE_TYPE=minio
S3_ENDPOINT=http://minio:9000
S3_BUCKET=crm-documents
S3_PATH_STYLE_ACCESS=true
S3_CREATE_BUCKET=true
MINIO_API_PORT=9010
MINIO_CONSOLE_PORT=9011
```

Production can point the same settings at AWS S3, Cloudflare R2, DigitalOcean Spaces, or another S3-compatible provider. Use `FILE_STORAGE_TYPE=s3`, set `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY`, and omit `S3_ENDPOINT` for AWS S3.

For debugging only, `FILE_STORAGE_TYPE=local` writes files under `FILE_UPLOAD_DIR`.

## Start Backend Anytime

From [backend](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend):

```powershell
cd C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend
docker compose -f docker-compose.run.yml up -d postgres redis rabbitmq minio crm-backend
```

This starts the Java backend plus required backend infrastructure:
- Postgres database
- Redis cache
- RabbitMQ queue
- MinIO document object storage

Use this when you only need the Java backend/API running.

## Start Full Backend Stack

Use this if you also want the AI service running:

```powershell
cd C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend
docker compose -f docker-compose.run.yml up -d postgres redis rabbitmq minio crm-backend ai-service
```

## Rebuild After Code Changes

If backend Java code or backend dependencies changed:

```powershell
cd C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend
docker compose -f docker-compose.run.yml build crm-backend
docker compose -f docker-compose.run.yml up -d crm-backend
```

If Compose or dependency changes are acting stale, force a clean rebuild:

```powershell
docker compose -f docker-compose.run.yml build --no-cache crm-backend
docker compose -f docker-compose.run.yml up -d crm-backend
```

## Check Backend Status

```powershell
docker compose -f docker-compose.run.yml ps
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8080/actuator/health"
```

Expected backend health result:

```text
StatusCode: 200
```

Useful URLs:
- Backend API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Backend health: `http://localhost:8080/actuator/health`
- RabbitMQ UI: `http://localhost:15672`
- MinIO console: `http://localhost:9011`
- AI service health, only if started: `http://localhost:8000/health`

## Stop Backend

Stop containers without deleting data:

```powershell
docker compose -f docker-compose.run.yml stop
```

Stop and remove containers/networks while keeping named volumes:

```powershell
docker compose -f docker-compose.run.yml down
```

Do not remove Docker volumes unless you intentionally want to delete local database/object-storage data.

## Backend Logs

```powershell
docker compose -f docker-compose.run.yml logs --tail 150 crm-backend
docker compose -f docker-compose.run.yml logs --tail 150 minio
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
