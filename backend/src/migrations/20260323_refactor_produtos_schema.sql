-- Migration: Refactor produtos table schema
-- Date: 2026-03-23
-- Description: Remove campos desnecessários e adicionar novos campos de controle

BEGIN;

-- Remover campos que não são mais necessários (já removidos no Neon)
-- unidade, fator_divisao, marca, peso foram removidos

-- Adicionar novos campos se não existirem
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;

ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS fator_correcao NUMERIC(5, 3) NOT NULL DEFAULT '1.000';

ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS tipo_fator_correcao VARCHAR(20) NOT NULL DEFAULT 'perda';

ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS unidade_distribuicao VARCHAR(50);

ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS peso NUMERIC;

-- Garantir que updated_at existe
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMIT;

-- Estrutura final da tabela produtos:
-- id SERIAL PRIMARY KEY
-- nome VARCHAR(255) NOT NULL
-- descricao TEXT
-- tipo_processamento VARCHAR(100)
-- categoria VARCHAR(100)
-- validade_minima INTEGER
-- imagem_url TEXT
-- perecivel BOOLEAN DEFAULT false
-- ativo BOOLEAN DEFAULT true
-- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- estoque_minimo INTEGER DEFAULT 0
-- fator_correcao NUMERIC(5, 3) NOT NULL DEFAULT '1.000'
-- tipo_fator_correcao VARCHAR(20) NOT NULL DEFAULT 'perda'
-- unidade_distribuicao VARCHAR(50)
-- peso NUMERIC
