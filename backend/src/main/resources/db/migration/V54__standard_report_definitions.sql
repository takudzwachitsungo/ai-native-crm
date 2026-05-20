CREATE TABLE standard_report_definitions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    report_type VARCHAR(120) NOT NULL,
    report_mode VARCHAR(30) NOT NULL,
    date_start DATE,
    date_end DATE,
    filters_json VARCHAR(4000),
    run_count INTEGER NOT NULL DEFAULT 0,
    last_run_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_standard_report_definitions_tenant_updated
    ON standard_report_definitions (tenant_id, updated_at DESC);
