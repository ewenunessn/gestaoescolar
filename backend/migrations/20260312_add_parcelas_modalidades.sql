-- Adicionar campo parcelas na tabela modalidades
-- Este campo indica quantas vezes o valor_repasse se repete no ano

ALTER TABLE modalidades 
ADD COLUMN IF NOT EXISTS parcelas INTEGER DEFAULT 1 CHECK (parcelas > 0);

COMMENT ON COLUMN modalidades.parcelas IS 'Número de parcelas/repetições do valor_repasse no ano';

-- Atualizar modalidades existentes com valor padrão
UPDATE modalidades 
SET parcelas = 1 
WHERE parcelas IS NULL;
