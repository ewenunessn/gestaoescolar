-- Migration: Criar tabelas do Estoque Central
-- Data: 2026-03-03
-- Descrição: Sistema de controle de estoque central com entradas, saídas, ajustes e validade

-- Tabela principal de estoque central
CREATE TABLE IF NOT EXISTS estoque_central (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade DECIMAL(10,3) NOT NULL DEFAULT 0,
  quantidade_reservada DECIMAL(10,3) NOT NULL DEFAULT 0,
  quantidade_disponivel DECIMAL(10,3) GENERATED ALWAYS AS (quantidade - quantidade_reservada) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de lotes do estoque central (controle de validade)
CREATE TABLE IF NOT EXISTS estoque_central_lotes (
  id SERIAL PRIMARY KEY,
  estoque_central_id INTEGER NOT NULL REFERENCES estoque_central(id) ON DELETE CASCADE,
  lote VARCHAR(100) NOT NULL,
  data_fabricacao DATE,
  data_validade DATE NOT NULL,
  quantidade DECIMAL(10,3) NOT NULL DEFAULT 0,
  quantidade_reservada DECIMAL(10,3) NOT NULL DEFAULT 0,
  quantidade_disponivel DECIMAL(10,3) GENERATED ALWAYS AS (quantidade - quantidade_reservada) STORED,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(estoque_central_id, lote)
);

-- Tabela de movimentações do estoque central
CREATE TABLE IF NOT EXISTS estoque_central_movimentacoes (
  id SERIAL PRIMARY KEY,
  estoque_central_id INTEGER NOT NULL REFERENCES estoque_central(id) ON DELETE RESTRICT,
  lote_id INTEGER REFERENCES estoque_central_lotes(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade DECIMAL(10,3) NOT NULL,
  quantidade_anterior DECIMAL(10,3) NOT NULL,
  quantidade_posterior DECIMAL(10,3) NOT NULL,
  motivo VARCHAR(100),
  observacao TEXT,
  documento VARCHAR(100),
  fornecedor VARCHAR(200),
  nota_fiscal VARCHAR(100),
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nome VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_estoque_central_produto ON estoque_central(produto_id);
CREATE INDEX IF NOT EXISTS idx_estoque_central_lotes_estoque ON estoque_central_lotes(estoque_central_id);
CREATE INDEX IF NOT EXISTS idx_estoque_central_lotes_validade ON estoque_central_lotes(data_validade);
CREATE INDEX IF NOT EXISTS idx_estoque_central_movimentacoes_estoque ON estoque_central_movimentacoes(estoque_central_id);
CREATE INDEX IF NOT EXISTS idx_estoque_central_movimentacoes_tipo ON estoque_central_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_estoque_central_movimentacoes_data ON estoque_central_movimentacoes(created_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_estoque_central_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_estoque_central_updated_at
  BEFORE UPDATE ON estoque_central
  FOR EACH ROW
  EXECUTE FUNCTION update_estoque_central_updated_at();

CREATE TRIGGER trigger_estoque_central_lotes_updated_at
  BEFORE UPDATE ON estoque_central_lotes
  FOR EACH ROW
  EXECUTE FUNCTION update_estoque_central_updated_at();

-- View para consulta completa do estoque central
CREATE OR REPLACE VIEW vw_estoque_central_completo AS
SELECT 
  ec.id,
  ec.produto_id,
  p.nome as produto_nome,
  p.unidade,
  p.categoria,
  ec.quantidade,
  ec.quantidade_reservada,
  ec.quantidade_disponivel,
  COUNT(DISTINCT ecl.id) as total_lotes,
  MIN(ecl.data_validade) as proxima_validade,
  ec.created_at,
  ec.updated_at
FROM estoque_central ec
INNER JOIN produtos p ON p.id = ec.produto_id
LEFT JOIN estoque_central_lotes ecl ON ecl.estoque_central_id = ec.id AND ecl.quantidade > 0
GROUP BY ec.id, p.id, p.nome, p.unidade, p.categoria;

-- View para lotes próximos do vencimento (30 dias)
CREATE OR REPLACE VIEW vw_lotes_proximos_vencimento AS
SELECT 
  ecl.id,
  ecl.estoque_central_id,
  ec.produto_id,
  p.nome as produto_nome,
  p.unidade,
  ecl.lote,
  ecl.data_fabricacao,
  ecl.data_validade,
  ecl.quantidade,
  ecl.quantidade_disponivel,
  (ecl.data_validade - CURRENT_DATE) as dias_para_vencer
FROM estoque_central_lotes ecl
INNER JOIN estoque_central ec ON ec.id = ecl.estoque_central_id
INNER JOIN produtos p ON p.id = ec.produto_id
WHERE ecl.quantidade > 0
  AND ecl.data_validade <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY ecl.data_validade ASC;

-- View para produtos com estoque baixo (menos de 10% da média de saídas mensais)
CREATE OR REPLACE VIEW vw_estoque_baixo AS
SELECT 
  ec.id,
  ec.produto_id,
  p.nome as produto_nome,
  p.unidade,
  ec.quantidade,
  ec.quantidade_disponivel,
  COALESCE(AVG(ABS(m.quantidade)), 0) as media_saidas_mensais,
  CASE 
    WHEN COALESCE(AVG(ABS(m.quantidade)), 0) > 0 
    THEN ec.quantidade_disponivel / COALESCE(AVG(ABS(m.quantidade)), 1)
    ELSE 999
  END as dias_estoque
FROM estoque_central ec
INNER JOIN produtos p ON p.id = ec.produto_id
LEFT JOIN estoque_central_movimentacoes m ON m.estoque_central_id = ec.id 
  AND m.tipo = 'saida' 
  AND m.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ec.id, p.id, p.nome, p.unidade
HAVING ec.quantidade_disponivel < COALESCE(AVG(ABS(m.quantidade)) * 0.1, 0)
ORDER BY dias_estoque ASC;

-- Comentários nas tabelas
COMMENT ON TABLE estoque_central IS 'Controle de estoque central com saldo por produto';
COMMENT ON TABLE estoque_central_lotes IS 'Controle de lotes e validade dos produtos no estoque central';
COMMENT ON TABLE estoque_central_movimentacoes IS 'Histórico de todas as movimentações do estoque central';
COMMENT ON COLUMN estoque_central_movimentacoes.tipo IS 'Tipo de movimentação: entrada (compra/recebimento), saida (transferência/venda), ajuste (correção de estoque)';
