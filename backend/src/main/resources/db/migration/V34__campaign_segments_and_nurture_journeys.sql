CREATE TABLE IF NOT EXISTS campaign_segments (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    segment_type VARCHAR(50) NOT NULL,
    target_audience VARCHAR(255),
    primary_persona VARCHAR(120),
    territory_focus VARCHAR(120),
    min_lead_score INTEGER,
    source_filters TEXT[],
    status_filters TEXT[],
    include_campaign_attributed_only BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS nurture_journeys (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    journey_stage VARCHAR(50) NOT NULL,
    auto_enroll_new_leads BOOLEAN NOT NULL DEFAULT TRUE,
    default_cadence_days INTEGER,
    default_touch_count INTEGER,
    default_call_to_action VARCHAR(255),
    success_metric VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS segment_id UUID,
    ADD COLUMN IF NOT EXISTS journey_id UUID;

ALTER TABLE campaigns
    ADD CONSTRAINT fk_campaigns_segment
        FOREIGN KEY (segment_id) REFERENCES campaign_segments(id);

ALTER TABLE campaigns
    ADD CONSTRAINT fk_campaigns_journey
        FOREIGN KEY (journey_id) REFERENCES nurture_journeys(id);

CREATE INDEX IF NOT EXISTS idx_campaign_segments_tenant_active
    ON campaign_segments (tenant_id, is_active, archived);

CREATE INDEX IF NOT EXISTS idx_nurture_journeys_tenant_active
    ON nurture_journeys (tenant_id, is_active, archived);

CREATE INDEX IF NOT EXISTS idx_campaigns_segment_id
    ON campaigns (segment_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_journey_id
    ON campaigns (journey_id);
