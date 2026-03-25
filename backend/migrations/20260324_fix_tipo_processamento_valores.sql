-- Migração: Padronizar valores de tipo_processamento
-- Aceitar: 'in natura', 'minimamente processado', 'ingrediente culinário', 'processado', 'ultraprocessado'

-- 1. Converter strings vazias em NULL
UPDATE produtos 
SET tipo_processamento = NULL
WHERE tipo_processamento = '' OR TRIM(tipo_processamento) = '';

-- 2. Atualizar valores existentes para o padrão correto (lowercase e trim)
UPDATE produtos 
SET tipo_processamento = LOWER(TRIM(tipo_processamento))
WHERE tipo_processamento IS NOT NULL;

-- 3. Normalizar valores antigos
UPDATE produtos 
SET tipo_processamento = 'in natura'
WHERE tipo_processamento IN ('In Natura', 'IN NATURA', 'in_natura', 'natural', 'fresco');

UPDATE produtos 
SET tipo_processamento = 'minimamente processado'
WHERE tipo_processamento IN ('Minimamente Processado', 'MINIMAMENTE PROCESSADO', 'minimamente_processado', 'minimo');

UPDATE produtos 
SET tipo_processamento = 'ingrediente culinário'
WHERE tipo_processamento IN ('Ingrediente Culinário', 'INGREDIENTE CULINÁRIO', 'ingrediente_culinario', 'culinario');

UPDATE produtos 
SET tipo_processamento = 'processado'
WHERE tipo_processamento IN ('Processado', 'PROCESSADO');

UPDATE produtos 
SET tipo_processamento = 'ultraprocessado'
WHERE tipo_processamento IN ('Ultraprocessado', 'ULTRAPROCESSADO', 'ultra_processado', 'ultra');

-- 4. Adicionar constraint CHECK para garantir apenas valores válidos
ALTER TABLE produtos 
DROP CONSTRAINT IF EXISTS check_tipo_processamento_valido;

ALTER TABLE produtos 
ADD CONSTRAINT check_tipo_processamento_valido 
CHECK (tipo_processamento IS NULL OR tipo_processamento IN (
  'in natura',
  'minimamente processado',
  'ingrediente culinário',
  'processado',
  'ultraprocessado'
));

-- 5. Adicionar comentário explicativo
COMMENT ON COLUMN produtos.tipo_processamento IS 
'Classificação NOVA de processamento: in natura, minimamente processado, ingrediente culinário, processado ou ultraprocessado';

-- 6. Criar índice para facilitar consultas por tipo de processamento
CREATE INDEX IF NOT EXISTS idx_produtos_tipo_processamento 
ON produtos(tipo_processamento) 
WHERE tipo_processamento IS NOT NULL;
