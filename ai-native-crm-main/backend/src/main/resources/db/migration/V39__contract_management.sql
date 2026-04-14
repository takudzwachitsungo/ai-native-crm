CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    contract_number VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    company_id UUID NOT NULL,
    contact_id UUID,
    quote_id UUID,
    owner_id UUID,
    territory VARCHAR(120),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    renewal_date DATE,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    renewal_notice_days INTEGER NOT NULL DEFAULT 30,
    contract_value NUMERIC(19,2) NOT NULL DEFAULT 0,
    activated_at TIMESTAMP,
    terminated_at TIMESTAMP,
    termination_reason TEXT,
    notes TEXT,
    CONSTRAINT uk_contracts_tenant_number UNIQUE (tenant_id, contract_number),
    CONSTRAINT fk_contracts_company FOREIGN KEY (company_id) REFERENCES companies (id),
    CONSTRAINT fk_contracts_contact FOREIGN KEY (contact_id) REFERENCES contacts (id),
    CONSTRAINT fk_contracts_quote FOREIGN KEY (quote_id) REFERENCES quotes (id),
    CONSTRAINT fk_contracts_owner FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant_status ON contracts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_company ON contracts (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_owner ON contracts (tenant_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_quote ON contracts (tenant_id, quote_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_territory ON contracts (tenant_id, territory);
