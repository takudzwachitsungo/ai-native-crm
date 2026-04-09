ALTER TABLE campaign_segments
    ADD COLUMN IF NOT EXISTS min_estimated_value NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS max_estimated_value NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS title_keyword VARCHAR(120),
    ADD COLUMN IF NOT EXISTS company_keyword VARCHAR(120);
