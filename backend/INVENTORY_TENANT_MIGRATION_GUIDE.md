# Guia de Migração de Tenant para Estoque

Este documento descreve o processo completo de migração dos dados de estoque para suporte a multi-tenant, incluindo preparação, execução, validação e rollback.

## Visão Geral

A migração adiciona suporte a tenant nas seguintes tabelas de estoque:
- `estoque_escolas`
- `estoque_lotes`
- `estoque_escolas_historico`
- `estoque_movimentacoes`

### Objetivos da Migração

1. **Isolamento de Dados**: Garantir que cada tenant veja apenas seus próprios dados de estoque
2. **Integridade Referencial**: Manter todas as relações entre tabelas funcionando corretamente
3. **Performance**: Otimizar consultas com índices tenant-aware
4. **Segurança**: Implementar Row Level Security (RLS) para proteção automática

## Pré-requisitos

### 1. Estrutura do Banco
- Tabelas de tenant já criadas (`tenants`, `tenant_users`, etc.)
- Tabelas de estoque existentes com dados
- Colunas `tenant_id` já adicionadas às tabelas (migração 011)

### 2. Backup
- **OBRIGATÓRIO**: Fazer backup completo do banco antes da migração
- Testar restauração do backup em ambiente de desenvolvimento

### 3. Ambiente
- Acesso administrativo ao banco de dados
- Node.js instalado (para scripts de automação)
- Variáveis de ambiente configuradas

## Arquivos da Migração

### Scripts SQL
- `migrations/012_inventory_tenant_data_migration.sql` - Migração principal
- `scripts/validate-inventory-tenant-migration.sql` - Validação pós-migração
- `scripts/rollback-inventory-tenant-migration.sql` - Rollback em caso de problemas
- `scripts/verify-inventory-referential-integrity.sql` - Verificação de integridade

### Scripts Node.js
- `run-inventory-tenant-migration.js` - Execução automatizada da migração
- `test-inventory-tenant-migration.js` - Testes automatizados

## Processo de Migração

### Fase 1: Preparação

#### 1.1 Verificar Pré-requisitos
```bash
# Verificar estrutura do banco
psql -d gestao_escolar -f scripts/verify-inventory-referential-integrity.sql
```

#### 1.2 Análise de Constraints
```bash
# Analisar problemas potenciais
psql -d gestao_escolar -f analyze-database-constraints.sql
```

#### 1.3 Backup Completo
```bash
# Backup do banco completo
pg_dump -h localhost -U postgres -d gestao_escolar > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Backup específico das tabelas de estoque
pg_dump -h localhost -U postgres -d gestao_escolar \
  -t estoque_escolas -t estoque_lotes -t estoque_escolas_historico -t estoque_movimentacoes \
  > backup_estoque_pre_migration_$(date +%Y%m%d_%H%M%S).sql
```

### Fase 2: Teste em Desenvolvimento

#### 2.1 Executar Testes Automatizados
```bash
# Teste completo com dados simulados
node test-inventory-tenant-migration.js --verbose --cleanup

# Teste apenas validação (sem executar migração)
node test-inventory-tenant-migration.js --dry-run --verbose
```

#### 2.2 Teste Manual
```bash
# Executar migração em modo dry-run
node run-inventory-tenant-migration.js --dry-run --verbose

# Executar migração real em desenvolvimento
node run-inventory-tenant-migration.js --verbose
```

### Fase 3: Execução em Produção

#### 3.1 Janela de Manutenção
- Agendar janela de manutenção
- Notificar usuários sobre indisponibilidade
- Parar aplicações que acessam o banco

#### 3.2 Execução da Migração
```bash
# Execução automatizada com validação
node run-inventory-tenant-migration.js --verbose

# OU execução manual SQL
psql -d gestao_escolar -f migrations/012_inventory_tenant_data_migration.sql
```

#### 3.3 Validação Imediata
```bash
# Validar resultado da migração
psql -d gestao_escolar -f scripts/validate-inventory-tenant-migration.sql

# Verificar integridade referencial
psql -d gestao_escolar -f scripts/verify-inventory-referential-integrity.sql
```

### Fase 4: Pós-Migração

#### 4.1 Testes de Aplicação
- Testar funcionalidades de estoque
- Verificar isolamento entre tenants
- Validar performance das consultas

#### 4.2 Monitoramento
- Monitorar logs de erro
- Verificar performance das consultas
- Acompanhar uso de recursos

## Detalhes Técnicos

### Estrutura de Dados Migrada

#### Antes da Migração
```sql
-- estoque_escolas
CREATE TABLE estoque_escolas (
    id INTEGER PRIMARY KEY,
    escola_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    quantidade_atual NUMERIC DEFAULT 0,
    -- tenant_id UUID NULL (adicionado na migração 011)
);

-- estoque_lotes  
CREATE TABLE estoque_lotes (
    id INTEGER PRIMARY KEY,
    produto_id INTEGER NOT NULL,
    lote TEXT NOT NULL,
    quantidade_atual NUMERIC DEFAULT 0,
    -- escola_id INTEGER NULL (pode não existir)
    -- tenant_id UUID NULL (adicionado na migração 011)
);
```

#### Após a Migração
```sql
-- estoque_escolas
CREATE TABLE estoque_escolas (
    id INTEGER PRIMARY KEY,
    escola_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    quantidade_atual NUMERIC DEFAULT 0,
    tenant_id UUID NOT NULL, -- Populado baseado na escola
);

-- estoque_lotes
CREATE TABLE estoque_lotes (
    id INTEGER PRIMARY KEY,
    produto_id INTEGER NOT NULL,
    lote TEXT NOT NULL,
    quantidade_atual NUMERIC DEFAULT 0,
    escola_id INTEGER NOT NULL, -- Populado baseado no produto/estoque
    tenant_id UUID NOT NULL, -- Populado baseado na escola
);
```

### Lógica de Atribuição de Tenant

1. **estoque_escolas**: `tenant_id` copiado da tabela `escolas`
2. **estoque_lotes**: 
   - `escola_id` populado baseado em `estoque_escolas` com mesmo `produto_id`
   - `tenant_id` copiado da tabela `escolas` usando `escola_id`
3. **estoque_escolas_historico**: `tenant_id` copiado da tabela `escolas`
4. **estoque_movimentacoes**: `tenant_id` copiado da tabela `estoque_lotes`

### Índices Criados

```sql
-- Índices compostos para performance
CREATE INDEX idx_estoque_escolas_tenant_escola_produto 
ON estoque_escolas(tenant_id, escola_id, produto_id);

CREATE INDEX idx_estoque_lotes_tenant_escola_produto 
ON estoque_lotes(tenant_id, escola_id, produto_id);

CREATE INDEX idx_estoque_lotes_tenant_validade_ativo 
ON estoque_lotes(tenant_id, data_validade) 
WHERE data_validade IS NOT NULL AND status = 'ativo';

CREATE INDEX idx_estoque_historico_tenant_escola_data 
ON estoque_escolas_historico(tenant_id, escola_id, data_movimentacao);

CREATE INDEX idx_estoque_movimentacoes_tenant_lote_data 
ON estoque_movimentacoes(tenant_id, lote_id, data_movimentacao);
```

### Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE estoque_escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento
CREATE POLICY tenant_isolation_estoque_escolas ON estoque_escolas
    FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_estoque_lotes ON estoque_lotes
    FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_estoque_historico ON estoque_escolas_historico
    FOR ALL USING (tenant_id = get_current_tenant_id());

CREATE POLICY tenant_isolation_estoque_movimentacoes ON estoque_movimentacoes
    FOR ALL USING (tenant_id = get_current_tenant_id());
```

## Problemas Comuns e Soluções

### 1. Coluna escola_id Faltando em estoque_lotes

**Problema**: Tabela `estoque_lotes` não tem coluna `escola_id`

**Solução**: A migração adiciona automaticamente a coluna e popula baseado em `estoque_escolas`

```sql
-- Adicionado automaticamente pela migração
ALTER TABLE estoque_lotes ADD COLUMN escola_id INTEGER;
ALTER TABLE estoque_lotes ADD CONSTRAINT estoque_lotes_escola_id_fkey 
    FOREIGN KEY (escola_id) REFERENCES escolas(id);
```

### 2. Movimentações Órfãs

**Problema**: Registros em `estoque_movimentacoes` referenciam lotes inexistentes

**Solução**: A migração remove automaticamente movimentações órfãs

```sql
-- Limpeza automática
DELETE FROM estoque_movimentacoes 
WHERE lote_id NOT IN (SELECT id FROM estoque_lotes);
```

### 3. Produtos Sem Tenant

**Problema**: Produtos não têm `tenant_id` definido

**Solução**: A migração atribui ao tenant padrão

```sql
-- Atribuição automática
UPDATE produtos 
SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE tenant_id IS NULL;
```

### 4. Performance Degradada

**Problema**: Consultas lentas após migração

**Soluções**:
- Verificar se índices foram criados corretamente
- Analisar planos de execução com `EXPLAIN ANALYZE`
- Ajustar configurações do PostgreSQL se necessário

```sql
-- Verificar índices
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename LIKE 'estoque_%' AND indexname LIKE '%tenant%';

-- Analisar consulta
EXPLAIN ANALYZE SELECT * FROM estoque_escolas WHERE tenant_id = 'uuid-here';
```

## Rollback

### Quando Fazer Rollback

- Falha na validação pós-migração
- Problemas de performance críticos
- Inconsistências de dados detectadas
- Falhas na aplicação após migração

### Processo de Rollback

#### 1. Rollback Automatizado
```bash
# Rollback completo
node run-inventory-tenant-migration.js --rollback --verbose
```

#### 2. Rollback Manual
```bash
# Editar o script para permitir execução
# Comentar a linha: RAISE EXCEPTION 'ROLLBACK BLOQUEADO...';
psql -d gestao_escolar -f scripts/rollback-inventory-tenant-migration.sql
```

#### 3. Restauração de Backup
```bash
# Se rollback falhar, restaurar backup completo
psql -d gestao_escolar < backup_pre_migration_YYYYMMDD_HHMMSS.sql
```

### Verificação Pós-Rollback

```bash
# Verificar estado após rollback
psql -d gestao_escolar -f scripts/verify-inventory-referential-integrity.sql

# Testar aplicação
# Executar testes de funcionalidade
```

## Monitoramento e Manutenção

### Métricas a Acompanhar

1. **Performance de Consultas**
   - Tempo de resposta das consultas de estoque
   - Uso de índices tenant-aware
   - Planos de execução otimizados

2. **Integridade de Dados**
   - Consistência de `tenant_id` entre tabelas relacionadas
   - Ausência de registros órfãos
   - Validação de foreign keys

3. **Isolamento de Tenant**
   - Verificação de que RLS está funcionando
   - Testes de acesso cross-tenant
   - Auditoria de acessos

### Scripts de Monitoramento

```sql
-- Verificar distribuição por tenant
SELECT 
    t.slug,
    COUNT(ee.*) as estoque_escolas,
    COUNT(el.*) as estoque_lotes
FROM tenants t
LEFT JOIN estoque_escolas ee ON ee.tenant_id = t.id
LEFT JOIN estoque_lotes el ON el.tenant_id = t.id
GROUP BY t.id, t.slug;

-- Verificar performance de consultas
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%estoque_%' 
ORDER BY mean_time DESC;
```

## Checklist de Migração

### Pré-Migração
- [ ] Backup completo realizado
- [ ] Backup testado em ambiente de desenvolvimento
- [ ] Testes automatizados executados com sucesso
- [ ] Janela de manutenção agendada
- [ ] Usuários notificados
- [ ] Aplicações paradas

### Durante a Migração
- [ ] Migração executada sem erros
- [ ] Logs verificados
- [ ] Validação imediata passou
- [ ] Integridade referencial verificada

### Pós-Migração
- [ ] Aplicações reiniciadas
- [ ] Testes funcionais executados
- [ ] Performance verificada
- [ ] Monitoramento ativado
- [ ] Usuários notificados da conclusão

### Em Caso de Problemas
- [ ] Rollback executado
- [ ] Backup restaurado (se necessário)
- [ ] Causa raiz identificada
- [ ] Plano de correção definido
- [ ] Nova tentativa agendada

## Suporte e Troubleshooting

### Logs Importantes

1. **Logs da Migração**
   - Saída do script de migração
   - Logs do PostgreSQL durante execução
   - Resultados da validação

2. **Logs da Aplicação**
   - Erros relacionados a estoque após migração
   - Consultas SQL com problemas
   - Timeouts ou performance degradada

### Comandos Úteis

```bash
# Verificar status das tabelas
psql -d gestao_escolar -c "
SELECT 
    schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'estoque_%';
"

# Verificar políticas RLS
psql -d gestao_escolar -c "
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename LIKE 'estoque_%';
"

# Verificar índices
psql -d gestao_escolar -c "
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename LIKE 'estoque_%' AND indexname LIKE '%tenant%';
"
```

### Contatos de Suporte

- **Equipe de Desenvolvimento**: [email/slack]
- **DBA**: [email/slack]
- **DevOps**: [email/slack]
- **Documentação**: Este arquivo e comentários no código

---

**Importante**: Este documento deve ser atualizado conforme mudanças no processo de migração ou descoberta de novos cenários.