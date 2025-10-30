-- Migração para adicionar colunas data_validade e data_entrada na tabela estoque_escolas
-- Data: 2025-01-30

-- Adicionar coluna data_validade (opcional)
ALTER TABLE estoque_escolas 
ADD COLUMN IF NOT EXISTS data_validade DATE;

-- Adicionar coluna data_entrada (opcional)
ALTER TABLE estoque_escolas 
ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Comentários explicativos
COMMENT ON COLUMN estoque_escolas.data_validade IS 'Data de validade do produto no estoque (opcional)';
COMMENT ON COLUMN estoque_escolas.data_entrada IS 'Data de entrada do produto no estoque';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_data_validade 
ON estoque_escolas(data_validade) 
WHERE data_validade IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_escolas_data_entrada 
ON estoque_escolas(data_entrada);

-- Verificar se as colunas foram adicionadas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'estoque_escolas' 
AND column_name IN ('data_validade', 'data_entrada')
ORDER BY column_name;