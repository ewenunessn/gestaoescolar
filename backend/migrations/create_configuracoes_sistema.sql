-- Migração para criar tabela de configurações do sistema
-- Data: 2024-12-26

-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(255) NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) DEFAULT 'string' CHECK (tipo IN ('string', 'boolean', 'number', 'json')),
  categoria VARCHAR(100) DEFAULT 'geral',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_configuracoes_chave ON configuracoes_sistema(chave);
CREATE INDEX IF NOT EXISTS idx_configuracoes_categoria ON configuracoes_sistema(categoria);

-- Inserir configuração padrão para módulo de saldo de contratos
INSERT INTO configuracoes_sistema (chave, valor, descricao, tipo, categoria) 
VALUES (
  'modulo_saldo_contratos',
  '{"modulo_principal": "modalidades", "mostrar_ambos": true}',
  'Configuração do módulo principal de saldo de contratos',
  'json',
  'sistema'
) ON CONFLICT (chave) DO NOTHING;

-- Comentários na tabela
COMMENT ON TABLE configuracoes_sistema IS 'Tabela para armazenar configurações do sistema';
COMMENT ON COLUMN configuracoes_sistema.chave IS 'Chave única da configuração';
COMMENT ON COLUMN configuracoes_sistema.valor IS 'Valor da configuração (pode ser JSON para configurações complexas)';
COMMENT ON COLUMN configuracoes_sistema.tipo IS 'Tipo do valor: string, boolean, number ou json';
COMMENT ON COLUMN configuracoes_sistema.categoria IS 'Categoria da configuração para organização';