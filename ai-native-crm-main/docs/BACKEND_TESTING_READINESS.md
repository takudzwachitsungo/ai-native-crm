# Backend Testing Readiness

This guide is the backend handoff for QA.

## What Is Ready

The backend is functionally implemented through:
- Phase 4: security and scoped RBAC
- Phase 5: generic automation execution
- Phase 6: marketing depth
- Phase 7: service depth
- Phase 8: contract and CPQ
- Phase 9: customer data governance
- Phase 10: platform hardening foundations
- Phase 11: field service foundation

## Test Entry Points

Primary backend docs and APIs:
- Swagger: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Health: `http://localhost:8080/actuator/health`
- Metrics: `http://localhost:8080/actuator/metrics`

## Recommended Test Order

1. Authentication and workspace context
- login
- workspace slug handling
- permission payload
- data-scope behavior across admin, manager, rep

2. Core CRM flow
- lead create/update/convert
- contact and company relationships
- deal lifecycle, approvals, stalled-deal rescue

3. Marketing
- campaign CRUD
- segment preview
- journey and journey-step lifecycle
- campaign-attributed lead nurture progression

4. Service
- case creation and specialization
- SLA targets and breach automation
- queue assignment
- support operations dashboard

5. Revenue and governance
- territory mismatch review
- quota-risk automation
- governance inbox and automation history
- workspace operations summary

6. Contract and CPQ
- quote pricing guardrails
- quote to contract conversion
- renewal invoice generation
- renewal chain and termination

7. Data governance
- duplicate detection
- governance summary
- contact merge and downstream rewiring

8. Field service
- work order create
- dispatch
- technician assignment
- in-progress and completion
- work-order statistics

## Important New Backend Areas

Workspace ops:
- `GET /api/v1/workspace/operations`

Field service:
- `GET /api/v1/field-service/work-orders`
- `POST /api/v1/field-service/work-orders`
- `POST /api/v1/field-service/work-orders/{id}/dispatch`
- `POST /api/v1/field-service/work-orders/{id}/start`
- `POST /api/v1/field-service/work-orders/{id}/complete`
- `GET /api/v1/field-service/work-orders/statistics`

Customer governance:
- `GET /api/v1/data-governance/summary`
- duplicate review endpoints
- contact merge endpoints

## Smoke Coverage

The smoke suite already exercises most major backend paths.

Run from repo root:

```bash
npm run smoke
```

Backend-only mode:

```bash
CRM_SMOKE_SKIP_AI=true npm run smoke
```

## Known Environment Prerequisites

- Docker must be running for the local stack
- backend uses Docker Compose runtime from [docker-compose.run.yml](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend\docker-compose.run.yml)
- there is no Maven wrapper in the repo right now, so local test execution uses:
  - system `mvn`, or
  - Docker build/runtime validation

## QA Notes

- Use tenant-aware credentials, not global assumptions
- Some modules depend on role/permission differences, so at least admin and non-admin scenarios should be tested
- For field service and workspace ops, verify both happy path and permission-denied behavior
- For governance and automation, verify task creation plus state changes on the target records
