-- Migration: Adicionar campos de competência e data de entrega
-- Data: 2025-03-01
-- Objetivo: Separar o conceito de "quando entregar" vs "para qual mês contabilizar"

-- Adicionar coluna data_entrega (quando será entregue fisicamente)
ALTER TABLE guia_produto_escola 
ADD COLUMN IF NOT EXISTS data_entrega DATE;

-- Comentários explicativos
COMMENT ON COLUMN guia_produto_escola.data_entrega IS 'Data em que o produto será/foi entregue fisicamente na escola';
COMMENT ON TABLE guias IS 'Guias de demanda organizadas por mês/ano de competência (consumo)';

-- Criar índice para melhorar performance de consultas por data de entrega
CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_data_entrega ON guia_produto_escola(data_entrega);

-- Atualizar registros existentes que não têm data_entrega
-- Define como primeiro dia do mês da guia
UPDATE guia_produto_escola gpe
SET data_entrega = make_date(g.ano, g.mes, 1)
FROM guias g
WHERE gpe.guia_id = g.id 
  AND gpe.data_entrega IS NULL;

-- Adicionar constraint para garantir que data_entrega não seja nula em novos registros
-- (Comentado por enquanto para não quebrar código existente)
-- ALTER TABLE guia_produto_escola 
-- ALTER COLUMN data_entrega SET NOT NULL;

-- Criar view para facilitar consultas
CREATE OR REPLACE VIEW vw_entregas_programadas AS
SELECT 
  gpe.id,
  gpe.guia_id,
  g.mes as mes_competencia,
  g.ano as ano_competencia,
  gpe.data_entrega,
  EXTRACT(MONTH FROM gpe.data_entrega) as mes_entrega,
  EXTRACT(YEAR FROM gpe.data_entrega) as ano_entrega,
  gpe.produto_id,
  p.nome as produto_nome,
  gpe.escola_id,
  e.nome as escola_nome,
  gpe.quantidade,
  gpe.unidade,
  gpe.observacao,
  gpe.para_entrega,
  gpe.status,
  gpe.entrega_confirmada,
  COALESCE(gpe.quantidade_total_entregue, 0) as quantidade_entregue,
  (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
  -- Flag para identificar entregas antecipadas
  CASE 
    WHEN EXTRACT(MONTH FROM gpe.data_entrega) < g.mes 
      OR (EXTRACT(MONTH FROM gpe.data_entrega) = g.mes AND EXTRACT(YEAR FROM gpe.data_entrega) < g.ano)
    THEN true
    ELSE false
  END as entrega_antecipada,
  gpe.created_at,
  gpe.updated_at
FROM guia_produto_escola gpe
INNER JOIN guias g ON gpe.guia_id = g.id
INNER JOIN produtos p ON gpe.produto_id = p.id
INNER JOIN escolas e ON gpe.escola_id = e.id;

COMMENT ON VIEW vw_entregas_programadas IS 'View que mostra entregas com separação clara entre mês de competência (consumo) e data de entrega física';

-- Exemplos de uso:
-- 
-- 1. Listar entregas antecipadas (entregues antes do mês de competência):
-- SELECT * FROM vw_entregas_programadas WHERE entrega_antecipada = true;
--
-- 2. Listar entregas de março/2026 que serão entregues em fevereiro:
-- SELECT * FROM vw_entregas_programadas 
-- WHERE mes_competencia = 3 AND ano_competencia = 2026 
--   AND mes_entrega = 2 AND ano_entrega = 2026;
--
-- 3. Listar todas as entregas físicas programadas para uma data específica:
-- SELECT * FROM vw_entregas_programadas WHERE data_entrega = '2026-02-25';
