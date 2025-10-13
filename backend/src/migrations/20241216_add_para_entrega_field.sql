-- Migration: Add para_entrega field to guia_produto_escola
-- Created: 2024-12-16

-- Add para_entrega field to guia_produto_escola table
ALTER TABLE guia_produto_escola 
ADD COLUMN IF NOT EXISTS para_entrega BOOLEAN DEFAULT true;

-- Add index for performance on para_entrega field
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_para_entrega ON guia_produto_escola(para_entrega);

-- Add fields for delivery tracking if they don't exist
ALTER TABLE guia_produto_escola 
ADD COLUMN IF NOT EXISTS entrega_confirmada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quantidade_entregue DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS data_entrega TIMESTAMP,
ADD COLUMN IF NOT EXISTS nome_quem_recebeu VARCHAR(255),
ADD COLUMN IF NOT EXISTS nome_quem_entregou VARCHAR(255),
ADD COLUMN IF NOT EXISTS lote VARCHAR(100);

-- Remove the unique constraint to allow multiple entries with different lotes
ALTER TABLE guia_produto_escola DROP CONSTRAINT IF EXISTS guia_produto_escola_guia_id_produto_id_escola_id_key;

-- Add new unique constraint including lote
ALTER TABLE guia_produto_escola 
ADD CONSTRAINT guia_produto_escola_unique_with_lote 
UNIQUE(guia_id, produto_id, escola_id, lote);