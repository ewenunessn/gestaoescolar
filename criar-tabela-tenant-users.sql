-- Criar tabela tenant_users se não existir
CREATE TABLE IF NOT EXISTS tenant_users (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, user_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_status ON tenant_users(status);

-- Associar usuário existente ao tenant padrão
INSERT INTO tenant_users (tenant_id, user_id, role, status)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  id,
  CASE 
    WHEN tipo = 'admin' THEN 'admin'
    WHEN tipo = 'gestor' THEN 'manager'
    ELSE 'user'
  END,
  'active'
FROM usuarios
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_users WHERE user_id = usuarios.id
);

SELECT 'Tabela tenant_users criada e usuários associados!' as resultado;
