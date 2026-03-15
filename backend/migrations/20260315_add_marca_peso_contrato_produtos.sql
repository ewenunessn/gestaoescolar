-- Migration: Adicionar colunas marca e peso na tabela contrato_produtos
-- Permite armazenar marca e peso específicos para cada produto no contrato

-- Adicionar coluna marca
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS marca VARCHAR(255);

-- Adicionar coluna peso (em gramas)
ALTER TABLE contrato_produtos ADD COLUMN IF NOT EXISTS peso NUMERIC;

-- Comentários
COMMENT ON COLUMN contrato_produtos.marca IS 'Marca específica do produto no contrato';
COMMENT ON COLUMN contrato_produtos.peso IS 'Peso em gramas do produto no contrato';
