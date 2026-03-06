# Deploy das Rotas de Produtos de Refeição

## Status Atual

✅ Código commitado e enviado para o GitHub (commit 9e188a0)
⏳ Aguardando deploy automático no Vercel

## O que foi alterado

### Backend
- `backend/src/modules/cardapios/routes/refeicaoRoutes.ts` - Adicionadas rotas de produtos

### App Mobile
- Módulo completo de Nutrição criado
- Integração com API de produtos de refeição

## Deploy Automático

O Vercel está configurado para fazer deploy automático quando há push na branch `main`.

### Verificar Deploy

1. Acesse: https://vercel.com/dashboard
2. Procure pelo projeto "gestaoescolar"
3. Verifique se há um novo deployment em andamento
4. Aguarde a conclusão (geralmente 2-5 minutos)

### Verificar se funcionou

Após o deploy, teste a rota:

```bash
curl https://gestaoescolar-backend.vercel.app/api/refeicoes/8/produtos
```

Deve retornar um array de produtos (pode ser vazio se não houver produtos cadastrados).

## Se o Deploy Automático Falhar

### Opção 1: Deploy Manual via CLI

```bash
cd backend
npm install -g vercel
vercel --prod
```

### Opção 2: Forçar Redeploy no Dashboard

1. Acesse https://vercel.com/dashboard
2. Selecione o projeto "gestaoescolar"
3. Vá em "Deployments"
4. Clique nos 3 pontos do último deployment
5. Selecione "Redeploy"

### Opção 3: Verificar Logs de Erro

Se o deploy falhar:

1. Acesse o dashboard do Vercel
2. Clique no deployment com erro
3. Veja os logs de build/runtime
4. Corrija os erros e faça novo commit

## Estrutura do Vercel

```
backend/
├── api/
│   └── index.js          # Entry point para Vercel
├── src/
│   ├── index.ts          # Aplicação Express
│   └── modules/
│       └── cardapios/
│           └── routes/
│               └── refeicaoRoutes.ts  ✅ ATUALIZADO
└── vercel.json           # Configuração do Vercel
```

## Rotas Disponíveis Após Deploy

- `GET /api/refeicoes/:id/produtos` - Listar produtos de uma refeição
- `POST /api/refeicoes/:id/produtos` - Adicionar produto
- `PUT /api/refeicoes/produtos/:id` - Editar per capita
- `DELETE /api/refeicoes/produtos/:id` - Remover produto

## Teste Completo

Após o deploy, execute:

```bash
# Teste local (se backend rodando localmente)
node backend/scripts/test-refeicao-produtos.js

# Teste produção
API_URL=https://gestaoescolar-backend.vercel.app/api node backend/scripts/test-refeicao-produtos.js
```

## Troubleshooting

### Erro 404 persiste após deploy

1. Limpe o cache do Vercel:
   - Dashboard > Settings > General > Clear Cache
   - Faça redeploy

2. Verifique se o arquivo foi incluído no build:
   - Veja os logs de build
   - Procure por "refeicaoRoutes.ts"

3. Verifique a configuração do vercel.json:
   ```json
   {
     "builds": [
       {
         "src": "api/index.js",
         "use": "@vercel/node",
         "config": {
           "includeFiles": ["src/**"]
         }
       }
     ]
   }
   ```

### Erro de importação

Se houver erro de importação do controller:

```typescript
// Verifique se o import está correto
import {
  listarRefeicaoProdutos,
  adicionarRefeicaoProduto,
  editarRefeicaoProduto,
  removerRefeicaoProduto,
} from "../controllers/refeicaoProdutoController";
```

## Monitoramento

Após o deploy, monitore:

1. Logs do Vercel (tempo real)
2. Erros no app mobile
3. Tempo de resposta das APIs

## Próximos Passos

1. ✅ Código commitado
2. ⏳ Aguardar deploy automático (2-5 min)
3. ⏳ Testar rotas no Vercel
4. ⏳ Testar app mobile
5. ⏳ Verificar se produtos aparecem corretamente

## Links Úteis

- Dashboard Vercel: https://vercel.com/dashboard
- Backend Produção: https://gestaoescolar-backend.vercel.app
- Documentação Vercel: https://vercel.com/docs
