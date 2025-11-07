# Sessão de Correções - Sistema Multi-Tenant

## Data: 08/01/2025

## Problemas Identificados e Corrigidos

### 1. ✅ Tabela `tenant_users` não existia
**Problema:** Erro "relation tenant_users does not exist"
**Solução:** 
- Criado script `criar-tabela-tenant-users.js`
- Tabela criada com colunas: id, tenant_id, user_id, role, status, created_at, updated_at
- 6 associações criadas (4 usuários associados ao Sistema Principal)

### 2. ✅ Coluna `t.ativo` não existia na tabela tenants
**Problema:** Erro "column t.ativo does not exist"
**Solução:**
- Corrigido userController.ts: `t.ativo` → `t.status`
- Corrigido debugLoginController.ts: `t.ativo` → `t.status`
- Condição alterada de `t.ativo = true` para `t.status = 'active'`

### 3. ✅ JWT_SECRET inconsistente
**Problema:** Token gerado no login não era aceito em outros endpoints
**Arquivos corrigidos:**
- `backend/src/middlewares/devAuthMiddleware.ts`
- `backend/src/modules/usuarios/controllers/debugLoginController.ts`
- `backend/src/services/tenantResolver.ts`
- `backend/src/middleware/tenantMiddleware.ts`
- `backend/src/modules/usuarios/controllers/userController.ts`

**Solução:** Todos agora usam `config.jwtSecret` em vez de hardcoded strings

### 4. ✅ Queries do tenantService usando coluna errada
**Problema:** Queries selecionavam `name` mas a coluna é `nome`
**Solução:**
- Corrigido `getTenant()`: `nome as name`
- Corrigido `getTenantBySlug()`: `nome as name`
- Corrigido `getTenantBySubdomain()`: `nome as name`
- Corrigido `listTenants()`: `nome as name`

### 5. ✅ availableTenants não sendo salvos/carregados
**Problema:** Dropdown de tenants vazio
**Solução:**
- `frontend/src/pages/Login.tsx`: Salvar availableTenants no localStorage
- `frontend/src/context/TenantContext.tsx`: Carregar tenants no mount do componente

### 6. ✅ Login fazendo logout automático
**Problema:** Após login, sistema voltava para tela de login
**Causa:** JWT_SECRET inconsistente fazia `/usuarios/me` retornar 401
**Solução:** Corrigido JWT_SECRET (item 3)

## Tenants Criados

1. **Sistema Principal** (00000000-0000-0000-0000-000000000000)
   - Slug: sistema-principal
   - Status: active
   - Usuário: Ewerton Nunes (manager)

2. **SEMED** (1e43f397-76ce-4f24-85c1-c896cacbad4a)
   - Slug: semed
   - Nome: SEMED - Secretaria Municipal de Educação
   - Status: active
   - Usuário: Ewerton Nunes (admin)

3. **Escola Municipal João Silva** (d0faf565-e71e-4161-854f-471594135c7f)
   - Slug: escola-joao-silva
   - Status: active
   - Usuário: Ewerton Nunes (manager)

## Scripts Criados

1. `criar-tabela-tenant-users.js` - Cria tabela e associações
2. `criar-tenant-semed.js` - Cria tenants SEMED e Escola
3. `verificar-tenants.js` - Lista todos os tenants e associações
4. `verificar-tenant-id.js` - Verifica se um tenant específico existe
5. `resetar-senha.js` - Reseta senha de usuário
6. `criar-tenant.js` - Script genérico para criar tenants

## Status Atual

### ✅ Funcionando:
- Login sem logout automático
- Carregamento de tenants no localStorage
- Dropdown de tenants aparece com 3 opções
- Token JWT válido em todos os endpoints
- `/usuarios/me` retorna dados do usuário

### ❌ Pendente:
- Switch de tenant retorna 404 "Tenant não encontrado"
- Investigando se `tenantService.getTenant()` está funcionando corretamente

## Próximos Passos

1. Verificar logs do `tenantService.getTenant()` na Vercel
2. Confirmar que as queries estão usando `nome as name`
3. Testar switch de tenant após correções

## Credenciais de Teste

- **Email:** ewenunes0@gmail.com
- **Senha:** @Nunes8922
- **Tipo:** gestor
- **Tenants:** 3 (Sistema Principal, SEMED, Escola Municipal)


## 7. ✅ CORREÇÃO CRÍTICA: Tenant Resolver

### Problema Identificado
**Erro:** "TENANT_NOT_FOUND" mesmo com header X-Tenant-ID e token JWT corretos

**Causa Raiz:**
- O JWT estava sendo gerado com `tenant` (objeto completo) no payload
- O `tenantResolver.resolveByToken()` estava procurando por `decoded.tenant_id` (campo inexistente)
- Resultado: tenant NUNCA era resolvido do token JWT

### Correções Aplicadas

#### 1. `backend/src/services/tenantResolver.ts` - resolveByToken()
```typescript
// ANTES (ERRADO):
if (!decoded.tenant_id) {
  return null;
}
return await this.resolveByHeader(decoded.tenant_id);

// DEPOIS (CORRETO):
const tenantId = decoded.tenant?.id || decoded.tenant_id;
if (!tenantId) {
  console.log('⚠️ Token JWT não contém informação de tenant');
  return null;
}
console.log('🔍 Resolvendo tenant do token:', tenantId);
return await this.resolveByHeader(tenantId);
```

#### 2. `backend/src/services/tenantResolver.ts` - resolveByHeader()
- Adicionados logs detalhados para rastrear a resolução
- Busca por slug primeiro, depois por UUID
- Melhor tratamento de erros e feedback

#### 3. `backend/src/middleware/tenantMiddleware.ts`
- Adicionados logs nas tentativas de resolução por header e token
- Melhor visibilidade do fluxo de resolução

### Como Testar
```bash
node testar-tenant-resolver.js
```

Este script testa:
1. Login e obtenção do token
2. Resolução por header X-Tenant-ID para cada tenant
3. Resolução apenas por token (sem header)

### Status Esperado
- ✅ Resolução por header X-Tenant-ID deve funcionar
- ✅ Resolução por token JWT deve funcionar
- ✅ API de escolas deve retornar dados corretamente
- ✅ Switch de tenant deve funcionar no frontend
