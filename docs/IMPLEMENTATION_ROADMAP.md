# Implementation Roadmap

## Phase 1: Backend Security Baseline

- Restrict actuator and API docs by default.
- Normalize legacy controllers to permission authorities.
- Add login lockout.
- Shorten default access-token lifetime.
- Refresh RLS coverage for newer tenant tables.

Status: in progress.

## Phase 2: Data Scope Completion

- Apply owner/team/territory data scopes to contacts, tasks, documents, emails, events, products, and search where appropriate.
- Add explicit record-access tests.
- Review manager vs rep vs user visibility.

## Phase 3: Auth Session Maturity

- Add refresh-token rotation.
- Store refresh token hash/family on `user_sessions`.
- Detect refresh-token reuse and revoke session family.
- Add device/session metadata and suspicious login audit.

## Phase 4: Tenant Database Enforcement

- Verify Postgres tenant setting propagation for every tenant-aware query path.
- Add database integration tests for RLS.
- Consider `FORCE ROW LEVEL SECURITY` after verification.

## Phase 5: Push And Realtime Hardening

- Replace URL device-token notification polling with signed short-lived polling or authenticated background sync.
- Add SSE connection limits and idle timeout.
- Add broker-backed realtime fanout for multi-instance deployments.

## Phase 6: Test Depth

- Build the backend security test matrix.
- Add tenant-isolation integration tests.
- Add integration lifecycle tests.
- Add document storage tests.
- Add reporting tests.

## Phase 7: Deployment Readiness

- Secret-store integration.
- Production CORS profiles.
- Alertmanager/cloud alert routing.
- Backup/restore drill.
- Runbook validation with QA and operations.
