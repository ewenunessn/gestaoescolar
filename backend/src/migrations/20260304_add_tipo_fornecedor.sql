-- Migration: Adicionar campo tipo_fornecedor na tabela fornecedores
-- Data: 2026-03-04
-- Descrição: Adiciona campo para classificar fornecedores como empresa, cooperativa ou individual

-- Adicionar coluna tipo_fornecedor
ALTER TABLE fornecedores 
ADD COLUMN IF NOT EXISTS tipo_fornecedor VARCHAR(20) DEFAULT 'empresa' CHECK (tipo_fornecedor IN ('empresa', 'cooperativa', 'individual'));

-- Atualizar fornecedores existentes (padrão: empresa)
UPDATE fornecedores 
SET tipo_fornecedor = 'empresa' 
WHERE tipo_fornecedor IS NULL;

-- Criar índice para melhorar performance de consultas por tipo
CREATE INDEX IF NOT EXISTS idx_fornecedores_tipo ON fornecedores(tipo_fornecedor);

-- Comentários
COMMENT ON COLUMN fornecedores.tipo_fornecedor IS 'Tipo do fornecedor: empresa, cooperativa ou individual';
