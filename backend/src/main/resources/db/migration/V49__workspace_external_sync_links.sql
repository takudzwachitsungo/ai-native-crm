CREATE TABLE workspace_external_sync_links (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    provider_key VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    local_entity_id UUID NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    external_name VARCHAR(255),
    last_synced_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uk_workspace_external_sync_links_unique
    ON workspace_external_sync_links (tenant_id, provider_key, entity_type, local_entity_id)
    WHERE archived = FALSE;

CREATE INDEX idx_workspace_external_sync_links_tenant
    ON workspace_external_sync_links (tenant_id);
