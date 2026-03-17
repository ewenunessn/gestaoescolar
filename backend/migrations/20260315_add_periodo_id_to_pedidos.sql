-- Adiciona coluna periodo_id na tabela pedidos para controle de ano letivo

-- Adicionar coluna periodo_id
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS periodo_id INTEGER REFERENCES periodos(id) ON DELETE RESTRICT;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_pedidos_periodo ON pedidos(periodo_id);

-- Atualizar pedidos existentes com o período ativo
UPDATE pedidos 
SET periodo_id = (SELECT id FROM periodos WHERE ativo = true LIMIT 1)
WHERE periodo_id IS NULL;

-- Comentário
COMMENT ON COLUMN pedidos.periodo_id IS 'Referência ao período/ano letivo do pedido';
