ALTER TABLE emails
    ADD COLUMN external_provider VARCHAR(100),
    ADD COLUMN external_message_id VARCHAR(255),
    ADD COLUMN provider_synced_at TIMESTAMP;

ALTER TABLE events
    ADD COLUMN external_provider VARCHAR(100),
    ADD COLUMN external_event_id VARCHAR(255),
    ADD COLUMN provider_synced_at TIMESTAMP;

CREATE INDEX idx_emails_external_provider_message
    ON emails (tenant_id, external_provider, external_message_id)
    WHERE archived = false;

CREATE INDEX idx_events_external_provider_event
    ON events (tenant_id, external_provider, external_event_id)
    WHERE archived = false;
