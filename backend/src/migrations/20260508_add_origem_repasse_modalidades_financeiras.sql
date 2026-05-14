CREATE TABLE IF NOT EXISTS origens_repasse (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  codigo VARCHAR(40) UNIQUE,
  customizada BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO origens_repasse (nome, codigo, customizada, ativo)
VALUES
  ('FNDE', 'FNDE', false, true),
  ('PAE', 'PAE', false, true),
  ('SEDUC Estado', 'SEDUC_ESTADO', false, true)
ON CONFLICT (codigo) DO UPDATE
  SET nome = EXCLUDED.nome,
      ativo = true,
      updated_at = CURRENT_TIMESTAMP;

ALTER TABLE categorias_financeiras_modalidade
  ADD COLUMN IF NOT EXISTS origem_repasse_id INTEGER REFERENCES origens_repasse(id);

CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_origem_repasse
  ON categorias_financeiras_modalidade(origem_repasse_id);

COMMENT ON TABLE origens_repasse IS 'Origens dos recursos usados nas modalidades financeiras, como FNDE, PAE e SEDUC Estado.';
COMMENT ON COLUMN categorias_financeiras_modalidade.origem_repasse_id IS 'Origem do repasse financeiro desta modalidade financeira.';
