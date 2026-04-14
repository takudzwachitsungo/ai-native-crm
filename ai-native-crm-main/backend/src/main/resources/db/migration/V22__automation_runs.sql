CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    automation_key VARCHAR(80) NOT NULL,
    automation_name VARCHAR(160) NOT NULL,
    trigger_source VARCHAR(30) NOT NULL,
    run_status VARCHAR(30) NOT NULL,
    reviewed_count INTEGER,
    action_count INTEGER,
    already_covered_count INTEGER,
    summary TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_tenant_created_at
    ON automation_runs (tenant_id, created_at DESC);
