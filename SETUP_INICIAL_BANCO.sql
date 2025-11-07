-- ========================================
-- SETUP INICIAL DO BANCO DE DADOS
-- Execute este script no Neon Console
-- ========================================

-- 1. CRIAR TENANT PADRÃO
-- ========================================
INSERT INTO tenants (
  id,
  slug,
  name,
  status,
  settings,
  limits,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'sistema-principal',
  'Sistema Principal',
  'active',
  '{"features":{"inventory":true,"contracts":true,"deliveries":true,"reports":true,"mobile":true}}'::jsonb,
  '{"maxUsers":100,"maxSchools":50,"maxProducts":1000,"storageLimit":1024,"apiRateLimit":100}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- 2. CRIAR USUÁRIO ADMINISTRADOR
-- ========================================
-- Senha: Admin@123
-- Hash gerado com bcrypt (10 rounds)
INSERT INTO usuarios (
  nome,
  email,
  senha,
  tipo,
  ativo,
  tenant_id,
  created_at,
  updated_at
) VALUES (
  'Administrador',
  'admin@gestaoescolar.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'admin',
  true,
  '00000000-0000-0000-0000-000000000000',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- IMPORTANTE: Anote o ID retornado acima!
-- Se não retornar nada, execute: SELECT id FROM usuarios WHERE email = 'admin@gestaoescolar.com';

-- 3. ASSOCIAR USUÁRIO AO TENANT
-- ========================================
-- Substitua o user_id pelo ID retornado acima
INSERT INTO tenant_users (
  tenant_id,
  user_id,
  role,
  status,
  created_at,
  updated_at
) 
SELECT 
  '00000000-0000-0000-0000-000000000000',
  id,
  'tenant_admin',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM usuarios 
WHERE email = 'admin@gestaoescolar.com'
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- 4. CRIAR ESCOLAS DE EXEMPLO
-- ========================================
INSERT INTO escolas (
  nome,
  endereco,
  telefone,
  email,
  tenant_id,
  created_at,
  updated_at
) VALUES 
(
  'Escola Municipal Centro',
  'Rua Principal, 123 - Centro',
  '(11) 3333-4444',
  'centro@escola.com',
  '00000000-0000-0000-0000-000000000000',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'Escola Estadual Norte',
  'Av. Norte, 456 - Bairro Norte',
  '(11) 3333-5555',
  'norte@escola.com',
  '00000000-0000-0000-0000-000000000000',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'Escola Municipal Sul',
  'Rua Sul, 789 - Bairro Sul',
  '(11) 3333-6666',
  'sul@escola.com',
  '00000000-0000-0000-0000-000000000000',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- 5. VERIFICAR DADOS CRIADOS
-- ========================================
SELECT 'TENANT CRIADO:' as info;
SELECT id, slug, name, status FROM tenants;

SELECT 'USUÁRIO CRIADO:' as info;
SELECT id, nome, email, tipo FROM usuarios WHERE email = 'admin@gestaoescolar.com';

SELECT 'ASSOCIAÇÃO TENANT-USER:' as info;
SELECT * FROM tenant_users WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

SELECT 'ESCOLAS CRIADAS:' as info;
SELECT id, nome, email FROM escolas WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- ========================================
-- CREDENCIAIS DE ACESSO
-- ========================================
-- Email: admin@gestaoescolar.com
-- Senha: Admin@123
-- ========================================
