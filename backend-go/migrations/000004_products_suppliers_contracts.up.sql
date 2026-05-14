CREATE TABLE IF NOT EXISTS products (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    description text,
    unit text NOT NULL,
    category text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT products_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT products_unit_not_blank CHECK (btrim(unit) <> ''),
    CONSTRAINT products_category_not_blank CHECK (btrim(category) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_name_unit_unique_idx ON products (tenant_id, lower(name), lower(unit));
CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_id_unique_idx ON products (tenant_id, id);
CREATE INDEX IF NOT EXISTS products_tenant_active_id_idx ON products (tenant_id, active, id);
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS suppliers (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    document text NOT NULL,
    supplier_type text NOT NULL,
    address text,
    city text,
    state text,
    postal_code text,
    contact_name text,
    phone text,
    email text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT suppliers_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT suppliers_document_not_blank CHECK (btrim(document) <> ''),
    CONSTRAINT suppliers_type_valid CHECK (supplier_type IN ('family_farming', 'cooperative', 'conventional', 'individual', 'other'))
);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_tenant_document_unique_idx ON suppliers (tenant_id, regexp_replace(document, '[^0-9A-Za-z]', '', 'g'));
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_tenant_id_unique_idx ON suppliers (tenant_id, id);
CREATE INDEX IF NOT EXISTS suppliers_tenant_active_id_idx ON suppliers (tenant_id, active, id);
CREATE INDEX IF NOT EXISTS suppliers_name_trgm_idx ON suppliers USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS contracts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    number text NOT NULL,
    supplier_id bigint NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    available_balance numeric(14,2) NOT NULL,
    status text NOT NULL DEFAULT 'active',
    contract_type text NOT NULL DEFAULT 'supply',
    notes text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT contracts_number_not_blank CHECK (btrim(number) <> ''),
    CONSTRAINT contracts_dates_valid CHECK (end_date >= start_date),
    CONSTRAINT contracts_total_amount_non_negative CHECK (total_amount >= 0),
    CONSTRAINT contracts_available_balance_non_negative CHECK (available_balance >= 0),
    CONSTRAINT contracts_status_valid CHECK (status IN ('active', 'inactive', 'suspended', 'finished')),
    CONSTRAINT contracts_type_valid CHECK (contract_type IN ('supply', 'service', 'mixed')),
    CONSTRAINT contracts_supplier_fkey FOREIGN KEY (tenant_id, supplier_id) REFERENCES suppliers(tenant_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS contracts_tenant_number_unique_idx ON contracts (tenant_id, lower(number));
CREATE UNIQUE INDEX IF NOT EXISTS contracts_tenant_id_unique_idx ON contracts (tenant_id, id);
CREATE INDEX IF NOT EXISTS contracts_tenant_supplier_idx ON contracts (tenant_id, supplier_id, active, id);
CREATE INDEX IF NOT EXISTS contracts_tenant_status_idx ON contracts (tenant_id, status, active, id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'products_set_updated_at') THEN
        CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'suppliers_set_updated_at') THEN
        CREATE TRIGGER suppliers_set_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'contracts_set_updated_at') THEN
        CREATE TRIGGER contracts_set_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_tenant_isolation ON products;
CREATE POLICY products_tenant_isolation ON products
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS suppliers_tenant_isolation ON suppliers;
CREATE POLICY suppliers_tenant_isolation ON suppliers
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS contracts_tenant_isolation ON contracts;
CREATE POLICY contracts_tenant_isolation ON contracts
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE contracts FORCE ROW LEVEL SECURITY;
