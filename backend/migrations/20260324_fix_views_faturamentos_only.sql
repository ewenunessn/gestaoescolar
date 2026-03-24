-- =====================================================
-- Migração: Corrigir views de faturamentos
-- Data: 2026-03-24
-- Descrição: Atualizar views para usar unidade_distribuicao
-- =====================================================

BEGIN;

-- Dropar as views existentes para recriá-las
DROP VIEW IF EXISTS vw_faturamento_tipo_fornecedor_modalidade CASCADE;
DROP VIEW IF EXISTS vw_faturamentos_detalhados CASCADE;
DROP VIEW IF EXISTS vw_faturamentos_resumo_modalidades CASCADE;

-- 1. Criar vw_faturamentos_detalhados
CREATE VIEW vw_faturamentos_detalhados AS
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

-- 2. Criar vw_faturamentos_resumo_modalidades
CREATE VIEW vw_faturamentos_resumo_modalidades AS
SELECT 
  fp.id as faturamento_id,
  fp.pedido_id,
  p.numero as pedido_numero,
  fi.modalidade_id,
  m.nome as modalidade_nome,
  m.valor_repasse as modalidade_repasse,
  COUNT(DISTINCT fi.pedido_item_id) as total_itens,
  SUM(fi.quantidade_alocada) as quantidade_total,
  SUM(fi.valor_total) as valor_total_modalidade
FROM faturamentos_pedidos fp
JOIN pedidos p ON fp.pedido_id = p.id
JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
JOIN modalidades m ON fi.modalidade_id = m.id
GROUP BY fp.id, fp.pedido_id, p.numero, fi.modalidade_id, m.nome, m.valor_repasse
ORDER BY fp.id, m.nome;

-- 3. Criar vw_faturamento_tipo_fornecedor_modalidade
CREATE VIEW vw_faturamento_tipo_fornecedor_modalidade AS
SELECT 
  fp.id as faturamento_id,
  fp.pedido_id,
  p.numero as pedido_numero,
  CASE 
    WHEN f.tipo_fornecedor = 'PNAE' THEN 'PNAE'
    WHEN f.tipo_fornecedor = 'CONVENCIONAL' THEN 'CONVENCIONAL'
    ELSE 'OUTROS'
  END as tipo_fornecedor,
  m.id as modalidade_id,
  m.nome as modalidade_nome,
  m.valor_repasse as modalidade_repasse,
  prod.id as produto_id,
  prod.nome as produto_nome,
  COALESCE(prod.unidade_distribuicao, 'UN') as unidade,
  c.numero as contrato_numero,
  fi.quantidade_alocada,
  fi.preco_unitario,
  fi.valor_total,
  (fi.valor_total * m.valor_repasse / 100) as valor_repasse_calculado
FROM faturamentos_pedidos fp
JOIN pedidos p ON fp.pedido_id = p.id
JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
JOIN modalidades m ON fi.modalidade_id = m.id
JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
JOIN produtos prod ON cp.produto_id = prod.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN fornecedores f ON c.fornecedor_id = f.id
ORDER BY fp.id, tipo_fornecedor, m.nome, prod.nome;

COMMIT;

-- Verificar se as views foram criadas corretamente
SELECT 
  table_name,
  'OK' as status
FROM information_schema.views
WHERE table_schema = 'public' 
AND table_name IN (
  'vw_faturamentos_detalhados',
  'vw_faturamentos_resumo_modalidades',
  'vw_faturamento_tipo_fornecedor_modalidade'
)
ORDER BY table_name;
