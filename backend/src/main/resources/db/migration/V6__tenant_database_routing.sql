ALTER TABLE tenants ADD COLUMN dedicated_database_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN database_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN database_username VARCHAR(255);
ALTER TABLE tenants ADD COLUMN database_password VARCHAR(255);
ALTER TABLE tenants ADD COLUMN database_driver_class_name VARCHAR(255) NOT NULL DEFAULT 'org.postgresql.Driver';
