-- Historico de quantidade de alunos por escola/modalidade.
-- Mantem escola_modalidades como estado atual e registra eventos com data de vigencia.

CREATE TABLE IF NOT EXISTS escola_modalidades_historico (
  id BIGSERIAL PRIMARY KEY,
  escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE RESTRICT,
  quantidade_alunos INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_alunos >= 0),
  quantidade_anterior INTEGER CHECK (quantidade_anterior IS NULL OR quantidade_anterior >= 0),
  operacao VARCHAR(20) NOT NULL CHECK (operacao IN ('create', 'update', 'delete', 'bootstrap')),
  vigente_de DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  origem VARCHAR(40) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_escola_modalidades_hist_pair_vigencia
  ON escola_modalidades_historico (escola_id, modalidade_id, vigente_de DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_escola_modalidades_hist_escola
  ON escola_modalidades_historico (escola_id);

CREATE INDEX IF NOT EXISTS idx_escola_modalidades_hist_modalidade
  ON escola_modalidades_historico (modalidade_id);

CREATE INDEX IF NOT EXISTS idx_escola_modalidades_hist_vigente_de
  ON escola_modalidades_historico (vigente_de DESC);

INSERT INTO escola_modalidades_historico (
  escola_id,
  modalidade_id,
  quantidade_alunos,
  quantidade_anterior,
  operacao,
  vigente_de,
  observacao,
  origem,
  created_at
)
SELECT
  em.escola_id,
  em.modalidade_id,
  COALESCE(em.quantidade_alunos, 0),
  NULL,
  'bootstrap',
  DATE '1900-01-01',
  'Snapshot inicial criado a partir de escola_modalidades',
  'migration',
  CURRENT_TIMESTAMP
FROM escola_modalidades em
INNER JOIN escolas e ON e.id = em.escola_id
INNER JOIN modalidades m ON m.id = em.modalidade_id
WHERE NOT EXISTS (
  SELECT 1
  FROM escola_modalidades_historico h
  WHERE h.escola_id = em.escola_id
    AND h.modalidade_id = em.modalidade_id
);
