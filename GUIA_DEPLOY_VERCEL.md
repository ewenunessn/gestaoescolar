# 🚀 Guia Completo de Deploy na Vercel

## 📋 Pré-requisitos

- Conta no GitHub (já tem ✅)
- Repositório no GitHub (já tem ✅)
- Conta na Vercel (você vai criar)

---

## 🎯 Parte 1: Criar Conta na Vercel

### Passo 1: Acessar Vercel
1. Acesse: https://vercel.com
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"**
4. Autorize a Vercel a acessar seu GitHub

### Passo 2: Conectar Repositório
1. A Vercel vai pedir permissão para acessar seus repositórios
2. Clique em **"Install"** ou **"Configure"**
3. Selecione **"Only select repositories"**
4. Escolha o repositório: **ewenunessn/gestaoescolar**
5. Clique em **"Install"**

---

## 🔧 Parte 2: Deploy do Backend (API)

### Passo 1: Criar Projeto Backend
1. No dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Selecione o repositório **gestaoescolar**
3. Clique em **"Import"**

### Passo 2: Configurar Projeto Backend
Configure exatamente assim:

```
PROJECT NAME: gestaoescolar-backend
FRAMEWORK PRESET: Other
ROOT DIRECTORY: backend
```

Clique em **"Edit"** ao lado de "Root Directory" e selecione **backend**

### Passo 3: Configurar Build Settings

```
BUILD COMMAND: (deixe vazio)
OUTPUT DIRECTORY: (deixe vazio)
INSTALL COMMAND: cd api && npm install
```

### Passo 4: Adicionar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

```
DATABASE_URL
Valor: sua_connection_string_do_neon

POSTGRES_URL
Valor: sua_connection_string_do_neon

JWT_SECRET
Valor: sua_chave_jwt_super_secreta_minimo_32_caracteres_producao_2024

NODE_ENV
Valor: production
```

**IMPORTANTE:** Pegue a connection string do Neon:
1. Acesse: https://console.neon.tech
2. Selecione seu projeto
3. Vá em **"Connection Details"**
4. Copie a **"Connection string"**
5. Cole nas variáveis DATABASE_URL e POSTGRES_URL

### Passo 5: Deploy
1. Clique em **"Deploy"**
2. Aguarde o deploy (2-3 minutos)
3. Quando terminar, você verá: ✅ **"Deployment Ready"**
4. Sua API estará em: `https://gestaoescolar-backend.vercel.app`

### Passo 6: Testar Backend
Abra no navegador:
```
https://gestaoescolar-backend.vercel.app/
```

Deve retornar um JSON com informações da API:
```json
{
  "name": "Sistema de Gestão Escolar API",
  "version": "2.0.0",
  "status": "online",
  "database": "PostgreSQL",
  ...
}
```

Teste também:
```
https://gestaoescolar-backend.vercel.app/health
```

---

## 🎨 Parte 3: Deploy do Frontend

### Passo 1: Criar Projeto Frontend
1. No dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Selecione o repositório **gestaoescolar** novamente
3. Clique em **"Import"**

### Passo 2: Configurar Projeto Frontend
Configure exatamente assim:

```
PROJECT NAME: nutriescola (ou gestaoescolar-frontend)
FRAMEWORK PRESET: Vite
ROOT DIRECTORY: frontend
```

Clique em **"Edit"** ao lado de "Root Directory" e selecione **frontend**

### Passo 3: Configurar Build Settings

A Vercel detecta automaticamente o Vite, mas confirme:

```
BUILD COMMAND: npm run build
OUTPUT DIRECTORY: dist
INSTALL COMMAND: npm install
```

### Passo 4: Adicionar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

```
VITE_API_URL
Valor: https://gestaoescolar-backend.vercel.app

VITE_APP_NAME
Valor: NutriEscola

NODE_ENV
Valor: production
```

### Passo 5: Deploy
1. Clique em **"Deploy"**
2. Aguarde o deploy (2-3 minutos)
3. Quando terminar, você verá: ✅ **"Deployment Ready"**
4. Seu frontend estará em: `https://nutriescola.vercel.app`

### Passo 6: Testar Frontend
Abra no navegador:
```
https://nutriescola.vercel.app
```

Deve carregar a aplicação React normalmente.

---

## 🔐 Parte 4: Configurar CORS no Backend

Após o deploy, você precisa atualizar o CORS para aceitar o domínio do frontend.

### Opção 1: Via Código (Recomendado)

Já está configurado no código para aceitar domínios `.vercel.app` automaticamente! ✅

### Opção 2: Verificar Manualmente

Se tiver problemas de CORS, verifique o arquivo:
```
backend/src/index.ts
```

Procure por:
```javascript
if (origin.includes('.vercel.app')) {
  return callback(null, true);
}
```

---

## 🎯 Parte 5: Configurar Domínios Personalizados (Opcional)

### Backend
1. No projeto **gestaoescolar-backend**
2. Vá em **Settings** → **Domains**
3. Adicione: `api.seudominio.com`
4. Configure o DNS conforme instruções da Vercel

### Frontend
1. No projeto **nutriescola**
2. Vá em **Settings** → **Domains**
3. Adicione: `seudominio.com` ou `app.seudominio.com`
4. Configure o DNS conforme instruções da Vercel

---

## 🔄 Parte 6: Configurar Deploy Automático

### Deploy Automático no Push
Já está configurado! ✅

Toda vez que você fizer:
```bash
git push origin main
```

A Vercel vai:
1. Detectar as mudanças
2. Fazer deploy automático do backend (se mudou algo em `/backend`)
3. Fazer deploy automático do frontend (se mudou algo em `/frontend`)

### Deploy de Preview (Branches)
Quando você criar uma branch e fazer push:
```bash
git checkout -b feature/nova-funcionalidade
git push origin feature/nova-funcionalidade
```

A Vercel cria um **Preview Deployment** com URL única para testar!

---

## 📊 Parte 7: Monitoramento e Logs

### Ver Logs do Backend
1. Acesse o projeto **gestaoescolar-backend**
2. Clique em **"Deployments"**
3. Clique no deployment ativo
4. Clique em **"Functions"** → **"api/index.js"**
5. Veja os logs em tempo real

### Ver Logs do Frontend
1. Acesse o projeto **nutriescola**
2. Clique em **"Deployments"**
3. Clique no deployment ativo
4. Veja os logs de build

### Analytics (Opcional)
1. Vá em **"Analytics"** em cada projeto
2. Veja métricas de:
   - Requisições
   - Tempo de resposta
   - Erros
   - Tráfego

---

## 🐛 Parte 8: Troubleshooting

### Problema: Backend retorna 500
**Solução:**
1. Verifique as variáveis de ambiente
2. Verifique os logs da função
3. Teste a connection string do Neon localmente

### Problema: Frontend não conecta no Backend
**Solução:**
1. Verifique se `VITE_API_URL` está correto
2. Abra o DevTools (F12) → Console
3. Veja se há erros de CORS
4. Verifique se o backend está online

### Problema: CORS Error
**Solução:**
1. Verifique se o domínio do frontend está permitido no backend
2. Veja o arquivo `backend/src/index.ts` na configuração de CORS
3. Adicione o domínio manualmente se necessário

### Problema: Build Failed
**Solução:**
1. Veja os logs de build
2. Verifique se todas as dependências estão no `package.json`
3. Teste o build localmente: `npm run build`

---

## ✅ Checklist Final

### Backend
- [ ] Projeto criado na Vercel
- [ ] Root directory configurado: `backend`
- [ ] Variáveis de ambiente adicionadas
- [ ] Deploy realizado com sucesso
- [ ] URL funcionando: `https://gestaoescolar-backend.vercel.app`
- [ ] Endpoint `/health` retornando OK
- [ ] Endpoint `/` retornando JSON da API

### Frontend
- [ ] Projeto criado na Vercel
- [ ] Root directory configurado: `frontend`
- [ ] Variáveis de ambiente adicionadas
- [ ] Deploy realizado com sucesso
- [ ] URL funcionando: `https://nutriescola.vercel.app`
- [ ] Aplicação carregando normalmente
- [ ] Login funcionando
- [ ] Requisições para API funcionando

---

## 🎉 Pronto!

Agora você tem:
- ✅ Backend rodando em: `https://gestaoescolar-backend.vercel.app`
- ✅ Frontend rodando em: `https://nutriescola.vercel.app`
- ✅ Deploy automático configurado
- ✅ Logs e monitoramento disponíveis
- ✅ Escalabilidade automática

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs na Vercel
2. Teste localmente primeiro
3. Verifique as variáveis de ambiente
4. Consulte a documentação: https://vercel.com/docs

---

## 🔗 Links Úteis

- Dashboard Vercel: https://vercel.com/dashboard
- Documentação Vercel: https://vercel.com/docs
- Neon Console: https://console.neon.tech
- GitHub Repo: https://github.com/ewenunessn/gestaoescolar

---

**Última atualização:** 07/11/2024
**Versão:** 1.0
