ALTER TABLE workspace_integrations
    ADD COLUMN oauth_state VARCHAR(500),
    ADD COLUMN oauth_state_expires_at TIMESTAMP,
    ADD COLUMN access_token VARCHAR(4000),
    ADD COLUMN refresh_token VARCHAR(4000),
    ADD COLUMN token_type VARCHAR(100),
    ADD COLUMN token_expires_at TIMESTAMP,
    ADD COLUMN connected_at TIMESTAMP;
