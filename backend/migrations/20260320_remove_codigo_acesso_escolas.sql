-- Migration: Remove codigo_acesso from escolas table
-- Date: 2026-03-20
-- Description: Remove the codigo_acesso column as it's no longer needed (using codigo/INEP instead)

-- Remove the codigo_acesso column
ALTER TABLE escolas DROP COLUMN IF EXISTS codigo_acesso;

-- Add comment to codigo column to clarify it's used for both INEP and access
COMMENT ON COLUMN escolas.codigo IS 'Código INEP da escola (também usado para acesso ao sistema)';
