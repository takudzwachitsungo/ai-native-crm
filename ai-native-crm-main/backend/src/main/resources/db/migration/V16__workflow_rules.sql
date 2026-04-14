CREATE TABLE IF NOT EXISTS workflow_rules (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    rule_type VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    auto_assignment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    prefer_territory_match BOOLEAN NOT NULL DEFAULT TRUE,
    fallback_to_load_balance BOOLEAN NOT NULL DEFAULT TRUE,
    auto_follow_up_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    default_follow_up_days INTEGER NOT NULL DEFAULT 3,
    referral_follow_up_days INTEGER NOT NULL DEFAULT 2,
    fast_track_follow_up_days INTEGER NOT NULL DEFAULT 1,
    fast_track_score_threshold INTEGER NOT NULL DEFAULT 80,
    fast_track_value_threshold NUMERIC(19,2) NOT NULL DEFAULT 50000,
    default_task_priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    fast_track_task_priority VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    CONSTRAINT uq_workflow_rules_tenant_type UNIQUE (tenant_id, rule_type)
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_tenant_type
    ON workflow_rules (tenant_id, rule_type, archived);
