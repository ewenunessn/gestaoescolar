# 🔧 Fix Vercel Build Error

## O Problema

Erro no build:
```
Running "install" command: `npm install --prefix=..`
Cannot find module 'react' or its corresponding type declarations
```

## A Causa

Vercel está instalando dependências na pasta errada (raiz do repositório) em vez da pasta `admin-panel`.

## ✅ A Solução

### No Vercel Dashboard:

1. Vá em **Settings** → **General**
2. Encontre a seção **Build & Development Settings**
3. Configure:

```
Root Directory: admin-panel
```

4. Clique em **Save**
5. Vá em **Deployments**
6. Clique nos 3 pontinhos do último deployment
7. Clique em **Redeploy**

### Ou ao Criar Novo Projeto:

Quando importar o repositório do GitHub:

1. **Root Directory**: Digite `admin-panel` ← OBRIGATÓRIO
2. Framework Preset: Vite (auto-detectado)
3. Build Command: `npm run build` (padrão)
4. Output Directory: `dist` (padrão)
5. Install Command: `npm install` (padrão)

## Por Que Isso Acontece?

O repositório tem esta estrutura:

```
gestaoescolar/
├── package.json          ← Workspace root (não tem React)
├── backend/
├── frontend/
└── admin-panel/
    ├── package.json      ← Tem React e dependências
    ├── src/
    └── vercel.json
```

Sem o Root Directory configurado, Vercel:
- Instala dependências do `package.json` da raiz (que não tem React)
- Tenta buildar o código que precisa de React
- **FALHA** ❌

Com Root Directory = `admin-panel`, Vercel:
- Entra na pasta `admin-panel`
- Instala dependências do `package.json` correto (que tem React)
- Builda com sucesso
- **SUCESSO** ✅

## Verificação

Após configurar, o log do Vercel deve mostrar:

```
Running "install" command: `npm install`
added 826 packages
Running "build" command: `npm run build`
✓ built in 2.5s
```

**NÃO** deve mostrar `npm install --prefix=..`

## Variáveis de Ambiente

Não esqueça de configurar:

```
VITE_API_URL = https://seu-backend.vercel.app/api
```

Em: Settings → Environment Variables

---

**Resumo**: Configure `Root Directory: admin-panel` no Vercel e faça redeploy.
