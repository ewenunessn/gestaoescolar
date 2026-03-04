-- Migration: Adicionar coluna competencia_mes_ano em pedidos
-- Data: 2026-03-04
-- Descrição: Adiciona coluna para armazenar mês/ano de competência do pedido

-- Adicionar coluna competencia_mes_ano (formato: YYYY-MM)
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS competencia_mes_ano VARCHAR(7);

-- Preencher competencia_mes_ano com base na data_pedido dos pedidos existentes
UPDATE pedidos 
SET competencia_mes_ano = TO_CHAR(data_pedido, 'YYYY-MM')
WHERE competencia_mes_ano IS NULL;

-- Criar índice para melhorar performance de consultas por competência
CREATE INDEX IF NOT EXISTS idx_pedidos_competencia_mes_ano 
ON pedidos(competencia_mes_ano);

-- Comentários
COMMENT ON COLUMN pedidos.competencia_mes_ano IS 'Mês e ano de competência do pedido no formato YYYY-MM';
