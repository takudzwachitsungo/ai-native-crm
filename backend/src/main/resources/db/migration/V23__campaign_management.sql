CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'OTHER',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    channel VARCHAR(50) NOT NULL DEFAULT 'MULTI_CHANNEL',
    target_audience VARCHAR(255),
    audience_size INTEGER,
    budget DECIMAL(19, 2),
    expected_revenue DECIMAL(19, 2),
    actual_revenue DECIMAL(19, 2),
    leads_generated INTEGER,
    opportunities_created INTEGER,
    conversions INTEGER,
    start_date DATE,
    end_date DATE,
    owner_id UUID REFERENCES users(id),
    description TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_type ON campaigns(tenant_id, type);
