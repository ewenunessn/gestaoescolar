ALTER TABLE school_education_modalities DISABLE ROW LEVEL SECURITY;
ALTER TABLE education_modalities DISABLE ROW LEVEL SECURITY;
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS school_education_modalities;
DROP TABLE IF EXISTS education_modalities;

DROP INDEX IF EXISTS schools_tenant_active_id_idx;
DROP INDEX IF EXISTS schools_tenant_id_unique_idx;
DROP INDEX IF EXISTS schools_tenant_code_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS schools_code_unique_idx
    ON schools (lower(code));

ALTER TABLE schools
    DROP CONSTRAINT IF EXISTS schools_tenant_id_fkey,
    DROP COLUMN IF EXISTS tenant_id;

DROP TABLE IF EXISTS tenants;
