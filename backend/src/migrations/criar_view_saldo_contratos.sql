-- View para saldos de contratos
CREATE OR REPLACE VIEW view_saldo_contratos_itens AS
SELECT 
    cp.id,
    cp.contrato_id,
    cp.produto_id,
    p.nome as produto_nome,
    p.unidade_medida,
    cp.quantidade_contratada as quantidade_total,
    COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) as quantidade_utilizada,
    COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0) as quantidade_estornada,
    (cp.quantidade_contratada - COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0)) as quantidade_disponivel_real,
    cp.preco_unitario,
    ((cp.quantidade_contratada - COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0)) * cp.preco_unitario) as valor_total_disponivel,
    c.numero as contrato_numero,
    c.data_inicio,
    c.data_fim,
    c.status as contrato_status,
    f.nome as fornecedor_nome,
    f.id as fornecedor_id,
    CASE 
        WHEN (cp.quantidade_contratada - COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0)) <= 0 THEN 'ESGOTADO'
        WHEN (cp.quantidade_contratada - COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'ESTORNO' THEN mcc.quantidade ELSE 0 END), 0)) <= (cp.quantidade_contratada * 0.2) THEN 'BAIXO_ESTOQUE'
        ELSE 'DISPONIVEL'
    END as status,
    cp.created_at,
    cp.updated_at
FROM contrato_produtos cp
JOIN produtos p ON cp.produto_id = p.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN fornecedores f ON c.fornecedor_id = f.id
LEFT JOIN movimentacoes_consumo_contrato mcc ON cp.id = mcc.contrato_produto_id
WHERE cp.ativo = true
GROUP BY cp.id, cp.contrato_id, cp.produto_id, p.nome, p.unidade_medida, cp.quantidade_contratada, cp.preco_unitario, c.numero, c.data_inicio, c.data_fim, c.status, f.nome, f.id, cp.created_at, cp.updated_at;