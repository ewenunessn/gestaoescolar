# 🔄 Remoção de Unidade de contrato_produtos

## 📋 Resumo

A coluna `unidade` foi removida da tabela `contrato_produtos`. Agora todos os módulos buscam a unidade diretamente da tabela `produtos`, garantindo consistência e eliminando redundância.

## 🎯 Objetivo

Centralizar a informação de unidade na tabela `produtos`, eliminando duplicação e garantindo que todos os módulos usem a mesma fonte de verdade.

## ✅ Mudanças Realizadas

### 1. Migration SQL
**Arquivo**: `backend/src/migrations/20260303_remove_unidade_from_contrato_produtos.sql`

- Remove coluna `unidade` de `contrato_produtos`
- Remove coluna `marca` de `contrato_produtos` (também migrada para produtos)
- Remove coluna `peso` de `contrato_produtos` (também migrada para produtos)
- Cria backup em `contrato_produtos_backup_unidade`
- Adiciona verificações e estatísticas

### 2. Controllers Atualizados

#### contratoProdutoController.ts
- `listarProdutosPorContrato()`: Busca `p.unidade` do produto
- `criarContratoProduto()`: Remove campos unidade, marca, peso
- `editarContratoProduto()`: Remove campos unidade, marca, peso

#### pedidoController.ts
- `buscarPedido()`: Busca `COALESCE(p.unidade, 'UN')` do produto
- `listarProdutosContrato()`: Busca `COALESCE(p.unidade, 'UN')` do produto
- `listarTodosProdutosDisponiveis()`: Busca `COALESCE(p.unidade, 'UN')` do produto

### 3. Models Atualizados

#### PedidoItem.ts
- `buscarPorPedido()`: Query atualizada para buscar unidade do produto

#### Faturamento.ts
- Query atualizada para buscar `COALESCE(pr.unidade, 'UN')`

### 4. Services Atualizados

#### FaturamentoService.ts
- Remove verificação de coluna `unidade` em `contrato_produtos`
- Query sempre busca `COALESCE(p.unidade, 'UN')` do produto

### 5. View Atualizada

#### view_saldo_contratos_modalidades
**Arquivo**: `backend/recreate_view_saldo.sql`
- Campo `unidade_medida` agora vem de `p.unidade`

## 🗂️ Estrutura Antes vs Depois

### Antes
```sql
-- contrato_produtos tinha unidade
SELECT cp.unidade FROM contrato_produtos cp;

-- Queries buscavam de contrato_produtos
COALESCE(cp.unidade, 'Kg') as unidade
```

### Depois
```sql
-- contrato_produtos NÃO tem mais unidade
-- Coluna removida

-- Queries buscam de produtos
COALESCE(p.unidade, 'UN') as unidade
```

## 📊 Impacto nos Módulos

### Contratos
- ✅ Criação de contrato-produto não aceita mais unidade
- ✅ Edição de contrato-produto não aceita mais unidade
- ✅ Listagem busca unidade do produto

### Pedidos
- ✅ Listagem de itens busca unidade do produto
- ✅ Detalhes do pedido busca unidade do produto
- ✅ Produtos disponíveis busca unidade do produto

### Faturamento
- ✅ Cálculo de faturamento busca unidade do produto
- ✅ Divisão por modalidades usa unidade do produto
- ✅ Relatórios exibem unidade do produto

### Saldo de Contratos
- ✅ View atualizada para buscar unidade do produto

## 🚀 Como Aplicar

### 1. Aplicar Migration
```bash
cd backend
node scripts/remove-unidade-contrato-produtos.js
```

O script aplica a migration em:
- ✅ Banco LOCAL
- ✅ Banco NEON

### 2. Verificar Resultado
```sql
-- Verificar que coluna foi removida
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'contrato_produtos' 
AND column_name = 'unidade';
-- Deve retornar 0 linhas

-- Verificar backup
SELECT COUNT(*) FROM contrato_produtos_backup_unidade;

-- Verificar produtos com unidade
SELECT COUNT(*) FROM produtos WHERE unidade IS NOT NULL;
```

## 📝 Arquivos Modificados

### Backend
1. `backend/src/migrations/20260303_remove_unidade_from_contrato_produtos.sql`
2. `backend/scripts/remove-unidade-contrato-produtos.js`
3. `backend/src/modules/contratos/controllers/contratoProdutoController.ts`
4. `backend/src/modules/pedidos/controllers/pedidoController.ts`
5. `backend/src/modules/pedidos/models/PedidoItem.ts`
6. `backend/src/modules/pedidos/models/Faturamento.ts`
7. `backend/src/modules/pedidos/services/FaturamentoService.ts`
8. `backend/recreate_view_saldo.sql`

### Documentação
1. `docs/REMOCAO-UNIDADE-CONTRATO.md` (este arquivo)
2. `docs/UNIDADE-PRODUTO-MIGRATION.md` (atualizado)

## ✅ Checklist de Implementação

### Migration
- [x] SQL de migration criado
- [x] Script de aplicação criado
- [x] Backup de dados implementado
- [x] Verificações adicionadas

### Controllers
- [x] contratoProdutoController.ts atualizado
- [x] pedidoController.ts atualizado
- [x] Todas as queries buscam de produtos

### Models
- [x] PedidoItem.ts atualizado
- [x] Faturamento.ts atualizado

### Services
- [x] FaturamentoService.ts atualizado
- [x] Verificações de coluna removidas

### Views
- [x] view_saldo_contratos_modalidades atualizada

### Documentação
- [x] Documentação completa criada
- [x] Exemplos de uso incluídos

## 🧪 Testes Necessários

### Backend
```bash
# 1. Testar criação de contrato-produto
POST /api/contratos/:id/produtos
{
  "produto_id": 1,
  "preco_unitario": 10.50,
  "quantidade_contratada": 100
}
# Não deve aceitar unidade, marca, peso

# 2. Testar listagem de produtos por contrato
GET /api/contratos/:id/produtos
# Deve retornar unidade do produto

# 3. Testar criação de pedido
POST /api/pedidos
# Deve usar unidade do produto

# 4. Testar faturamento
POST /api/faturamento/:pedido_id/calcular
# Deve usar unidade do produto
```

### Queries Diretas
```sql
-- Verificar que queries funcionam
SELECT 
  cp.*,
  p.nome,
  p.unidade
FROM contrato_produtos cp
JOIN produtos p ON cp.produto_id = p.id
LIMIT 5;

-- Verificar view
SELECT * FROM view_saldo_contratos_modalidades LIMIT 5;
```

## ⚠️ Pontos de Atenção

1. **Produtos sem unidade**: Todos os produtos devem ter unidade definida
2. **Fallback**: Queries usam `COALESCE(p.unidade, 'UN')` como fallback
3. **Backup**: Dados antigos estão em `contrato_produtos_backup_unidade`
4. **Frontend**: Verificar se formulários não enviam mais unidade para contrato-produto
5. **Importação**: Atualizar scripts de importação se necessário

## 🔄 Rollback (Se Necessário)

Se precisar reverter:

```sql
-- 1. Recriar coluna
ALTER TABLE contrato_produtos ADD COLUMN unidade VARCHAR(50);

-- 2. Restaurar dados do backup
UPDATE contrato_produtos cp
SET unidade = b.unidade
FROM contrato_produtos_backup_unidade b
WHERE cp.id = b.id;

-- 3. Reverter queries nos controllers
-- (usar git revert nos commits)
```

## 📊 Estatísticas Esperadas

Após aplicar a migration:
- Contrato-produtos: mantém todos os registros
- Produtos com unidade: 100%
- Registros em backup: igual ao total de contrato-produtos
- Coluna unidade existe: NÃO

## 🎉 Benefícios

1. **Consistência**: Unidade sempre vem da mesma fonte
2. **Manutenção**: Alterar unidade em um lugar atualiza tudo
3. **Simplicidade**: Menos campos para gerenciar
4. **Performance**: Menos dados duplicados
5. **Integridade**: Impossível ter unidades diferentes para o mesmo produto

## 📚 Referências

- Migration: `backend/src/migrations/20260303_remove_unidade_from_contrato_produtos.sql`
- Script: `backend/scripts/remove-unidade-contrato-produtos.js`
- Docs: `docs/UNIDADE-PRODUTO-MIGRATION.md`

---

**Data**: 03/03/2026  
**Status**: ✅ Implementado  
**Próximo Passo**: Aplicar migration e testar
