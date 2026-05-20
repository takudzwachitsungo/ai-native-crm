# Cicosy CRM Documentation

This is the clean documentation baseline for the platform. Older working notes and phase-by-phase implementation logs were archived to `docs/archive/legacy-2026-05-18` so this folder can stay focused on the current product architecture.

## Start Here

- `SYSTEM_DESIGN.md`: product architecture, bounded contexts, runtime topology, and data flow.
- `BACKEND_ARCHITECTURE.md`: Java backend modules, database model, integration boundaries, and service patterns.
- `SECURITY_RBAC.md`: authentication, tenant isolation, RBAC, data scopes, session security, and hardening gaps.
- `OPERATIONS_RUNBOOK.md`: local/runtime operations, observability, secrets, deployment notes, and incident checks.
- `TESTING_QA_STRATEGY.md`: smoke, integration, security, tenant-isolation, and UAT test strategy.
- `IMPLEMENTATION_ROADMAP.md`: remaining enterprise-hardening phases and priority order.

## Documentation Principles

- Keep docs current with the running system.
- Prefer architecture and operational truth over historical phase notes.
- Move exploratory notes into `archive` instead of mixing them with current runbooks.
- Every security-sensitive feature should document the threat model, control, and residual risk.
