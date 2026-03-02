# 📦 App de Entregas - PWA

Aplicativo Progressive Web App (PWA) para gerenciamento de entregas escolares.

## 🚀 Características

- ✅ **PWA Instalável** - Pode ser instalado como app nativo
- ✅ **Funciona Offline** - Cache inteligente com Service Worker
- ✅ **Scanner QR Code** - Leitura de QR Code para filtrar entregas
- ✅ **Entrada Manual** - Alternativa quando câmera não está disponível
- ✅ **Assinatura Digital** - Captura de assinatura do recebedor
- ✅ **Histórico de Entregas** - Timeline organizada por data
- ✅ **Entregas Parciais** - Suporte para entregas em múltiplas etapas
- ✅ **Sincronização Offline** - Fila de entregas quando sem internet

## 📱 Instalação

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Gerar ícones do PWA
node generate-icons-simple.js

# Iniciar servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:5174`

### Produção

```bash
# Build
npm run build

# Preview
npm run preview
```

### Instalar como PWA

Veja o guia completo em [INSTALAR-PWA.md](./INSTALAR-PWA.md)

## 🎨 Gerar Ícones

Veja instruções detalhadas em [GERAR-ICONES.md](./GERAR-ICONES.md)

**Opção rápida:**
```bash
node generate-icons-simple.js
```

Depois abra `public/convert-icons.html` no navegador para converter SVG para PNG.

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.development` na raiz:

```env
VITE_PROXY_TARGET=http://localhost:3000
```

Para produção, crie `.env.production`:

```env
VITE_PROXY_TARGET=https://gestaoescolar-backend.vercel.app
```

### Proxy API

O app usa proxy para evitar problemas de CORS:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'https://gestaoescolar-backend.vercel.app',
      changeOrigin: true
    }
  }
}
```

## 📂 Estrutura

```
apps/entregador/
├── public/
│   ├── manifest.json       # Configuração do PWA
│   ├── sw.js              # Service Worker
│   ├── icon-*.png         # Ícones do app
│   └── convert-icons.html # Conversor SVG→PNG
├── src/
│   ├── api/               # Chamadas à API
│   │   ├── client.ts      # Cliente HTTP
│   │   └── rotas.ts       # Endpoints de rotas
│   ├── components/        # Componentes React
│   │   ├── CheckinModal.tsx
│   │   ├── FiltroData.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── QRCodeScanner.tsx
│   │   ├── SignaturePad.tsx
│   │   └── Topbar.tsx
│   ├── offline/           # Funcionalidades offline
│   │   └── queue.ts       # Fila de sincronização
│   ├── pages/             # Páginas do app
│   │   ├── EscolaDetalhe.tsx
│   │   ├── Historico.tsx
│   │   ├── Login.tsx
│   │   ├── RotaDetalhe.tsx
│   │   └── Rotas.tsx
│   ├── App.tsx            # Componente principal
│   ├── main.tsx           # Entry point
│   └── styles.css         # Estilos globais
├── generate-icons-simple.js  # Script para gerar ícones
├── GERAR-ICONES.md          # Guia de ícones
├── INSTALAR-PWA.md          # Guia de instalação
└── README.md                # Este arquivo
```

## 🎯 Funcionalidades

### 1. Login

- Autenticação com token JWT
- Armazenamento seguro no localStorage
- Redirecionamento automático

### 2. Rotas

- Listagem de rotas de entrega
- Filtro por QR Code
- Indicador visual de filtro ativo
- Botão para limpar filtro

### 3. Scanner QR Code

- Leitura automática via câmera
- Seleção de câmera (frontal/traseira)
- Entrada manual como fallback
- Validação de dados

### 4. Detalhes da Escola

- Abas: Pendentes e Entregues
- Seleção múltipla de itens
- Ajuste de quantidade
- Timeline de entregas
- Modal de histórico completo

### 5. Confirmação de Entrega

- Nome do entregador (automático)
- Nome do recebedor
- Observações opcionais
- Assinatura digital obrigatória
- Animação de sucesso

### 6. Histórico

- Timeline organizada por data
- Filtro por período
- Detalhes de cada entrega
- Informações de recebedor

### 7. Offline

- Indicador de status de conexão
- Fila de entregas pendentes
- Sincronização automática
- Cache de dados

## 🔐 Segurança

- HTTPS obrigatório para câmera
- Tokens JWT para autenticação
- Validação de dados no cliente
- Service Worker com cache seguro

## 📊 Performance

- Lazy loading de componentes
- Cache estratégico
- Otimização de imagens
- Minificação de código
- Code splitting

## 🐛 Troubleshooting

### Câmera não funciona

**Problema:** "Camera access is only supported in secure context"

**Solução:**
- Use HTTPS ou localhost
- Ou use a opção de entrada manual

### Service Worker não registra

**Problema:** SW não aparece no DevTools

**Solução:**
```bash
# Limpar cache
rm -rf node_modules/.vite
npm run dev
```

### Build falha

**Problema:** Erros de TypeScript

**Solução:**
```bash
# Verificar tipos
npm run typecheck

# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 🚀 Deploy

### Vercel

```bash
vercel
```

### Netlify

```bash
netlify deploy --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

## 📝 Licença

Este projeto faz parte do Sistema de Gestão Escolar.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação ou abra uma issue.
