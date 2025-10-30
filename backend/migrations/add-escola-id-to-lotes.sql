-- Migração para adicionar escola_id na tabela estoque_lotes
-- Data: 2025-01-30
-- Objetivo: Garantir que cada lote pertença a uma escola específica

-- 1. Adicionar coluna escola_id (permitir NULL temporariamente)
ALTER TABLE estoque_lotes 
ADD COLUMN IF NOT EXISTS escola_id INTEGER;

-- 2. Adicionar foreign key
ALTER TABLE estoque_lotes 
ADD CONSTRAINT fk_estoque_lotes_escola 
FOREIGN KEY (escola_id) REFERENCES escolas(id)
ON DELETE CASCADE;

-- 3. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_escola 
ON estoque_lotes(escola_id);

-- 4. Criar índice composto para queries otimizadas
CREATE INDEX IF NOT EXISTS idx_estoque_lotes_escola_produto 
ON estoque_lotes(escola_id, produto_id);

-- 5. Atualizar lotes existentes com escola_id baseado no estoque_escolas
-- (Isso vai associar lotes existentes às escolas que têm o produto)
UPDATE estoque_lotes el
SET escola_id = (
  SELECT ee.escola_id 
  FROM estoque_escolas ee 
  WHERE ee.produto_id = el.produto_id 
  AND ee.quantidade_atual > 0
  LIMIT 1
)
WHERE el.escola_id IS NULL;

-- 6. Deletar lotes órfãos (que não têm escola associada)
DELETE FROM estoque_lotes 
WHERE escola_id IS NULL;

-- 7. Tornar escola_id obrigatório
ALTER TABLE estoque_lotes 
ALTER COLUMN escola_id SET NOT NULL;

-- 8. Atualizar constraint unique para incluir escola_id
-- Primeiro remover a constraint antiga
ALTER TABLE estoque_lotes 
DROP CONSTRAINT IF EXISTS uk_produto_lote;

-- Criar nova constraint unique incluindo escola_id
CREATE UNIQUE INDEX IF NOT EXISTS uk_escola_produto_lote 
ON estoque_lotes(escola_id, produto_id, lote);

-- Comentário explicativo
COMMENT ON COLUMN estoque_lotes.escola_id IS 'ID da escola dona do lote - garante isolamento de dados por escola';

-- Verificar resultado
SELECT 
    'estoque_lotes' as tabela,
    COUNT(*) as total_lotes,
    COUNT(DISTINCT escola_id) as total_escolas
FROM estoque_lotes;