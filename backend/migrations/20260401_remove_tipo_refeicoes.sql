-- Migration: Remover coluna tipo da tabela refeicoes
-- Data: 2026-04-01
-- Descrição: Remove o campo tipo da tabela refeicoes, mantendo apenas categoria

BEGIN;

-- Remover a coluna tipo
ALTER TABLE refeicoes DROP COLUMN IF EXISTS tipo;

COMMIT;
