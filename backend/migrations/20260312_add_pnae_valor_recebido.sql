-- Migration: Adicionar controle de valor recebido do FNDE
-- Data: 2026-03-12
-- Descrição: Tabela para registrar valores recebidos do FNDE por período

-- Criar tabela de valores recebidos do FNDE
CREATE TABLE IF NOT EXISTS pnae_valores_recebidos (
  id SERIAL PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER CHECK (mes >= 1 AND mes <= 12),
  valor_recebido DECIMAL(12,2) NOT NULL CHECK (valor_recebido >= 0),
  percentual_minimo_af DECIMAL(5,2) DEFAULT 30.00 CHECK (percentual_minimo_af >= 0 AND percentual_minimo_af <= 100),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ano, mes)
);

COMMENT ON TABLE pnae_valores_recebidos IS 'Valores recebidos do FNDE por período para cálculo correto do percentual AF';
COMMENT ON COLUMN pnae_valores_recebidos.valor_recebido IS 'Valor em reais recebido do FNDE no período';
COMMENT ON COLUMN pnae_valores_recebidos.percentual_minimo_af IS 'Percentual mínimo obrigatório de agricultura familiar (padrão 30%, pode ser 45% em alguns casos)';

-- Criar índices
CREATE INDEX idx_pnae_valores_recebidos_ano ON pnae_valores_recebidos(ano);
CREATE INDEX idx_pnae_valores_recebidos_periodo ON pnae_valores_recebidos(ano, mes);

-- Criar view atualizada para cálculo correto
CREATE OR REPLACE VIEW vw_pnae_conformidade AS
SELECT 
  vr.ano,
  vr.mes,
  vr.valor_recebido,
  vr.percentual_minimo_af,
  COALESCE(SUM(af.valor_agricultura_familiar), 0) as valor_gasto_af,
  COALESCE(SUM(af.valor_itens), 0) as valor_total_gasto,
  ROUND(
    (COALESCE(SUM(af.valor_agricultura_familiar), 0) / NULLIF(vr.valor_recebido, 0) * 100)::numeric,
    2
  ) as percentual_af_sobre_recebido,
  CASE 
    WHEN (COALESCE(SUM(af.valor_agricultura_familiar), 0) / NULLIF(vr.valor_recebido, 0) * 100) >= vr.percentual_minimo_af
    THEN true
    ELSE false
  END as atende_requisito,
  (vr.valor_recebido * vr.percentual_minimo_af / 100) as valor_minimo_obrigatorio_af,
  (vr.valor_recebido * vr.percentual_minimo_af / 100) - COALESCE(SUM(af.valor_agricultura_familiar), 0) as valor_faltante_af
FROM pnae_valores_recebidos vr
LEFT JOIN vw_pnae_agricultura_familiar af ON 
  EXTRACT(YEAR FROM af.data_pedido) = vr.ano AND
  (vr.mes IS NULL OR EXTRACT(MONTH FROM af.data_pedido) = vr.mes)
GROUP BY vr.id, vr.ano, vr.mes, vr.valor_recebido, vr.percentual_minimo_af;

COMMENT ON VIEW vw_pnae_conformidade IS 'View para verificar conformidade PNAE considerando valor recebido do FNDE';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela pnae_valores_recebidos criada com sucesso!';
  RAISE NOTICE '✅ View vw_pnae_conformidade criada para cálculo correto!';
  RAISE NOTICE '⚠️  IMPORTANTE: Configure os valores recebidos do FNDE para cálculo correto do percentual AF';
END $$;
