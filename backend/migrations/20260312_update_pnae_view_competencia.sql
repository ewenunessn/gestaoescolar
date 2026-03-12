-- Atualizar view vw_pnae_agricultura_familiar para incluir competencia_mes_ano
-- Isso permite filtrar por competência ao invés de data de criação do pedido

DROP VIEW IF EXISTS vw_pnae_agricultura_familiar CASCADE;

CREATE OR REPLACE VIEW vw_pnae_agricultura_familiar AS
SELECT 
  p.id as pedido_id,
  p.numero as pedido_numero,
  p.data_pedido,
  p.competencia_mes_ano,
  p.valor_total as valor_pedido,
  f.id as fornecedor_id,
  f.nome as fornecedor_nome,
  f.tipo_fornecedor,
  c.id as contrato_id,
  c.numero as contrato_numero,
  SUM(pi.valor_total) as valor_itens,
  CASE 
    WHEN f.tipo_fornecedor IN ('AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF') 
    THEN SUM(pi.valor_total)
    ELSE 0 
  END as valor_agricultura_familiar,
  CASE 
    WHEN f.tipo_fornecedor IN ('AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF') 
    THEN 100.0 
    ELSE 0.0 
  END as percentual_af,
  p.origem_recurso
FROM pedidos p
INNER JOIN pedido_itens pi ON p.id = pi.pedido_id
INNER JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
INNER JOIN contratos c ON cp.contrato_id = c.id
INNER JOIN fornecedores f ON c.fornecedor_id = f.id
WHERE p.origem_recurso = 'PNAE' OR p.origem_recurso IS NULL
GROUP BY p.id, p.numero, p.data_pedido, p.competencia_mes_ano, p.valor_total, f.id, f.nome, f.tipo_fornecedor, c.id, c.numero, p.origem_recurso;

COMMENT ON VIEW vw_pnae_agricultura_familiar IS 'View para cálculo automático do percentual de agricultura familiar - usa competencia_mes_ano para agrupamento correto';
