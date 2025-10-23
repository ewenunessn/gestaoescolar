-- Migration: Add lote column to guia_produto_escola table
-- Created: 2024-12-23

-- Add lote column to guia_produto_escola table
ALTER TABLE guia_produto_escola 
ADD COLUMN IF NOT EXISTS lote VARCHAR(50);

-- Create index for performance on lote column
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_lote ON guia_produto_escola(lote);

-- Update existing records to have a default lote value if needed
-- UPDATE guia_produto_escola SET lote = 'LOTE-001' WHERE lote IS NULL;