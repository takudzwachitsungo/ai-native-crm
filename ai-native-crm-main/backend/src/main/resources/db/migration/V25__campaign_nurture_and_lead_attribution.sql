ALTER TABLE workflow_rules
    ADD COLUMN IF NOT EXISTS require_active_campaign BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS campaign_score_boost INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS campaign_follow_up_days INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS campaign_task_priority VARCHAR(20) NOT NULL DEFAULT 'HIGH';

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS campaign_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_leads_campaign_id'
          AND table_name = 'leads'
    ) THEN
        ALTER TABLE leads
            ADD CONSTRAINT fk_leads_campaign_id
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_campaign
    ON leads (tenant_id, campaign_id)
    WHERE archived = FALSE;
