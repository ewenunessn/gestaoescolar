-- Criação das tabelas de pedidos de compra

-- Tabela de pedidos (pedido único com múltiplos fornecedores)
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(50) UNIQUE NOT NULL,
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'pendente', 'aprovado', 'em_separacao', 'enviado', 'entregue', 'cancelado')),
  valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  usuario_criacao_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  usuario_aprovacao_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  data_aprovacao TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  contrato_produto_id INTEGER NOT NULL REFERENCES contrato_produtos(id) ON DELETE RESTRICT,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade DECIMAL(10, 3) NOT NULL CHECK (quantidade > 0),
  preco_unitario DECIMAL(10, 2) NOT NULL CHECK (preco_unitario >= 0),
  valor_total DECIMAL(10, 2) NOT NULL CHECK (valor_total >= 0),
  data_entrega_prevista DATE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos(data_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(numero);

CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_produto ON pedido_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_contrato_produto ON pedido_itens(contrato_produto_id);

-- Comentários nas tabelas
COMMENT ON TABLE pedidos IS 'Pedidos de compra baseados em contratos';
COMMENT ON TABLE pedido_itens IS 'Itens dos pedidos de compra';

COMMENT ON COLUMN pedidos.numero IS 'Número único do pedido (formato: PEDYYYYNNNNNN)';
COMMENT ON COLUMN pedidos.status IS 'Status do pedido: rascunho (salvo mas não enviado), pendente, aprovado, em_separacao, enviado, entregue, cancelado';
COMMENT ON COLUMN pedido_itens.quantidade IS 'Quantidade solicitada do produto';
COMMENT ON COLUMN pedido_itens.preco_unitario IS 'Preço unitário do produto no momento do pedido';
COMMENT ON COLUMN pedido_itens.valor_total IS 'Valor total do item (quantidade * preco_unitario)';
COMMENT ON COLUMN pedido_itens.data_entrega_prevista IS 'Data de entrega prevista específica para este item';
