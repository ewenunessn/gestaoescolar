CREATE TABLE IF NOT EXISTS financial_modalities (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    code text NOT NULL,
    description text,
    funding_source text NOT NULL,
    monthly_amount numeric(14,2) NOT NULL,
    payment_code text,
    paid_installments integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT financial_modalities_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT financial_modalities_code_not_blank CHECK (btrim(code) <> ''),
    CONSTRAINT financial_modalities_funding_source_not_blank CHECK (btrim(funding_source) <> ''),
    CONSTRAINT financial_modalities_monthly_amount_non_negative CHECK (monthly_amount >= 0),
    CONSTRAINT financial_modalities_paid_installments_non_negative CHECK (paid_installments >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS financial_modalities_tenant_code_unique_idx ON financial_modalities (tenant_id, lower(code));
CREATE UNIQUE INDEX IF NOT EXISTS financial_modalities_tenant_id_unique_idx ON financial_modalities (tenant_id, id);
CREATE INDEX IF NOT EXISTS financial_modalities_tenant_active_id_idx ON financial_modalities (tenant_id, active, id);
CREATE INDEX IF NOT EXISTS financial_modalities_name_trgm_idx ON financial_modalities USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS contract_balance_entries (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    contract_id bigint NOT NULL,
    contract_product_id bigint NOT NULL,
    financial_modality_id bigint,
    control_type text NOT NULL,
    entry_type text NOT NULL,
    quantity numeric(14,2),
    amount numeric(14,2) NOT NULL,
    occurred_at date NOT NULL,
    description text,
    reference_document text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT contract_balance_entries_contract_fkey FOREIGN KEY (tenant_id, contract_id) REFERENCES contracts(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT contract_balance_entries_contract_product_fkey FOREIGN KEY (tenant_id, contract_product_id) REFERENCES contract_products(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT contract_balance_entries_financial_modality_fkey FOREIGN KEY (tenant_id, financial_modality_id) REFERENCES financial_modalities(tenant_id, id) ON DELETE RESTRICT,
    CONSTRAINT contract_balance_entries_control_type_valid CHECK (control_type IN ('item', 'item_financial_modality')),
    CONSTRAINT contract_balance_entries_type_valid CHECK (entry_type IN ('initial_balance', 'consumption', 'reversal', 'addendum')),
    CONSTRAINT contract_balance_entries_quantity_non_negative CHECK (quantity IS NULL OR quantity >= 0),
    CONSTRAINT contract_balance_entries_amount_positive CHECK (amount > 0),
    CONSTRAINT contract_balance_entries_modality_rule CHECK (
        (control_type = 'item' AND financial_modality_id IS NULL)
        OR (control_type = 'item_financial_modality' AND financial_modality_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS contract_balance_entries_tenant_id_unique_idx ON contract_balance_entries (tenant_id, id);
CREATE INDEX IF NOT EXISTS contract_balance_entries_tenant_contract_id_idx ON contract_balance_entries (tenant_id, contract_id, id);
CREATE INDEX IF NOT EXISTS contract_balance_entries_tenant_contract_product_idx ON contract_balance_entries (tenant_id, contract_product_id, id);
CREATE INDEX IF NOT EXISTS contract_balance_entries_tenant_financial_modality_idx ON contract_balance_entries (tenant_id, financial_modality_id, id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'financial_modalities_set_updated_at') THEN
        CREATE TRIGGER financial_modalities_set_updated_at BEFORE UPDATE ON financial_modalities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

ALTER TABLE financial_modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_balance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_modalities_tenant_isolation ON financial_modalities;
CREATE POLICY financial_modalities_tenant_isolation ON financial_modalities
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS contract_balance_entries_tenant_isolation ON contract_balance_entries;
CREATE POLICY contract_balance_entries_tenant_isolation ON contract_balance_entries
    FOR ALL
    USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE financial_modalities FORCE ROW LEVEL SECURITY;
ALTER TABLE contract_balance_entries FORCE ROW LEVEL SECURITY;
