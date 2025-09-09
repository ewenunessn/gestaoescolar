-- Script para adicionar campo unidade_medida na tabela estoque_escolas_historico
-- Este campo armazenará a unidade de medida do produto no momento da movimentação

-- Adicionar coluna unidade_medida
ALTER TABLE estoque_escolas_historico 
ADD COLUMN IF NOT EXISTS unidade_medida VARCHAR(50);

-- Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'estoque_escolas_historico' 
AND column_name = 'unidade_medida';

-- Atualizar registros existentes com a unidade de medida atual do produto
UPDATE estoque_escolas_historico 
SET unidade_medida = p.unidade
FROM produtos p
WHERE estoque_escolas_historico.produto_id = p.id
AND estoque_escolas_historico.unidade_medida IS NULL;

-- Verificar quantos registros foram atualizados
SELECT COUNT(*) as registros_atualizados 
FROM estoque_escolas_historico 
WHERE unidade_medida IS NOT NULL;

SELECT 'Campo unidade_medida adicionado com sucesso na tabela estoque_escolas_historico!' as resultado;