# ✅ Checklist de Verificação Pré-Deploy

Execute esta verificação ANTES de fazer o deploy na Vercel.

---

## 📦 Backend

### 1. Estrutura de Arquivos
```bash
backend/
├── api/
│   ├── index.js          ✅ Deve existir
│   └── package.json      ✅ Deve existir
├── src/
│   └── index.ts          ✅ Deve existir
├── vercel.json           ✅ Deve existir
└── .vercelignore         ✅ Deve existir
```

### 2. Verificar api/package.json
```bash
cd backend/api
cat package.json
```

Deve conter:
- ✅ `tsx` nas dependencies
- ✅ `express` nas dependencies
- ✅ Todas as dependências necessárias

### 3. Testar Localmente
```bash
cd backend
node api/index.js
```

Deve iniciar sem erros e conectar ao banco.

### 4. Verificar Variáveis de Ambiente
Você tem:
- ✅ Connection string do Neon?
- ✅ JWT_SECRET definido?
- ✅ Acesso ao banco de dados?

---

## 🎨 Frontend

### 1. Estrutura de Arquivos
```bash
frontend/
├── src/
│   └── main.tsx          ✅ Deve existir
├── public/
├── index.html            ✅ Deve existir
├── package.json          ✅ Deve existir
├── vite.config.ts        ✅ Deve existir
└── vercel.json           ✅ Deve existir
```

### 2. Verificar package.json
```bash
cd frontend
cat package.json
```

Deve conter:
- ✅ Script `build`
- ✅ `vite` nas dependencies ou devDependencies
- ✅ `react` e `react-dom` nas dependencies

### 3. Testar Build Localmente
```bash
cd frontend
npm install
npm run build
```

Deve criar o diretório `dist/` sem erros.

### 4. Testar Localmente
```bash
npm run dev
```

Deve abrir em `http://localhost:5173` sem erros.

---

## 🔗 Conexão Backend ↔ Frontend

### 1. Verificar Configuração de API
No frontend, verifique:
```bash
cd frontend
grep -r "VITE_API_URL" src/
```

Deve usar a variável de ambiente corretamente.

### 2. Verificar CORS no Backend
```bash
cd backend
grep -A 20 "corsOptions" src/index.ts
```

Deve permitir domínios `.vercel.app`.

---

## 🗄️ Banco de Dados

### 1. Verificar Neon
1. Acesse: https://console.neon.tech
2. Verifique se o projeto está ativo
3. Teste a connection string:

```bash
psql "sua_connection_string_aqui"
```

### 2. Verificar Tabelas
```sql
\dt
```

Deve listar todas as tabelas necessárias:
- ✅ usuarios
- ✅ tenants
- ✅ tenant_users
- ✅ escolas
- ✅ produtos
- ✅ etc.

### 3. Verificar Tenant Padrão
```sql
SELECT * FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000';
```

Se não existir, será criado no primeiro registro.

---

## 🔐 Segurança

### 1. Verificar .gitignore
```bash
cat .gitignore
```

Deve ignorar:
- ✅ `.env`
- ✅ `.env.local`
- ✅ `node_modules/`
- ✅ `dist/`

### 2. Verificar Secrets
```bash
git log --all --full-history --source -- **/.env
```

Não deve retornar nada (nenhum .env commitado).

### 3. Verificar JWT_SECRET
Deve ter no mínimo 32 caracteres e ser aleatório.

---

## 📝 Git

### 1. Verificar Branch
```bash
git branch
```

Deve estar em `main` ou `master`.

### 2. Verificar Status
```bash
git status
```

Não deve ter arquivos não commitados importantes.

### 3. Verificar Último Commit
```bash
git log -1
```

Deve ser o commit com as configurações finais.

### 4. Push para GitHub
```bash
git push origin main
```

Deve fazer push sem erros.

---

## ✅ Checklist Final

Antes de criar os projetos na Vercel:

### Backend
- [ ] `backend/api/index.js` existe e funciona
- [ ] `backend/api/package.json` tem todas as dependências
- [ ] `backend/vercel.json` está configurado
- [ ] Testado localmente com sucesso
- [ ] Connection string do Neon disponível
- [ ] JWT_SECRET gerado (32+ caracteres)

### Frontend
- [ ] `frontend/package.json` tem script `build`
- [ ] `frontend/vercel.json` está configurado
- [ ] `npm run build` funciona sem erros
- [ ] `npm run dev` funciona localmente
- [ ] Variáveis de ambiente preparadas

### Geral
- [ ] Código commitado no GitHub
- [ ] Nenhum secret commitado
- [ ] Banco de dados Neon ativo
- [ ] Conta na Vercel criada
- [ ] Repositório conectado à Vercel

---

## 🚀 Próximo Passo

Se todos os itens estão ✅, você está pronto para:

1. Seguir o **GUIA_DEPLOY_VERCEL.md**
2. Criar os projetos na Vercel
3. Fazer o deploy!

---

**Boa sorte! 🎉**
