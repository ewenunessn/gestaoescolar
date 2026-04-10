-- Migration: Fix produto_composicao_nutricional column names
-- Date: 2026-04-10
-- Description: Add missing nutritional columns with correct names expected by backend

-- Add new columns with correct names (all per 100g)
ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS energia_kcal NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS proteina_g NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS carboidratos_g NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS lipideos_g NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS fibra_alimentar_g NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS sodio_mg NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS calcio_mg NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS ferro_mg NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS vitamina_a_mcg NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS vitamina_c_mg NUMERIC;

ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS colesterol_mg NUMERIC;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_produto_composicao_energia ON produto_composicao_nutricional(energia_kcal);

-- Add comments
COMMENT ON COLUMN produto_composicao_nutricional.energia_kcal IS 'Energia em kcal por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.proteina_g IS 'Proteínas em gramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.carboidratos_g IS 'Carboidratos em gramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.lipideos_g IS 'Lipídeos em gramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.fibra_alimentar_g IS 'Fibra alimentar em gramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.sodio_mg IS 'Sódio em miligramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.calcio_mg IS 'Cálcio em miligramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.ferro_mg IS 'Ferro em miligramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.vitamina_a_mcg IS 'Vitamina A (retinol) em microgramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.vitamina_c_mg IS 'Vitamina C em miligramas por 100g';
COMMENT ON COLUMN produto_composicao_nutricional.colesterol_mg IS 'Colesterol em miligramas por 100g';
