-- Migração para adicionar índices de performance nas tabelas de guias
-- Data: 2026-03-29
-- Objetivo: Otimizar consultas de guias de demanda

-- Índices compostos para guia_produto_escola
CREATE INDEX IF NOT EXISTS idx_gpe_guia_escola_produto 
ON guia_produto_escola (guia_id, escola_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_gpe_escola_status 
ON guia_produto_escola (escola_id, status);

CREATE INDEX IF NOT EXISTS idx_gpe_produto_status 
ON guia_produto_escola (produto_id, status);

-- Índice para consultas por mês/ano nas guias
CREATE INDEX IF NOT EXISTS idx_guias_mes_ano 
ON guias (mes, ano);

-- Índice para status das guias
CREATE INDEX IF NOT EXISTS idx_guias_status 
ON guias (status);

-- Índice composto para consultas de status por período
CREATE INDEX IF NOT EXISTS idx_gpe_guia_created 
ON guia_produto_escola (guia_id, created_at);

-- Índice para data de entrega
CREATE INDEX IF NOT EXISTS idx_gpe_data_entrega 
ON guia_produto_escola (data_entrega) 
WHERE data_entrega IS NOT NULL;

-- Índice para quantidade entregue (usado em cálculos)
CREATE INDEX IF NOT EXISTS idx_gpe_quantidade_entregue 
ON guia_produto_escola (quantidade_total_entregue) 
WHERE quantidade_total_entregue IS NOT NULL;

-- Comentários para documentação
COMMENT ON INDEX idx_gpe_guia_escola_produto IS 'Otimiza consultas de produtos por guia e escola';
COMMENT ON INDEX idx_gpe_escola_status IS 'Otimiza consultas de status por escola';
COMMENT ON INDEX idx_gpe_produto_status IS 'Otimiza consultas de status por produto';
COMMENT ON INDEX idx_guias_mes_ano IS 'Otimiza consultas de guias por período';