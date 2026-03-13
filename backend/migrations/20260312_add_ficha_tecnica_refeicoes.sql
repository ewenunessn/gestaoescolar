-- Adicionar campos de Ficha Técnica de Preparação nas refeições
-- Conforme Resolução CFN 465/2010

ALTER TABLE refeicoes 
ADD COLUMN IF NOT EXISTS modo_preparo TEXT,
ADD COLUMN IF NOT EXISTS tempo_preparo_minutos INTEGER,
ADD COLUMN IF NOT EXISTS rendimento_porcoes INTEGER,
ADD COLUMN IF NOT EXISTS utensílios TEXT,
ADD COLUMN IF NOT EXISTS calorias_por_porcao NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS proteinas_g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS carboidratos_g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS lipidios_g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS fibras_g NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sodio_mg NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS custo_por_porcao NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS observacoes_tecnicas TEXT,
ADD COLUMN IF NOT EXISTS categoria VARCHAR(50); -- Ex: Prato Principal, Sobremesa, Lanche, etc

COMMENT ON COLUMN refeicoes.modo_preparo IS 'Modo de preparo detalhado da refeição';
COMMENT ON COLUMN refeicoes.tempo_preparo_minutos IS 'Tempo estimado de preparo em minutos';
COMMENT ON COLUMN refeicoes.rendimento_porcoes IS 'Número de porções que a receita rende';
COMMENT ON COLUMN refeicoes.utensílios IS 'Lista de utensílios necessários para o preparo';
COMMENT ON COLUMN refeicoes.calorias_por_porcao IS 'Valor energético por porção (kcal)';
COMMENT ON COLUMN refeicoes.proteinas_g IS 'Proteínas por porção (gramas)';
COMMENT ON COLUMN refeicoes.carboidratos_g IS 'Carboidratos por porção (gramas)';
COMMENT ON COLUMN refeicoes.lipidios_g IS 'Lipídios/Gorduras por porção (gramas)';
COMMENT ON COLUMN refeicoes.fibras_g IS 'Fibras por porção (gramas)';
COMMENT ON COLUMN refeicoes.sodio_mg IS 'Sódio por porção (miligramas)';
COMMENT ON COLUMN refeicoes.custo_por_porcao IS 'Custo estimado por porção (R$)';
COMMENT ON COLUMN refeicoes.observacoes_tecnicas IS 'Observações técnicas do nutricionista';
COMMENT ON COLUMN refeicoes.categoria IS 'Categoria da refeição (Prato Principal, Sobremesa, etc)';

-- Criar índice para categoria
CREATE INDEX IF NOT EXISTS idx_refeicoes_categoria ON refeicoes(categoria);

-- Atualizar tabela refeicao_produtos para incluir ordem e observações
ALTER TABLE refeicao_produtos
ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipo_ingrediente VARCHAR(50); -- Ex: Base, Tempero, Guarnição

COMMENT ON COLUMN refeicao_produtos.ordem IS 'Ordem de apresentação do ingrediente na ficha técnica';
COMMENT ON COLUMN refeicao_produtos.tipo_ingrediente IS 'Tipo/categoria do ingrediente na receita';

-- Criar índice para ordem
CREATE INDEX IF NOT EXISTS idx_refeicao_produtos_ordem ON refeicao_produtos(refeicao_id, ordem);

