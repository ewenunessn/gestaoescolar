CREATE TABLE IF NOT EXISTS contrato_produto_saldos (
  id SERIAL PRIMARY KEY,
  contrato_produto_id INTEGER NOT NULL REFERENCES contrato_produtos(id) ON DELETE CASCADE,
  modalidade_financeira_id INTEGER,
  saldo_inicial DECIMAL(12,3) NOT NULL DEFAULT 0,
  saldo_atual DECIMAL(12,3) NOT NULL DEFAULT 0,
  quantidade_consumida DECIMAL(12,3) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (contrato_produto_id, modalidade_financeira_id),
  CHECK (saldo_inicial >= 0),
  CHECK (saldo_atual >= 0),
  CHECK (quantidade_consumida >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contrato_produto_saldos_item_simples
  ON contrato_produto_saldos(contrato_produto_id)
  WHERE modalidade_financeira_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contrato_produto_saldos_item_modalidade
  ON contrato_produto_saldos(contrato_produto_id, modalidade_financeira_id)
  WHERE modalidade_financeira_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contrato_produto_ledger (
  id SERIAL PRIMARY KEY,
  contrato_produto_id INTEGER NOT NULL REFERENCES contrato_produtos(id) ON DELETE CASCADE,
  modalidade_financeira_id INTEGER,
  tipo_movimento VARCHAR(40) NOT NULL,
  direcao VARCHAR(10) NOT NULL,
  quantidade DECIMAL(12,3) NOT NULL,
  saldo_antes DECIMAL(12,3) NOT NULL,
  saldo_depois DECIMAL(12,3) NOT NULL,
  descricao TEXT,
  origem_tipo VARCHAR(60),
  origem_id INTEGER,
  movimento_referenciado_id INTEGER REFERENCES contrato_produto_ledger(id),
  criado_por INTEGER,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (direcao IN ('ENTRADA', 'SAIDA', 'AJUSTE')),
  CHECK (quantidade > 0),
  CHECK (saldo_antes >= 0),
  CHECK (saldo_depois >= 0)
);

CREATE INDEX IF NOT EXISTS idx_contrato_produto_ledger_saldo
  ON contrato_produto_ledger(contrato_produto_id, modalidade_financeira_id, criado_em);

INSERT INTO contrato_produto_saldos (
  contrato_produto_id,
  modalidade_financeira_id,
  saldo_inicial,
  saldo_atual,
  quantidade_consumida,
  ativo,
  created_at,
  updated_at
)
SELECT
  contrato_produto_id,
  NULL,
  quantidade_inicial,
  quantidade_disponivel,
  quantidade_consumida,
  ativo,
  created_at,
  updated_at
FROM contrato_produtos_saldos
ON CONFLICT DO NOTHING;

INSERT INTO contrato_produto_saldos (
  contrato_produto_id,
  modalidade_financeira_id,
  saldo_inicial,
  saldo_atual,
  quantidade_consumida,
  ativo,
  created_at,
  updated_at
)
SELECT
  contrato_produto_id,
  modalidade_id,
  quantidade_inicial,
  quantidade_disponivel,
  quantidade_consumida,
  ativo,
  created_at,
  updated_at
FROM contrato_produtos_modalidades
ON CONFLICT DO NOTHING;
