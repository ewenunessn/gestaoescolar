# Sistema de Otimização de Performance Multi-Tenant

Este documento descreve as otimizações de performance implementadas para o sistema multi-tenant, incluindo cache, connection pooling, queries otimizadas e monitoramento.

## 📋 Resumo das Implementações

### ✅ Implementado com Sucesso

1. **Sistema de Cache Redis Multi-Tenant** (`src/utils/tenantCache.ts`)
   - Cache com prefixos de tenant para isolamento completo
   - Suporte a TTL configurável por chave
   - Operações batch (mget/mset) para performance
   - Invalidação por padrões (wildcards)
   - Estatísticas de hit rate e performance

2. **Connection Pool com Contexto de Tenant** (`src/utils/tenantConnectionPool.ts`)
   - Pool de conexões otimizado para multi-tenancy
   - Configuração automática de contexto RLS por tenant
   - Suporte a transações e batch queries
   - Monitoramento de performance por tenant
   - Estatísticas detalhadas de uso

3. **Queries Otimizadas Multi-Tenant** (`src/utils/tenantOptimizedQueries.ts`)
   - Queries pré-otimizadas para operações frequentes
   - Cache automático integrado
   - Paginação eficiente
   - Agregações otimizadas para relatórios
   - Invalidação inteligente de cache

4. **Middleware de Monitoramento** (`src/middleware/tenantPerformanceMiddleware.ts`)
   - Coleta automática de métricas por tenant
   - Detecção de queries lentas
   - Alertas de performance configuráveis
   - Estatísticas de endpoints mais utilizados

5. **Índices de Performance** (`migrations/006_optimize_tenant_indexes_safe.sql`)
   - 31 índices otimizados criados
   - Índices compostos para queries multi-tenant
   - Índices específicos para operações de estoque
   - Otimizações para histórico e auditoria

6. **Views Materializadas** 
   - `mv_estoque_resumo_performance`: Resumo otimizado de estoque
   - `mv_estatisticas_performance`: Estatísticas gerais do sistema
   - Refresh automático configurável

7. **API de Monitoramento** (`src/routes/tenantPerformanceRoutes.ts`)
   - Endpoints para métricas por tenant
   - Alertas de performance em tempo real
   - Estatísticas do sistema
   - Controle de cache e otimizações

## 🚀 Como Usar

### Configuração Inicial

1. **Configure Redis (Opcional mas Recomendado)**:
```bash
# No arquivo .env
REDIS_HOST=localhost
REDIS_PORT=6379
# ou
REDIS_URL=redis://localhost:6379
```

2. **Execute as Otimizações**:
```bash
npm run optimize:performance
```

3. **Teste as Implementações**:
```bash
npm run test:performance-simple
```

### Uso do Cache Multi-Tenant

```typescript
import { tenantCache } from './src/utils/tenantCache';

// Armazenar dados
await tenantCache.set('tenant-id', 'chave', dados, { ttl: 300 });

// Recuperar dados
const dados = await tenantCache.get('tenant-id', 'chave');

// Cache com callback automático
const resultado = await tenantCache.getOrSet(
  'tenant-id', 
  'chave', 
  async () => await buscarDados(),
  { ttl: 600 }
);
```

### Uso do Connection Pool

```typescript
import { tenantConnectionPool } from './src/utils/tenantConnectionPool';

// Query simples
const result = await tenantConnectionPool.query(
  'tenant-id',
  'SELECT * FROM escolas WHERE ativo = true',
  []
);

// Transação
const resultado = await tenantConnectionPool.transaction('tenant-id', async (client) => {
  await client.query('INSERT INTO ...');
  await client.query('UPDATE ...');
  return { success: true };
});
```

### Uso das Queries Otimizadas

```typescript
import { tenantOptimizedQueries } from './src/utils/tenantOptimizedQueries';

// Listar escolas com cache
const escolas = await tenantOptimizedQueries.getEscolasByTenant({
  tenantId: 'tenant-id',
  page: 1,
  limit: 20,
  useCache: true,
  cacheTTL: 300
});

// Estatísticas do tenant
const stats = await tenantOptimizedQueries.getEstatisticasByTenant({
  tenantId: 'tenant-id',
  useCache: true
});
```

## 📊 Endpoints de Monitoramento

### Métricas por Tenant
- `GET /api/performance/tenant/:id/metrics` - Métricas específicas do tenant
- `GET /api/performance/tenant/:id/cache-stats` - Estatísticas de cache
- `POST /api/performance/tenant/:id/cache/clear` - Limpar cache do tenant

### Métricas Globais
- `GET /api/performance/tenants` - Métricas de todos os tenants
- `GET /api/performance/alerts` - Alertas de performance
- `GET /api/performance/system` - Estatísticas do sistema
- `GET /api/performance/connection-pool` - Stats do pool de conexões

### Otimizações
- `POST /api/performance/optimize/materialized-views` - Atualizar views
- `POST /api/performance/optimize/analyze-tables` - Analisar tabelas
- `GET /api/performance/database/health` - Saúde do banco

## 📈 Resultados Obtidos

### Índices Criados
- **31 índices de performance** otimizados para queries frequentes
- Índices compostos para operações multi-tenant
- Cobertura completa para tabelas críticas (escolas, produtos, estoque)

### Views Materializadas
- **2 views materializadas** para consultas complexas
- Redução significativa no tempo de resposta para relatórios
- Refresh automático configurável

### Cache Redis
- Isolamento completo por tenant
- Suporte a operações batch
- Invalidação inteligente por padrões
- Estatísticas de performance em tempo real

### Connection Pool
- Pool otimizado com contexto de tenant
- Monitoramento de performance por query
- Suporte a transações complexas
- Estatísticas detalhadas de uso

## 🔧 Configurações Recomendadas

### PostgreSQL
```sql
-- Configurações otimizadas para multi-tenancy
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 8MB
maintenance_work_mem = 128MB
random_page_cost = 1.1
```

### Redis
```bash
# Configuração básica para cache
maxmemory 512mb
maxmemory-policy allkeys-lru
```

### Aplicação
```env
# Pool de conexões
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000

# Cache
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_DEFAULT_TTL=300
```

## 🚨 Alertas e Monitoramento

### Alertas Automáticos
- **Queries Lentas**: > 1000ms
- **Cache Hit Rate Baixo**: < 50%
- **Tempo de Resposta Alto**: > 500ms
- **Pool de Conexões Saturado**: > 80% de uso

### Métricas Coletadas
- Tempo de resposta por endpoint
- Hit rate do cache por tenant
- Uso do pool de conexões
- Queries mais lentas por tenant
- Estatísticas de uso por funcionalidade

## 🔄 Manutenção

### Tarefas Periódicas
```bash
# Atualizar views materializadas (recomendado: a cada hora)
SELECT refresh_performance_materialized_views();

# Analisar tabelas (recomendado: diariamente)
ANALYZE escolas, produtos, estoque_escolas, usuarios;

# Limpar cache antigo (automático, mas pode ser manual)
# Via API: POST /api/performance/tenant/:id/cache/clear
```

### Scripts Disponíveis
- `npm run optimize:performance` - Aplicar todas as otimizações
- `npm run test:performance-simple` - Testar otimizações básicas
- `npm run test:performance` - Teste completo (requer Redis)

## 📚 Arquivos Principais

### Implementação
- `src/utils/tenantCache.ts` - Sistema de cache Redis
- `src/utils/tenantConnectionPool.ts` - Pool de conexões otimizado
- `src/utils/tenantOptimizedQueries.ts` - Queries pré-otimizadas
- `src/middleware/tenantPerformanceMiddleware.ts` - Monitoramento
- `src/routes/tenantPerformanceRoutes.ts` - API de performance

### Migrações
- `migrations/006_optimize_tenant_indexes_safe.sql` - Índices e views
- `run-tenant-performance-optimization.js` - Script de aplicação

### Testes
- `test-tenant-performance-simple.js` - Testes básicos
- `test-tenant-performance.js` - Testes completos

## 🎯 Próximos Passos

1. **Configure Redis** para cache distribuído
2. **Monitore alertas** via `/api/performance/alerts`
3. **Ajuste configurações** do PostgreSQL conforme carga
4. **Implemente refresh automático** das views materializadas
5. **Configure alertas externos** (email, Slack) para problemas críticos

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs de performance via API
2. Execute os testes de diagnóstico
3. Consulte as métricas em tempo real
4. Revise as configurações do banco de dados

---

**Status**: ✅ **Implementado e Testado**  
**Versão**: 1.0.0  
**Data**: Novembro 2024