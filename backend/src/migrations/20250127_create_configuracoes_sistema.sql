-- Criar tabela de configurações do sistema
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

-- Criar índice para busca por chave
CREATE INDEX IF NOT EXISTS idx_configuracoes_chave ON configuracoes_sistema(chave);

-- Criar índice para busca por categoria
CREATE INDEX IF NOT EXISTS idx_configuracoes_categoria ON configuracoes_sistema(categoria);

-- Inserir configuração padrão para módulos de saldo no menu
INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria)
VALUES 
  ('modulos_saldo_menu', 'true', 'Exibir módulo de Saldo de Contratos no menu', 'boolean', 'menu')
ON CONFLICT (chave) DO NOTHING;

-- Comentários nas colunas
COMMENT ON TABLE configuracoes_sistema IS 'Tabela de configurações gerais do sistema';
COMMENT ON COLUMN configuracoes_sistema.chave IS 'Chave única da configuração';
COMMENT ON COLUMN configuracoes_sistema.valor IS 'Valor da configuração (pode ser string, número, boolean, JSON)';
COMMENT ON COLUMN configuracoes_sistema.descricao IS 'Descrição da configuração';
COMMENT ON COLUMN configuracoes_sistema.tipo IS 'Tipo do valor (string, number, boolean, json)';
COMMENT ON COLUMN configuracoes_sistema.categoria IS 'Categoria da configuração (menu, sistema, integracao, etc)';
