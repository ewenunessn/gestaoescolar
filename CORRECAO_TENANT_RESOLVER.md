# 🔧 Correção Crítica: Tenant Resolver

## Problema
Sistema retornava "TENANT_NOT_FOUND" mesmo com header X-Tenant-ID e token JWT corretos.

## Causa Raiz
O JWT continha `tenant` (objeto), mas o resolver procurava por `decoded.tenant_id` (inexistente).

## Correção
**Arquivo:** `backend/src/services/tenantResolver.ts`

```typescript
// Linha ~120 - resolveByToken()
const tenantId = decoded.tenant?.id || decoded.tenant_id;
```

Agora suporta ambos os formatos: novo (`tenant.id`) e antigo (`tenant_id`).

## Arquivos Modificados
1. `backend/src/services/tenantResolver.ts` - Correção principal + logs
2. `backend/src/middleware/tenantMiddleware.ts` - Logs adicionais

## Testar
```bash
node testar-tenant-resolver.js
```

## Resultado Esperado
✅ Resolução por header funciona  
✅ Resolução por token funciona  
✅ API de escolas retorna dados  
✅ Switch de tenant funciona
