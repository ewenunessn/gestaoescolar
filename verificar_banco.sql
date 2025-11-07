-- Verificação completa do banco de dados

-- 1. Contar tenants
SELECT 'TENANTS' as tabela, COUNT(*) as total FROM tenants;

-- 2. Listar todos os tenants
SELECT 'LISTA DE TENANTS:' as info;
SELECT id, slug, name, status, created_at FROM tenants ORDER BY created_at DESC;

-- 3. Contar usuários
SELECT 'USUARIOS' as tabela, COUNT(*) as total FROM usuarios;

-- 4. Contar associações tenant-user
SELECT 'TENANT_USERS' as tabela, COUNT(*) as total FROM tenant_users;

-- 5. Listar associações
SELECT 'ASSOCIACOES TENANT-USER:' as info;
SELECT 
  tu.id,
  tu.tenant_id,
  tu.user_id,
  u.email,
  tu.role,
  tu.status
FROM tenant_users tu
JOIN usuarios u ON tu.user_id = u.id
ORDER BY tu.created_at DESC
LIMIT 10;

-- 6. Contar escolas
SELECT 'ESCOLAS' as tabela, COUNT(*) as total FROM escolas;

-- 7. Verificar se existe tenant padrão
SELECT 'TENANT PADRAO:' as info;
SELECT * FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000';
