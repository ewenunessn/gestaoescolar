-- Migration: Adicionar campo unidade nas movimentações
-- Data: 2026-03-04
-- Descrição: Preserva a unidade usada no momento da movimentação para manter histórico correto

-- 1. Adicionar coluna unidade na tabela de movimentações
ALTER TABLE estoque_central_movimentacoes 
ADD COLUMN IF NOT EXISTS unidade VARCHAR(20);

-- 2. Atualizar movimentações existentes com a unidade atual do produto
UPDATE estoque_central_movimentacoes ecm
SET unidade = p.unidade
FROM estoque_central ec
INNER JOIN produtos p ON p.id = ec.produto_id
WHERE ecm.estoque_central_id = ec.id
  AND ecm.unidade IS NULL;

-- 3. Tornar o campo obrigatório após preencher os dados existentes
ALTER TABLE estoque_central_movimentacoes 
ALTER COLUMN unidade SET NOT NULL;

-- 4. Adicionar índice para consultas por unidade
CREATE INDEX IF NOT EXISTS idx_estoque_central_movimentacoes_unidade 
ON estoque_central_movimentacoes(unidade);

-- 5. Adicionar comentário explicativo
COMMENT ON COLUMN estoque_central_movimentacoes.unidade IS 
'Unidade de medida no momento da movimentação (preserva histórico mesmo se unidade do produto mudar)';

-- 6. Atualizar view de movimentações (se existir)
-- Não há view específica, mas as consultas já retornarão o campo automaticamente

