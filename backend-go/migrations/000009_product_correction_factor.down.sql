ALTER TABLE products DROP CONSTRAINT IF EXISTS products_fator_correcao_positive;
DROP INDEX IF EXISTS products_tenant_correction_factor_idx;
ALTER TABLE products DROP COLUMN IF EXISTS fator_correcao;
