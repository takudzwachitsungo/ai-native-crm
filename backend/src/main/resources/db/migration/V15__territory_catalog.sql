CREATE TABLE IF NOT EXISTS territories (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(120) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_territories_tenant_normalized UNIQUE (tenant_id, normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_territories_tenant_active
    ON territories (tenant_id, is_active, archived);
