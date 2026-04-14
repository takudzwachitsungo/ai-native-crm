CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    lead_assignment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    deal_stage_changes_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    task_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    team_mentions_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_reports_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uk_user_notification_preferences_user
    ON user_notification_preferences (tenant_id, user_id)
    WHERE archived = FALSE;

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_agent VARCHAR(1000),
    ip_address VARCHAR(100),
    last_used_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revocation_reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by UUID,
    updated_by UUID,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_user_sessions_user
    ON user_sessions (tenant_id, user_id);
