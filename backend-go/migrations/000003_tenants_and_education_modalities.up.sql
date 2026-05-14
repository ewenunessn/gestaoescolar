CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tenants_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT tenants_slug_not_blank CHECK (btrim(slug) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique_idx
    ON tenants (lower(slug));

INSERT INTO tenants (id, name, slug, active)
VALUES ('00000000-0000-4000-8000-000000000001', 'Default Tenant', 'default', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    active = true,
    updated_at = now();

ALTER TABLE schools
    ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE schools
SET tenant_id = '00000000-0000-4000-8000-000000000001'
WHERE tenant_id IS NULL;

ALTER TABLE schools
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'schools_tenant_id_fkey'
          AND conrelid = 'public.schools'::regclass
    ) THEN
        ALTER TABLE schools
            ADD CONSTRAINT schools_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    END IF;
END $$;

DROP INDEX IF EXISTS schools_code_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS schools_tenant_code_unique_idx
    ON schools (tenant_id, lower(code));

CREATE UNIQUE INDEX IF NOT EXISTS schools_tenant_id_unique_idx
    ON schools (tenant_id, id);

CREATE INDEX IF NOT EXISTS schools_tenant_active_id_idx
    ON schools (tenant_id, active, id);

DROP INDEX IF EXISTS schools_active_id_idx;

CREATE TABLE IF NOT EXISTS education_modalities (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    description text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT education_modalities_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS education_modalities_tenant_name_unique_idx
    ON education_modalities (tenant_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS education_modalities_tenant_id_unique_idx
    ON education_modalities (tenant_id, id);

CREATE INDEX IF NOT EXISTS education_modalities_tenant_active_id_idx
    ON education_modalities (tenant_id, active, id);

CREATE INDEX IF NOT EXISTS education_modalities_name_trgm_idx
    ON education_modalities USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS school_education_modalities (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    school_id bigint NOT NULL,
    education_modality_id bigint NOT NULL,
    student_count integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT school_education_modalities_student_count_non_negative CHECK (student_count >= 0),
    CONSTRAINT school_education_modalities_school_fkey
        FOREIGN KEY (tenant_id, school_id) REFERENCES schools(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT school_education_modalities_modality_fkey
        FOREIGN KEY (tenant_id, education_modality_id) REFERENCES education_modalities(tenant_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS school_education_modalities_active_unique_idx
    ON school_education_modalities (tenant_id, school_id, education_modality_id)
    WHERE active = true;

CREATE INDEX IF NOT EXISTS school_education_modalities_school_idx
    ON school_education_modalities (tenant_id, school_id, active, id);

CREATE INDEX IF NOT EXISTS school_education_modalities_modality_idx
    ON school_education_modalities (tenant_id, education_modality_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'education_modalities_set_updated_at'
    ) THEN
        CREATE TRIGGER education_modalities_set_updated_at
        BEFORE UPDATE ON education_modalities
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'school_education_modalities_set_updated_at'
    ) THEN
        CREATE TRIGGER school_education_modalities_set_updated_at
        BEFORE UPDATE ON school_education_modalities
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_education_modalities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schools_tenant_isolation ON schools;
CREATE POLICY schools_tenant_isolation ON schools
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS education_modalities_tenant_isolation ON education_modalities;
CREATE POLICY education_modalities_tenant_isolation ON education_modalities
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS school_education_modalities_tenant_isolation ON school_education_modalities;
CREATE POLICY school_education_modalities_tenant_isolation ON school_education_modalities
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE schools FORCE ROW LEVEL SECURITY;
ALTER TABLE education_modalities FORCE ROW LEVEL SECURITY;
ALTER TABLE school_education_modalities FORCE ROW LEVEL SECURITY;
