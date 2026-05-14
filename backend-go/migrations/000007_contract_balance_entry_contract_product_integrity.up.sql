CREATE UNIQUE INDEX IF NOT EXISTS contract_products_tenant_contract_id_unique_idx
    ON contract_products (tenant_id, contract_id, id);

ALTER TABLE contract_balance_entries
    DROP CONSTRAINT IF EXISTS contract_balance_entries_contract_product_matches_contract_fkey;

ALTER TABLE contract_balance_entries
    ADD CONSTRAINT contract_balance_entries_contract_product_matches_contract_fkey
    FOREIGN KEY (tenant_id, contract_id, contract_product_id)
    REFERENCES contract_products(tenant_id, contract_id, id)
    ON DELETE RESTRICT;
