# Fix: Produtos não apareciam após adicionar à refeição

## Problema

Ao adicionar um produto a uma refeição no app mobile, o produto era adicionado com sucesso no banco de dados, mas não aparecia na lista de "Produtos da Refeição".

## Causa Raiz

A rota `/api/refeicoes` estava configurada com middleware de cache (`mediumCache`):

```typescript
app.use("/api/refeicoes", mediumCache, refeicaoRoutes);
```

Isso causava:
1. Produto era adicionado com sucesso (POST retornava 201)
2. App chamava GET `/api/refeicoes/:id/produtos` para recarregar
3. Cache retornava dados antigos (antes da adição)
4. Lista não era atualizada na tela

## Solução

Removido o middleware de cache da rota de refeições:

```typescript
app.use("/api/refeicoes", refeicaoRoutes);
```

## Testes Realizados

### Antes da correção:
```bash
POST /api/refeicoes/8/produtos → 201 Created (ID 41)
GET /api/refeicoes/8/produtos → Retorna IDs 36-40 (cache antigo)
```

### Depois da correção:
```bash
POST /api/refeicoes/8/produtos → 201 Created (ID 42)
GET /api/refeicoes/8/produtos → Retorna IDs 36-42 (dados atualizados)
```

## Arquivos Alterados

- `backend/src/index.ts` - Removido `mediumCache` da rota

## Scripts Criados

1. `backend/scripts/test-api-produtos-refeicao.js` - Testa API completa
2. `backend/scripts/limpar-produtos-duplicados.js` - Remove duplicados
3. `backend/scripts/verificar-refeicao-produtos.js` - Verifica estrutura

## Deploy

Commit: `03817aa`
Status: ✅ Deployed no Vercel

## Verificação

Aguarde 2-3 minutos para o Vercel fazer redeploy, então teste:

```bash
# Adicionar produto
curl -X POST https://gestaoescolar-backend.vercel.app/api/refeicoes/8/produtos \
  -H "Content-Type: application/json" \
  -d '{"produto_id": 1, "per_capita": 100, "tipo_medida": "gramas"}'

# Listar produtos (deve mostrar o recém-adicionado)
curl https://gestaoescolar-backend.vercel.app/api/refeicoes/8/produtos
```

## Considerações sobre Cache

### Quando usar cache:
- ✅ Dados que mudam raramente (modalidades, escolas)
- ✅ Listas de referência (produtos, fornecedores)
- ✅ Relatórios pesados

### Quando NÃO usar cache:
- ❌ Dados que mudam frequentemente
- ❌ Associações/relacionamentos dinâmicos
- ❌ Dados de formulários/CRUD ativo

### Rotas com cache mantido:
- `/api/escolas` - longCache
- `/api/modalidades` - longCache
- `/api/fornecedores` - mediumCache
- `/api/produtos` - longCache

### Rotas sem cache:
- `/api/refeicoes` - ✅ Removido
- `/api/cardapios` - Sem cache
- `/api/entregas` - Sem cache
- `/api/pedidos` - Sem cache

## Logs de Debug

Os logs adicionados no app mobile ajudarão a identificar problemas futuros:

```typescript
console.log('📦 Produtos carregados:', produtosData.length);
console.log('🔗 Associações carregadas:', associacoesData.length);
console.log('➕ Adicionando produto:', produtoId);
console.log('✅ Produto adicionado, resultado:', resultado);
```

## Status Final

✅ Cache removido
✅ Produtos aparecem imediatamente após adicionar
✅ Deploy realizado
✅ Documentação atualizada
