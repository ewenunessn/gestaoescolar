-- ============================================================
-- APLICAR NO NEON (PRODUÇÃO)
-- ============================================================
-- Este script ajusta a constraint de nome de escola para permitir
-- o mesmo nome em tenants diferentes, mas não no mesmo tenant
-- ============================================================

-- 1. Remover constraint antiga (nome único globalmente)
ALTER TABLE escolas 
DROP CONSTRAINT IF EXISTS escolas_nome_unique;

-- 2. Remover índice único antigo (se existir)
DROP INDEX IF EXISTS escolas_nome_unique;

-- 3. Adicionar nova constraint (nome + tenant_id)
ALTER TABLE escolas 
ADD CONSTRAINT escolas_nome_tenant_key 
UNIQUE (nome, tenant_id);

-- ============================================================
-- MODALIDADES: Ajustar constraint de nome
-- ============================================================

-- 4. Remover constraint antiga de modalidades (nome único globalmente)
ALTER TABLE modalidades 
DROP CONSTRAINT IF EXISTS modalidades_nome_key;

-- 5. Remover índice único antigo de modalidades (se existir)
DROP INDEX IF EXISTS modalidades_nome_key;

-- 6. Adicionar nova constraint em modalidades (nome + tenant_id)
ALTER TABLE modalidades 
ADD CONSTRAINT modalidades_nome_tenant_key 
UNIQUE (nome, tenant_id);

-- 7. Verificar constraints criadas
-- Verificar constraints de escolas
SELECT 
  'ESCOLAS' as tabela,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'escolas'::regclass
  AND contype = 'u'
ORDER BY conname;

-- Verificar constraints de modalidades
SELECT 
  'MODALIDADES' as tabela,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'modalidades'::regclass
  AND contype = 'u'
ORDER BY conname;

-- ============================================================
-- RESULTADO ESPERADO:
-- ESCOLAS:
-- - escolas_codigo_acesso_tenant_key: UNIQUE (codigo_acesso, tenant_id)
-- - escolas_nome_tenant_key: UNIQUE (nome, tenant_id)
-- 
-- MODALIDADES:
-- - modalidades_nome_tenant_key: UNIQUE (nome, tenant_id)
-- ============================================================


-- ============================================================
-- OUTRAS TABELAS: Ajustar constraints de unicidade
-- ============================================================

-- PRODUTOS
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_nome_unique;
ALTER TABLE produtos ADD CONSTRAINT produtos_nome_tenant_key UNIQUE (nome, tenant_id);

-- FORNECEDORES
ALTER TABLE fornecedores DROP CONSTRAINT IF EXISTS fornecedores_cnpj_key;
ALTER TABLE fornecedores ADD CONSTRAINT fornecedores_cnpj_tenant_key UNIQUE (cnpj, tenant_id);

-- USUÁRIOS
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_email_tenant_key UNIQUE (email, tenant_id);

-- CONTRATOS
ALTER TABLE contratos DROP CONSTRAINT IF EXISTS contratos_numero_key;
ALTER TABLE contratos ADD CONSTRAINT contratos_numero_tenant_key UNIQUE (numero, tenant_id);

-- PEDIDOS
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_numero_key;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_numero_tenant_key UNIQUE (numero, tenant_id);

-- FATURAMENTOS
ALTER TABLE faturamentos DROP CONSTRAINT IF EXISTS faturamentos_numero_key;
ALTER TABLE faturamentos ADD CONSTRAINT faturamentos_numero_tenant_key UNIQUE (numero, tenant_id);
