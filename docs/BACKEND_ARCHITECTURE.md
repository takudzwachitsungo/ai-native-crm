# Backend Architecture

## Responsibilities

The Java backend owns:

- Authentication and session management.
- Tenant context and tenant-aware data access.
- RBAC and module permissions.
- CRM entities and business workflows.
- Standard reports and deterministic exports.
- Third-party integrations and token storage.
- Document metadata and object-storage access.
- Realtime event publication.
- Push notification registration and delivery queueing.

## Main Modules

- Auth and account self-service: registration, login, refresh, password reset, 2FA, sessions, notification preferences.
- Sales: leads, deals, companies, contacts, products, quotes, invoices, contracts.
- Marketing: campaigns, segments, nurture journeys.
- Service: support cases, queues, SLA policies, assignment workflows.
- Field service: work orders and technician assignment.
- Revenue operations: quota, territory, forecast/reporting support.
- Integrations: Microsoft 365, Google Workspace, QuickBooks/Xero-style ERP sync scaffolding.
- Reporting: standard report definitions, generation, scheduling/export foundation.
- Documents: metadata in PostgreSQL, file content in local/S3/MinIO storage.

## Data Access Pattern

- Controllers enforce module permissions with `@PreAuthorize`.
- Services enforce tenant filtering and business rules.
- Repositories should expose tenant-aware queries where direct lookup is required.
- Cross-record operations must validate that related records belong to the same tenant.
- Data-scope checks should be applied for owner/team/territory-sensitive modules.

## Current Hardening Direction

The backend now has permission authorities for legacy modules that previously relied on broad roles:

- `CONTACTS_*`
- `TASKS_*`
- `DOCUMENTS_*`
- `EMAILS_*`
- `EVENTS_*`
- `PRODUCTS_*`
- `SEARCH_VIEW`

Next backend hardening should focus on applying owner/team/territory data scopes consistently to these modules, not only to newer sales/service modules.
