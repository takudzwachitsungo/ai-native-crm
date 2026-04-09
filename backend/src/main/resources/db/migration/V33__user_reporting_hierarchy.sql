ALTER TABLE users
    ADD COLUMN IF NOT EXISTS manager_id UUID;

ALTER TABLE users
    ADD CONSTRAINT fk_users_manager
        FOREIGN KEY (manager_id)
        REFERENCES users (id)
        ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
