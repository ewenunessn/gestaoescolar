# 🚀 Guia de Deploy do Admin Panel

Este guia explica como fazer deploy do Admin Panel no Vercel.

## 📋 Pré-requisitos

1. ✅ Backend já deployado no Vercel
2. ✅ Banco Neon configurado e sincronizado
3. ✅ Conta no Vercel
4. ✅ Vercel CLI instalado (opcional)

## 🎯 Configuração Atual

### Desenvolvimento Local
- **API URL**: `http://localhost:3000/api`
- **Arquivo**: `.env`

### Produção (Vercel)
- **API URL**: Será configurada nas variáveis de ambiente do Vercel
- **Arquivo**: `.env.production` (template)

## 🚀 Método 1: Deploy via Vercel Dashboard (Recomendado)

### Passo 1: Preparar o Projeto

Certifique-se de que o código está no GitHub:
```bash
git add .
git commit -m "feat: Adicionar admin panel"
git push origin main
```

### Passo 2: Criar Novo Projeto no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New Project"
3. Importe o repositório do GitHub
4. **🚨 CRÍTICO - Configure o Root Directory**:
   
   **⚠️ SEM ISSO O BUILD VAI FALHAR!**
   
   - **Root Directory**: `admin-panel` ← OBRIGATÓRIO!
   - Framework Preset: `Vite`
   - Build Command: `npm run build` (deixe padrão)
   - Output Directory: `dist` (deixe padrão)
   - Install Command: `npm install` (deixe padrão)

   **Por quê?** O projeto está em um monorepo. O Vercel precisa saber que deve instalar as dependências dentro da pasta `admin-panel`, não na raiz do repositório.

### Passo 3: Configurar Variáveis de Ambiente

Na seção "Environment Variables", adicione:

**Nome**: `VITE_API_URL`  
**Valor**: `https://seu-backend.vercel.app/api`  
**Ambientes**: Production, Preview, Development

**⚠️ IMPORTANTE**: Substitua `seu-backend.vercel.app` pela URL real do seu backend no Vercel.

**Exemplo**:
```
VITE_API_URL = https://gestaoescolar-backend.vercel.app/api
```

### Passo 4: Deploy

1. Clique em "Deploy"
2. Aguarde o build (1-2 minutos)
3. Acesse a URL gerada (ex: `admin-panel-xxx.vercel.app`)

## 🚀 Método 2: Deploy via Vercel CLI

### Passo 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Passo 2: Login

```bash
vercel login
```

### Passo 3: Configurar Variável de Ambiente

Edite `.env.production` e coloque a URL real do backend:

```env
VITE_API_URL=https://seu-backend.vercel.app/api
```

### Passo 4: Deploy

```bash
cd admin-panel
vercel --prod
```

Siga as instruções:
- Set up and deploy? **Y**
- Which scope? (escolha sua conta)
- Link to existing project? **N**
- Project name? **admin-panel** (ou outro nome)
- In which directory is your code located? **./**
- Want to override settings? **N**

## 🔧 Configuração Automática

O arquivo `vercel.json` já está configurado para SPA routing:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**✅ Não precisa editar nada no código!** A URL do backend é configurada via Environment Variables no Vercel Dashboard.

## ✅ Verificação Pós-Deploy

### 1. Testar Conexão com Backend

Acesse a URL do admin panel e abra o DevTools (F12):

```javascript
// No Console, verifique:
console.log(import.meta.env.VITE_API_URL)
// Deve mostrar: https://seu-backend.vercel.app/api
```

### 2. Testar Login

1. Acesse a página de login
2. Tente fazer login com um admin criado
3. Verifique no Network tab se as requisições estão indo para o backend correto

### 3. Verificar CORS

Se houver erro de CORS, adicione a URL do admin panel no backend:

**Backend `.env` ou Vercel Environment Variables:**
```env
CORS_ORIGIN=https://admin-panel-xxx.vercel.app,https://seu-frontend.vercel.app
```

## 🔄 Atualizações Automáticas

Após o primeiro deploy, toda vez que você fizer push para o GitHub:
- O Vercel detecta automaticamente
- Faz build e deploy automaticamente
- Gera uma URL de preview para cada commit

## 📊 Estrutura de URLs

Após deploy, você terá:

```
Frontend Principal:  https://seu-app.vercel.app
Admin Panel:         https://admin-panel-xxx.vercel.app
Backend API:         https://seu-backend.vercel.app/api
```

## 🔐 Segurança

### Variáveis de Ambiente Sensíveis

**NUNCA** commite arquivos `.env` com dados sensíveis!

O `.gitignore` já está configurado para ignorar:
- `.env`
- `.env.local`
- `.env.production.local`

### Configurar no Vercel Dashboard

Para variáveis sensíveis, sempre use o Vercel Dashboard:
1. Projeto → Settings → Environment Variables
2. Adicione as variáveis
3. Escolha o ambiente (Production, Preview, Development)

## 🐛 Troubleshooting

### Erro: "Failed to fetch"

**Causa**: Backend não está acessível ou CORS não configurado.

**Solução**:
1. Verifique se o backend está online
2. Adicione a URL do admin panel no CORS do backend
3. Verifique se VITE_API_URL está correto

### Erro: "404 Not Found" em rotas

**Causa**: Vercel não está redirecionando corretamente.

**Solução**: Verifique se `vercel.json` tem a configuração de rewrites.

### Erro: "Environment variable not defined"

**Causa**: VITE_API_URL não está configurado.

**Solução**:
1. Vá em Vercel Dashboard → Settings → Environment Variables
2. Adicione `VITE_API_URL`
3. Faça redeploy

### Build falha com erro de TypeScript

**Solução**:
```bash
# Localmente, teste o build
npm run build

# Se funcionar localmente mas falhar no Vercel:
# Verifique se todas as dependências estão em "dependencies" (não em "devDependencies")
```

## 📝 Checklist de Deploy

- [ ] Backend deployado e funcionando
- [ ] Banco Neon sincronizado
- [ ] Admin criado no banco Neon
- [ ] `.env.production` configurado com URL do backend
- [ ] `vercel.json` configurado
- [ ] Código commitado e pushed para GitHub
- [ ] Projeto criado no Vercel
- [ ] Root Directory configurado como `admin-panel`
- [ ] Variável `VITE_API_URL` configurada no Vercel
- [ ] Deploy realizado com sucesso
- [ ] Login testado
- [ ] CORS configurado no backend

## 🎉 Pronto!

Após seguir estes passos, seu Admin Panel estará online e conectado ao backend no Vercel e banco Neon!

**URLs Finais:**
- Admin Panel: `https://admin-panel-xxx.vercel.app`
- Login: `https://admin-panel-xxx.vercel.app/login`

---

**Última atualização**: 2024  
**Versão**: 1.0
