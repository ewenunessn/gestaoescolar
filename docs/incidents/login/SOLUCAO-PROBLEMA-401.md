# 🔍 SOLUÇÃO DO PROBLEMA 401 NO VERCEL

## 🎯 PROBLEMA IDENTIFICADO

O backend está retornando **401 Unauthorized** mesmo com token válido porque:

### Causa Raiz: JWT_SECRET Dinâmico

No arquivo `backend/src/config/config.ts`, o JWT_SECRET tem um fallback problemático:

```typescript
jwtSecret: process.env.JWT_SECRET || (() => {
    console.warn('⚠️ JWT_SECRET não configurado - usando valor padrão (INSEGURO EM PRODUÇÃO!)');
    return 'default-secret-change-in-production-' + Date.now();
  })(),
```

**O que acontece:**
1. Se `JWT_SECRET` não está configurado no Vercel, o código gera um secret baseado em `Date.now()`
2. Cada vez que o backend reinicia (deploy, cold start, etc.), gera um JWT_SECRET DIFERENTE
3. Tokens gerados com o secret anterior se tornam INVÁLIDOS
4. Resultado: 401 Unauthorized mesmo com token "válido"

## ✅ SOLUÇÃO

### Passo 1: Configurar JWT_SECRET no Vercel

1. Acesse o dashboard do Vercel: https://vercel.com/dashboard
2. Selecione o projeto **gestaoescolar-backend**
3. Vá em **Settings** → **Environment Variables**
4. Adicione a variável:
   - **Name:** `JWT_SECRET`
   - **Value:** Use um valor seguro e FIXO (exemplo abaixo)
   - **Environments:** Production, Preview, Development

**Valor sugerido (gere um novo para segurança):**
```
your_super_secret_jwt_key_change_this_in_production_2024_FIXED
```

**OU gere um secret criptograficamente seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Passo 2: Verificar JWT_SECRET no Frontend (se aplicável)

O frontend NÃO deve ter acesso ao JWT_SECRET (apenas o backend usa para assinar/verificar).
Mas verifique se não há configuração incorreta.

### Passo 3: Fazer Redeploy

Após configurar a variável de ambiente:
1. Faça um novo deploy do backend
2. Ou force um redeploy no Vercel dashboard

### Passo 4: Testar

1. Faça logout completo (limpe localStorage)
2. Faça login novamente
3. O novo token será gerado com o JWT_SECRET fixo
4. O token permanecerá válido mesmo após restarts do backend

## 🔍 COMO VERIFICAR SE O PROBLEMA FOI RESOLVIDO

### Teste 1: Decodificar o Token

Execute o script `decode-token.js`:

```bash
node decode-token.js
```

Cole o token do console do navegador e verifique:
- ✅ Token não está expirado
- ✅ Payload contém os dados corretos do usuário

### Teste 2: Verificar Logs do Backend

No Vercel, vá em **Deployments** → selecione o deployment → **Functions**

Procure por:
- ❌ `⚠️ JWT_SECRET não configurado` - Se aparecer, a variável não foi configurada corretamente
- ✅ Nenhum warning sobre JWT_SECRET - Configuração correta

### Teste 3: Teste de Persistência

1. Faça login
2. Aguarde 5 minutos (para garantir que o backend pode ter reiniciado)
3. Recarregue a página
4. ✅ Deve permanecer logado

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] JWT_SECRET configurado no Vercel (Production)
- [ ] JWT_SECRET configurado no Vercel (Preview)
- [ ] Valor do JWT_SECRET é FIXO (não contém Date.now() ou valores dinâmicos)
- [ ] Redeploy do backend realizado
- [ ] Teste de login realizado
- [ ] Token permanece válido após reload
- [ ] Sem warnings de JWT_SECRET nos logs

## 🔐 SEGURANÇA ADICIONAL

### Recomendações:

1. **Use um JWT_SECRET forte:**
   - Mínimo 32 caracteres
   - Mistura de letras, números e símbolos
   - Gerado aleatoriamente

2. **Nunca commite o JWT_SECRET no código:**
   - ✅ Use variáveis de ambiente
   - ❌ Não hardcode no código

3. **Rotação de secrets:**
   - Considere rotacionar o JWT_SECRET periodicamente
   - Implemente um sistema de múltiplos secrets para transição suave

4. **Monitore tokens inválidos:**
   - Configure alertas para muitos erros 401
   - Pode indicar tentativas de ataque ou problemas de configuração

## 🐛 OUTROS PROBLEMAS POSSÍVEIS (se o problema persistir)

### 1. Token Expirado
- Verifique `JWT_EXPIRES_IN` no backend
- Atualmente configurado para 7 dias
- Use o script `decode-token.js` para verificar

### 2. CORS Issues
- Verifique se o frontend está na lista de origens permitidas
- Arquivo: `backend/src/config/config.ts`

### 3. Formato do Token
- Token deve ser enviado como: `Bearer <token>`
- Verifique logs: `[API DEBUG] Token adicionado ao header Authorization`

### 4. Cache do Navegador
- Limpe o cache e cookies
- Teste em modo anônimo

## 📞 SUPORTE

Se o problema persistir após seguir todos os passos:

1. Execute `decode-token.js` e compartilhe o output (SEM o token completo)
2. Verifique os logs do Vercel Functions
3. Teste com `test-complete-login-flow.js` para isolar o problema
