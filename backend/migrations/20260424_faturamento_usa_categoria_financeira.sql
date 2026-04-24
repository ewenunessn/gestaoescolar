-- Atualiza views de faturamento para usar a categoria financeira da modalidade.
-- A modalidade continua sendo a unidade pedagogica/operacional; codigo e repasse
-- financeiro vêm de categorias_financeiras_modalidade quando houver vínculo.

DROP VIEW IF EXISTS vw_faturamento_detalhado_tipo_fornecedor;
DROP VIEW IF EXISTS vw_faturamento_tipo_fornecedor_modalidade;
DROP VIEW IF EXISTS vw_faturamentos_resumo_modalidades;
DROP VIEW IF EXISTS vw_faturamentos_detalhados;
DROP VIEW IF EXISTS view_saldo_contratos_modalidades;

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
  m.categoria_financeira_id,
  cfm.nome as categoria_financeira_nome,
  COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as modalidade_codigo_financeiro,
  COALESCE(cfm.valor_repasse, m.valor_repasse) as modalidade_repasse,
  fi.quantidade_alocada,
  fi.preco_unitario,
  fi.valor_total,
  prod.id as produto_id,
  prod.nome as produto_nome,
  COALESCE(um.codigo, 'UN') as unidade,
  pi.quantidade as quantidade_pedido,
  c.numero as contrato_numero,
  f.nome as fornecedor_nome,
  f.cnpj as fornecedor_cnpj
FROM faturamentos_pedidos fp
JOIN pedidos p ON fp.pedido_id = p.id
LEFT JOIN usuarios u ON fp.usuario_id = u.id
JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
JOIN modalidades m ON fi.modalidade_id = m.id
LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
JOIN produtos prod ON cp.produto_id = prod.id
LEFT JOIN unidades_medida um ON prod.unidade_medida_id = um.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN fornecedores f ON c.fornecedor_id = f.id
ORDER BY fp.data_faturamento DESC, fi.id;

CREATE OR REPLACE VIEW vw_faturamentos_resumo_modalidades AS
SELECT
  fp.id as faturamento_id,
  fp.pedido_id,
  p.numero as pedido_numero,
  fi.modalidade_id,
  m.nome as modalidade_nome,
  m.categoria_financeira_id,
  cfm.nome as categoria_financeira_nome,
  COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as modalidade_codigo_financeiro,
  COALESCE(cfm.valor_repasse, m.valor_repasse) as modalidade_repasse,
  COUNT(DISTINCT fi.pedido_item_id) as total_itens,
  SUM(fi.quantidade_alocada) as quantidade_total,
  SUM(fi.valor_total) as valor_total_modalidade
FROM faturamentos_pedidos fp
JOIN pedidos p ON fp.pedido_id = p.id
JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
JOIN modalidades m ON fi.modalidade_id = m.id
LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
GROUP BY
  fp.id,
  fp.pedido_id,
  p.numero,
  fi.modalidade_id,
  m.nome,
  m.categoria_financeira_id,
  cfm.nome,
  COALESCE(cfm.codigo_financeiro, m.codigo_financeiro),
  COALESCE(cfm.valor_repasse, m.valor_repasse)
ORDER BY fp.id, m.nome;

CREATE OR REPLACE VIEW vw_faturamento_tipo_fornecedor_modalidade AS
SELECT
  fp.id as faturamento_id,
  fp.pedido_id,
  p.numero as pedido_numero,
  f.tipo_fornecedor,
  m.id as modalidade_id,
  m.nome as modalidade_nome,
  m.categoria_financeira_id,
  cfm.nome as categoria_financeira_nome,
  COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as modalidade_codigo_financeiro,
  COUNT(DISTINCT fi.id) as total_itens,
  COUNT(DISTINCT f.id) as total_fornecedores,
  SUM(fi.quantidade_alocada) as quantidade_total,
  SUM(fi.quantidade_alocada * fi.preco_unitario) as valor_total
FROM faturamentos_pedidos fp
INNER JOIN pedidos p ON fp.pedido_id = p.id
INNER JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
INNER JOIN modalidades m ON fi.modalidade_id = m.id
LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
INNER JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
INNER JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
INNER JOIN contratos c ON cp.contrato_id = c.id
INNER JOIN fornecedores f ON c.fornecedor_id = f.id
GROUP BY
  fp.id,
  fp.pedido_id,
  p.numero,
  f.tipo_fornecedor,
  m.id,
  m.nome,
  m.categoria_financeira_id,
  cfm.nome,
  COALESCE(cfm.codigo_financeiro, m.codigo_financeiro)
ORDER BY fp.id, f.tipo_fornecedor, m.nome;

CREATE OR REPLACE VIEW vw_faturamento_detalhado_tipo_fornecedor AS
SELECT
  fp.id as faturamento_id,
  fp.pedido_id,
  p.numero as pedido_numero,
  fp.data_faturamento,
  f.id as fornecedor_id,
  f.nome as fornecedor_nome,
  f.cnpj as fornecedor_cnpj,
  f.tipo_fornecedor,
  m.id as modalidade_id,
  m.nome as modalidade_nome,
  m.categoria_financeira_id,
  cfm.nome as categoria_financeira_nome,
  COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as modalidade_codigo_financeiro,
  COALESCE(cfm.valor_repasse, m.valor_repasse) as modalidade_repasse,
  prod.id as produto_id,
  prod.nome as produto_nome,
  COALESCE(um.codigo, 'UN') as unidade,
  c.numero as contrato_numero,
  fi.quantidade_alocada,
  fi.preco_unitario,
  (fi.quantidade_alocada * fi.preco_unitario) as valor_total
FROM faturamentos_pedidos fp
INNER JOIN pedidos p ON fp.pedido_id = p.id
INNER JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
INNER JOIN modalidades m ON fi.modalidade_id = m.id
LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
INNER JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
INNER JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
INNER JOIN contratos c ON cp.contrato_id = c.id
INNER JOIN fornecedores f ON c.fornecedor_id = f.id
INNER JOIN produtos prod ON cp.produto_id = prod.id
LEFT JOIN unidades_medida um ON prod.unidade_medida_id = um.id
ORDER BY fp.id, f.tipo_fornecedor, m.nome, prod.nome;

CREATE OR REPLACE VIEW view_saldo_contratos_modalidades AS
SELECT
    cpm.id,
    cpm.contrato_produto_id,
    cpm.modalidade_id,
    cpm.quantidade_inicial,
    cpm.quantidade_consumida,
    cpm.quantidade_disponivel,
    cpm.ativo,
    cpm.created_at,
    cpm.updated_at,
    cp.contrato_id,
    cp.produto_id,
    cp.quantidade_contratada as quantidade_contrato,
    cp.preco_unitario,
    cp.saldo as saldo_contrato,
    c.numero as contrato_numero,
    c.data_inicio,
    c.data_fim,
    c.status as contrato_status,
    p.nome as produto_nome,
    COALESCE(um.codigo, 'UN') as unidade,
    m.nome as modalidade_nome,
    m.categoria_financeira_id,
    cfm.nome as categoria_financeira_nome,
    COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as modalidade_codigo_financeiro,
    COALESCE(cfm.valor_repasse, m.valor_repasse) as modalidade_valor_repasse,
    f.id as fornecedor_id,
    f.nome as fornecedor_nome,
    (cpm.quantidade_disponivel * cp.preco_unitario) as valor_disponivel,
    CASE
        WHEN cpm.quantidade_disponivel <= 0 THEN 'ESGOTADO'
        WHEN cpm.quantidade_disponivel <= (cpm.quantidade_inicial * 0.1) THEN 'BAIXO_ESTOQUE'
        ELSE 'DISPONIVEL'
    END as status
FROM contrato_produtos_modalidades cpm
JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN produtos p ON cp.produto_id = p.id
LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
JOIN modalidades m ON cpm.modalidade_id = m.id
LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
JOIN fornecedores f ON c.fornecedor_id = f.id
WHERE cpm.ativo = true
  AND cp.ativo = true
  AND c.ativo = true
  AND m.ativo = true;
