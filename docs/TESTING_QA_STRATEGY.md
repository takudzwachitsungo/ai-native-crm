# Testing And QA Strategy

## Required Test Layers

- Unit tests for services, policies, mappers, and security helpers.
- Controller tests for auth, permissions, validation, and error response shape.
- Integration tests with PostgreSQL for tenant isolation, migrations, and repository behavior.
- Security tests for JWT expiry, revoked sessions, password reset, 2FA, and login lockout.
- Regression tests for tenant-aware async execution, queue message tenancy, and tenant-scoped cache keys.
- RBAC matrix tests for every module/action permission.
- E2E smoke tests for the newest frontend/backend flows.
- AI eval tests for assistant grounding, RAG, governance, and safe actions.

## Current Known Gap

Backend automated coverage is still too small for the size of the backend. The next testing push should prioritize:

- Security filter chain tests.
- More two-tenant API and database isolation tests across core and newer modules.
- RBAC tests for legacy modules now moved to permission authorities.
- Password reset and login lockout tests.
- Document upload/download authorization tests.
- Realtime authorization tests.
- Report generation tests.
- Integration token lifecycle tests.

## QA Entry Criteria

- Backend compiles.
- Frontend builds.
- Docker stack starts cleanly.
- Smoke tests pass.
- AI enterprise eval passes.
- Critical security endpoints are not public except explicit health/auth paths.
- Seed data is tenant-scoped and realistic.

## QA Exit Criteria

- No cross-tenant data visibility.
- No unauthenticated access to protected APIs.
- Module permissions match expected roles.
- Reports generate correctly and export where supported.
- Documents upload/download from object storage.
- Realtime updates work across key modules.
- AI assistant responds with tenant-scoped, grounded answers.
