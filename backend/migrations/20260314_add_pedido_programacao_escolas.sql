-- Programações de entrega por item do pedido
CREATE TABLE IF NOT EXISTS pedido_item_programacoes (
  id SERIAL PRIMARY KEY,
  pedido_item_id INTEGER NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  data_entrega DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pip_pedido_item ON pedido_item_programacoes(pedido_item_id);

-- Quantidade por escola dentro de cada programação
CREATE TABLE IF NOT EXISTS pedido_item_programacao_escolas (
  id SERIAL PRIMARY KEY,
  programacao_id INTEGER NOT NULL REFERENCES pedido_item_programacoes(id) ON DELETE CASCADE,
  escola_id INTEGER NOT NULL REFERENCES escolas(id),
  quantidade NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(programacao_id, escola_id)
);

CREATE INDEX idx_pipe_programacao ON pedido_item_programacao_escolas(programacao_id);
CREATE INDEX idx_pipe_escola ON pedido_item_programacao_escolas(escola_id);
