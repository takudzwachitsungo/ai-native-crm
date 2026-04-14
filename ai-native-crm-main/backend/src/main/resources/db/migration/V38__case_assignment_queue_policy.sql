ALTER TABLE workflow_rules
    ADD COLUMN IF NOT EXISTS prefer_senior_coverage_for_high_touch BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS prefer_frontline_for_tier_one BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS prefer_specialist_coverage BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS frontline_queue_capacity INTEGER NOT NULL DEFAULT 8,
    ADD COLUMN IF NOT EXISTS specialist_queue_capacity INTEGER NOT NULL DEFAULT 5;
