CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    order_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    work_type VARCHAR(30) NOT NULL DEFAULT 'OTHER',
    company_id UUID,
    contact_id UUID,
    support_case_id UUID,
    assigned_technician_id UUID,
    territory VARCHAR(120),
    service_address VARCHAR(255),
    scheduled_start_at TIMESTAMP,
    scheduled_end_at TIMESTAMP,
    dispatched_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    description TEXT,
    completion_notes TEXT,
    CONSTRAINT uk_work_orders_tenant_order_number UNIQUE (tenant_id, order_number),
    CONSTRAINT fk_work_orders_company FOREIGN KEY (company_id) REFERENCES companies (id),
    CONSTRAINT fk_work_orders_contact FOREIGN KEY (contact_id) REFERENCES contacts (id),
    CONSTRAINT fk_work_orders_support_case FOREIGN KEY (support_case_id) REFERENCES support_cases (id),
    CONSTRAINT fk_work_orders_assigned_technician FOREIGN KEY (assigned_technician_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant_id ON work_orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders (status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders (priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_technician_id ON work_orders (assigned_technician_id);
