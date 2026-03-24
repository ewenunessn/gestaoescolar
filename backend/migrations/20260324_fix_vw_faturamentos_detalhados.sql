-- =====================================================
-- Migração: Corrigir view vw_faturamentos_detalhados
-- Data: 2026-03-24
-- Descrição: Atualizar view para usar unidade_distribuicao ao invés de unidade
-- =====================================================

BEGIN;

-- Recriar view com a coluna correta
CREATE OR REPLACE VIEW vw_faturamentos_detalhados AS
SELECT 
  fp.id as faturamento_id,
  fp.pedido_id,
  p.numero as pedido_numero,
  p.data_pedido,
  p.competencia_mes_ano,
  fp.data_faturamento,
  fp.observacoes as faturamento_observacoes,
  u.nome as usuario_nome,
  fi.id as item_id,
  fi.pedido_item_id,
  fi.modalidade_id,
  m.nome as modalidade_nome,
  m.valor_repasse as modalidade_repasse,
  fi.quantidade_alocada,
  fi.preco_unitario,
  fi.valor_total,
  prod.id as produto_id,
  prod.nome as produto_nome,
  COALESCE(prod.unidade_distribuicao, 'UN') as unidade,
  pi.quantidade as quantidade_pedido,
  c.numero as contrato_numero,
  f.nome as fornecedor_nome,
  f.cnpj as fornecedor_cnpj
FROM faturamentos_pedidos fp
JOIN pedidos p ON fp.pedido_id = p.id
LEFT JOIN usuarios u ON fp.usuario_id = u.id
JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
JOIN modalidades m ON fi.modalidade_id = m.id
JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
JOIN produtos prod ON cp.produto_id = prod.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN fornecedores f ON c.fornecedor_id = f.id
ORDER BY fp.data_faturamento DESC, fi.id;

COMMIT;

-- Verificar se a view foi criada corretamente
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public' 
AND table_name = 'vw_faturamentos_detalhados';
