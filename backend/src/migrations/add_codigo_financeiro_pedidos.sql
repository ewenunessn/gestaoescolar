-- Adicionar campo código financeiro aos pedidos
-- Este campo será usado para identificação no sistema financeiro

ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS codigo_financeiro VARCHAR(50);

-- Adicionar comentário explicativo
COMMENT ON COLUMN pedidos.codigo_financeiro IS 'Código usado no sistema financeiro (ex: 2.036, 1.025, etc.)';

-- Criar índice para busca rápida por código financeiro
CREATE INDEX IF NOT EXISTS idx_pedidos_codigo_financeiro ON pedidos(codigo_financeiro);