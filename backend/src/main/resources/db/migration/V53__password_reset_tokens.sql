CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    requested_ip VARCHAR(100),
    requested_user_agent VARCHAR(1000),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uk_password_reset_tokens_token_hash
    ON password_reset_tokens (token_hash)
    WHERE archived = FALSE;

CREATE INDEX idx_password_reset_tokens_user
    ON password_reset_tokens (tenant_id, user_id, expires_at);
