-- Migration: Funções (roles) e associação de usuários a funções
-- Permite criar funções com permissões por módulo e associar usuários a essas funções

-- Tabela de funções (roles)
CREATE TABLE IF NOT EXISTS funcoes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissões de cada função por módulo
CREATE TABLE IF NOT EXISTS funcao_permissoes (
  id SERIAL PRIMARY KEY,
  funcao_id INTEGER NOT NULL REFERENCES funcoes(id) ON DELETE CASCADE,
  modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  nivel_permissao_id INTEGER NOT NULL REFERENCES niveis_permissao(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(funcao_id, modulo_id)
);

-- Associação de usuário a função
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS funcao_id INTEGER REFERENCES funcoes(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_funcao_permissoes_funcao ON funcao_permissoes(funcao_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_funcao ON usuarios(funcao_id);

-- Garantir que a tabela modulos existe com dados básicos
INSERT INTO modulos (nome, slug, descricao, icone, ordem) VALUES
  ('Dashboard', 'dashboard', 'Painel principal', 'dashboard', 1),
  ('Escolas', 'escolas', 'Gerenciamento de escolas', 'school', 2),
  ('Usuários', 'usuarios', 'Gerenciamento de usuários', 'people', 3),
  ('Produtos', 'produtos', 'Cadastro de produtos', 'inventory', 4),
  ('Fornecedores', 'fornecedores', 'Cadastro de fornecedores', 'business', 5),
  ('Contratos', 'contratos', 'Gerenciamento de contratos', 'description', 6),
  ('Pedidos', 'pedidos', 'Gerenciamento de pedidos', 'shopping_cart', 7),
  ('Estoque', 'estoque', 'Controle de estoque', 'warehouse', 8),
  ('Cardápios', 'cardapios', 'Planejamento de cardápios', 'restaurant_menu', 9),
  ('Entregas', 'entregas', 'Gestão de entregas', 'local_shipping', 10),
  ('Configurações', 'configuracoes', 'Configurações do sistema', 'settings', 11)
ON CONFLICT (slug) DO NOTHING;

-- Garantir níveis de permissão
INSERT INTO niveis_permissao (nome, slug, descricao, nivel) VALUES
  ('Nenhum', 'nenhum', 'Sem acesso ao módulo', 0),
  ('Leitura', 'leitura', 'Pode visualizar dados', 1),
  ('Cadastro e Edição', 'escrita', 'Pode visualizar e editar dados', 2),
  ('Administrador', 'admin', 'Acesso total ao módulo', 3)
ON CONFLICT (slug) DO NOTHING;
