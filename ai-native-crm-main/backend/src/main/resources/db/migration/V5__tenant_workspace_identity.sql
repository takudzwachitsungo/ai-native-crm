ALTER TABLE tenants ADD COLUMN slug VARCHAR(120);

UPDATE tenants
SET slug = CONCAT(
    TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')),
    '-',
    SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8)
)
WHERE slug IS NULL;

ALTER TABLE tenants ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX uk_tenants_slug ON tenants(slug);
