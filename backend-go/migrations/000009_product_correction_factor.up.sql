ALTER TABLE products
    ADD COLUMN IF NOT EXISTS fator_correcao numeric(8,3) NOT NULL DEFAULT 1.000;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_fator_correcao_positive'
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT products_fator_correcao_positive CHECK (fator_correcao > 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_tenant_correction_factor_idx
    ON products (tenant_id, fator_correcao);

COMMENT ON COLUMN products.fator_correcao IS
    'Multiplicador de ganho/acrescimo aplicado ao per capita no calculo de necessidade. 1.000 nao altera a quantidade.';
