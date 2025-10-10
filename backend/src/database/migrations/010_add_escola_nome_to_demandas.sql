-- Adicionar campo escola_nome para permitir texto livre
ALTER TABLE demandas ADD COLUMN escola_nome VARCHAR(255);

-- Atualizar registros existentes com o nome da escola
UPDATE demandas 
SET escola_nome = e.nome 
FROM escolas e 
WHERE demandas.escola_id = e.id;

-- Tornar escola_id opcional (pode ser NULL quando for texto livre)
ALTER TABLE demandas ALTER COLUMN escola_id DROP NOT NULL;

-- Adicionar constraint para garantir que pelo menos um dos campos esteja preenchido
ALTER TABLE demandas ADD CONSTRAINT check_escola_info 
CHECK (escola_id IS NOT NULL OR (escola_nome IS NOT NULL AND escola_nome != ''));

-- Comentário
COMMENT ON COLUMN demandas.escola_nome IS 'Nome da escola/entidade solicitante (pode ser texto livre)';