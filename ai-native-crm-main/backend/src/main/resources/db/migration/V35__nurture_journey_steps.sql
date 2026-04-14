CREATE TABLE IF NOT EXISTS nurture_journey_steps (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    journey_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    sequence_order INTEGER NOT NULL,
    wait_days INTEGER NOT NULL DEFAULT 0,
    channel VARCHAR(50) NOT NULL,
    task_priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    objective VARCHAR(255),
    task_title_template VARCHAR(255),
    task_description_template TEXT,
    call_to_action VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE nurture_journey_steps
    ADD CONSTRAINT fk_nurture_journey_steps_journey
        FOREIGN KEY (journey_id) REFERENCES nurture_journeys(id);

CREATE INDEX IF NOT EXISTS idx_nurture_journey_steps_journey
    ON nurture_journey_steps (journey_id, sequence_order, is_active, archived);
