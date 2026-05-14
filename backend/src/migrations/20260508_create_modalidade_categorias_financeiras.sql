CREATE TABLE IF NOT EXISTS modalidade_categorias_financeiras (
  modalidade_id INTEGER NOT NULL REFERENCES modalidades(id) ON DELETE CASCADE,
  categoria_financeira_id INTEGER NOT NULL REFERENCES categorias_financeiras_modalidade(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (modalidade_id, categoria_financeira_id)
);

INSERT INTO modalidade_categorias_financeiras (modalidade_id, categoria_financeira_id, ativo)
SELECT id, categoria_financeira_id, true
FROM modalidades
WHERE categoria_financeira_id IS NOT NULL
ON CONFLICT (modalidade_id, categoria_financeira_id) DO UPDATE
  SET ativo = true,
      updated_at = CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_modalidade_categorias_fin_modalidade
  ON modalidade_categorias_financeiras(modalidade_id);

CREATE INDEX IF NOT EXISTS idx_modalidade_categorias_fin_categoria
  ON modalidade_categorias_financeiras(categoria_financeira_id);

COMMENT ON TABLE modalidade_categorias_financeiras IS 'Vinculo N:N entre modalidades pedagogicas e modalidades financeiras.';
