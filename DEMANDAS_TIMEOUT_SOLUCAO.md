# Solução para Timeout em Demandas

## Problema
As requisições para `/api/demandas` e `/api/demandas/solicitantes` estão dando timeout de 30 segundos.

## Diagnóstico Realizado

### ✅ Banco de Dados - OK
- Queries diretas no banco executam em < 30ms
- Índices criados e otimizados (12 índices na tabela demandas)
- RLS desabilitado para melhor performance

### ✅ Model - OK  
- Queries otimizadas
- Placeholders SQL corrigidos
- Cálculo de dias simplificado

### ❌ Middleware - PROBLEMA
- `tenantMiddleware` está travando
- Timeout ocorre mesmo com autenticação válida
- Problema está no `tenantResolver` ou nas queries do middleware

## Otimizações Aplicadas

1. **Índices no Banco** (migration 023)
   - idx_demandas_tenant_data_solicitacao
   - idx_demandas_tenant_created_at
   - idx_demandas_tenant_status
   - idx_demandas_tenant_escola_id
   - idx_escolas_id_tenant
   - idx_usuarios_id

2. **RLS Desabilitado**
   - Removidas políticas duplicadas
   - Validação de tenant_id feita no código

3. **Controller Otimizado**
   - Removida chamada a `setTenantContextFromRequest`
   - Logs adicionados para debug

4. **Middleware Simplificado**
   - `setDatabaseTenantContext` desabilitado
   - Busca de usuário no banco removida

## Próximos Passos

### Solução Temporária (Rápida)
Desabilitar o `tenantMiddleware` nas rotas de demandas:

```typescript
// backend/src/modules/demandas/routes/demandaRoutes.ts
router.use(authenticateToken);
// router.use(tenantMiddleware); // DESABILITAR TEMPORARIAMENTE

// Validar tenant_id manualmente no controller
```

### Solução Definitiva (Recomendada)
1. Investigar `tenantResolver.resolve()` - pode estar fazendo queries lentas
2. Adicionar cache para resolução de tenants
3. Adicionar timeout nas queries do middleware
4. Considerar usar Redis para cache de sessão/tenant

## Comandos para Testar

```bash
# Testar query direta no banco
node backend/test-demandas-performance.js

# Testar API com autenticação
node backend/test-demandas-with-auth.js

# Verificar locks no banco
node backend/check-database-locks.js
```

## Arquivos Modificados

- `backend/migrations/023_optimize_demandas_performance.sql`
- `backend/src/modules/demandas/models/demandaModel.ts`
- `backend/src/modules/demandas/controllers/demandaController.ts`
- `backend/src/middleware/tenantMiddleware.ts`
- `backend/fix-demandas-rls.js`
- `frontend/src/config/api.ts` (timeout aumentado para 30s)
