-- Migration: Add para_entrega column to guia_produto_escola table
-- Created: 2024-12-23

-- Add para_entrega column to guia_produto_escola table
ALTER TABLE guia_produto_escola 
ADD COLUMN IF NOT EXISTS para_entrega BOOLEAN DEFAULT true;

-- Create index for performance on para_entrega column
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_para_entrega ON guia_produto_escola(para_entrega);

-- Update existing records to have para_entrega = true by default
UPDATE guia_produto_escola SET para_entrega = true WHERE para_entrega IS NULL;