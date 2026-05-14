-- Isola o cadastro pedagogico do cadastro financeiro.
-- A tabela modalidades representa somente a etapa/modalidade pedagogica.
-- A tabela categorias_financeiras_modalidade representa origem, codigo, repasse e parcelas.
-- A tabela modalidade_categorias_financeiras faz o vinculo N:N entre os dois conceitos.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'modalidades'
      AND column_name = 'categoria_financeira_id'
  ) THEN
    INSERT INTO modalidade_categorias_financeiras (modalidade_id, categoria_financeira_id, ativo)
    SELECT id, categoria_financeira_id, true
    FROM modalidades
    WHERE categoria_financeira_id IS NOT NULL
    ON CONFLICT (modalidade_id, categoria_financeira_id) DO UPDATE
      SET ativo = true,
          updated_at = CURRENT_TIMESTAMP;
  END IF;
END $$;

DROP VIEW IF EXISTS _legacy_view_saldo_contratos_modalidades_20260505;
DROP VIEW IF EXISTS _legacy_vw_faturamento_detalhado_tipo_fornecedor_20260505;
DROP VIEW IF EXISTS _legacy_vw_faturamentos_detalhados_20260505;

CREATE OR REPLACE VIEW vw_faturamento_tipo_fornecedor_modalidade AS
SELECT
  fp.id AS faturamento_id,
  fp.pedido_id,
  p.numero AS pedido_numero,
  f.tipo_fornecedor,
  m.id AS modalidade_id,
  m.nome AS modalidade_nome,
  categorias_financeiras.ids[1] AS categoria_financeira_id,
  categorias_financeiras.nomes::varchar(255) AS categoria_financeira_nome,
  categorias_financeiras.codigos::varchar(50) AS modalidade_codigo_financeiro,
  COUNT(DISTINCT fi.id) AS total_itens,
  COUNT(DISTINCT f.id) AS total_fornecedores,
  SUM(fi.quantidade_alocada) AS quantidade_total,
  SUM((fi.quantidade_alocada * fi.preco_unitario)) AS valor_total
FROM faturamentos_pedidos fp
JOIN pedidos p ON fp.pedido_id = p.id
JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
JOIN modalidades m ON fi.modalidade_id = m.id
LEFT JOIN LATERAL (
  SELECT
    ARRAY_AGG(cfm.id ORDER BY cfm.nome) AS ids,
    STRING_AGG(cfm.nome, ', ' ORDER BY cfm.nome) AS nomes,
    STRING_AGG(cfm.codigo_financeiro, ', ' ORDER BY cfm.nome) FILTER (WHERE cfm.codigo_financeiro IS NOT NULL) AS codigos
  FROM modalidade_categorias_financeiras mcf
  JOIN categorias_financeiras_modalidade cfm ON cfm.id = mcf.categoria_financeira_id
  WHERE mcf.modalidade_id = m.id
    AND mcf.ativo = true
    AND cfm.ativo = true
) categorias_financeiras ON true
JOIN pedido_itens pi ON fi.pedido_item_id = pi.id
JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN fornecedores f ON c.fornecedor_id = f.id
GROUP BY
  fp.id,
  fp.pedido_id,
  p.numero,
  f.tipo_fornecedor,
  m.id,
  m.nome,
  categorias_financeiras.ids,
  categorias_financeiras.nomes,
  categorias_financeiras.codigos
ORDER BY fp.id, f.tipo_fornecedor, m.nome;

CREATE OR REPLACE VIEW vw_faturamentos_resumo_modalidades AS
SELECT
  fp.id AS faturamento_id,
  fp.pedido_id,
  p.numero AS pedido_numero,
  fi.modalidade_id,
  m.nome AS modalidade_nome,
  categorias_financeiras.ids[1] AS categoria_financeira_id,
  categorias_financeiras.nomes::varchar(255) AS categoria_financeira_nome,
  categorias_financeiras.codigos::varchar(50) AS modalidade_codigo_financeiro,
  COALESCE(categorias_financeiras.valor_repasse, 0) AS modalidade_repasse,
  COUNT(DISTINCT fi.pedido_item_id) AS total_itens,
  SUM(fi.quantidade_alocada) AS quantidade_total,
  SUM(fi.valor_total) AS valor_total_modalidade
FROM faturamentos_pedidos fp
JOIN pedidos p ON fp.pedido_id = p.id
JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
JOIN modalidades m ON fi.modalidade_id = m.id
LEFT JOIN LATERAL (
  SELECT
    ARRAY_AGG(cfm.id ORDER BY cfm.nome) AS ids,
    STRING_AGG(cfm.nome, ', ' ORDER BY cfm.nome) AS nomes,
    STRING_AGG(cfm.codigo_financeiro, ', ' ORDER BY cfm.nome) FILTER (WHERE cfm.codigo_financeiro IS NOT NULL) AS codigos,
    SUM(COALESCE(cfm.valor_repasse, 0)) AS valor_repasse
  FROM modalidade_categorias_financeiras mcf
  JOIN categorias_financeiras_modalidade cfm ON cfm.id = mcf.categoria_financeira_id
  WHERE mcf.modalidade_id = m.id
    AND mcf.ativo = true
    AND cfm.ativo = true
) categorias_financeiras ON true
GROUP BY
  fp.id,
  fp.pedido_id,
  p.numero,
  fi.modalidade_id,
  m.nome,
  categorias_financeiras.ids,
  categorias_financeiras.nomes,
  categorias_financeiras.codigos,
  categorias_financeiras.valor_repasse
ORDER BY fp.id, m.nome;

ALTER TABLE modalidades
  DROP COLUMN IF EXISTS categoria_financeira_id,
  DROP COLUMN IF EXISTS codigo_financeiro,
  DROP COLUMN IF EXISTS valor_repasse,
  DROP COLUMN IF EXISTS parcelas;
