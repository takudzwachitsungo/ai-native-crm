CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(120) NOT NULL,
    description TEXT,
    module VARCHAR(40) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    execution_mode VARCHAR(40) NOT NULL,
    conditions_json TEXT NOT NULL,
    actions_json TEXT NOT NULL,
    priority_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant
    ON automation_rules (tenant_id, archived);

CREATE INDEX IF NOT EXISTS idx_automation_rules_event
    ON automation_rules (tenant_id, event_type, is_active, archived, priority_order);
