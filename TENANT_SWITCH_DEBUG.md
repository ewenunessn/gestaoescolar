# Debug: Tenant Switch Error

## Problema
Ao fazer login, a Brenda consegue autenticar mas:
1. ❌ Não carrega os tenants inicialmente (precisa dar refresh)
2. ❌ Ao selecionar um tenant, dá erro "Tenant não encontrado" (404)

## Investigação

### 1. Token JWT ✅
O token está correto e contém:
```json
{
  "id": 7,
  "institution_id": "069c3667-4279-4d63-b771-bb2bc1c9d833",
  "tenant": {
    "id": "1e7141a9-9298-40a4-baba-828aab9254ad",
    "slug": "testefix",
    "name": "Teste Fix"
  },
  "tenants": [...]
}
```

### 2. Tenant no Banco ✅
O tenant existe no banco Neon:
```sql
SELECT * FROM tenants WHERE id = '1e7141a9-9298-40a4-baba-828aab9254ad';
-- Retorna: Teste Fix, status=active, institution_id correto
```

### 3. Endpoint `/tenants/switch` ❌
Ao chamar o endpoint com o tenant ID válido, retorna 404:
```
POST /api/tenants/switch
Body: { "tenantId": "1e7141a9-9298-40a4-baba-828aab9254ad" }
Response: 404 - "Tenant não encontrado"
```

### 4. Causa Raiz
O método `tenantService.getTenant(tenantId)` está retornando `null` no Vercel, mesmo com o tenant existindo no banco.

Possíveis causas:
- ❓ Backend no Vercel não foi atualizado com as correções
- ❓ Problema de conexão com o banco Neon no Vercel
- ❓ Query SQL falhando silenciosamente

## Solução Aplicada

### 1. Correção do `institution_id` da Brenda ✅
```javascript
// Antes: institution_id = '00000000-0000-0000-0000-000000000001' (inválido)
// Depois: institution_id = '069c3667-4279-4d63-b771-bb2bc1c9d833' (válido)
```

### 2. Logs Adicionais no Backend
Adicionei logs detalhados em `tenantSwitchController.switchTenant()`:
- Tipo do tenantId
- Dados do usuário
- Lista de tenants disponíveis (para debug)

### 3. Deploy do Backend
```bash
git add backend/src/controllers/tenantSwitchController.ts
git commit -m "Add debug logs to tenant switch endpoint"
git push
# Vercel vai fazer deploy automático
```

## Próximos Passos

1. ⏳ Aguardar deploy do Vercel terminar (2-3 minutos)
2. 🧪 Testar novamente o endpoint `/tenants/switch`
3. 📋 Verificar logs do Vercel para entender por que `getTenant()` retorna null
4. 🔧 Corrigir o problema identificado nos logs

## Teste Manual

```bash
# Após deploy, testar:
node backend/test-switch-tenant.js
```

Deve retornar sucesso ao invés de 404.
