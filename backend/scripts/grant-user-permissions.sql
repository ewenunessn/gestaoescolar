-- Script para dar permissões de leitura a um usuário específico
-- Substitua o ID do usuário conforme necessário

-- Verificar se as tabelas de permissões existem
DO $$
BEGIN
  -- Criar tabela de módulos se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modulos') THEN
    CREATE TABLE modulos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      descricao TEXT,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  END IF;

  -- Criar tabela de níveis de permissão se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'niveis_permissao') THEN
    CREATE TABLE niveis_permissao (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(50) NOT NULL,
      nivel INTEGER NOT NULL UNIQUE,
      descricao TEXT
    );
    
    -- Inserir níveis padrão
    INSERT INTO niveis_permissao (nome, nivel, descricao) VALUES
      ('Nenhum', 0, 'Sem acesso'),
      ('Leitura', 1, 'Apenas visualização'),
      ('Escrita', 2, 'Visualização e edição'),
      ('Total', 3, 'Acesso completo');
  END IF;

  -- Criar tabela de permissões de usuário se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuario_permissoes') THEN
    CREATE TABLE usuario_permissoes (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
      nivel_permissao_id INTEGER NOT NULL REFERENCES niveis_permissao(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(usuario_id, modulo_id)
    );
  END IF;
END $$;

-- Inserir módulos principais se não existirem
INSERT INTO modulos (nome, slug, descricao) VALUES
  ('Produtos', 'produtos', 'Gerenciamento de produtos'),
  ('Escolas', 'escolas', 'Gerenciamento de escolas'),
  ('Contratos', 'contratos', 'Gerenciamento de contratos'),
  ('Fornecedores', 'fornecedores', 'Gerenciamento de fornecedores'),
  ('Cardápios', 'cardapios', 'Gerenciamento de cardápios'),
  ('Guias', 'guias', 'Gerenciamento de guias'),
  ('Entregas', 'entregas', 'Gerenciamento de entregas'),
  ('Compras', 'compras', 'Gerenciamento de compras'),
  ('Faturamento', 'faturamentos', 'Gerenciamento de faturamento'),
  ('Estoque', 'estoque', 'Gerenciamento de estoque')
ON CONFLICT (slug) DO NOTHING;

-- Dar permissão de LEITURA (nível 1) para o usuário ID 31 (Brenda Aleixo) em todos os módulos
INSERT INTO usuario_permissoes (usuario_id, modulo_id, nivel_permissao_id)
SELECT 31, m.id, 1 -- 1 = Leitura
FROM modulos m
WHERE m.ativo = true
ON CONFLICT (usuario_id, modulo_id) DO UPDATE
SET nivel_permissao_id = 1;

-- Verificar permissões criadas
SELECT 
  u.nome as usuario,
  m.nome as modulo,
  np.nome as nivel_permissao
FROM usuario_permissoes up
JOIN usuarios u ON u.id = up.usuario_id
JOIN modulos m ON m.id = up.modulo_id
JOIN niveis_permissao np ON np.id = up.nivel_permissao_id
WHERE u.id = 31;
