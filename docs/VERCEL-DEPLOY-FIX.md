# Fix: Erro 500 em Pedidos no Vercel

## Problema
Após remover o campo `unidade` de `contrato_produtos`, o endpoint `/api/pedidos` retorna erro 500 no Vercel.

## Causa
O código no Vercel ainda está desatualizado e tenta acessar `cp.unidade` que não existe mais no banco Neon.

## Solução Aplicada

### 1. Código Corrigido ✅
Todos os arquivos foram atualizados para buscar `p.unidade` ao invés de `cp.unidade`:
- `backend/src/utils/optimizedQueries.ts`
- `backend/src/modules/estoque/controllers/estoqueEscolarController.ts`
- `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts`
- `backend/src/modules/pedidos/controllers/pedidoController.ts`

### 2. Banco Neon Atualizado ✅
- Coluna `unidade` removida de `contrato_produtos`
- Views atualizadas

### 3. Deploy Forçado ✅
Commit vazio criado para forçar redeploy no Vercel:
```bash
git commit --allow-empty -m "chore: trigger vercel redeploy to fix pedidos 500 error"
git push origin main
```

## Como Verificar o Deploy

### Opção 1: Vercel Dashboard
1. Acesse https://vercel.com/seu-projeto
2. Vá em "Deployments"
3. Verifique se há um deploy em andamento
4. Aguarde status "Ready"

### Opção 2: Verificar Logs
1. No Vercel, clique no deployment mais recente
2. Vá em "Functions" > "api/pedidos"
3. Verifique os logs de erro

### Opção 3: Testar Endpoint
Após o deploy finalizar, teste:
```bash
curl https://gestaoescolar-backend.vercel.app/api/pedidos?page=1&limit=10
```

Deve retornar 200 OK com lista de pedidos.

## Tempo Estimado
- Deploy automático: 2-5 minutos
- Se não funcionar, pode levar até 10 minutos

## Se o Erro Persistir

### 1. Verificar se o deploy foi feito
```bash
# Ver último commit no Vercel
# Deve ser: "chore: trigger vercel redeploy to fix pedidos 500 error"
```

### 2. Forçar rebuild manualmente
No Vercel Dashboard:
1. Vá em "Deployments"
2. Clique nos 3 pontos do último deployment
3. Clique em "Redeploy"
4. Marque "Use existing Build Cache" como DESMARCADO
5. Clique em "Redeploy"

### 3. Verificar variáveis de ambiente
Certifique-se que `NEON_DATABASE_URL` ou `POSTGRES_URL` está configurada corretamente no Vercel.

### 4. Verificar logs de build
Se o build falhar, verifique os logs no Vercel para identificar o erro.

## Commits Relacionados
- `1130769` - fix: corrigir referências a cp.unidade após remoção do campo
- `9fb5833` - chore: adicionar script para verificar remoção de unidade no Neon
- `d6c8e59` - chore: trigger vercel redeploy to fix pedidos 500 error

## Status
- [x] Código corrigido
- [x] Banco Neon atualizado
- [x] Deploy forçado
- [ ] Aguardando deploy do Vercel
- [ ] Testar endpoint

