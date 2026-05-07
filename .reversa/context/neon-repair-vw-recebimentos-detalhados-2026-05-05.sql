-- Repair missing view vw_recebimentos_detalhados - 2026-05-05
--
-- Contexto:
--   backend/src/modules/recebimentos/controllers/recebimentoController.ts
--   consulta public.vw_recebimentos_detalhados, mas a view nao existe no Neon.
--
-- Validacao feita:
--   O SELECT abaixo foi validado contra as colunas atuais do Neon com EXPLAIN.
--
-- Uso:
--   Execute antes da quarentena/limpeza do schema.

BEGIN;

CREATE OR REPLACE VIEW public.vw_recebimentos_detalhados AS
SELECT
  r.id,
  r.pedido_id,
  r.pedido_item_id,
  r.quantidade_recebida,
  r.data_recebimento,
  r.observacoes,
  r.usuario_id,
  u.nome AS usuario_nome,
  p.numero AS pedido_numero,
  p.status AS pedido_status,
  pi.quantidade AS quantidade_pedida,
  pi.preco_unitario,
  pi.valor_total AS valor_item,
  prod.nome AS produto_nome,
  COALESCE(um_prod.codigo, prod.unidade_distribuicao, pi.unidade, 'UN') AS produto_unidade,
  f.nome AS fornecedor_nome,
  f.cnpj AS fornecedor_cnpj,
  c.numero AS contrato_numero,
  (
    SELECT COALESCE(SUM(r2.quantidade_recebida), 0)
    FROM public.recebimentos r2
    WHERE r2.pedido_item_id = r.pedido_item_id
  ) AS total_recebido_item,
  (
    pi.quantidade - (
      SELECT COALESCE(SUM(r3.quantidade_recebida), 0)
      FROM public.recebimentos r3
      WHERE r3.pedido_item_id = r.pedido_item_id
    )
  ) AS saldo_pendente
FROM public.recebimentos r
JOIN public.pedidos p ON r.pedido_id = p.id
JOIN public.pedido_itens pi ON r.pedido_item_id = pi.id
LEFT JOIN public.contrato_produtos cp ON pi.contrato_produto_id = cp.id
LEFT JOIN public.produtos prod ON prod.id = COALESCE(pi.produto_id, cp.produto_id)
LEFT JOIN public.unidades_medida um_prod ON um_prod.id = prod.unidade_medida_id
LEFT JOIN public.contratos c ON cp.contrato_id = c.id
LEFT JOIN public.fornecedores f ON c.fornecedor_id = f.id
LEFT JOIN public.usuarios u ON r.usuario_id = u.id;

COMMENT ON VIEW public.vw_recebimentos_detalhados IS
  'Detalhamento de recebimentos por pedido/item usado pelo historico de recebimentos do backend.';

COMMIT;

