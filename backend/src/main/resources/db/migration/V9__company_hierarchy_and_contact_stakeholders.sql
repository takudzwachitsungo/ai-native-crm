ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_companies_parent_company_id ON companies(parent_company_id);

ALTER TABLE contacts
    ADD COLUMN IF NOT EXISTS department VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS stakeholder_role VARCHAR(50),
    ADD COLUMN IF NOT EXISTS influence_level VARCHAR(20),
    ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20),
    ADD COLUMN IF NOT EXISTS reports_to_id UUID REFERENCES contacts(id);

CREATE INDEX IF NOT EXISTS idx_contacts_reports_to_id ON contacts(reports_to_id);
