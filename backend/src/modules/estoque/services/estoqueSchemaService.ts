import db from "../../../database";

export function buildEstoqueLedgerSchemaSql(): string {
  return `
CREATE TABLE IF NOT EXISTS estoque_eventos (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  escopo VARCHAR(20) NOT NULL CHECK (escopo IN ('central', 'escola')),
  escola_id INTEGER REFERENCES escolas(id),
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  lote_id INTEGER,
  tipo_evento VARCHAR(50) NOT NULL,
  origem VARCHAR(50) NOT NULL,
  quantidade_delta NUMERIC(12, 3) NOT NULL DEFAULT 0,
  quantidade_absoluta NUMERIC(12, 3),
  motivo TEXT,
  observacao TEXT,
  referencia_tipo VARCHAR(50),
  referencia_id INTEGER,
  usuario_id INTEGER REFERENCES usuarios(id),
  usuario_nome_snapshot VARCHAR(255),
  data_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  evento_estornado_id BIGINT REFERENCES estoque_eventos(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_estoque_eventos_escopo_produto
  ON estoque_eventos (escopo, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_eventos_escola_produto
  ON estoque_eventos (escola_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_eventos_data
  ON estoque_eventos (data_evento DESC, id DESC);

CREATE TABLE IF NOT EXISTS estoque_operacao_escola (
  escola_id INTEGER PRIMARY KEY REFERENCES escolas(id),
  modo_operacao VARCHAR(20) NOT NULL CHECK (modo_operacao IN ('escola', 'central', 'hibrido')),
  permite_ajuste_escola BOOLEAN NOT NULL DEFAULT true,
  permite_lancamento_central BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES usuarios(id)
);

INSERT INTO estoque_operacao_escola (escola_id, modo_operacao)
SELECT e.id, 'hibrido'
FROM escolas e
WHERE NOT EXISTS (
  SELECT 1
  FROM estoque_operacao_escola o
  WHERE o.escola_id = e.id
);

CREATE OR REPLACE VIEW vw_estoque_saldo_escola AS
SELECT
  ee.escola_id,
  ee.produto_id,
  SUM(ee.quantidade_delta) AS quantidade_atual,
  MAX(ee.data_evento) AS data_ultima_atualizacao
FROM estoque_eventos ee
WHERE ee.escopo = 'escola'
GROUP BY ee.escola_id, ee.produto_id;

CREATE OR REPLACE VIEW vw_estoque_saldo_central AS
SELECT
  ee.produto_id,
  SUM(ee.quantidade_delta) AS quantidade_atual,
  MAX(ee.data_evento) AS data_ultima_atualizacao
FROM estoque_eventos ee
WHERE ee.escopo = 'central'
GROUP BY ee.produto_id;
`;
}

export async function ensureEstoqueLedgerSchema(): Promise<void> {
  await db.query(buildEstoqueLedgerSchemaSql());
}
