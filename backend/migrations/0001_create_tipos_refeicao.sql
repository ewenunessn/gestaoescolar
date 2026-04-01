-- =====================================================
-- Migração: Criar tabela de tipos de refeição personalizados
-- Data: 2026-04-01
-- Descrição: Permite criar tipos de refeição customizados
--            com nome e horário configuráveis
-- =====================================================

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

-- Comentários nas colunas
COMMENT ON TABLE tipos_refeicao IS 'Tipos de refeição personalizados do sistema';
COMMENT ON COLUMN tipos_refeicao.nome IS 'Nome exibido do tipo de refeição (ex: Desjejum)';
COMMENT ON COLUMN tipos_refeicao.chave IS 'Identificador único usado no sistema (ex: desjejum)';
COMMENT ON COLUMN tipos_refeicao.horario IS 'Horário padrão da refeição';
COMMENT ON COLUMN tipos_refeicao.ordem IS 'Ordem de exibição (menor aparece primeiro)';
COMMENT ON COLUMN tipos_refeicao.ativo IS 'Se o tipo está ativo para uso';

-- Inserir tipos padrão do sistema
INSERT INTO tipos_refeicao (nome, chave, horario, ordem, ativo) VALUES
  ('Café da Manhã', 'cafe_manha', '07:00:00', 1, true),
  ('Lanche da Manhã', 'lanche_manha', '09:00:00', 2, true),
  ('Almoço', 'almoco', '12:00:00', 3, true),
  ('Refeição', 'refeicao', '12:00:00', 3, true),
  ('Lanche da Tarde', 'lanche_tarde', '15:00:00', 4, true),
  ('Lanche', 'lanche', '15:00:00', 4, true),
  ('Jantar', 'jantar', '18:00:00', 5, true),
  ('Ceia', 'ceia', '21:00:00', 6, true)
ON CONFLICT (chave) DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tipos_refeicao_ativo ON tipos_refeicao(ativo);
CREATE INDEX IF NOT EXISTS idx_tipos_refeicao_ordem ON tipos_refeicao(ordem);
CREATE INDEX IF NOT EXISTS idx_tipos_refeicao_chave ON tipos_refeicao(chave);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_tipos_refeicao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tipos_refeicao_updated_at
  BEFORE UPDATE ON tipos_refeicao
  FOR EACH ROW
  EXECUTE FUNCTION update_tipos_refeicao_updated_at();

-- Verificação final
DO $$
BEGIN
  RAISE NOTICE 'Migração concluída com sucesso!';
  RAISE NOTICE 'Total de tipos de refeição: %', (SELECT COUNT(*) FROM tipos_refeicao);
END $$;
