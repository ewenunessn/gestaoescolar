# 🔧 Solução: Configurar Variáveis de Ambiente na Vercel

## ⚠️ PROBLEMA
O backend na Vercel está tentando conectar ao banco local (127.0.0.1:5432) ao invés do Neon.

## ✅ SOLUÇÃO

### Passo 1: Acessar o Painel da Vercel
1. Acesse: https://vercel.com/dashboard
2. Clique no projeto: **gestaoescolar-backend**
3. Clique em **Settings** (Configurações)
4. No menu lateral, clique em **Environment Variables**

### Passo 2: Adicionar as Variáveis (COPIE E COLE)

Clique em **Add New** e adicione cada variável abaixo:

#### 1. DB_HOST
```
ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech
```
✅ Marque: Production, Preview, Development

#### 2. DB_PORT
```
5432
```
✅ Marque: Production, Preview, Development

#### 3. DB_NAME
```
neondb
```
✅ Marque: Production, Preview, Development

#### 4. DB_USER
```
neondb_owner
```
✅ Marque: Production, Preview, Development

#### 5. DB_PASSWORD
```
npg_PDfBTKRsi29G
```
✅ Marque: Production, Preview, Development

#### 6. DB_SSL
```
true
```
✅ Marque: Production, Preview, Development

#### 7. NODE_ENV
```
production
```
✅ Marque: Production, Preview, Development

#### 8. JWT_SECRET
```
sua_chave_jwt_super_secreta_minimo_32_caracteres_producao_2024
```
✅ Marque: Production, Preview, Development

#### 9. JWT_EXPIRES_IN
```
24h
```
✅ Marque: Production, Preview, Development

#### 10. CORS_ORIGIN
```
https://gestaoescolar-frontend.vercel.app,https://odontoquiz.vercel.app
```
✅ Marque: Production, Preview, Development

### Passo 3: Fazer Redeploy

Após adicionar TODAS as variáveis:

1. Vá para a aba **Deployments**
2. Clique nos **3 pontinhos** do último deployment
3. Clique em **Redeploy**
4. Clique em **Redeploy** novamente para confirmar

### Passo 4: Verificar

Aguarde 2-3 minutos e teste:
```
https://gestaoescolar-backend.vercel.app/api/escolas
```

Deve retornar a lista de escolas ao invés do erro de conexão.

---

## 🎯 IMPORTANTE

- **NÃO PULE NENHUMA VARIÁVEL** - todas são necessárias
- **MARQUE TODOS OS AMBIENTES** (Production, Preview, Development)
- **FAÇA O REDEPLOY** após adicionar as variáveis
- As variáveis no `vercel.json` NÃO são suficientes - você PRECISA configurar no painel

---

## 🐛 Se ainda não funcionar

Verifique os logs do deployment:
1. Vá em **Deployments**
2. Clique no último deployment
3. Clique em **View Function Logs**
4. Procure por mensagens de erro de conexão

Se ver "127.0.0.1:5432", significa que as variáveis ainda não foram aplicadas.
