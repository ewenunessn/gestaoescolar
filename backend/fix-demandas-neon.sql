-- Script para corrigir tabela demandas no Neon
-- Execute este script no console do Neon ou via psql

-- 1. Desabilitar RLS (melhora performance)
ALTER TABLE demandas DISABLE ROW LEVEL SECURITY;

-- 2. Remover políticas RLS duplicadas
DROP POLICY IF EXISTS demandas_tenant_isolation ON demandas;
DROP POLICY IF EXISTS tenant_isolation_demandas ON demandas;

-- 3. Criar índices para otimização (se não existirem)
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_id ON demandas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_data_solicitacao ON demandas(tenant_id, data_solicitacao DESC);
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_created_at ON demandas(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_status ON demandas(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_escola_id ON demandas(tenant_id, escola_id) WHERE escola_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_data_solicitacao ON demandas(data_solicitacao);
CREATE INDEX IF NOT EXISTS idx_demandas_escola_nome ON demandas(escola_nome) WHERE escola_nome IS NOT NULL;

-- 4. Criar índices para JOINs
CREATE INDEX IF NOT EXISTS idx_escolas_id_tenant ON escolas(id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_id ON usuarios(id);

-- 5. Atualizar estatísticas
ANALYZE demandas;
ANALYZE escolas;
ANALYZE usuarios;

-- 6. Verificar se há demandas sem tenant_id
SELECT COUNT(*) as demandas_sem_tenant
FROM demandas
WHERE tenant_id IS NULL;

-- Se houver demandas sem tenant_id, você precisa atribuir um tenant padrão:
-- UPDATE demandas 
-- SET tenant_id = 'SEU_TENANT_ID_AQUI'
-- WHERE tenant_id IS NULL;

-- 7. Verificar índices criados
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename = 'demandas'
ORDER BY indexname;

-- 8. Verificar RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'demandas';

SELECT 
  'Demandas sem tenant_id:' as info,
  COUNT(*) as total
FROM demandas
WHERE tenant_id IS NULL
UNION ALL
SELECT 
  'Total de demandas:' as info,
  COUNT(*) as total
FROM demandas
UNION ALL
SELECT 
  'Tenants diferentes:' as info,
  COUNT(DISTINCT tenant_id) as total
FROM demandas;
