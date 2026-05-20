# Security And RBAC

## Authentication

- JWT access tokens include tenant, user, role, and session context.
- Refresh tokens include tenant, user, session context, and refresh type.
- Sessions are persisted and can be revoked.
- Password reset tokens are random, hashed, expiring, and single-use.
- 2FA uses TOTP for enabled users.
- Login lockout now blocks repeated failed attempts per email/IP pair.

## Current Token Defaults

- Access token default: 15 minutes.
- Refresh token default: 7 days.
- JWT secret must be provided through environment/secret store and must be high entropy.

## RBAC Model

Permissions are module/action based:

- View permissions allow reads.
- Write permissions allow creates/updates.
- Manage permissions allow destructive/admin operations.

Data scopes are role-derived:

- `OWN`
- `TEAM`
- `TERRITORY`
- `TENANT`

## Tenant Isolation Controls

- JWT tenant claim sets Java tenant context.
- Hibernate tenant filter applies `tenant_id`.
- Services use explicit tenant-aware filtering.
- ID-based application cache keys include tenant context.
- Async tasks propagate tenant and security context from the submitting request.
- Queue consumers must reject tenant-owned work messages that do not include a tenant identifier.
- Flyway RLS policies provide database-level defense-in-depth.
- New RLS policy coverage was added for newer tenant tables.

## Production Rules

- Do not expose Swagger publicly in production.
- Do not expose actuator metrics publicly in production.
- Keep only health endpoints public.
- Store integration tokens and tenant database credentials encrypted.
- Use object storage for documents in production.
- Use secret-store references for JWT, database, integration, SMTP, VAPID, and AI secrets.

## Residual Security Work

- Implement persistent refresh-token rotation and reuse detection.
- Replace service-worker push polling by URL token with signed short-lived polling or authenticated background sync.
- Add distributed login-rate limiting for multi-instance deployments.
- Add deeper integration tests for tenant isolation, permission matrix, session revocation, and password reset.
- Consider `FORCE ROW LEVEL SECURITY` after verifying every tenant-aware connection sets the tenant DB setting.
