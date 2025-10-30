-- Migração para tornar o campo motivo opcional nas movimentações de estoque
-- Data: 2025-01-30

-- Alterar a coluna motivo para permitir NULL
ALTER TABLE estoque_movimentacoes 
ALTER COLUMN motivo DROP NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN estoque_movimentacoes.motivo IS 'Motivo da movimentação (opcional)';

-- Verificar se a alteração foi aplicada
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'estoque_movimentacoes' 
AND column_name = 'motivo';