-- Script para adicionar campo unidade_medida na tabela estoque_movimentacoes
-- Execute este script no console do Neon Database

-- Adicionar campo unidade_medida na tabela estoque_movimentacoes
ALTER TABLE estoque_movimentacoes 
ADD COLUMN unidade_medida VARCHAR(50);

-- Comentário explicativo
COMMENT ON COLUMN estoque_movimentacoes.unidade_medida IS 'Unidade de medida do produto no momento da movimentação (preserva histórico)';

-- Verificar se o campo foi adicionado
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'estoque_movimentacoes' 
AND column_name = 'unidade_medida';

-- Atualizar registros existentes com a unidade atual do produto
UPDATE estoque_movimentacoes 
SET unidade_medida = p.unidade
FROM produtos p 
WHERE estoque_movimentacoes.produto_id = p.id 
AND estoque_movimentacoes.unidade_medida IS NULL;

SELECT 'Campo unidade_medida adicionado com sucesso!' as resultado;