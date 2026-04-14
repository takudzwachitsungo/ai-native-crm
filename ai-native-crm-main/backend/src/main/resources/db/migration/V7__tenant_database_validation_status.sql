ALTER TABLE tenants
    ADD COLUMN database_last_validated_at TIMESTAMP,
    ADD COLUMN database_last_validation_success BOOLEAN,
    ADD COLUMN database_last_validation_message VARCHAR(500);
