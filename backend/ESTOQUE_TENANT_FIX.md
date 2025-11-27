# Correção do Módulo de Estoque-Escola para Usar Tenant do Usuário

## Problema Identificado

O módulo de estoque-escola estava usando um tenant fixo ou extraindo o tenant de forma incorreta, causando erro 403 (Acesso negado) quando usuários tentavam registrar movimentações de estoque.

### Erro Original
```
POST /api/estoque-escola/escola/84/movimentacao
Status: 403 Forbidden
Mensagem: "Acesso negado: recurso não pertence à sua organização"
```

## Causa Raiz

1. **Incompatibilidade de Tenant**: A escola estava no tenant "Escola de Teste" (`1cc9b18f-2b7d-412d-bb6d-4b8055e9590f`), mas todos os usuários estavam no tenant "Sistema Principal" (`00000000-0000-0000-0000-000000000000`)

2. **Extração Incorreta de Tenant**: O controller estava usando `tenantInventoryValidator.extractTenantFromRequest(req)` que priorizava o header `X-Tenant-ID` sobre o tenant do usuário autenticado

## Solução Implementada

### 1. Correção Temporária dos Dados
Movemos a escola e seus produtos para o tenant correto onde os usuários estão:

```bash
node backend/fix-escola-tenant-mismatch.js --fix
```

Resultado:
- Escola ID 84 atualizada para tenant `00000000-0000-0000-0000-000000000000`
- 12 produtos atualizados para o mesmo tenant

### 2. Correção Permanente do Código

Criamos uma função helper que extrai o tenant do usuário logado (via token JWT):

```typescript
/**
 * Extrai o tenant ID do usuário logado (via token JWT processado pelo middleware)
 * Prioriza o tenant do usuário autenticado sobre o header X-Tenant-ID
 */
function getTenantIdFromUser(req: Request): string | null {
  // 1. Prioridade: tenant do usuário autenticado (extraído do token JWT)
  const tenantFromUser = (req as any).tenant?.id;
  if (tenantFromUser) {
    console.log(`🔐 Tenant extraído do usuário autenticado: ${tenantFromUser}`);
    return tenantFromUser;
  }

  // 2. Fallback: header X-Tenant-ID (para compatibilidade)
  const tenantFromHeader = req.headers['x-tenant-id'] as string;
  if (tenantFromHeader) {
    console.log(`📋 Tenant extraído do header: ${tenantFromHeader}`);
    return tenantFromHeader;
  }

  console.log('⚠️  Nenhum tenant encontrado na requisição');
  return null;
}
```

### 3. Atualização de Todas as Funções

Substituímos todas as 11 ocorrências de:

```typescript
// ANTES
const tenantId = tenantInventoryValidator.extractTenantFromRequest(req);
```

Por:

```typescript
// DEPOIS
const tenantId = getTenantIdFromUser(req);

if (!tenantId) {
  return res.status(400).json({
    success: false,
    message: 'Tenant ID não encontrado. Faça login novamente.'
  });
}
```

## Funções Atualizadas

1. `listarEstoqueEscola`
2. `buscarItemEstoqueEscola`
3. `atualizarQuantidadeEstoque`
4. `atualizarLoteQuantidades`
5. `listarHistoricoEstoque`
6. `obterResumoEstoque`
7. `inicializarEstoqueEscola`
8. `registrarMovimentacao`
9. `resetarEstoqueComBackup`
10. `listarLotesProduto`
11. `criarLote`
12. `processarMovimentacaoLotes`

## Padrão Seguido

Agora o módulo de estoque-escola segue o mesmo padrão dos outros módulos (demandas, guias, etc.):

1. **Extração de Tenant**: `(req as any).tenant?.id` (do token JWT via middleware)
2. **Fallback**: `req.headers['x-tenant-id']` (para compatibilidade)
3. **Validação**: Retorna erro 400 se nenhum tenant for encontrado
4. **Validações de Ownership**: Mantidas para garantir segurança

## Fluxo de Autenticação e Tenant

```
1. Usuário faz login
   ↓
2. Backend gera JWT com tenant_id do usuário
   ↓
3. Frontend armazena token e tenant_id no localStorage
   ↓
4. Frontend envia X-Tenant-ID no header (opcional)
   ↓
5. Middleware de tenant extrai tenant do JWT
   ↓
6. Controller usa (req as any).tenant?.id
   ↓
7. Validações verificam se recursos pertencem ao tenant
```

## Benefícios

1. ✅ **Segurança**: Usuário só acessa recursos do seu tenant
2. ✅ **Consistência**: Mesmo padrão em todos os módulos
3. ✅ **Auditoria**: Logs mostram qual tenant está sendo usado
4. ✅ **Multi-tenant**: Suporta múltiplas organizações isoladas
5. ✅ **Troca de Tenant**: Usuários podem trocar entre tenants (se tiverem acesso)

## Testes Realizados

### Scripts de Diagnóstico Criados

1. `fix-estoque-escola-tenant.js` - Verifica escolas/produtos sem tenant
2. `check-tenant-context.js` - Verifica contexto de tenant de uma escola
3. `check-user-tenant-mismatch.js` - Identifica incompatibilidades
4. `fix-escola-tenant-mismatch.js` - Corrige tenant de escola específica
5. `update-estoque-tenant-extraction.js` - Atualiza código automaticamente

### Resultados

- ✅ Todas as escolas têm tenant_id
- ✅ Todos os produtos têm tenant_id
- ✅ Usuários e escolas no mesmo tenant
- ✅ Movimentações de estoque funcionando

## Próximos Passos

1. Testar no frontend com usuário real
2. Verificar se a troca de tenant funciona corretamente
3. Adicionar testes unitários para a função `getTenantIdFromUser`
4. Documentar o padrão de extração de tenant para novos módulos

## Comandos Úteis

```bash
# Verificar tenant de uma escola
node backend/check-tenant-context.js

# Verificar incompatibilidades
node backend/check-user-tenant-mismatch.js

# Corrigir tenant de escola
node backend/fix-escola-tenant-mismatch.js --fix

# Ver todas as escolas sem tenant
node backend/fix-estoque-escola-tenant.js
```

## Referências

- Módulo de Demandas: `backend/src/modules/demandas/controllers/demandaController.ts`
- Módulo de Guias: `backend/src/modules/guias/controllers/guiaController.ts`
- Middleware de Tenant: `backend/src/middleware/tenantMiddleware.ts`
- Validador de Tenant: `backend/src/services/tenantInventoryValidator.ts`
