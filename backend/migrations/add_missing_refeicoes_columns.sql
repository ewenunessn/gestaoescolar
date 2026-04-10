-- Migration: Add missing columns to refeicoes table
-- Date: 2026-04-10
-- Description: Add rendimento_porcoes and other missing columns for nutritional calculations

-- Add rendimento_porcoes column (required for nutritional calculations)
ALTER TABLE refeicoes 
ADD COLUMN IF NOT EXISTS rendimento_porcoes INTEGER DEFAULT 1;

-- Add other missing columns that the frontend expects
ALTER TABLE refeicoes 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);

ALTER TABLE refeicoes 
ADD COLUMN IF NOT EXISTS tempo_preparo_minutos INTEGER;

ALTER TABLE refeicoes 
ADD COLUMN IF NOT EXISTS modo_preparo TEXT;

ALTER TABLE refeicoes 
ADD COLUMN IF NOT EXISTS utensilios TEXT;

ALTER TABLE refeicoes 
ADD COLUMN IF NOT EXISTS observacoes_tecnicas TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_refeicoes_categoria ON refeicoes(categoria);
CREATE INDEX IF NOT EXISTS idx_refeicoes_rendimento ON refeicoes(rendimento_porcoes);

-- Update existing records to have a default rendimento_porcoes of 1
UPDATE refeicoes 
SET rendimento_porcoes = 1 
WHERE rendimento_porcoes IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN refeicoes.rendimento_porcoes IS 'Número de porções que a receita rende (usado para cálculos nutricionais)';
