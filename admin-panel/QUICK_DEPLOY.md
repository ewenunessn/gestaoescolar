# ⚡ Deploy Rápido - Admin Panel

## 🎯 Resposta Rápida

**✅ Sim, está pronto!** Você só precisa:

1. ✅ Configurar variável de ambiente no Vercel
2. ✅ Fazer deploy

**Não precisa editar código!** 🎉

## 🚀 2 Passos para Deploy

### 1️⃣ Commit e Push (se ainda não fez)

```bash
git add .
git commit -m "feat: Admin panel pronto para deploy"
git push origin main
```

### 2️⃣ Deploy no Vercel

**Opção A - Dashboard (Recomendado):**
1. Acesse [vercel.com](https://vercel.com)
2. New Project → Import do GitHub
3. **Root Directory**: `admin-panel`
4. **Framework Preset**: Vite
5. **Environment Variables**: 
   - Nome: `VITE_API_URL`
   - Valor: `https://seu-backend.vercel.app/api`
   - Ambientes: Production, Preview, Development
6. Deploy

**Opção B - CLI:**
```bash
cd admin-panel
vercel --prod
```

## ✅ Verificar

Após deploy, teste:
1. Acesse a URL gerada
2. Tente fazer login
3. Verifique se conecta ao backend

## 🔧 Configuração de CORS

No backend, adicione a URL do admin panel:

**Vercel Environment Variables do Backend:**
```
CORS_ORIGIN=https://admin-panel-xxx.vercel.app,https://seu-frontend.vercel.app
```

## 📖 Guia Completo

Para mais detalhes: [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)

---

**Resumo**: Não está auto-configurado, mas são apenas 3 passos simples! 🚀
