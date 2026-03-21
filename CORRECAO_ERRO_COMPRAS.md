# Correção: Erro ao Carregar Pedidos

## Problema
Erro ao carregar pedidos na página de Compras.

## Investigação

### 1. Loop Infinito - CORRIGIDO ✅
- **Causa**: `toast` estava nas dependências do `useCallback` em `loadPedidos`
- **Solução**: Removido `toast` das dependências
- **Arquivo**: `frontend/src/pages/Compras.tsx`

### 2. Placeholders SQL - JÁ CORRETO ✅
- Os placeholders SQL já estão corretos: `$${paramCount}`
- **Arquivo**: `backend/src/modules/compras/controllers/compraController.ts`

### 3. Possíveis Causas do Erro

#### A. Tabela `pedidos` não existe
A query faz JOIN com a tabela `pedidos`:
```sql
FROM pedidos p
JOIN usuarios u ON p.usuario_criacao_id = u.id
```

**Verificar**: A tabela pode se chamar `compras` ao invés de `pedidos`

#### B. Colunas faltando
A query espera estas colunas em `pedidos`:
- `id`
- `status`
- `contrato_id`
- `escola_id`
- `data_pedido`
- `usuario_criacao_id`
- `usuario_aprovacao_id`
- `created_at`

#### C. Permissões
A rota requer permissão de leitura:
```typescript
router.get("/", requireLeitura('compras'), listarCompras);
```

## Próximos Passos

1. Verificar se a tabela `pedidos` existe no banco
2. Se não existir, verificar se é `compras`
3. Verificar se o usuário tem permissão de leitura em 'compras'
4. Verificar logs do backend para ver o erro exato

## Comandos para Diagnóstico

```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('pedidos', 'compras');

-- Ver estrutura da tabela
\d pedidos
-- ou
\d compras
```
