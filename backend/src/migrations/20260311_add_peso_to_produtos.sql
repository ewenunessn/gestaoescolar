-- Migration: Adicionar coluna peso de volta na tabela produtos
-- Data: 2026-03-11
-- Descrição: Peso deve estar em produtos, não em contrato_produtos

BEGIN;

-- Adicionar coluna peso na tabela produtos se não existir
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS peso DECIMAL(10,3);

-- Comentário explicativo
COMMENT ON COLUMN produtos.peso IS 'Peso do produto em gramas';

-- Criar índice para performance (opcional)
CREATE INDEX IF NOT EXISTS idx_produtos_peso ON produtos(peso);

COMMIT;
