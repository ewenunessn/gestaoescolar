-- Remover colunas antigas de vitaminas que estavam sendo usadas incorretamente
-- vitamina_e_mg e vitamina_b1_mg não correspondem a Vitamina C e Retinol

ALTER TABLE produto_composicao_nutricional 
DROP COLUMN IF EXISTS vitamina_e_mg,
DROP COLUMN IF EXISTS vitamina_b1_mg;

-- As colunas corretas já existem:
-- vitamina_a_mcg (Retinol/Vitamina A)
-- vitamina_c_mg (Vitamina C/Ácido Ascórbico)

COMMENT ON COLUMN produto_composicao_nutricional.vitamina_a_mcg IS 'Vitamina A (Retinol) em microgramas (mcg) - por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.vitamina_c_mg IS 'Vitamina C (Ácido Ascórbico) em miligramas (mg) - por 100g';
