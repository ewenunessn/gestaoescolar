-- Recriar view com coluna quantidade_estornada

DROP VIEW IF EXISTS view_saldo_contratos_itens CASCADE;

CREATE OR REPLACE VIEW view_saldo_contratos_itens AS
SELECT 
    cp.id AS contrato_produto_id,
    cp.produto_id,
    p.nome AS produto_nome,
    p.unidade AS produto_unidade,
    cp.contrato_id,
    c.numero AS contrato_numero,
    c.data_inicio,
    c.data_fim,
    
    -- Quantidades
    cp.limite AS quantidade_original,
    COALESCE(aditivos.quantidade_adicional, 0) AS quantidade_aditivos,
    (cp.limite + COALESCE(aditivos.quantidade_adicional, 0)) AS quantidade_total,
    COALESCE(consumo.quantidade_utilizada, 0) AS quantidade_utilizada,
    COALESCE(estornos.quantidade_estornada, 0) AS quantidade_estornada,
    ((cp.limite + COALESCE(aditivos.quantidade_adicional, 0)) - COALESCE(consumo.quantidade_utilizada, 0) + COALESCE(estornos.quantidade_estornada, 0)) AS quantidade_disponivel,
    COALESCE(reservas.quantidade_reservada, 0) AS quantidade_reservada,
    (((cp.limite + COALESCE(aditivos.quantidade_adicional, 0)) - COALESCE(consumo.quantidade_utilizada, 0) + COALESCE(estornos.quantidade_estornada, 0)) - COALESCE(reservas.quantidade_reservada, 0)) AS quantidade_disponivel_real,
    
    -- Valores
    cp.preco AS valor_unitario,
    (((cp.limite + COALESCE(aditivos.quantidade_adicional, 0)) - COALESCE(consumo.quantidade_utilizada, 0) + COALESCE(estornos.quantidade_estornada, 0)) * cp.preco) AS valor_total_disponivel,
    
    -- Status
    CASE 
        WHEN (((cp.limite + COALESCE(aditivos.quantidade_adicional, 0)) - COALESCE(consumo.quantidade_utilizada, 0) + COALESCE(estornos.quantidade_estornada, 0)) <= 0) THEN 'ESGOTADO'
        WHEN ((COALESCE(consumo.quantidade_utilizada, 0) / NULLIF((cp.limite + COALESCE(aditivos.quantidade_adicional, 0)), 0)) >= 0.9) THEN 'BAIXO_ESTOQUE'
        ELSE 'DISPONIVEL'
    END AS status,
    
    -- Percentual utilizado
    CASE 
        WHEN ((cp.limite + COALESCE(aditivos.quantidade_adicional, 0)) > 0) 
        THEN ((COALESCE(consumo.quantidade_utilizada, 0) / (cp.limite + COALESCE(aditivos.quantidade_adicional, 0))) * 100)
        ELSE 0
    END AS percentual_utilizado

FROM contrato_produtos cp
JOIN produtos p ON cp.produto_id = p.id
JOIN contratos c ON cp.contrato_id = c.id

-- Aditivos
LEFT JOIN (
    SELECT 
        contrato_produto_id,
        SUM(quantidade_adicional) AS quantidade_adicional
    FROM aditivos_contratos_itens
    GROUP BY contrato_produto_id
) aditivos ON cp.id = aditivos.contrato_produto_id

-- Consumo (incluindo ajustes)
LEFT JOIN (
    SELECT 
        contrato_produto_id,
        SUM(
            CASE 
                WHEN tipo = 'CONSUMO' THEN quantidade_utilizada
                WHEN tipo = 'AJUSTE' THEN quantidade_utilizada
                ELSE 0
            END
        ) AS quantidade_utilizada
    FROM movimentacoes_consumo_contratos
    WHERE tipo IN ('CONSUMO', 'AJUSTE')
    GROUP BY contrato_produto_id
) consumo ON cp.id = consumo.contrato_produto_id

-- Estornos
LEFT JOIN (
    SELECT 
        contrato_produto_id,
        SUM(quantidade_utilizada) AS quantidade_estornada
    FROM movimentacoes_consumo_contratos
    WHERE tipo = 'ESTORNO'
    GROUP BY contrato_produto_id
) estornos ON cp.id = estornos.contrato_produto_id

-- Reservas
LEFT JOIN (
    SELECT 
        contrato_produto_id,
        SUM(
            CASE 
                WHEN tipo = 'RESERVA' THEN quantidade_utilizada
                WHEN tipo = 'LIBERACAO_RESERVA' THEN -quantidade_utilizada
                ELSE 0
            END
        ) AS quantidade_reservada
    FROM movimentacoes_consumo_contratos
    WHERE tipo IN ('RESERVA', 'LIBERACAO_RESERVA')
    GROUP BY contrato_produto_id
) reservas ON cp.id = reservas.contrato_produto_id;

-- Verificar se a view foi criada
SELECT 'View view_saldo_contratos_itens recriada com sucesso!' as status;
