-- Separa a modalidade pedagogica da categoria usada no financeiro.
-- Mantem os campos financeiros em modalidades como fallback para compatibilidade.

CREATE TABLE IF NOT EXISTS categorias_financeiras_modalidade (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  codigo_financeiro VARCHAR(50),
  valor_repasse NUMERIC DEFAULT 0.00,
  parcelas INTEGER DEFAULT 1 CHECK (parcelas > 0),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE modalidades
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS categoria_financeira_id INTEGER REFERENCES categorias_financeiras_modalidade(id);

INSERT INTO categorias_financeiras_modalidade (nome, codigo_financeiro, valor_repasse, parcelas, ativo)
SELECT DISTINCT
  COALESCE(NULLIF(TRIM(nome), ''), 'Categoria financeira') AS nome,
  codigo_financeiro,
  COALESCE(valor_repasse, 0),
  COALESCE(parcelas, 1),
  COALESCE(ativo, true)
FROM modalidades
WHERE NOT EXISTS (
  SELECT 1
  FROM categorias_financeiras_modalidade cfm
  WHERE LOWER(cfm.nome) = LOWER(COALESCE(NULLIF(TRIM(modalidades.nome), ''), 'Categoria financeira'))
);

UPDATE modalidades m
SET categoria_financeira_id = cfm.id
FROM categorias_financeiras_modalidade cfm
WHERE m.categoria_financeira_id IS NULL
  AND LOWER(cfm.nome) = LOWER(COALESCE(NULLIF(TRIM(m.nome), ''), 'Categoria financeira'));

CREATE INDEX IF NOT EXISTS idx_modalidades_categoria_financeira_id
  ON modalidades(categoria_financeira_id);

COMMENT ON COLUMN modalidades.descricao IS 'Descricao pedagogica da modalidade, incluindo faixa etaria quando aplicavel.';
COMMENT ON COLUMN modalidades.categoria_financeira_id IS 'Categoria usada para consolidacao financeira/pagamento.';
