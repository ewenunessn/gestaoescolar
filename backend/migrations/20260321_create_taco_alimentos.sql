-- Tabela TACO (Tabela Brasileira de Composição de Alimentos - UNICAMP, 4ª edição)
-- Valores por 100g do alimento no estado descrito
CREATE TABLE IF NOT EXISTS taco_alimentos (
  id SERIAL PRIMARY KEY,
  codigo INTEGER,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  -- Macronutrientes
  energia_kcal NUMERIC(10,2),
  proteina_g NUMERIC(10,2),
  lipideos_g NUMERIC(10,2),
  carboidratos_g NUMERIC(10,2),
  fibra_alimentar_g NUMERIC(10,2),
  -- Minerais
  calcio_mg NUMERIC(10,2),
  ferro_mg NUMERIC(10,2),
  sodio_mg NUMERIC(10,2),
  -- Vitaminas
  vitamina_c_mg NUMERIC(10,2),
  vitamina_a_mcg NUMERIC(10,2),
  -- Outros
  acucares_g NUMERIC(10,2),
  gorduras_saturadas_g NUMERIC(10,2),
  gorduras_trans_g NUMERIC(10,2),
  colesterol_mg NUMERIC(10,2)
);

CREATE INDEX IF NOT EXISTS idx_taco_nome ON taco_alimentos USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_taco_nome_like ON taco_alimentos(nome varchar_pattern_ops);
