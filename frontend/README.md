# Frontend - Sistema de Gestão Escolar

Frontend do Sistema de Gerenciamento de Alimentação Escolar desenvolvido em React + TypeScript + Vite.

## 🚀 Deploy no Vercel

### Pré-requisitos
- Conta no [Vercel](https://vercel.com)
- Repositório no GitHub

### Configuração para Deploy

1. **Instale a CLI do Vercel** (opcional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via GitHub**:
   - Conecte seu repositório ao Vercel
   - O Vercel detectará automaticamente que é um projeto Vite
   - Configure as variáveis de ambiente no painel do Vercel

3. **Variáveis de Ambiente no Vercel**:
   ```
   VITE_API_URL=https://seu-backend.vercel.app
   VITE_APP_ENV=production
   NODE_ENV=production
   ```

### Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run vercel-build` - Build específico para Vercel
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter
- `npm run test` - Executa os testes

### Configurações do Vercel

O arquivo `vercel.json` já está configurado com:
- Redirecionamento de rotas da API para o backend
- Configuração SPA para React Router
- Headers CORS apropriados
- Build settings otimizadas

### Estrutura do Projeto

```
frontend/
├── public/          # Arquivos estáticos
├── src/             # Código fonte
│   ├── components/  # Componentes React
│   ├── pages/       # Páginas da aplicação
│   ├── services/    # Serviços e APIs
│   ├── utils/       # Utilitários
│   └── types/       # Tipos TypeScript
├── vercel.json      # Configuração do Vercel
├── vite.config.ts   # Configuração do Vite
└── package.json     # Dependências e scripts
```

### Tecnologias Utilizadas

- **React 18** - Biblioteca para interfaces
- **TypeScript** - Superset tipado do JavaScript
- **Vite** - Build tool e dev server
- **Material-UI** - Biblioteca de componentes
- **React Router** - Roteamento
- **Axios** - Cliente HTTP
- **Chart.js** - Gráficos e visualizações

### Desenvolvimento Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o arquivo `.env.local`:
   ```
   VITE_API_URL=http://localhost:3000
   VITE_APP_ENV=development
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse: `http://localhost:5173`

### Deploy Manual via CLI

```bash
# Login no Vercel
vercel login

# Deploy
vercel --prod
```

### Troubleshooting

- **Erro de CORS**: Verifique se o backend está configurado para aceitar requisições do domínio do frontend
- **Rotas 404**: Certifique-se que o `vercel.json` está configurado corretamente para SPAs
- **Variáveis de ambiente**: Todas as variáveis devem começar com `VITE_` para serem acessíveis no frontend