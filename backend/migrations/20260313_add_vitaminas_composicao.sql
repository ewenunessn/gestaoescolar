-- Adicionar colunas de Vitamina A (Retinol) e Vitamina C na tabela produto_composicao_nutricional

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS vitamina_a_mcg NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS vitamina_c_mg NUMERIC(10,2);

COMMENT ON COLUMN produto_composicao_nutricional.vitamina_a_mcg IS 'Vitamina A (Retinol) em microgramas (mcg)';
COMMENT ON COLUMN produto_composicao_nutricional.vitamina_c_mg IS 'Vitamina C (Ácido Ascórbico) em miligramas (mg)';
