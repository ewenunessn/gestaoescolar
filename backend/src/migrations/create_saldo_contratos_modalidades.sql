-- Migração para criar estrutura de saldo de contratos por modalidade
-- Data: 2025-10-06

-- Tabela para armazenar saldos iniciais por modalidade
CREATE TABLE IF NOT EXISTS contrato_produtos_modalidades (
    id SERIAL PRIMARY KEY,
    contrato_produto_id INTEGER NOT NULL REFERENCES contrato_produtos(id) ON DELETE CASCADE,
    modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
    quantidade_inicial DECIMAL(10,3) NOT NULL DEFAULT 0,
    quantidade_consumida DECIMAL(10,3) NOT NULL DEFAULT 0,
    quantidade_disponivel DECIMAL(10,3) GENERATED ALWAYS AS (quantidade_inicial - quantidade_consumida) STORED,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Garantir que não haja duplicatas
    UNIQUE(contrato_produto_id, modalidade_id)
);

-- Tabela para movimentações de consumo por modalidade
CREATE TABLE IF NOT EXISTS movimentacoes_consumo_modalidade (
    id SERIAL PRIMARY KEY,
    contrato_produto_modalidade_id INTEGER NOT NULL REFERENCES contrato_produtos_modalidades(id) ON DELETE CASCADE,
    quantidade DECIMAL(10,3) NOT NULL,
    tipo_movimentacao VARCHAR(20) NOT NULL DEFAULT 'CONSUMO', -- CONSUMO, ESTORNO, AJUSTE
    observacao TEXT,
    usuario_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contrato_produtos_modalidades_contrato_produto 
    ON contrato_produtos_modalidades(contrato_produto_id);
CREATE INDEX IF NOT EXISTS idx_contrato_produtos_modalidades_modalidade 
    ON contrato_produtos_modalidades(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_consumo_modalidade_contrato_produto_modalidade 
    ON movimentacoes_consumo_modalidade(contrato_produto_modalidade_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_contrato_produtos_modalidades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contrato_produtos_modalidades_updated_at
    BEFORE UPDATE ON contrato_produtos_modalidades
    FOR EACH ROW
    EXECUTE FUNCTION update_contrato_produtos_modalidades_updated_at();

-- View para consultar saldos por modalidade
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
    
    -- Dados do contrato produto
    cp.contrato_id,
    cp.produto_id,
    cp.quantidade_contratada as quantidade_contrato,
    cp.preco_unitario,
    cp.saldo as saldo_contrato,
    
    -- Dados do contrato
    c.numero as contrato_numero,
    c.data_inicio,
    c.data_fim,
    c.status as contrato_status,
    
    -- Dados do produto
    p.nome as produto_nome,
    p.unidade,
    
    -- Dados da modalidade
    m.nome as modalidade_nome,
    m.codigo_financeiro as modalidade_codigo_financeiro,
    m.valor_repasse as modalidade_valor_repasse,
    
    -- Dados do fornecedor
    f.id as fornecedor_id,
    f.nome as fornecedor_nome,
    
    -- Cálculos
    (cpm.quantidade_disponivel * cp.preco_unitario) as valor_disponivel,
    
    -- Status baseado na disponibilidade
    CASE 
        WHEN cpm.quantidade_disponivel <= 0 THEN 'ESGOTADO'
        WHEN cpm.quantidade_disponivel <= (cpm.quantidade_inicial * 0.1) THEN 'BAIXO_ESTOQUE'
        ELSE 'DISPONIVEL'
    END as status
    
FROM contrato_produtos_modalidades cpm
JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
JOIN contratos c ON cp.contrato_id = c.id
JOIN produtos p ON cp.produto_id = p.id
JOIN modalidades m ON cpm.modalidade_id = m.id
JOIN fornecedores f ON c.fornecedor_id = f.id
WHERE cpm.ativo = true
  AND cp.ativo = true
  AND c.ativo = true
  AND m.ativo = true;

-- Comentários nas tabelas
COMMENT ON TABLE contrato_produtos_modalidades IS 'Armazena saldos iniciais de produtos de contratos por modalidade';
COMMENT ON TABLE movimentacoes_consumo_modalidade IS 'Registra movimentações de consumo por modalidade';
COMMENT ON VIEW view_saldo_contratos_modalidades IS 'View consolidada para consultar saldos de contratos por modalidade';

-- Inserir dados iniciais se necessário (opcional)
-- Você pode descomentar e ajustar conforme necessário
/*
INSERT INTO contrato_produtos_modalidades (contrato_produto_id, modalidade_id, quantidade_inicial)
SELECT 
    cp.id as contrato_produto_id,
    m.id as modalidade_id,
    0 as quantidade_inicial -- Será definido manualmente
FROM contrato_produtos cp
CROSS JOIN modalidades m
WHERE cp.ativo = true 
  AND m.ativo = true
ON CONFLICT (contrato_produto_id, modalidade_id) DO NOTHING;
*/