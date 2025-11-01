-- Migration to fix produto_composicao_nutricional table columns
-- This adds the missing columns that the application expects

-- Add missing columns to match the application expectations
ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS valor_energetico_kcal DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS carboidratos_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS acucares_totais_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS acucares_adicionados_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS proteinas_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS gorduras_totais_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS gorduras_saturadas_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS gorduras_trans_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS fibra_alimentar_g DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sodio_mg DECIMAL(10,2);

-- Copy data from old columns to new columns (if they exist)
UPDATE produto_composicao_nutricional SET
  valor_energetico_kcal = COALESCE(valor_energetico_kcal, calorias),
  carboidratos_g = COALESCE(carboidratos_g, carboidratos),
  proteinas_g = COALESCE(proteinas_g, proteinas),
  gorduras_totais_g = COALESCE(gorduras_totais_g, gorduras),
  fibra_alimentar_g = COALESCE(fibra_alimentar_g, fibras),
  sodio_mg = COALESCE(sodio_mg, sodio);

-- Add energia_kcal column as alias for valor_energetico_kcal
ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS energia_kcal DECIMAL(10,2);

UPDATE produto_composicao_nutricional SET
  energia_kcal = valor_energetico_kcal;

-- Add proteina_g column as alias for proteinas_g  
ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS proteina_g DECIMAL(10,2);

UPDATE produto_composicao_nutricional SET
  proteina_g = proteinas_g;

-- Add lipideos_g column as alias for gorduras_totais_g
ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS lipideos_g DECIMAL(10,2);

UPDATE produto_composicao_nutricional SET
  lipideos_g = gorduras_totais_g;

-- Add acucares_g column as alias for acucares_totais_g
ALTER TABLE produto_composicao_nutricional 
ADD COLUMN IF NOT EXISTS acucares_g DECIMAL(10,2);

UPDATE produto_composicao_nutricional SET
  acucares_g = acucares_totais_g;