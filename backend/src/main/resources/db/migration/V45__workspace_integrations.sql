CREATE TABLE workspace_integrations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    provider_key VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    provider_type VARCHAR(40) NOT NULL,
    auth_type VARCHAR(40),
    base_url VARCHAR(500),
    client_id VARCHAR(255),
    client_secret VARCHAR(1000),
    account_identifier VARCHAR(255),
    redirect_uri VARCHAR(500),
    scopes VARCHAR(1000),
    sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    last_validated_at TIMESTAMP,
    last_validation_succeeded BOOLEAN,
    last_validation_message VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uk_workspace_integrations_tenant_provider
    ON workspace_integrations (tenant_id, provider_key)
    WHERE archived = FALSE;

CREATE INDEX idx_workspace_integrations_tenant
    ON workspace_integrations (tenant_id);
