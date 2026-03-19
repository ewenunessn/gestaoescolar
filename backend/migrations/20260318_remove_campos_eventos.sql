-- Migration: Remover campos desnecessários da tabela eventos_calendario
-- Data: 2026-03-18
-- Descrição: Remove colunas hora_inicio, hora_fim, local e responsavel

-- Remover colunas da tabela eventos_calendario
ALTER TABLE eventos_calendario 
DROP COLUMN IF EXISTS hora_inicio,
DROP COLUMN IF EXISTS hora_fim,
DROP COLUMN IF EXISTS local,
DROP COLUMN IF EXISTS responsavel;

-- Comentário explicativo
COMMENT ON TABLE eventos_calendario IS 'Tabela de eventos do calendário letivo - simplificada para conter apenas informações essenciais';
