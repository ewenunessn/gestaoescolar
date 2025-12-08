# 🔍 Como Ver os Logs do Vercel

## Método 1: Via Dashboard do Vercel (Recomendado)

1. Acesse: https://vercel.com/dashboard
2. Clique no projeto `gestaoescolar-backend-seven`
3. Vá na aba **"Logs"** ou **"Runtime Logs"**
4. Tente criar um usuário no painel admin
5. Observe os logs em tempo real

## Método 2: Via CLI do Vercel

Se você tem o Vercel CLI instalado:

```bash
vercel logs gestaoescolar-backend-seven --follow
```

Se não tem instalado:

```bash
npm install -g vercel
vercel login
vercel logs gestaoescolar-backend-seven --follow
```

## Método 3: Via API do Vercel

Você também pode ver os logs diretamente na resposta da API se configurar `NODE_ENV=development` no Vercel.

## 📊 O que Procurar nos Logs

Após o deploy (aguarde 2-3 minutos), tente criar um usuário e procure por:

### Logs de Sucesso:
```
📝 [CREATE USER] Dados recebidos
🔧 [SERVICE] createUser iniciado
🔧 [SERVICE] Transação iniciada
🔧 [SERVICE] Verificando instituição...
✅ [SERVICE] Instituição encontrada
🔧 [SERVICE] Verificando limite de usuários...
🔧 [SERVICE] Usuários: X/100
🔧 [SERVICE] Gerando hash da senha...
🔧 [SERVICE] Criando usuário no banco...
✅ [SERVICE] Usuário criado
🔧 [SERVICE] Vinculando usuário à instituição...
✅ [SERVICE] Vínculo com instituição criado
🔧 [SERVICE] Criando log de auditoria...
✅ [SERVICE] Log de auditoria criado
✅ [SERVICE] Transação commitada com sucesso
✅ [CREATE USER] Usuário criado com sucesso
```

### Logs de Erro:
```
❌ [CREATE USER] Erro ao criar usuário
❌ [CREATE USER] Mensagem: [mensagem do erro]
❌ [CREATE USER] Stack: [stack trace]
❌ [SERVICE] Erro durante criação
```

## 🎯 Possíveis Erros e Soluções

### 1. Erro de Conexão com Banco
```
Error: connect ETIMEDOUT
```
**Solução:** Verificar configuração do DATABASE_URL no Vercel

### 2. Erro de Autenticação
```
Error: password authentication failed
```
**Solução:** Verificar credenciais do banco no Vercel

### 3. Erro de Timeout
```
Error: Query timeout
```
**Solução:** Aumentar timeout ou otimizar query

### 4. Erro de Constraint
```
Error: duplicate key value violates unique constraint
```
**Solução:** Email já existe no banco

### 5. Erro de Coluna Não Encontrada
```
Error: column "institution_id" does not exist
```
**Solução:** Executar script de migração no banco Neon

## 🚀 Próximos Passos

1. **Aguarde 2-3 minutos** para o deploy completar
2. **Tente criar um usuário** no painel admin
3. **Verifique os logs** usando um dos métodos acima
4. **Compartilhe os logs** se o erro persistir

## 📝 Informações Úteis

- **Projeto:** gestaoescolar-backend-seven
- **Último commit:** 28b8184
- **Mensagem:** "debug: adicionar logs detalhados para identificar erro 500 na criação de usuários"
- **Branch:** main

## ⏱️ Status do Deploy

Você pode verificar o status do deploy em:
https://vercel.com/dashboard

Procure por:
- ✅ **Ready** - Deploy concluído com sucesso
- 🔄 **Building** - Deploy em andamento
- ❌ **Error** - Erro no deploy
