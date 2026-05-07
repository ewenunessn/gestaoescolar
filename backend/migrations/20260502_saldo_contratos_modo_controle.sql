CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(255) UNIQUE NOT NULL,
  valor TEXT,
  descricao TEXT,
  tipo VARCHAR(50) DEFAULT 'string',
  categoria VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE configuracoes_sistema
  ADD COLUMN IF NOT EXISTS valor TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'string',
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(100),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracoes_sistema_chave_unique
  ON configuracoes_sistema(chave);

CREATE TABLE IF NOT EXISTS contrato_produtos_saldos (
  id SERIAL PRIMARY KEY,
  contrato_produto_id INTEGER NOT NULL REFERENCES contrato_produtos(id) ON DELETE CASCADE,
  quantidade_inicial DECIMAL(10,3) NOT NULL DEFAULT 0,
  quantidade_consumida DECIMAL(10,3) NOT NULL DEFAULT 0,
  quantidade_disponivel DECIMAL(10,3) GENERATED ALWAYS AS (quantidade_inicial - quantidade_consumida) STORED,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contrato_produto_id)
);

CREATE TABLE IF NOT EXISTS contrato_produtos_saldos_historico (
  id SERIAL PRIMARY KEY,
  contrato_produto_saldo_id INTEGER NOT NULL REFERENCES contrato_produtos_saldos(id) ON DELETE CASCADE,
  quantidade DECIMAL(10,3) NOT NULL,
  tipo_movimentacao VARCHAR(20) NOT NULL DEFAULT 'CONSUMO',
  data_consumo DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  usuario_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contrato_produtos_modalidades_id_unique
  ON contrato_produtos_modalidades(id);

CREATE TABLE IF NOT EXISTS contrato_produtos_modalidades_historico (
  id SERIAL PRIMARY KEY,
  contrato_produto_modalidade_id INTEGER NOT NULL REFERENCES contrato_produtos_modalidades(id) ON DELETE CASCADE,
  quantidade DECIMAL(10,2) NOT NULL,
  data_consumo DATE NOT NULL,
  observacao TEXT,
  usuario_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contrato_produtos_saldos_contrato_produto
  ON contrato_produtos_saldos(contrato_produto_id);

ALTER TABLE faturamentos_itens
  ADD COLUMN IF NOT EXISTS saldo_consumo_modo VARCHAR(20),
  ADD COLUMN IF NOT EXISTS saldo_consumo_ref_id INTEGER;

INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
VALUES (
  'modulo_saldo_contratos',
  '{"modulo_principal":"modalidades","mostrar_ambos":false}',
  'Configuracao do modo oficial de saldo de contratos',
  'json',
  'saldos'
) ON CONFLICT (chave) DO NOTHING;
