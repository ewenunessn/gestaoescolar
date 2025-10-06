-- Criação das tabelas de faturamento

-- Tabela principal de faturamentos
CREATE TABLE IF NOT EXISTS faturamentos (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  numero VARCHAR(50) UNIQUE NOT NULL,
  data_faturamento DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'gerado' CHECK (status IN ('gerado', 'processado', 'cancelado')),
  valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  usuario_criacao_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de itens do faturamento por modalidade
CREATE TABLE IF NOT EXISTS faturamento_itens (
  id SERIAL PRIMARY KEY,
  faturamento_id INTEGER NOT NULL REFERENCES faturamentos(id) ON DELETE CASCADE,
  pedido_item_id INTEGER NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE RESTRICT,
  contrato_id INTEGER NOT NULL REFERENCES contratos(id) ON DELETE RESTRICT,
  fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade_original DECIMAL(10, 3) NOT NULL,
  quantidade_modalidade DECIMAL(10, 3) NOT NULL,
  percentual_modalidade DECIMAL(5, 2) NOT NULL,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  valor_total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_faturamentos_pedido ON faturamentos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_status ON faturamentos(status);
CREATE INDEX IF NOT EXISTS idx_faturamentos_data ON faturamentos(data_faturamento);
CREATE INDEX IF NOT EXISTS idx_faturamentos_numero ON faturamentos(numero);

CREATE INDEX IF NOT EXISTS idx_faturamento_itens_faturamento ON faturamento_itens(faturamento_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_itens_modalidade ON faturamento_itens(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_itens_contrato ON faturamento_itens(contrato_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_itens_fornecedor ON faturamento_itens(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_itens_produto ON faturamento_itens(produto_id);

-- Comentários nas tabelas
COMMENT ON TABLE faturamentos IS 'Faturamentos gerados a partir de pedidos';
COMMENT ON TABLE faturamento_itens IS 'Itens do faturamento divididos por modalidade';

COMMENT ON COLUMN faturamentos.numero IS 'Número único do faturamento (formato: FATYYYYNNNNNN)';
COMMENT ON COLUMN faturamentos.status IS 'Status do faturamento: gerado, processado, cancelado';
COMMENT ON COLUMN faturamento_itens.quantidade_original IS 'Quantidade original do item no pedido';
COMMENT ON COLUMN faturamento_itens.quantidade_modalidade IS 'Quantidade calculada para esta modalidade';
COMMENT ON COLUMN faturamento_itens.percentual_modalidade IS 'Percentual da modalidade usado no cálculo';