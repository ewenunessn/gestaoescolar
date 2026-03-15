-- Migration: Adicionar período às guias e vincular guias a pedidos
-- Data: 2026-03-15
-- Descrição: Suporte ao novo fluxo planejamento → guias de demanda → pedido de compra

-- Adicionar campos de período e competência na tabela guias
ALTER TABLE guias
  ADD COLUMN IF NOT EXISTS competencia_mes_ano VARCHAR(7),
  ADD COLUMN IF NOT EXISTS periodo_inicio DATE,
  ADD COLUMN IF NOT EXISTS periodo_fim DATE;

-- Preencher competencia_mes_ano para guias existentes
UPDATE guias
SET competencia_mes_ano = LPAD(mes::TEXT, 2, '0') || '-' || ano::TEXT
WHERE competencia_mes_ano IS NULL;

-- Índice para busca por competência
CREATE INDEX IF NOT EXISTS idx_guias_competencia ON guias(competencia_mes_ano);

-- Adicionar guia_id em pedidos (nullable para compatibilidade com fluxo legado)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS guia_id INTEGER REFERENCES guias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_guia_id ON pedidos(guia_id);

COMMENT ON COLUMN guias.competencia_mes_ano IS 'Competência no formato YYYY-MM';
COMMENT ON COLUMN guias.periodo_inicio IS 'Data de início do período de planejamento';
COMMENT ON COLUMN guias.periodo_fim IS 'Data de fim do período de planejamento';
COMMENT ON COLUMN pedidos.guia_id IS 'Guia de demanda que originou este pedido (null = fluxo legado)';
