-- Grupos de ingredientes base (ex: "Temperos básicos", "Base de arroz")
CREATE TABLE IF NOT EXISTS grupos_ingredientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Itens de cada grupo
CREATE TABLE IF NOT EXISTS grupos_ingredientes_itens (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES grupos_ingredientes(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  per_capita NUMERIC(8,2) NOT NULL DEFAULT 0,
  tipo_medida VARCHAR(20) NOT NULL DEFAULT 'gramas',
  UNIQUE(grupo_id, produto_id)
);

CREATE INDEX IF NOT EXISTS idx_grupos_ingredientes_itens_grupo ON grupos_ingredientes_itens(grupo_id);
