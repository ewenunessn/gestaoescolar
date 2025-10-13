-- Adicionar campos de localização e observação de entrega na tabela guia_produto_escola
-- Execute este script no banco de dados PostgreSQL

ALTER TABLE guia_produto_escola 
ADD COLUMN IF NOT EXISTS observacao_entrega TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS precisao_gps DECIMAL(8, 2);

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN guia_produto_escola.observacao_entrega IS 'Observação adicional registrada no momento da entrega';
COMMENT ON COLUMN guia_produto_escola.latitude IS 'Latitude da localização onde a entrega foi confirmada';
COMMENT ON COLUMN guia_produto_escola.longitude IS 'Longitude da localização onde a entrega foi confirmada';
COMMENT ON COLUMN guia_produto_escola.precisao_gps IS 'Precisão do GPS em metros no momento da entrega';

-- Criar índice para consultas por localização (opcional, para futuras funcionalidades)
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_location 
ON guia_produto_escola (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;