CREATE TABLE IF NOT EXISTS meal_types (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    code text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT meal_types_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT meal_types_code_not_blank CHECK (btrim(code) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS meal_types_tenant_code_unique_idx ON meal_types (tenant_id, lower(code));
CREATE UNIQUE INDEX IF NOT EXISTS meal_types_tenant_id_unique_idx ON meal_types (tenant_id, id);
CREATE INDEX IF NOT EXISTS meal_types_tenant_active_order_idx ON meal_types (tenant_id, active, sort_order, id);
CREATE INDEX IF NOT EXISTS meal_types_name_trgm_idx ON meal_types USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS menus (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    description text,
    year integer NOT NULL,
    month integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT menus_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT menus_month_valid CHECK (month BETWEEN 1 AND 12),
    CONSTRAINT menus_dates_valid CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS menus_tenant_name_year_month_unique_idx ON menus (tenant_id, lower(name), year, month);
CREATE UNIQUE INDEX IF NOT EXISTS menus_tenant_id_unique_idx ON menus (tenant_id, id);
CREATE INDEX IF NOT EXISTS menus_tenant_competence_idx ON menus (tenant_id, year, month, active, id);

CREATE TABLE IF NOT EXISTS menu_education_modalities (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    menu_id bigint NOT NULL,
    education_modality_id bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT menu_education_modalities_menu_fkey
        FOREIGN KEY (tenant_id, menu_id) REFERENCES menus(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT menu_education_modalities_modality_fkey
        FOREIGN KEY (tenant_id, education_modality_id) REFERENCES education_modalities(tenant_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_education_modalities_unique_idx
    ON menu_education_modalities (tenant_id, menu_id, education_modality_id);
CREATE INDEX IF NOT EXISTS menu_education_modalities_modality_idx
    ON menu_education_modalities (tenant_id, education_modality_id);

CREATE TABLE IF NOT EXISTS menu_preparations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    menu_id bigint NOT NULL,
    day integer NOT NULL,
    meal_type_id bigint NOT NULL,
    preparation_id bigint NOT NULL,
    notes text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT menu_preparations_day_valid CHECK (day BETWEEN 1 AND 31),
    CONSTRAINT menu_preparations_menu_fkey
        FOREIGN KEY (tenant_id, menu_id) REFERENCES menus(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT menu_preparations_meal_type_fkey
        FOREIGN KEY (tenant_id, meal_type_id) REFERENCES meal_types(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT menu_preparations_preparation_fkey
        FOREIGN KEY (tenant_id, preparation_id) REFERENCES preparations(tenant_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_preparations_unique_active_idx
    ON menu_preparations (tenant_id, menu_id, day, meal_type_id, preparation_id)
    WHERE active = true;
CREATE INDEX IF NOT EXISTS menu_preparations_menu_day_idx
    ON menu_preparations (tenant_id, menu_id, active, day, meal_type_id, id);
CREATE INDEX IF NOT EXISTS menu_preparations_preparation_idx
    ON menu_preparations (tenant_id, preparation_id, active);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'meal_types_set_updated_at') THEN
        CREATE TRIGGER meal_types_set_updated_at BEFORE UPDATE ON meal_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'menus_set_updated_at') THEN
        CREATE TRIGGER menus_set_updated_at BEFORE UPDATE ON menus FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'menu_preparations_set_updated_at') THEN
        CREATE TRIGGER menu_preparations_set_updated_at BEFORE UPDATE ON menu_preparations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

ALTER TABLE meal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_education_modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_preparations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meal_types_tenant_isolation ON meal_types;
CREATE POLICY meal_types_tenant_isolation ON meal_types
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS menus_tenant_isolation ON menus;
CREATE POLICY menus_tenant_isolation ON menus
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS menu_education_modalities_tenant_isolation ON menu_education_modalities;
CREATE POLICY menu_education_modalities_tenant_isolation ON menu_education_modalities
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS menu_preparations_tenant_isolation ON menu_preparations;
CREATE POLICY menu_preparations_tenant_isolation ON menu_preparations
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE meal_types FORCE ROW LEVEL SECURITY;
ALTER TABLE menus FORCE ROW LEVEL SECURITY;
ALTER TABLE menu_education_modalities FORCE ROW LEVEL SECURITY;
ALTER TABLE menu_preparations FORCE ROW LEVEL SECURITY;
