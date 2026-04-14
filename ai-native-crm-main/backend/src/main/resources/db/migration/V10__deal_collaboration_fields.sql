ALTER TABLE deals
    ADD COLUMN IF NOT EXISTS competitor_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS next_step VARCHAR(255),
    ADD COLUMN IF NOT EXISTS next_step_due_date DATE,
    ADD COLUMN IF NOT EXISTS buying_committee_summary TEXT,
    ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20),
    ADD COLUMN IF NOT EXISTS win_reason TEXT,
    ADD COLUMN IF NOT EXISTS loss_reason TEXT,
    ADD COLUMN IF NOT EXISTS close_notes TEXT,
    ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP;

UPDATE deals
SET stage_changed_at = COALESCE(stage_changed_at, updated_at, created_at)
WHERE stage_changed_at IS NULL;
