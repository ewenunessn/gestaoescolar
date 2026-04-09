# Troubleshooting - Problema de Login

## Sintomas
- Login funciona no localhost mas não na Vercel
- Após fazer login, aparece o dashboard por um momento e depois volta para a tela de login
- Token é salvo mas usuário é deslogado imediatamente

## Como Verificar os Logs

### 1. Abrir Console do Navegador
- Chrome/Edge: F12 ou Ctrl+Shift+I
- Firefox: F12 ou Ctrl+Shift+K
- Safari: Cmd+Option+I

### 2. Fazer Login e Observar os Logs

Você deve ver uma sequência como esta:

```
🔐 [LOGIN] Iniciando processo de login...
✅ [LOGIN] Resposta recebida do servidor
💾 [LOGIN] Token salvo no localStorage
💾 [LOGIN] Dados do usuário salvos: { tipo: 'admin', escola_id: 80 }
🔀 [LOGIN] Redirecionando para: /dashboard
👤 [useCurrentUser] Token encontrado, aguardando sincronização...
👤 [useCurrentUser] Buscando dados do usuário do servidor...
🔑 [API] Token adicionado à requisição: /usuarios/me
✅ [API] GET /usuarios/me (200)
```

### 3. Identificar Problemas

#### Problema: Token não está sendo salvo
```
💾 [LOGIN] Token salvo no localStorage
// Mas depois:
⚠️ [API] Requisição sem token: /usuarios/me
```
**Solução**: Problema de sincronização do localStorage. Já corrigido com delay de 200ms.

#### Problema: Erro 401 após login
```
🚫 [API] Erro 401 - Não autorizado
🚫 [API] URL: /usuarios/me
🚫 [API] Sessão expirada - limpando dados e redirecionando
```
**Possíveis causas**:
- Token inválido ou expirado
- Backend não está aceitando o token
- CORS ou problema de headers

#### Problema: Token válido mas erro 401
```
🔑 [API] Token adicionado à requisição: /usuarios/me
🚫 [API] Erro 401 - Não autorizado
```
**Verificar**:
- Se o token JWT está correto (copiar do localStorage e decodificar em jwt.io)
- Se o backend está validando corretamente
- Se há diferença entre localhost e produção

### 4. Verificar localStorage

No console do navegador, execute:

```javascript
// Ver token
console.log('Token:', localStorage.getItem('token'));

// Ver dados do usuário
console.log('User:', JSON.parse(localStorage.getItem('user')));

// Decodificar token JWT
const token = localStorage.getItem('token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token Payload:', payload);
}
```

### 5. Testar Endpoint Manualmente

No console do navegador:

```javascript
// Testar /usuarios/me com o token atual
const token = localStorage.getItem('token');
fetch('https://gestaoescolar-backend.vercel.app/api/usuarios/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Resposta /usuarios/me:', data))
.catch(err => console.error('Erro:', err));
```

## Correções Implementadas

### v1.0.1 (2026-04-08)
1. ✅ Substituído `window.location.href` por `navigate()` do React Router
2. ✅ Adicionado delay de 200ms no `useCurrentUser` para sincronização
3. ✅ Melhorado tratamento de erro 401 no interceptor
4. ✅ Adicionados logs detalhados em todo o fluxo
5. ✅ Desabilitada toolbar da Vercel (erro 403)
6. ✅ Configurado SSL verify-full no PostgreSQL

## Próximos Passos

1. Aguardar deploy da Vercel (geralmente 2-5 minutos)
2. Limpar cache do navegador (Ctrl+Shift+Delete)
3. Fazer logout se estiver logado
4. Tentar login novamente
5. Verificar logs no console conforme instruções acima
6. Se ainda houver problema, compartilhar os logs do console

## Comandos Úteis

```bash
# Ver logs da Vercel
vercel logs gestaoescolar-backend --follow

# Forçar redeploy
git commit --allow-empty -m "force redeploy"
git push

# Testar login via curl
curl -X POST https://gestaoescolar-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","senha":"suasenha"}'
```
