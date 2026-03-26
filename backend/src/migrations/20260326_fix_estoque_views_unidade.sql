-- Migration: Corrigir views do estoque central para usar unidades_medida
-- Data: 2026-03-26
-- Descrição: Atualizar views que usavam p.unidade (campo removido) para usar JOIN com unidades_medida

-- Corrigir view vw_estoque_central_completo

DROP VIEW IF EXISTS vw_estoque_central_completo CASCADE;

CREATE VIEW vw_estoque_central_completo AS
SELECT 
  ec.id,
  ec.produto_id,
  p.nome as produto_nome,
  COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade,
  p.categoria,
  COALESCE(SUM(ecl.quantidade), 0) as quantidade,
  COALESCE(SUM(ecl.quantidade_reservada), 0) as quantidade_reservada,
  COALESCE(SUM(ecl.quantidade_disponivel), 0) as quantidade_disponivel,
  COUNT(DISTINCT ecl.id) FILTER (WHERE ecl.quantidade > 0) as total_lotes,
  MIN(ecl.data_validade) FILTER (WHERE ecl.quantidade > 0) as proxima_validade,
  ec.created_at,
  ec.updated_at
FROM estoque_central ec
INNER JOIN produtos p ON p.id = ec.produto_id
LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
LEFT JOIN estoque_central_lotes ecl ON ecl.estoque_central_id = ec.id
GROUP BY ec.id, p.id, p.nome, um.codigo, p.unidade_distribuicao, p.categoria;

-- Corrigir view vw_lotes_proximos_vencimento

DROP VIEW IF EXISTS vw_lotes_proximos_vencimento CASCADE;

CREATE VIEW vw_lotes_proximos_vencimento AS
SELECT 
  ecl.id as lote_id,
  ecl.lote,
  ecl.data_validade,
  ecl.quantidade,
  ecl.quantidade_disponivel,
  p.nome as produto_nome,
  COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade,
  ec.id as estoque_id,
  (ecl.data_validade::DATE - CURRENT_DATE) as dias_para_vencer
FROM estoque_central_lotes ecl
INNER JOIN estoque_central ec ON ec.id = ecl.estoque_central_id
INNER JOIN produtos p ON p.id = ec.produto_id
LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
WHERE ecl.quantidade > 0
  AND ecl.data_validade >= CURRENT_DATE
ORDER BY ecl.data_validade ASC;

-- Corrigir view vw_estoque_baixo

DROP VIEW IF EXISTS vw_estoque_baixo CASCADE;

CREATE VIEW vw_estoque_baixo AS
SELECT 
  ec.id,
  p.nome as produto_nome,
  COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade,
  COALESCE(SUM(ecl.quantidade_disponivel), 0) as quantidade_disponivel,
  COUNT(DISTINCT ecl.id) FILTER (WHERE ecl.quantidade > 0) as total_lotes
FROM estoque_central ec
INNER JOIN produtos p ON p.id = ec.produto_id
LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
LEFT JOIN estoque_central_lotes ecl ON ecl.estoque_central_id = ec.id
GROUP BY ec.id, p.id, p.nome, um.codigo, p.unidade_distribuicao
HAVING COALESCE(SUM(ecl.quantidade_disponivel), 0) < 10;
