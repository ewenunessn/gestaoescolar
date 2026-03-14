-- Adicionar colunas corretas de vitaminas (se não existirem)
ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS vitamina_a_mcg NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS vitamina_c_mg NUMERIC(10,2);

-- Copiar dados das colunas antigas para as novas (se houver dados)
UPDATE produto_composicao_nutricional 
SET vitamina_a_mcg = vitamina_b1_mg 
WHERE vitamina_b1_mg IS NOT NULL AND vitamina_a_mcg IS NULL;

UPDATE produto_composicao_nutricional 
SET vitamina_c_mg = vitamina_e_mg 
WHERE vitamina_e_mg IS NOT NULL AND vitamina_c_mg IS NULL;

-- Remover colunas antigas
ALTER TABLE produto_composicao_nutricional 
DROP COLUMN IF EXISTS vitamina_e_mg,
DROP COLUMN IF EXISTS vitamina_b1_mg;

-- Adicionar comentários
COMMENT ON COLUMN produto_composicao_nutricional.vitamina_a_mcg IS 'Vitamina A (Retinol) em microgramas (mcg) - por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.vitamina_c_mg IS 'Vitamina C (Ácido Ascórbico) em miligramas (mg) - por 100g';
