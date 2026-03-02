# Como Instalar o App de Entregas como PWA

## 📱 O que é um PWA?

PWA (Progressive Web App) é um aplicativo web que pode ser instalado no celular como se fosse um app nativo, funcionando offline e com acesso à câmera, notificações, etc.

## 🚀 Passo a Passo para Instalação

### 1. Gerar os Ícones

Primeiro, você precisa gerar os ícones do app:

```bash
cd apps/entregador
node generate-icons-simple.js
```

Isso criará ícones SVG. Para converter para PNG, abra `public/convert-icons.html` no navegador e salve cada imagem como PNG.

**Ou use um gerador online:**
- Acesse: https://www.pwabuilder.com/imageGenerator
- Faça upload de uma imagem 512x512
- Baixe e extraia para `apps/entregador/public/`

### 2. Fazer o Build

```bash
npm run build
```

### 3. Testar Localmente

```bash
npm run preview
```

O app estará disponível em `http://localhost:4173`

### 4. Instalar no Celular

#### Android (Chrome)

1. Acesse o app no Chrome do celular
2. Toque no menu (⋮) no canto superior direito
3. Selecione "Adicionar à tela inicial" ou "Instalar app"
4. Confirme a instalação
5. O ícone aparecerá na tela inicial

#### iOS (Safari)

1. Acesse o app no Safari do iPhone/iPad
2. Toque no botão de compartilhar (□↑)
3. Role para baixo e toque em "Adicionar à Tela de Início"
4. Edite o nome se desejar
5. Toque em "Adicionar"
6. O ícone aparecerá na tela inicial

#### Desktop (Chrome/Edge)

1. Acesse o app no navegador
2. Clique no ícone de instalação (⊕) na barra de endereço
3. Ou vá em Menu → Instalar [Nome do App]
4. Confirme a instalação
5. O app abrirá em uma janela separada

## 🌐 Deploy para Produção

### Opção 1: Vercel (Recomendado)

1. Instale o Vercel CLI:
```bash
npm install -g vercel
```

2. Faça o deploy:
```bash
cd apps/entregador
vercel
```

3. Siga as instruções e configure:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. O Vercel fornecerá uma URL HTTPS
5. Acesse a URL no celular e instale o PWA

### Opção 2: Netlify

1. Crie uma conta em https://netlify.com
2. Conecte seu repositório Git
3. Configure:
   - Base directory: `apps/entregador`
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy automático a cada push

### Opção 3: GitHub Pages

1. Adicione ao `package.json`:
```json
{
  "homepage": "https://seu-usuario.github.io/seu-repo",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

2. Instale gh-pages:
```bash
npm install --save-dev gh-pages
```

3. Deploy:
```bash
npm run deploy
```

## ✅ Verificar se o PWA está Funcionando

### Lighthouse (Chrome DevTools)

1. Abra o app no Chrome
2. Pressione F12 para abrir DevTools
3. Vá para a aba "Lighthouse"
4. Selecione "Progressive Web App"
5. Clique em "Generate report"
6. Verifique a pontuação (deve ser 90+)

### Checklist Manual

- [ ] Manifest.json está acessível
- [ ] Service Worker está registrado
- [ ] Ícones estão carregando
- [ ] App funciona offline
- [ ] Botão "Instalar" aparece no navegador
- [ ] App abre em tela cheia após instalação
- [ ] Câmera funciona (em HTTPS)

## 🔧 Troubleshooting

### "Adicionar à tela inicial" não aparece

- Verifique se está usando HTTPS (ou localhost)
- Confirme que o manifest.json está acessível
- Verifique se os ícones existem
- Limpe o cache do navegador

### Service Worker não registra

- Verifique o console do navegador (F12)
- Confirme que sw.js está em `/public/`
- Teste em modo anônimo
- Verifique se não há erros de CORS

### App não funciona offline

- Verifique se o Service Worker está ativo
- Confirme que os recursos estão sendo cacheados
- Teste desconectando a internet após carregar

### Câmera não funciona

- Câmera só funciona em HTTPS ou localhost
- Verifique permissões do navegador
- Use a opção de entrada manual como fallback

## 📊 Recursos do PWA

✅ **Instalável** - Pode ser instalado na tela inicial
✅ **Offline** - Funciona sem internet (com cache)
✅ **Responsivo** - Adapta-se a qualquer tela
✅ **Seguro** - Requer HTTPS
✅ **Atualizável** - Service Worker atualiza automaticamente
✅ **Engajável** - Notificações push (futuro)
✅ **Descobrível** - Indexável por motores de busca

## 🎯 Próximos Passos

1. Adicionar notificações push
2. Implementar sincronização em background
3. Adicionar modo escuro
4. Otimizar performance
5. Adicionar analytics
6. Implementar cache estratégico
7. Adicionar splash screen customizada

## 📚 Recursos Úteis

- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
