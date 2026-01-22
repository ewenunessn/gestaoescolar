-- Migration: Move marca and peso from produtos to contrato_produtos
-- Date: 2025-01-04
-- Description: Move brand and weight from products to contracts for better flexibility

BEGIN;

-- Step 1: Add marca and peso columns to contrato_produtos table
ALTER TABLE contrato_produtos 
ADD COLUMN IF NOT EXISTS marca VARCHAR(255),
ADD COLUMN IF NOT EXISTS peso DECIMAL(10,3);

-- Step 2: Migrate existing data from produtos to contrato_produtos
-- This will copy the marca and peso from produtos to all existing contrato_produtos records
UPDATE contrato_produtos 
SET 
    marca = p.marca,
    peso = p.peso
FROM produtos p 
WHERE contrato_produtos.produto_id = p.id
AND (contrato_produtos.marca IS NULL OR contrato_produtos.peso IS NULL);

-- Step 3: Remove marca and peso columns from produtos table
ALTER TABLE produtos 
DROP COLUMN IF EXISTS marca,
DROP COLUMN IF EXISTS peso;

-- Step 4: Update any views that might reference these columns
-- Note: We'll handle view updates in the application code

COMMIT;

-- Verification queries (commented out for production)
-- SELECT 'contrato_produtos with marca/peso' as table_name, COUNT(*) as count FROM contrato_produtos WHERE marca IS NOT NULL OR peso IS NOT NULL;
-- SELECT 'produtos columns' as info, column_name FROM information_schema.columns WHERE table_name = 'produtos' AND column_name IN ('marca', 'peso');