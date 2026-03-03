-- Migration: Refatorar Estoque Central para usar apenas lotes
-- Data: 2026-03-03
-- Descrição: Remove quantidade fixa e calcula dinamicamente a partir dos lotes
--            Implementa FEFO (First Expired, First Out)

-- 1. Remover a coluna quantidade da tabela estoque_central
-- (ela será calculada dinamicamente a partir dos lotes)
ALTER TABLE estoque_central DROP COLUMN IF EXISTS quantidade CASCADE;
ALTER TABLE estoque_central DROP COLUMN IF EXISTS quantidade_reservada CASCADE;
ALTER TABLE estoque_central DROP COLUMN IF EXISTS quantidade_disponivel CASCADE;

-- 2. Recriar a view para calcular quantidade a partir dos lotes
DROP VIEW IF EXISTS vw_estoque_central_completo CASCADE;

CREATE VIEW vw_estoque_central_completo AS
SELECT 
  ec.id,
  ec.produto_id,
  p.nome as produto_nome,
  p.unidade,
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
LEFT JOIN estoque_central_lotes ecl ON ecl.estoque_central_id = ec.id
GROUP BY ec.id, p.id, p.nome, p.unidade, p.categoria;

-- 3. Atualizar a view de lotes próximos do vencimento
DROP VIEW IF EXISTS vw_lotes_proximos_vencimento CASCADE;

CREATE VIEW vw_lotes_proximos_vencimento AS
SELECT 
  ecl.id as lote_id,
  ecl.lote,
  ecl.data_validade,
  ecl.quantidade,
  ecl.quantidade_disponivel,
  p.nome as produto_nome,
  p.unidade,
  ec.id as estoque_id,
  (ecl.data_validade::DATE - CURRENT_DATE) as dias_para_vencer
FROM estoque_central_lotes ecl
INNER JOIN estoque_central ec ON ec.id = ecl.estoque_central_id
INNER JOIN produtos p ON p.id = ec.produto_id
WHERE ecl.quantidade > 0
  AND ecl.data_validade >= CURRENT_DATE
ORDER BY ecl.data_validade ASC;

-- 4. Atualizar a view de estoque baixo
DROP VIEW IF EXISTS vw_estoque_baixo CASCADE;

CREATE VIEW vw_estoque_baixo AS
SELECT 
  ec.id,
  p.nome as produto_nome,
  p.unidade,
  COALESCE(SUM(ecl.quantidade_disponivel), 0) as quantidade_disponivel,
  COUNT(DISTINCT ecl.id) FILTER (WHERE ecl.quantidade > 0) as total_lotes
FROM estoque_central ec
INNER JOIN produtos p ON p.id = ec.produto_id
LEFT JOIN estoque_central_lotes ecl ON ecl.estoque_central_id = ec.id
GROUP BY ec.id, p.id, p.nome, p.unidade
HAVING COALESCE(SUM(ecl.quantidade_disponivel), 0) < 10;

-- 5. Criar função para obter lotes disponíveis ordenados por FEFO
CREATE OR REPLACE FUNCTION obter_lotes_fefo(p_estoque_id INTEGER)
RETURNS TABLE (
  lote_id INTEGER,
  lote VARCHAR,
  data_validade DATE,
  quantidade_disponivel NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ecl.id,
    ecl.lote,
    ecl.data_validade,
    ecl.quantidade_disponivel
  FROM estoque_central_lotes ecl
  WHERE ecl.estoque_central_id = p_estoque_id
    AND ecl.quantidade_disponivel > 0
  ORDER BY ecl.data_validade ASC, ecl.created_at ASC;
END;
$$ LANGUAGE plpgsql;
