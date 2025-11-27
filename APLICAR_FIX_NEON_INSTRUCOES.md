# Como Aplicar as Correções no Neon

## Opção 1: Via Script Automatizado (Recomendado)

### Passo 1: Obter a Connection String do Neon

1. Acesse https://console.neon.tech
2. Selecione seu projeto
3. Vá em "Connection Details"
4. Copie a connection string (deve começar com `postgresql://`)

### Passo 2: Definir a Variável de Ambiente

No terminal do Windows (CMD):
```cmd
set POSTGRES_URL=postgresql://neondb_owner:sua_senha@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Ou no PowerShell:
```powershell
$env:POSTGRES_URL="postgresql://neondb_owner:sua_senha@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Passo 3: Executar o Script

```bash
node backend/apply-demandas-fix-neon.js
```

---

## Opção 2: Via Console do Neon (Manual)

Se preferir aplicar manualmente via interface do Neon:

### Passo 1: Acessar o SQL Editor

1. Acesse https://console.neon.tech
2. Selecione seu projeto
3. Clique em "SQL Editor"

### Passo 2: Executar os Comandos

Copie e cole os comandos abaixo no SQL Editor:

```sql
-- 1. Desabilitar RLS
ALTER TABLE demandas DISABLE ROW LEVEL SECURITY;

-- 2. Remover políticas duplicadas
DROP POLICY IF EXISTS demandas_tenant_isolation ON demandas;
DROP POLICY IF EXISTS tenant_isolation_demandas ON demandas;

-- 3. Criar índices de otimização
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_id ON demandas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_data_solicitacao ON demandas(tenant_id, data_solicitacao DESC);
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_created_at ON demandas(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_status ON demandas(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_escola_id ON demandas(tenant_id, escola_id) WHERE escola_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_data_solicitacao ON demandas(data_solicitacao);
CREATE INDEX IF NOT EXISTS idx_demandas_escola_nome ON demandas(escola_nome) WHERE escola_nome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_escolas_id_tenant ON escolas(id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_id ON usuarios(id);

-- 4. Atualizar estatísticas
ANALYZE demandas;
ANALYZE escolas;
ANALYZE usuarios;

-- 5. Verificar resultado
SELECT 
  'RLS Status' as info,
  CASE WHEN rowsecurity THEN 'HABILITADO ❌' ELSE 'DESABILITADO ✅' END as status
FROM pg_tables
WHERE tablename = 'demandas';

SELECT 
  'Total de Índices' as info,
  COUNT(*)::text as status
FROM pg_indexes
WHERE tablename = 'demandas';

SELECT 
  'Demandas sem tenant_id' as info,
  COUNT(*)::text as status
FROM demandas
WHERE tenant_id IS NULL;
```

### Passo 3: Verificar

Execute esta query para confirmar:

```sql
SELECT 
  COUNT(*) as total_demandas,
  COUNT(DISTINCT tenant_id) as total_tenants,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
FROM demandas;
```

---

## O que as Correções Fazem

1. **Desabilita RLS**: Remove a sobrecarga do Row Level Security que estava causando timeouts
2. **Remove Políticas Duplicadas**: Limpa políticas RLS conflitantes
3. **Cria Índices**: Adiciona índices para queries rápidas (< 200ms)
4. **Atualiza Estatísticas**: Otimiza o query planner do PostgreSQL

---

## Resultado Esperado

Após aplicar as correções:
- ✅ Queries de demandas executam em < 200ms (antes: timeout 10s+)
- ✅ RLS desabilitado (validação no código)
- ✅ 12 índices otimizados criados
- ✅ Sem políticas RLS conflitantes

---

## Troubleshooting

### Erro: "relation demandas does not exist"
A tabela demandas não existe no Neon. Execute primeiro a migration 017:
```bash
node backend/run-demandas-migration-neon.js
```

### Erro: "column tenant_id does not exist"
A coluna tenant_id não foi criada. Execute a migration 017.

### Demandas sem tenant_id
Se houver demandas sem tenant_id, execute:
```sql
-- Substitua 'SEU_TENANT_ID' pelo ID do tenant padrão
UPDATE demandas 
SET tenant_id = 'SEU_TENANT_ID'
WHERE tenant_id IS NULL;
```

---

## Após Aplicar

1. Faça deploy do backend no Vercel (se ainda não fez)
2. Teste a aplicação em produção
3. Verifique os logs do Vercel para confirmar que não há mais erros 500
