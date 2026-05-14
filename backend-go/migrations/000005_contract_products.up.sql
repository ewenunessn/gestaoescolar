CREATE TABLE IF NOT EXISTS contract_products (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    contract_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(14,2) NOT NULL,
    unit_price numeric(14,2) NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    notes text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT contract_products_quantity_positive CHECK (quantity > 0),
    CONSTRAINT contract_products_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT contract_products_total_amount_non_negative CHECK (total_amount >= 0),
    CONSTRAINT contract_products_contract_fkey FOREIGN KEY (tenant_id, contract_id) REFERENCES contracts(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT contract_products_product_fkey FOREIGN KEY (tenant_id, product_id) REFERENCES products(tenant_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS contract_products_tenant_contract_product_active_unique_idx
    ON contract_products (tenant_id, contract_id, product_id)
    WHERE active = true;
CREATE UNIQUE INDEX IF NOT EXISTS contract_products_tenant_id_unique_idx ON contract_products (tenant_id, id);
CREATE INDEX IF NOT EXISTS contract_products_tenant_contract_idx ON contract_products (tenant_id, contract_id, active, id);
CREATE INDEX IF NOT EXISTS contract_products_tenant_product_idx ON contract_products (tenant_id, product_id, active, id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'contract_products_set_updated_at') THEN
        CREATE TRIGGER contract_products_set_updated_at BEFORE UPDATE ON contract_products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

ALTER TABLE contract_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contract_products_tenant_isolation ON contract_products;
CREATE POLICY contract_products_tenant_isolation ON contract_products
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE contract_products FORCE ROW LEVEL SECURITY;
