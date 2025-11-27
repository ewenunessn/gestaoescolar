# 🔧 Correção: Rotas Duplicadas de Demandas

## ❌ Problema Identificado

As demandas estavam aparecendo para todos os tenants porque havia **duas rotas** `/api/demandas` registradas no servidor:

1. **Rota ANTIGA** (linha 257): `demandaRoutes` do módulo `estoque`
   - ❌ SEM filtro de tenant
   - ❌ SEM autenticação
   - ❌ SEM middleware de tenant

2. **Rota NOVA** (linha 272): `demandasRoutes` do módulo `demandas`
   - ✅ COM filtro de tenant
   - ✅ COM autenticação
   - ✅ COM middleware de tenant

A rota antiga estava sendo registrada **primeiro**, então ela era a que respondia às requisições, ignorando completamente o isolamento de tenant.

## ✅ Solução Aplicada

### Arquivo: `backend/src/index.ts`

**Removido:**
```typescript
import demandaRoutes from "./modules/estoque/routes/demandaRoutes";
// ...
app.use("/api/demandas", demandaRoutes);
```

**Mantido:**
```typescript
import demandasRoutes from "./modules/demandas/routes/demandaRoutes";
// ...
app.use("/api/demandas", demandasRoutes);
```

## 🧪 Testes Realizados

### Teste de Isolamento no Banco
```bash
node backend/test-demandas-isolation.js
```

**Resultado:**
- ✅ 6 tenants identificados
- ✅ 3 demandas no tenant "Sistema Principal"
- ✅ 0 demandas nos outros tenants
- ✅ Todas as demandas têm tenant_id
- ✅ RLS funcionando corretamente

### Distribuição Atual
```
📊 Tenant: Benevides                          → 0 demandas
📊 Tenant: Escola de Teste                    → 0 demandas
📊 Tenant: Ewerton                            → 0 demandas
📊 Tenant: Ewertond                           → 0 demandas
📊 Tenant: Secretaria Municipal de Educação   → 0 demandas
📊 Tenant: Sistema Principal                  → 3 demandas ✅
```

## 🚀 Próximo Passo: REINICIAR O SERVIDOR

⚠️ **IMPORTANTE**: Para que a correção tenha efeito, você precisa:

1. **Parar o servidor backend** (Ctrl+C no terminal)
2. **Reiniciar o servidor**: `npm run dev` ou `npm start`
3. **Testar no frontend**: Fazer login e acessar Guias de Demanda

## 🔍 Como Verificar se Funcionou

### No Frontend
1. Faça login com um usuário do tenant "Sistema Principal"
2. Acesse "Guias de Demanda"
3. Deve ver **3 demandas**

4. Faça login com um usuário de outro tenant (ex: Benevides)
5. Acesse "Guias de Demanda"
6. Deve ver **0 demandas** (lista vazia)

### Teste via API (opcional)
```bash
# Com token do tenant "Sistema Principal"
curl -H "Authorization: Bearer SEU_TOKEN" \
     -H "X-Tenant-ID: sistema-principal" \
     http://localhost:3000/api/demandas

# Deve retornar 3 demandas

# Com token de outro tenant
curl -H "Authorization: Bearer SEU_TOKEN" \
     -H "X-Tenant-ID: benevides" \
     http://localhost:3000/api/demandas

# Deve retornar array vazio []
```

## 📋 Checklist de Validação

- [x] Rota antiga removida do index.ts
- [x] Rota nova mantida
- [x] Banco de dados com tenant_id
- [x] Isolamento testado e funcionando
- [ ] **Servidor reiniciado** ⚠️ PENDENTE
- [ ] Frontend testado
- [ ] Isolamento validado no frontend

## 🎯 Resumo

**Causa raiz**: Rotas duplicadas, com a rota antiga (sem tenant) sendo registrada primeiro.

**Solução**: Remover a rota antiga do módulo de estoque e usar apenas a rota nova do módulo de demandas.

**Status**: ✅ Código corrigido | ⚠️ Aguardando reinicialização do servidor

---

**Data**: 18/11/2024  
**Arquivo modificado**: `backend/src/index.ts`  
**Ação necessária**: Reiniciar servidor backend
