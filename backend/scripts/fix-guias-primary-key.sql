-- Script para adicionar PRIMARY KEY na tabela guias
-- Executar nos dois ambientes: local e Neon

-- Verificar se a coluna id já existe e é única
DO $$ 
BEGIN
    -- Verificar se já existe uma primary key
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'guias_pkey' 
        AND conrelid = 'guias'::regclass
    ) THEN
        -- Adicionar PRIMARY KEY
        ALTER TABLE guias ADD PRIMARY KEY (id);
        RAISE NOTICE 'PRIMARY KEY adicionada com sucesso na tabela guias';
    ELSE
        RAISE NOTICE 'PRIMARY KEY já existe na tabela guias';
    END IF;
END $$;

-- Verificar a estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'guias'
ORDER BY ordinal_position;

-- Verificar constraints
SELECT
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'guias'::regclass;
