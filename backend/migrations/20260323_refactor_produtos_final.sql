-- =====================================================
-- Migração: Refatoração da tabela produtos
-- Data: 2026-03-23
-- Descrição: Adiciona novos campos de controle e gestão
-- =====================================================

BEGIN;

-- 1. Adicionar coluna estoque_minimo
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;

-- 2. Adicionar coluna fator_correcao
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS fator_correcao NUMERIC(5, 3) NOT NULL DEFAULT 1.000;

-- 3. Adicionar coluna tipo_fator_correcao
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS tipo_fator_correcao VARCHAR(20) NOT NULL DEFAULT 'perda';

-- 4. Adicionar coluna unidade_distribuicao
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS unidade_distribuicao VARCHAR(50);

-- 5. Adicionar coluna peso
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS peso NUMERIC;

-- 6. Garantir que updated_at existe
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 7. Criar índices para melhorar performance (opcional)
CREATE INDEX IF NOT EXISTS idx_produtos_estoque_minimo ON produtos(estoque_minimo);
CREATE INDEX IF NOT EXISTS idx_produtos_peso ON produtos(peso) WHERE peso IS NOT NULL;

COMMIT;

-- =====================================================
-- Estrutura final esperada da tabela produtos:
-- =====================================================
-- id                      SERIAL PRIMARY KEY
-- nome                    VARCHAR(255) NOT NULL UNIQUE
-- descricao               TEXT
-- tipo_processamento      VARCHAR(100)
-- categoria               VARCHAR(100)
-- validade_minima         INTEGER
-- imagem_url              TEXT
-- perecivel               BOOLEAN DEFAULT false
-- ativo                   BOOLEAN DEFAULT true
-- created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- estoque_minimo          INTEGER DEFAULT 0
-- fator_correcao          NUMERIC(5, 3) NOT NULL DEFAULT 1.000
-- tipo_fator_correcao     VARCHAR(20) NOT NULL DEFAULT 'perda'
-- unidade_distribuicao    VARCHAR(50)
-- peso                    NUMERIC
-- =====================================================

-- Verificar estrutura final
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'produtos'
ORDER BY ordinal_position;
