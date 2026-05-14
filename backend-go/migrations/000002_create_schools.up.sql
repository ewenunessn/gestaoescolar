CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS schools (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL,
    address text,
    city text NOT NULL,
    maps_address text,
    phone text,
    email text,
    manager_name text,
    administration_type text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT schools_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT schools_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT schools_city_not_blank CHECK (btrim(city) <> ''),
    CONSTRAINT schools_administration_type_valid CHECK (
        administration_type IS NULL
        OR administration_type IN ('municipal', 'state', 'federal', 'private')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS schools_code_unique_idx
    ON schools (lower(code));

CREATE INDEX IF NOT EXISTS schools_active_id_idx
    ON schools (active, id);

CREATE INDEX IF NOT EXISTS schools_name_trgm_idx
    ON schools USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS schools_code_trgm_idx
    ON schools USING gin (code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS schools_city_trgm_idx
    ON schools USING gin (city gin_trgm_ops);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'schools_set_updated_at'
    ) THEN
        CREATE TRIGGER schools_set_updated_at
        BEFORE UPDATE ON schools
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
