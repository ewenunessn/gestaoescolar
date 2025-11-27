-- Migration: Sistema de permissões granulares por módulo
-- Permite definir níveis de acesso específicos para cada usuário em cada módulo

-- Tabela de módulos do sistema
CREATE TABLE IF NOT EXISTS modulos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  icone VARCHAR(50),
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de níveis de permissão
CREATE TABLE IF NOT EXISTS niveis_permissao (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  descricao TEXT,
  nivel INTEGER NOT NULL UNIQUE, -- 0=nenhum, 1=leitura, 2=escrita, 3=admin
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de permissões de usuário por módulo
CREATE TABLE IF NOT EXISTS usuario_permissoes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  nivel_permissao_id INTEGER NOT NULL REFERENCES niveis_permissao(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, modulo_id, tenant_id)
);

-- Índices para performance
CREATE INDEX idx_usuario_permissoes_usuario ON usuario_permissoes(usuario_id);
CREATE INDEX idx_usuario_permissoes_modulo ON usuario_permissoes(modulo_id);
CREATE INDEX idx_usuario_permissoes_tenant ON usuario_permissoes(tenant_id);

-- Inserir níveis de permissão padrão
INSERT INTO niveis_permissao (nome, slug, descricao, nivel) VALUES
  ('Nenhum', 'nenhum', 'Sem acesso ao módulo', 0),
  ('Leitura', 'leitura', 'Pode visualizar dados', 1),
  ('Escrita', 'escrita', 'Pode visualizar e editar dados', 2),
  ('Admin', 'admin', 'Acesso total ao módulo', 3)
ON CONFLICT (slug) DO NOTHING;

-- Inserir módulos do sistema
INSERT INTO modulos (nome, slug, descricao, icone, ordem) VALUES
  ('Dashboard', 'dashboard', 'Painel principal com estatísticas', 'dashboard', 1),
  ('Escolas', 'escolas', 'Gerenciamento de escolas', 'school', 2),
  ('Usuários', 'usuarios', 'Gerenciamento de usuários', 'people', 3),
  ('Produtos', 'produtos', 'Cadastro de produtos', 'inventory', 4),
  ('Fornecedores', 'fornecedores', 'Cadastro de fornecedores', 'business', 5),
  ('Contratos', 'contratos', 'Gerenciamento de contratos', 'description', 6),
  ('Pedidos', 'pedidos', 'Gerenciamento de pedidos', 'shopping_cart', 7),
  ('Estoque', 'estoque', 'Controle de estoque', 'warehouse', 8),
  ('Cardápios', 'cardapios', 'Planejamento de cardápios', 'restaurant_menu', 9),
  ('Refeições', 'refeicoes', 'Tipos de refeições', 'lunch_dining', 10),
  ('Demandas', 'demandas', 'Solicitações de demandas', 'request_quote', 11),
  ('Guias', 'guias', 'Guias de remessa', 'local_shipping', 12),
  ('Faturamento', 'faturamento', 'Controle de faturamento', 'receipt', 13),
  ('Relatórios', 'relatorios', 'Relatórios e análises', 'assessment', 14),
  ('Configurações', 'configuracoes', 'Configurações do sistema', 'settings', 15)
ON CONFLICT (slug) DO NOTHING;

-- Comentários
COMMENT ON TABLE modulos IS 'Módulos disponíveis no sistema';
COMMENT ON TABLE niveis_permissao IS 'Níveis de permissão disponíveis';
COMMENT ON TABLE usuario_permissoes IS 'Permissões específicas de cada usuário por módulo';
COMMENT ON COLUMN usuario_permissoes.nivel_permissao_id IS 'Nível de acesso: 0=nenhum, 1=leitura, 2=escrita, 3=admin';
