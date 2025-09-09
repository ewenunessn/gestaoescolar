# 🚀 Guia de Deploy no Vercel

## Pré-requisitos

1. **Conta no Vercel**: [vercel.com](https://vercel.com)
2. **Repositório no GitHub**: Código deve estar no GitHub
3. **Vercel CLI** (opcional): `npm install -g vercel`

## 📋 Checklist Antes do Deploy

- [ ] ✅ Build local funcionando (`npm run build`)
- [ ] ✅ Backend rodando no Vercel
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ Arquivos de configuração criados

## 🔧 Configurações Necessárias

### 1. Arquivos de Configuração

Os seguintes arquivos já foram criados:

- ✅ `vercel.json` - Configuração do Vercel
- ✅ `.env.production` - Variáveis de produção
- ✅ `.env.local` - Variáveis de desenvolvimento
- ✅ `.gitignore` - Arquivos ignorados

### 2. Variáveis de Ambiente no Vercel

Configure no painel do Vercel:

```bash
VITE_API_URL=https://gestaoescolar-xtu1-git-main-ewenunes0-4923s-projects.vercel.app
VITE_APP_ENV=production
NODE_ENV=production
```

## 🚀 Métodos de Deploy

### Método 1: Deploy via GitHub (Recomendado)

1. **Conecte o repositório**:
   - Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
   - Clique em "New Project"
   - Conecte seu repositório GitHub
   - Selecione o diretório `frontend`

2. **Configure o projeto**:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`

3. **Adicione variáveis de ambiente**:
   - Vá em Settings > Environment Variables
   - Adicione as variáveis listadas acima

4. **Deploy**:
   - Clique em "Deploy"
   - O Vercel fará deploy automaticamente

### Método 2: Deploy via CLI

```bash
# 1. Instalar Vercel CLI (se não tiver)
npm install -g vercel

# 2. Fazer login
vercel login

# 3. Deploy de desenvolvimento
npm run deploy:dev

# 4. Deploy de produção
npm run deploy
```

### Método 3: Script PowerShell (Windows)

```powershell
# Execute o script de deploy
.\deploy.ps1
```

## 🔍 Verificação Pós-Deploy

### 1. Teste a Aplicação

- [ ] ✅ Frontend carrega corretamente
- [ ] ✅ Login funciona
- [ ] ✅ API conecta com backend
- [ ] ✅ Rotas funcionam (não retornam 404)

### 2. Teste as APIs

```bash
# Teste health check
curl https://seu-frontend.vercel.app/health

# Teste API
curl https://seu-frontend.vercel.app/api/health
```

### 3. Console do Navegador

- Abra DevTools (F12)
- Verifique se não há erros no console
- Confirme que as requisições API estão funcionando

## 🐛 Troubleshooting

### Erro: "Failed to load resource: 404"

**Causa**: Rotas não configuradas corretamente

**Solução**: Verifique o `vercel.json`:
```json
{
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### Erro: "CORS policy"

**Causa**: Backend não aceita requisições do frontend

**Solução**: Configure CORS no backend para aceitar o domínio do Vercel

### Erro: "Environment variable not defined"

**Causa**: Variáveis de ambiente não configuradas

**Solução**: 
1. Vá em Settings > Environment Variables no Vercel
2. Adicione todas as variáveis `VITE_*`
3. Redeploy o projeto

### Build falha

**Causa**: Dependências ou código com erro

**Solução**:
1. Teste build local: `npm run build`
2. Corrija erros encontrados
3. Commit e push as correções

## 📱 Deploy Automático

Após configurar via GitHub:

- ✅ **Push para `main`** → Deploy automático de produção
- ✅ **Push para outras branches** → Deploy de preview
- ✅ **Pull Requests** → Deploy de preview automático

## 🔗 Links Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Vite + Vercel](https://vercel.com/guides/deploying-vite-with-vercel)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs no painel do Vercel
2. Teste build local primeiro
3. Confirme variáveis de ambiente
4. Verifique se backend está funcionando