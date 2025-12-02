# Correção do Erro 500 no Admin Panel - Criação de Usuários

## 🔍 Problema Identificado

O erro 500 ocorre ao tentar criar usuários através do painel admin na rota:
```
POST /api/provisioning/institutions/{institutionId}/users
```

## 📊 Análise Realizada

### 1. Diferenças Estruturais Entre Bancos

**Banco Local (Funciona):**
- `institutions.tenant_id`: UUID (existe)
- `tenant_users.id`: UUID
- `tenants`: estrutura simplificada

**Banco Neon (Erro 500):**
- `institutions.tenant_id`: UUID (ADICIONADO ✅)
- `tenant_users.id`: INTEGER (mantido para compatibilidade)
- `tenants`: estrutura com colunas extras (cnpj, email, telefone, etc.)

### 2. Testes Realizados

✅ **Teste Direto no Banco Neon:** SUCESSO
- Script `test-create-user-neon.js` criou usuário com sucesso
- Todas as tabelas e relacionamentos funcionam corretamente

❌ **Teste via API Vercel:** ERRO 500
- A requisição falha no backend do Vercel
- Logs não mostram detalhes do erro

## 🔧 Correções Aplicadas

### 1. Estrutura do Banco Neon

Executado script `fix-neon-database-structure.sql` que:
- ✅ Adicionou coluna `tenant_id` na tabela `institutions`
- ✅ Adicionou colunas `domain`, `subdomain`, `settings`, `limits` na tabela `tenants`
- ✅ Criou índices para melhor performance
- ✅ Ajustou foreign keys e constraints

### 2. Compatibilidade de Tipos

A diferença no tipo de `tenant_users.id` (INTEGER no Neon vs UUID no local) foi mantida para não quebrar dados existentes. O código deve ser compatível com ambos.

## 🚨 Próximos Passos

### 1. Verificar Logs do Vercel

O erro 500 pode estar relacionado a:
- Timeout de conexão com o banco
- Erro de autenticação do token
- Problema na configuração de variáveis de ambiente
- Código desatualizado no Vercel

### 2. Recompilar e Fazer Deploy

```bash
cd backend
npm run build
git add .
git commit -m "fix: corrigir estrutura do banco e erros de compilação"
git push
```

### 3. Verificar Variáveis de Ambiente no Vercel

Certifique-se de que as seguintes variáveis estão configuradas:
- `DATABASE_URL` ou `POSTGRES_URL`
- `JWT_SECRET`
- `NODE_ENV=production`

### 4. Testar a API Diretamente

Use o script `test-api-create-user.js` para testar a API do Vercel:

1. Obtenha o token do admin:
   - Abra o painel admin no navegador
   - F12 > Console
   - Digite: `localStorage.getItem("adminToken")`
   - Copie o token

2. Edite o arquivo `test-api-create-user.js` e cole o token

3. Execute:
   ```bash
   node test-api-create-user.js
   ```

## 📝 Erros de Compilação a Corrigir

Antes de fazer deploy, corrija os seguintes erros:

1. **Faltando dependências:**
   ```bash
   npm install commander cron
   ```

2. **Tipo `institution_id` em Tenant:**
   - Adicionar `institution_id?: string` na interface `Tenant`

3. **Rotas de Guias:**
   - Adicionar parâmetro `tenantId` nas chamadas dos métodos

4. **AuthMiddleware:**
   - Ajustar tipo de `role` para `TenantUserRole`

## 🎯 Solução Imediata

Se o erro persistir após as correções acima, considere:

1. **Verificar se o código está atualizado no Vercel:**
   - Acesse o dashboard do Vercel
   - Verifique o último deploy
   - Force um novo deploy se necessário

2. **Verificar logs em tempo real:**
   ```bash
   vercel logs gestaoescolar-backend-seven --follow
   ```

3. **Testar localmente com o banco Neon:**
   - Altere o `.env` para usar o banco Neon
   - Execute o backend localmente
   - Teste a criação de usuário

## ✅ Verificação Final

Após aplicar as correções, teste:

1. ✅ Criação de usuário via painel admin
2. ✅ Listagem de usuários da instituição
3. ✅ Edição de permissões de usuário
4. ✅ Exclusão de usuário

## 📚 Arquivos Criados

- `check-provisioning-tables.js` - Verifica estrutura das tabelas
- `test-create-user-neon.js` - Testa criação direta no banco
- `fix-neon-database-structure.sql` - Script de correção estrutural
- `apply-neon-structure-fix.js` - Aplica as correções
- `test-api-create-user.js` - Testa a API do Vercel
