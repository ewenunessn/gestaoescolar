-- Script SQL para atualizar o status de todos os itens da guia baseado nas entregas realizadas
-- Execute este script diretamente no banco de dados de produção

-- Atualizar status de todos os itens baseado nas entregas
UPDATE guia_produto_escola
SET 
  status = CASE 
    WHEN (
      SELECT COALESCE(SUM(quantidade_entregue), 0) 
      FROM historico_entregas 
      WHERE guia_produto_escola_id = guia_produto_escola.id
    ) >= quantidade THEN 'entregue'
    WHEN (
      SELECT COALESCE(SUM(quantidade_entregue), 0) 
      FROM historico_entregas 
      WHERE guia_produto_escola_id = guia_produto_escola.id
    ) > 0 THEN 'parcial'
    ELSE status
  END,
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 
  FROM historico_entregas 
  WHERE guia_produto_escola_id = guia_produto_escola.id
);

-- Verificar resultados
SELECT 
  status,
  COUNT(*) as total
FROM guia_produto_escola
WHERE EXISTS (
  SELECT 1 
  FROM historico_entregas 
  WHERE guia_produto_escola_id = guia_produto_escola.id
)
GROUP BY status
ORDER BY status;

-- Ver exemplos de itens atualizados
SELECT 
  gpe.id,
  p.nome as produto,
  e.nome as escola,
  gpe.quantidade,
  gpe.quantidade_total_entregue,
  gpe.status
FROM guia_produto_escola gpe
JOIN produtos p ON gpe.produto_id = p.id
JOIN escolas e ON gpe.escola_id = e.id
WHERE EXISTS (
  SELECT 1 
  FROM historico_entregas 
  WHERE guia_produto_escola_id = gpe.id
)
ORDER BY gpe.updated_at DESC
LIMIT 10;
