# Correção Completa do Problema da Brenda

## Problemas Identificados

### 1. ❌ `institution_id` Inválido no Banco
**Problema:** A Brenda foi criada pelo painel admin com `institution_id = '00000000-0000-0000-0000-000000000001'` (UUID placeholder inválido)

**Solução:** ✅
```sql
UPDATE usuarios 
SET institution_id = '069c3667-4279-4d63-b771-bb2bc1c9d833'
WHERE email = 'ewertonsolon@gmail.com';

INSERT INTO institution_users (institution_id, user_id, role, status)
VALUES ('069c3667-4279-4d63-b771-bb2bc1c9d833', 7, 'institution_admin', 'active');
```

### 2. ❌ Endpoint `/usuarios/me` Não Retornava `institution_id`
**Problema:** O frontend chama `/usuarios/me` para pegar dados do usuário, mas o endpoint não retornava o `institution_id`

**Código Antes:**
```typescript
SELECT id, nome, email, tipo, ativo, created_at, updated_at
FROM usuarios WHERE id = $1
```

**Código Depois:** ✅
```typescript
SELECT id, nome, email, tipo, ativo, institution_id, created_at, updated_at
FROM usuarios WHERE id = $1
```

### 3. ❌ Endpoint `/tenants/switch` Retornando 404
**Problema:** O `tenantService.getTenant()` estava retornando `null` no Vercel

**Solução Temporária:** ✅
- Frontend agora troca de tenant apenas atualizando o `localStorage` e recarregando a página
- Não depende mais do endpoint `/tenants/switch` que está com bug

**Código:**
```typescript
// Salvar o tenantId no localStorage
localStorage.setItem('currentTenantId', tenantId);

// Atualizar o estado local
setCurrentTenant(selectedTenant);

// Recarregar a página
window.location.reload();
```

## Arquivos Modificados

### Backend
1. `backend/src/modules/usuarios/controllers/userController.ts`
   - Adicionado `institution_id` ao SELECT do endpoint `/usuarios/me`

2. `backend/src/controllers/tenantSwitchController.ts`
   - Adicionados logs de debug para investigar o problema do 404

### Frontend
1. `frontend/src/context/TenantContext.tsx`
   - Modificado `switchTenant()` para não chamar o backend
   - Usa apenas localStorage + reload

## Scripts Criados

1. `backend/fix-brenda-institution.js` - Corrigiu o `institution_id` da Brenda
2. `backend/test-brenda-login.js` - Testa o login e verifica o token
3. `backend/test-switch-tenant.js` - Testa o endpoint de switch
4. `backend/test-resolve-tenant.js` - Testa o endpoint de resolve
5. `backend/check-tenant-id.js` - Verifica se o tenant existe no banco

## Resultado Final

✅ **Token JWT Correto:**
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

✅ **Endpoint `/usuarios/me` Retorna:**
```json
{
  "id": 7,
  "nome": "Brenda",
  "email": "ewertonsolon@gmail.com",
  "tipo": "admin",
  "institution_id": "069c3667-4279-4d63-b771-bb2bc1c9d833",
  "ativo": true
}
```

✅ **Frontend Consegue:**
- Carregar o usuário com `institution_id`
- Filtrar tenants pela instituição
- Trocar de tenant (via localStorage)
- Acessar as funcionalidades do sistema

## Deploy

```bash
# Backend
git add backend/src/modules/usuarios/controllers/userController.ts
git commit -m "Fix: Add institution_id to /usuarios/me endpoint"
git push

# Frontend
git add frontend/src/context/TenantContext.tsx
git commit -m "Fix tenant switch - use localStorage instead of broken backend endpoint"
git push
```

Vercel fará deploy automático em ~2-3 minutos.

## Teste Final

Após o deploy, a Brenda deve:
1. Fazer logout
2. Fazer login novamente
3. Ver o tenant "Teste Fix" carregado automaticamente
4. Conseguir acessar escolas e outras funcionalidades

## Problema Pendente

⚠️ O endpoint `/tenants/switch` ainda retorna 404. Isso precisa ser investigado nos logs do Vercel, mas não bloqueia o uso do sistema pois implementamos uma solução alternativa no frontend.
