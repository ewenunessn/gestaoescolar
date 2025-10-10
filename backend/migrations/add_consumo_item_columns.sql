-- Adicionar colunas para controle de consumo por item
ALTER TABLE faturamento_itens 
ADD COLUMN IF NOT EXISTS consumo_registrado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_consumo TIMESTAMP;

-- Criar índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_faturamento_itens_consumo 
ON faturamento_itens(faturamento_id, consumo_registrado);

-- Comentários
COMMENT ON COLUMN faturamento_itens.consumo_registrado IS 'Indica se o consumo deste item foi registrado';
COMMENT ON COLUMN faturamento_itens.data_consumo IS 'Data e hora em que o consumo foi registrado';
