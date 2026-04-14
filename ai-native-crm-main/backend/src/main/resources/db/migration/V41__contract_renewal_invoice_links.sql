ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS renewal_invoice_id UUID,
    ADD COLUMN IF NOT EXISTS renewal_invoice_generated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS renewed_from_contract_id UUID,
    ADD COLUMN IF NOT EXISTS renewed_to_contract_id UUID;

