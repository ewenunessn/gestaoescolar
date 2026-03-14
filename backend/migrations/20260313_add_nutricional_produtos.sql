-- Adicionar campos nutricionais na tabela produtos
-- Para permitir cálculo automático de valor nutricional das refeições

ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS calorias_100g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS proteinas_100g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS carboidratos_100g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS lipidios_100g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS fibras_100g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sodio_100g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS eh_fruta_hortalica BOOLEAN DEFAULT false;

COMMENT ON COLUMN produtos.calorias_100g IS 'Valor energético por 100g do produto (kcal)';
COMMENT ON COLUMN produtos.proteinas_100g IS 'Proteínas por 100g do produto (gramas)';
COMMENT ON COLUMN produtos.carboidratos_100g IS 'Carboidratos por 100g do produto (gramas)';
COMMENT ON COLUMN produtos.lipidios_100g IS 'Lipídios/Gorduras por 100g do produto (gramas)';
COMMENT ON COLUMN produtos.fibras_100g IS 'Fibras por 100g do produto (gramas)';
COMMENT ON COLUMN produtos.sodio_100g IS 'Sódio por 100g do produto (miligramas)';
COMMENT ON COLUMN produtos.eh_fruta_hortalica IS 'Indica se o produto é fruta ou hortaliça (para controle de 200g/semana)';

-- Criar índice para facilitar busca de frutas e hortaliças
CREATE INDEX IF NOT EXISTS idx_produtos_fruta_hortalica ON produtos(eh_fruta_hortalica) WHERE eh_fruta_hortalica = true;
