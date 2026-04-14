ALTER TABLE support_cases
    ADD COLUMN IF NOT EXISTS customer_tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

ALTER TABLE workflow_rules
    ADD COLUMN IF NOT EXISTS premium_response_multiplier_percent INTEGER NOT NULL DEFAULT 75,
    ADD COLUMN IF NOT EXISTS strategic_response_multiplier_percent INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN IF NOT EXISTS premium_resolution_multiplier_percent INTEGER NOT NULL DEFAULT 75,
    ADD COLUMN IF NOT EXISTS strategic_resolution_multiplier_percent INTEGER NOT NULL DEFAULT 50;
