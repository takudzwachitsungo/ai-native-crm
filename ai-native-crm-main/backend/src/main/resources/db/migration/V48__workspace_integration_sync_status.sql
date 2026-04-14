ALTER TABLE workspace_integrations
    ADD COLUMN last_sync_started_at TIMESTAMP,
    ADD COLUMN last_synced_at TIMESTAMP,
    ADD COLUMN last_sync_succeeded BOOLEAN,
    ADD COLUMN last_sync_message VARCHAR(1000);
