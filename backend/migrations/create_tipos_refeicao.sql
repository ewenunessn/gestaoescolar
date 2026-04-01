-- Criar tabela de tipos de refeição personalizados
CREATE TABLE IF NOT EXISTS tipos_refeicao (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  chave VARCHAR(50) NOT NULL UNIQUE,
  horario TIME NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir tipos padrão
INSERT INTO tipos_refeicao (nome, chave, horario, ordem) VALUES
  ('Café da Manhã', 'cafe_manha', '07:00:00', 1),
  ('Lanche da Manhã', 'lanche_manha', '09:00:00', 2),
  ('Almoço', 'almoco', '12:00:00', 3),
  ('Lanche da Tarde', 'lanche_tarde', '15:00:00', 4),
  ('Jantar', 'jantar', '18:00:00', 5),
  ('Ceia', 'ceia', '21:00:00', 6)
ON CONFLICT (chave) DO NOTHING;

-- Adicionar índice
CREATE INDEX IF NOT EXISTS idx_tipos_refeicao_ativo ON tipos_refeicao(ativo);
CREATE INDEX IF NOT EXISTS idx_tipos_refeicao_ordem ON tipos_refeicao(ordem);
