-- Migration: Adicionar campo de assinatura digital nas entregas
-- Data: 2025-02-28

-- Adicionar coluna para armazenar a assinatura digital (base64)
ALTER TABLE guia_produto_escola 
ADD COLUMN IF NOT EXISTS assinatura_base64 TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN guia_produto_escola.assinatura_base64 IS 'Assinatura digital do recebedor em formato base64 (PNG)';

-- Criar índice para consultas de entregas com assinatura
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_assinatura 
ON guia_produto_escola(assinatura_base64) 
WHERE assinatura_base64 IS NOT NULL;
