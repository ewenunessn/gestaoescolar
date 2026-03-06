# Correção: Rotas de Produtos de Refeição

## Problema

O app mobile estava tentando acessar:
```
GET /api/refeicoes/8/produtos
```

Mas recebia erro 404:
```json
{
  "error": "NotFoundError",
  "message": "Rota GET /api/refeicoes/8/produtos não encontrada",
  "statusCode": 404
}
```

## Causa

As rotas de produtos de refeição estavam registradas apenas em `/api/refeicao-produtos`, mas não em `/api/refeicoes`.

### Estrutura Anterior

```typescript
// backend/src/index.ts
app.use("/api/refeicoes", refeicaoRoutes);           // Apenas CRUD de refeições
app.use("/api/refeicao-produtos", refeicaoProdutoRoutes);  // Produtos separados
```

Isso significava que as rotas eram:
- ❌ `/api/refeicao-produtos/:refeicaoId/produtos` (não intuitivo)
- ✅ `/api/refeicoes/:id` (CRUD de refeições)

## Solução

Adicionei as rotas de produtos diretamente no `refeicaoRoutes.ts` para seguir o padrão RESTful:

```typescript
// backend/src/modules/cardapios/routes/refeicaoRoutes.ts
import {
  listarRefeicaoProdutos,
  adicionarRefeicaoProduto,
  editarRefeicaoProduto,
  removerRefeicaoProduto,
} from "../controllers/refeicaoProdutoController";

// Rotas para produtos da refeição
router.get("/:refeicaoId/produtos", listarRefeicaoProdutos);      
router.post("/:refeicaoId/produtos", adicionarRefeicaoProduto);   
router.put("/produtos/:id", editarRefeicaoProduto);               
router.delete("/produtos/:id", removerRefeicaoProduto);           
```

## Rotas Disponíveis

### Refeições (CRUD)
- `GET /api/refeicoes` - Listar todas
- `GET /api/refeicoes/:id` - Buscar por ID
- `POST /api/refeicoes` - Criar nova
- `PUT /api/refeicoes/:id` - Atualizar
- `DELETE /api/refeicoes/:id` - Deletar
- `PATCH /api/refeicoes/:id/toggle` - Ativar/Desativar

### Produtos da Refeição ✅ NOVO
- `GET /api/refeicoes/:refeicaoId/produtos` - Listar produtos de uma refeição
- `POST /api/refeicoes/:refeicaoId/produtos` - Adicionar produto à refeição
- `PUT /api/refeicoes/produtos/:id` - Editar quantidade per capita
- `DELETE /api/refeicoes/produtos/:id` - Remover produto da refeição

## Formato dos Dados

### GET /api/refeicoes/:id/produtos

Retorna array de produtos com informações completas:

```json
[
  {
    "id": 1,
    "refeicao_id": 8,
    "produto_id": 5,
    "per_capita": 150,
    "tipo_medida": "gramas",
    "produto_nome": "Arroz",
    "unidade": "kg",
    "created_at": "2024-03-06T10:00:00Z",
    "updated_at": "2024-03-06T10:00:00Z"
  }
]
```

### POST /api/refeicoes/:id/produtos

Body:
```json
{
  "produto_id": 5,
  "per_capita": 150,
  "tipo_medida": "gramas"
}
```

Validações:
- `tipo_medida`: deve ser "gramas" ou "unidades"
- `per_capita`: 0-1000 para gramas, 0-100 para unidades

### PUT /api/refeicoes/produtos/:id

Body:
```json
{
  "per_capita": 200,
  "tipo_medida": "gramas"
}
```

## Teste

Execute o script de teste:

```bash
cd backend
node scripts/test-refeicao-produtos.js
```

Ou teste manualmente:

```bash
# Listar produtos de uma refeição
curl http://localhost:3000/api/refeicoes/8/produtos

# Adicionar produto
curl -X POST http://localhost:3000/api/refeicoes/8/produtos \
  -H "Content-Type: application/json" \
  -d '{"produto_id": 5, "per_capita": 150, "tipo_medida": "gramas"}'

# Editar quantidade
curl -X PUT http://localhost:3000/api/refeicoes/produtos/1 \
  -H "Content-Type: application/json" \
  -d '{"per_capita": 200, "tipo_medida": "gramas"}'

# Remover produto
curl -X DELETE http://localhost:3000/api/refeicoes/produtos/1
```

## Compatibilidade

As rotas antigas em `/api/refeicao-produtos` continuam funcionando para manter compatibilidade com código existente.

## Status

✅ Corrigido e testado
✅ App mobile funcionando
✅ Rotas RESTful seguindo padrão
✅ Validações implementadas
✅ Documentação atualizada
