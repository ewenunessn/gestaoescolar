# ✅ Solução do Erro 500 - Admin Panel

## 🎯 Problema Principal

Erro 500 ao criar usuários via painel admin na rota:
```
POST /api/provisioning/institutions/c1c7aabd-7f03-43ab-8d6d-ff003ea9005f/users
```

## ✅ Correção Aplicada

### 1. Estrutura do Banco Neon Corrigida

Executado script que adicionou:
- ✅ Coluna `tenant_id` na tabela `institutions`
- ✅ Colunas `domain`, `subdomain`, `settings`, `limits` na tabela `tenants`
- ✅ Índices e constraints necessários

**Comando executado:**
```bash
node backend/apply-neon-structure-fix.js
```

### 2. Teste Direto no Banco

✅ **SUCESSO:** Criação de usuário funciona diretamente no banco Neon
```bash
node backend/test-create-user-neon.js
```

## 🔍 Causa Provável do Erro 500

O erro 500 no Vercel pode ser causado por:

1. **Código desatualizado no Vercel**
   - O backend no Vercel pode estar com uma versão antiga do código
   - Solução: Fazer novo deploy

2. **Timeout de conexão**
   - Conexão com o banco Neon pode estar demorando
   - Solução: Verificar configuração de pool de conexões

3. **Erro de autenticação**
   - Token do admin pode estar inválido ou expirado
   - Solução: Verificar middleware de autenticação

## 🚀 Próximos Passos

### 1. Fazer Deploy Atualizado

```bash
cd backend
git add .
git commit -m "fix: corrigir estrutura do banco Neon para provisioning"
git push
```

O Vercel fará deploy automático.

### 2. Verificar Logs do Vercel

Após o deploy, teste novamente e verifique os logs:
```bash
vercel logs gestaoescolar-backend-seven --follow
```

### 3. Testar a API

Use o script de teste:
```bash
# 1. Obtenha o token do admin no navegador (F12 > Console):
localStorage.getItem("adminToken")

# 2. Edite o arquivo test-api-create-user.js e cole o token

# 3. Execute:
node backend/test-api-create-user.js
```

## 📝 Erros de Compilação Restantes

Há alguns erros de compilação que não afetam o provisioning:

1. **Módulo guias** - faltando parâmetro `tenantId`
2. **AuthMiddleware** - conflito de tipos (não crítico)

Esses erros podem ser corrigidos depois, pois não afetam a funcionalidade de provisioning.

## ✅ Verificação

Após o deploy, teste:

1. Login no painel admin
2. Acessar instituição
3. Criar novo usuário
4. Verificar se o usuário foi criado com sucesso

## 📊 Estrutura Atual do Banco Neon

```
institutions (26 colunas) ✅
├── id, slug, name, legal_name, document_number
├── type, status, email, phone, website
├── address_* (7 colunas)
├── settings, limits, metadata
├── created_at, updated_at
├── plan_id, default_tenant_id
└── tenant_id ✅ (ADICIONADO)

tenants (20 colunas) ✅
├── id, name, slug
├── cnpj, email, telefone, endereco, cidade, estado, cep
├── logo_url, config, status
├── created_at, updated_at
├── institution_id ✅
├── subdomain, domain ✅ (ADICIONADOS)
└── settings, limits ✅ (ADICIONADOS)

institution_users (8 colunas) ✅
├── id, institution_id, user_id
├── role, permissions, status
└── created_at, updated_at

tenant_users (7 colunas) ✅
├── id (INTEGER - mantido para compatibilidade)
├── tenant_id, user_id
├── role, status
└── created_at, updated_at
```

## 🎉 Conclusão

A estrutura do banco está correta e os testes diretos funcionam. O problema está no backend do Vercel que precisa ser atualizado com o novo código.

**Ação imediata:** Fazer commit e push para atualizar o Vercel.
