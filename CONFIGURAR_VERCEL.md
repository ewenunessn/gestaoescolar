# 🚀 Configurar Variáveis de Ambiente na Vercel

## Passo a Passo

### 1. Acesse o Painel da Vercel
- Vá para: https://vercel.com/dashboard
- Selecione o projeto: **gestaoescolar-backend**

### 2. Configure as Variáveis de Ambiente
- Clique em **Settings** (Configurações)
- No menu lateral, clique em **Environment Variables**
- Adicione as seguintes variáveis:

#### Variáveis Obrigatórias:

```
DB_HOST = ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech
DB_PORT = 5432
DB_NAME = neondb
DB_USER = neondb_owner
DB_PASSWORD = npg_PDfBTKRsi29G
DB_SSL = true
NODE_ENV = production
JWT_SECRET = sua_chave_jwt_super_secreta_minimo_32_caracteres_producao_2024
JWT_EXPIRES_IN = 24h
CORS_ORIGIN = https://gestaoescolar-frontend.vercel.app,https://odontoquiz.vercel.app
```

### 3. Importante!
- Para cada variável, selecione os ambientes: **Production**, **Preview** e **Development**
- Clique em **Save** após adicionar cada variável

### 4. Fazer Redeploy
Após configurar todas as variáveis:
- Vá para a aba **Deployments**
- Clique nos 3 pontinhos do último deployment
- Clique em **Redeploy**
- Marque a opção **Use existing Build Cache** (opcional)
- Clique em **Redeploy**

## OU - Fazer Deploy via CLI

Se preferir, você pode fazer o deploy via terminal:

```bash
cd backend
vercel --prod
```

## Verificar se Funcionou

Após o deploy, teste a API:
```
https://gestaoescolar-backend.vercel.app/api/escolas
```

Deve retornar a lista de escolas ao invés do erro de conexão.

---

## 🔍 Troubleshooting

Se ainda der erro:
1. Verifique se todas as variáveis foram salvas corretamente
2. Certifique-se de que selecionou todos os ambientes (Production, Preview, Development)
3. Faça um novo deploy (não apenas redeploy)
4. Verifique os logs na Vercel para ver qual variável está faltando
