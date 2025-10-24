-- Migration: Add nome column to guias table
-- Created: 2024-12-23

-- Add nome column to guias table
ALTER TABLE guias 
ADD COLUMN IF NOT EXISTS nome VARCHAR(255);

-- Create index for performance on nome column
CREATE INDEX IF NOT EXISTS idx_guias_nome ON guias(nome);

-- Update existing records to have a default name based on mes/ano
UPDATE guias 
SET nome = CONCAT(
    CASE mes
        WHEN 1 THEN 'Janeiro'
        WHEN 2 THEN 'Fevereiro'
        WHEN 3 THEN 'Março'
        WHEN 4 THEN 'Abril'
        WHEN 5 THEN 'Maio'
        WHEN 6 THEN 'Junho'
        WHEN 7 THEN 'Julho'
        WHEN 8 THEN 'Agosto'
        WHEN 9 THEN 'Setembro'
        WHEN 10 THEN 'Outubro'
        WHEN 11 THEN 'Novembro'
        WHEN 12 THEN 'Dezembro'
    END,
    ' ',
    ano
)
WHERE nome IS NULL;