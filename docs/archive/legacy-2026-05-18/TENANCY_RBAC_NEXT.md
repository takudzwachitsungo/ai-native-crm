# Tenancy and RBAC Next Steps

## Current state

- Authentication now returns tenant metadata: tenant ID, tenant name, and tenant tier.
- Authentication now also returns a tenant workspace slug and supports workspace-aware login.
- The frontend now surfaces tenant identity in auth, navigation, settings, and printable quote/invoice views.
- Backend authorization already uses role-based guards on many controllers.
- Backend now has a master-datasource plus tenant-routing foundation, with per-tenant database configuration fields on the tenant record.
- Workspace admins can now view, update, and validate dedicated database settings from the backend API and the Settings UI.
- New workspace signup now provisions a dedicated PostgreSQL database automatically, runs Flyway migrations, and seeds the tenant plus admin user into that database.
- Existing shared-database workspaces can now be migrated into dedicated databases through the workspace admin API and settings UI.
- Dedicated database credentials are now encrypted before being stored in the tenant registry, with backward-compatible reads for older plaintext records.
- Data isolation is still implemented as single-database multi-tenancy using `tenant_id` filtering.
  Legacy tenants use shared-database `tenant_id` filtering until they are migrated.
  Dedicated routing activates for newly provisioned tenants immediately and for legacy tenants after settings are configured and validation succeeds.

## Target state

- Each tenant should have its own dedicated database.
- Authentication should resolve both user identity and tenant workspace context.
- Tenant metadata should remain visible throughout the app and in generated documents.
- Role-based access control should be enforced both in backend authorization and frontend navigation/UX.

## Next backend phase

1. Move tenant database credentials out of the tenant record entirely and into a proper secrets backend or rotation workflow.
2. Sync tenant metadata changes across master and dedicated tenant databases where needed.
3. Revisit migrations, backup/restore, and AI service data access so they operate per tenant database.
4. Expand RBAC from admin-only endpoints into a fuller permission model across sensitive modules.
5. Add tenant-aware operational tooling for restore, rotation, and provisioning audits.

## Frontend follow-up

1. Add explicit workspace identity to more pages where context matters.
2. Expand role-aware navigation and access-denied states.
3. Add tenant-aware wording to onboarding and admin flows.
