CREATE TABLE IF NOT EXISTS preparations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    description text,
    preparation_type text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT preparations_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT preparations_type_not_blank CHECK (btrim(preparation_type) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS preparations_tenant_name_unique_idx ON preparations (tenant_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS preparations_tenant_id_unique_idx ON preparations (tenant_id, id);
CREATE INDEX IF NOT EXISTS preparations_tenant_active_id_idx ON preparations (tenant_id, active, id);
CREATE INDEX IF NOT EXISTS preparations_name_trgm_idx ON preparations USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS preparation_products (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    preparation_id bigint NOT NULL,
    product_id bigint NOT NULL,
    education_modality_id bigint,
    per_capita_amount numeric(14,2) NOT NULL,
    per_capita_unit text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT preparation_products_preparation_fkey FOREIGN KEY (tenant_id, preparation_id) REFERENCES preparations(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT preparation_products_product_fkey FOREIGN KEY (tenant_id, product_id) REFERENCES products(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT preparation_products_modality_fkey FOREIGN KEY (tenant_id, education_modality_id) REFERENCES education_modalities(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT preparation_products_per_capita_positive CHECK (per_capita_amount > 0),
    CONSTRAINT preparation_products_unit_valid CHECK (per_capita_unit IN ('g', 'ml'))
);

CREATE UNIQUE INDEX IF NOT EXISTS preparation_products_tenant_id_unique_idx ON preparation_products (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS preparation_products_active_general_unique_idx
    ON preparation_products (tenant_id, preparation_id, product_id)
    WHERE active = true AND education_modality_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS preparation_products_active_modality_unique_idx
    ON preparation_products (tenant_id, preparation_id, product_id, education_modality_id)
    WHERE active = true AND education_modality_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS preparation_products_tenant_preparation_idx ON preparation_products (tenant_id, preparation_id, active, id);
CREATE INDEX IF NOT EXISTS preparation_products_tenant_product_idx ON preparation_products (tenant_id, product_id, active, id);
CREATE INDEX IF NOT EXISTS preparation_products_tenant_modality_idx ON preparation_products (tenant_id, education_modality_id, active, id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'preparations_set_updated_at') THEN
        CREATE TRIGGER preparations_set_updated_at BEFORE UPDATE ON preparations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'preparation_products_set_updated_at') THEN
        CREATE TRIGGER preparation_products_set_updated_at BEFORE UPDATE ON preparation_products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

ALTER TABLE preparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS preparations_tenant_isolation ON preparations;
CREATE POLICY preparations_tenant_isolation ON preparations
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS preparation_products_tenant_isolation ON preparation_products;
CREATE POLICY preparation_products_tenant_isolation ON preparation_products
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE preparations FORCE ROW LEVEL SECURITY;
ALTER TABLE preparation_products FORCE ROW LEVEL SECURITY;
