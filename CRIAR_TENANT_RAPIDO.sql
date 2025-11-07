-- ========================================
-- CRIAR TENANT E ASSOCIAR SEU USUÁRIO
-- Execute no Neon Console SQL Editor
-- ========================================

-- 1. CRIAR TENANT PADRÃO
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
ON CONFLICT (id) DO UPDATE SET
  updated_at = CURRENT_TIMESTAMP;

-- 2. ASSOCIAR SEU USUÁRIO AO TENANT
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
WHERE email = 'ewenunes0@gmail.com'
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = 'tenant_admin',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP;

-- 3. ATUALIZAR TENANT_ID DO USUÁRIO
UPDATE usuarios 
SET tenant_id = '00000000-0000-0000-0000-000000000000'
WHERE email = 'ewenunes0@gmail.com';

-- 4. VERIFICAR SE FOI CRIADO
SELECT '✅ TENANT CRIADO:' as resultado;
SELECT id, slug, name, status FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000';

SELECT '✅ USUÁRIO ASSOCIADO:' as resultado;
SELECT 
  u.id,
  u.nome,
  u.email,
  tu.role,
  tu.status
FROM tenant_users tu
JOIN usuarios u ON tu.user_id = u.id
WHERE u.email = 'ewenunes0@gmail.com';

-- ========================================
-- PRONTO! Agora teste o login:
-- Email: ewenunes0@gmail.com
-- Senha: @Nunes8922
-- ========================================
