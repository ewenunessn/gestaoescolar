-- Migration: Add unidade field to contrato_produtos table
-- Date: 2025-01-20
-- Description: Move unit of measure from produtos to contrato_produtos to allow different units per contract

-- Add unidade column to contrato_produtos table
ALTER TABLE contrato_produtos 
ADD COLUMN unidade VARCHAR(50);

-- Update existing records with unit from produtos table
UPDATE contrato_produtos 
SET unidade = p.unidade 
FROM produtos p 
WHERE contrato_produtos.produto_id = p.id;

-- Set default unit for any records that might not have been updated
UPDATE contrato_produtos 
SET unidade = 'Kg' 
WHERE unidade IS NULL;

-- Make unidade NOT NULL after populating existing data
ALTER TABLE contrato_produtos 
ALTER COLUMN unidade SET NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN contrato_produtos.unidade IS 'Unit of measure for this product in this specific contract';