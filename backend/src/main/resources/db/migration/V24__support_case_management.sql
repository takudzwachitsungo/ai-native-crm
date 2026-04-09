CREATE TABLE support_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    case_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    source VARCHAR(20) NOT NULL DEFAULT 'OTHER',
    company_id UUID REFERENCES companies(id),
    contact_id UUID REFERENCES contacts(id),
    owner_id UUID REFERENCES users(id),
    response_due_at TIMESTAMP,
    resolution_due_at TIMESTAMP,
    resolved_at TIMESTAMP,
    customer_impact VARCHAR(255),
    description TEXT,
    resolution_summary TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (tenant_id, case_number)
);

CREATE INDEX idx_support_cases_tenant ON support_cases(tenant_id);
CREATE INDEX idx_support_cases_status ON support_cases(tenant_id, status);
CREATE INDEX idx_support_cases_priority ON support_cases(tenant_id, priority);
