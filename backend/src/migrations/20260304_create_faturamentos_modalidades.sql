-- Migration: Criar tabelas de faturamento por modalidades
-- Data: 2026-03-04
-- Descrição: Estrutura para armazenar faturamento de pedidos dividido por modalidades

-- Tabela principal de faturamentos (cabeçalho)
CREATE TABLE IF NOT EXISTS faturamentos_pedidos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  data_faturamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id INTEGER REFERENCES usuarios(id),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de itens do faturamento por modalidade
CREATE TABLE IF NOT EXISTS faturamentos_itens (
  id SERIAL PRIMARY KEY,
  faturamento_pedido_id INTEGER NOT NULL REFERENCES faturamentos_pedidos(id) ON DELETE CASCADE,
  pedido_item_id INTEGER NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE RESTRICT,
  quantidade_alocada DECIMAL(10, 2) NOT NULL CHECK (quantidade_alocada > 0),
  preco_unitario DECIMAL(10, 2) NOT NULL,
  valor_total DECIMAL(10, 2) GENERATED ALWAYS AS (quantidade_alocada * preco_unitario) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Garantir que não haja duplicação de item+modalidade no mesmo faturamento
  UNIQUE(faturamento_pedido_id, pedido_item_id, modalidade_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_faturamentos_pedidos_pedido_id ON faturamentos_pedidos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_pedidos_data ON faturamentos_pedidos(data_faturamento);
CREATE INDEX IF NOT EXISTS idx_faturamentos_itens_faturamento ON faturamentos_itens(faturamento_pedido_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_itens_pedido_item ON faturamentos_itens(pedido_item_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_itens_modalidade ON faturamentos_itens(modalidade_id);

-- View para consulta consolidada de faturamentos
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
  COALESCE(prod.unidade, 'UN') as unidade,
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

-- View para resumo por modalidade
CREATE OR REPLACE VIEW vw_faturamentos_resumo_modalidades AS
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

-- Comentários nas tabelas
COMMENT ON TABLE faturamentos_pedidos IS 'Cabeçalho dos faturamentos de pedidos';
COMMENT ON TABLE faturamentos_itens IS 'Itens do faturamento divididos por modalidade';
COMMENT ON COLUMN faturamentos_itens.quantidade_alocada IS 'Quantidade do item alocada para esta modalidade';
COMMENT ON COLUMN faturamentos_itens.valor_total IS 'Valor total calculado automaticamente (quantidade × preço)';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_faturamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_faturamentos_pedidos_updated_at
  BEFORE UPDATE ON faturamentos_pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_faturamentos_updated_at();

CREATE TRIGGER trigger_faturamentos_itens_updated_at
  BEFORE UPDATE ON faturamentos_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_faturamentos_updated_at();
