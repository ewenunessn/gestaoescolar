-- Migration: Ajustar todas as constraints de unicidade para incluir tenant_id
-- Data: 2024
-- Descrição: Permite que os mesmos dados existam em tenants diferentes,
--            mas não permite duplicação dentro do mesmo tenant

-- ============================================================
-- PRODUTOS
-- ============================================================
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_nome_unique;
DROP INDEX IF EXISTS produtos_nome_unique;
ALTER TABLE produtos ADD CONSTRAINT produtos_nome_tenant_key UNIQUE (nome, tenant_id);

-- ============================================================
-- FORNECEDORES
-- ============================================================
ALTER TABLE fornecedores DROP CONSTRAINT IF EXISTS fornecedores_cnpj_key;
DROP INDEX IF EXISTS fornecedores_cnpj_key;
ALTER TABLE fornecedores ADD CONSTRAINT fornecedores_cnpj_tenant_key UNIQUE (cnpj, tenant_id);

-- ============================================================
-- USUÁRIOS
-- ============================================================
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;
DROP INDEX IF EXISTS usuarios_email_key;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_tenant_key UNIQUE (email, tenant_id);

-- ============================================================
-- CONTRATOS
-- ============================================================
ALTER TABLE contratos DROP CONSTRAINT IF EXISTS contratos_numero_key;
DROP INDEX IF EXISTS contratos_numero_key;
ALTER TABLE contratos ADD CONSTRAINT contratos_numero_tenant_key UNIQUE (numero, tenant_id);

-- ============================================================
-- PEDIDOS
-- ============================================================
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_numero_key;
DROP INDEX IF EXISTS pedidos_numero_key;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_numero_tenant_key UNIQUE (numero, tenant_id);

-- ============================================================
-- FATURAMENTOS
-- ============================================================
ALTER TABLE faturamentos DROP CONSTRAINT IF EXISTS faturamentos_numero_key;
DROP INDEX IF EXISTS faturamentos_numero_key;
ALTER TABLE faturamentos ADD CONSTRAINT faturamentos_numero_tenant_key UNIQUE (numero, tenant_id);

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
-- Verificar constraints criadas
SELECT 
  'produtos' as tabela,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'produtos'::regclass AND contype = 'u'
UNION ALL
SELECT 
  'fornecedores' as tabela,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'fornecedores'::regclass AND contype = 'u'
UNION ALL
SELECT 
  'usuarios' as tabela,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'usuarios'::regclass AND contype = 'u'
UNION ALL
SELECT 
  'contratos' as tabela,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'contratos'::regclass AND contype = 'u'
UNION ALL
SELECT 
  'pedidos' as tabela,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'pedidos'::regclass AND contype = 'u'
UNION ALL
SELECT 
  'faturamentos' as tabela,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'faturamentos'::regclass AND contype = 'u'
ORDER BY tabela, constraint_name;
