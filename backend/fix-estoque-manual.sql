-- Corrigir estoque da escola 181 manualmente
-- Recalcular estoque principal baseado na soma dos lotes

UPDATE estoque_escolas ee
SET quantidade_atual = (
  SELECT COALESCE(SUM(el.quantidade_atual), 0)
  FROM estoque_lotes el
  WHERE el.escola_id = ee.escola_id
    AND el.produto_id = ee.produto_id
    AND el.status = 'ativo'
    AND el.tenant_id = ee.tenant_id
)
WHERE ee.escola_id = 181 
  AND ee.tenant_id = 'f830d523-25c9-4162-b241-6599df73171b';

-- Verificar resultado
SELECT 
  ee.id,
  ee.produto_id,
  p.nome as produto,
  ee.quantidade_atual as estoque_principal,
  (SELECT COALESCE(SUM(el.quantidade_atual), 0)
   FROM estoque_lotes el
   WHERE el.escola_id = ee.escola_id
     AND el.produto_id = ee.produto_id
     AND el.status = 'ativo'
     AND el.tenant_id = ee.tenant_id) as total_lotes
FROM estoque_escolas ee
JOIN produtos p ON p.id = ee.produto_id
WHERE ee.escola_id = 181
  AND ee.tenant_id = 'f830d523-25c9-4162-b241-6599df73171b';
