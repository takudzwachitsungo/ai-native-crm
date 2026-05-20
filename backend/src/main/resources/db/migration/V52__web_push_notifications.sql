CREATE TABLE user_push_subscriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by UUID NULL,
    updated_by UUID NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID NOT NULL,
    device_token VARCHAR(120) NOT NULL,
    endpoint TEXT NOT NULL,
    expiration_time TIMESTAMP NULL,
    p256dh_key TEXT NULL,
    auth_key TEXT NULL,
    user_agent TEXT NULL,
    last_seen_at TIMESTAMP NULL,
    last_push_attempt_at TIMESTAMP NULL,
    last_push_succeeded BOOLEAN NULL,
    last_push_status VARCHAR(255) NULL
);

CREATE UNIQUE INDEX uq_user_push_subscriptions_device_token
    ON user_push_subscriptions (device_token);

CREATE UNIQUE INDEX uq_user_push_subscriptions_endpoint
    ON user_push_subscriptions (tenant_id, user_id, endpoint)
    WHERE archived = FALSE;

CREATE INDEX idx_user_push_subscriptions_user
    ON user_push_subscriptions (tenant_id, user_id, archived);

CREATE TABLE user_push_notifications (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by UUID NULL,
    updated_by UUID NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID NOT NULL,
    device_token VARCHAR(120) NOT NULL,
    category VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NULL,
    target_url VARCHAR(512) NULL,
    fetched_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL
);

CREATE INDEX idx_user_push_notifications_device
    ON user_push_notifications (tenant_id, device_token, fetched_at, archived);
