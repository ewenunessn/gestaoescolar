# 🔄 Sistema de Pedidos Flexíveis - Mudanças Implementadas

## ✅ O que mudou?

O sistema foi **completamente refatorado** para permitir **pedidos únicos e flexíveis** onde você pode adicionar produtos de **qualquer contrato e fornecedor** no mesmo pedido!

## 🎯 Principais Mudanças

### 1. Banco de Dados
**ANTES:**
- Pedido amarrado a 1 contrato específico
- Pedido amarrado a 1 escola obrigatória
- Só podia adicionar produtos daquele contrato

**AGORA:**
- ✅ Pedido **NÃO** está amarrado a contrato
- ✅ Escola é **opcional**
- ✅ Pode adicionar produtos de **qualquer contrato ativo**
- ✅ Múltiplos fornecedores no mesmo pedido

### 2. Backend - Estrutura

#### Tabela `pedidos`
```sql
-- REMOVIDO
contrato_id INTEGER NOT NULL

-- MODIFICADO
escola_id INTEGER REFERENCES escolas(id) -- Agora é opcional (NULL permitido)
```

#### Controller
- ✅ Validação de contrato removida
- ✅ Validação de escola removida (opcional)
- ✅ Validação de produtos agora verifica se contrato está ativo
- ✅ Novo endpoint: `GET /api/pedidos/produtos-disponiveis`

### 3. Frontend - Interface

#### Página de Criação (`/pedidos/novo`)
**ANTES:**
1. Selecionar contrato
2. Selecionar escola
3. Adicionar produtos daquele contrato

**AGORA:**
1. ✅ **Buscar qualquer produto** (autocomplete com todos os produtos)
2. ✅ Escola é opcional
3. ✅ Produtos agrupados por fornecedor
4. ✅ Mostra fornecedor e contrato de cada produto
5. ✅ Resumo mostra quantos fornecedores estão no pedido

#### Página de Listagem (`/pedidos`)
**ANTES:**
- Mostrava 1 fornecedor por pedido

**AGORA:**
- ✅ Mostra "X fornecedores" quando há múltiplos
- ✅ Tooltip com nomes dos fornecedores
- ✅ Chip visual para múltiplos fornecedores

#### Página de Detalhes (`/pedidos/:id`)
**ANTES:**
- Mostrava dados de 1 contrato e 1 fornecedor

**AGORA:**
- ✅ Lista todos os fornecedores envolvidos (chips)
- ✅ Tabela mostra fornecedor e contrato de cada item
- ✅ Itens ordenados por fornecedor

## 📊 Exemplo de Uso

### Criar Pedido Flexível

```
1. Acessar /pedidos/novo
2. (Opcional) Selecionar escola
3. Buscar "Arroz" no autocomplete
   - Aparece: Arroz - Fornecedor A (R$ 5,50/kg)
   - Aparece: Arroz - Fornecedor B (R$ 5,20/kg)
4. Adicionar Arroz do Fornecedor A
5. Buscar "Feijão"
   - Aparece: Feijão - Fornecedor C (R$ 7,80/kg)
6. Adicionar Feijão do Fornecedor C
7. Salvar

Resultado: 1 pedido com produtos de 2 fornecedores diferentes!
```

## 🔄 Migration

Para atualizar o banco de dados:

```bash
cd backend

# Opção 1: Recriar tabelas (CUIDADO: apaga dados)
psql -U postgres -d alimentacao_escolar
DROP TABLE IF EXISTS pedido_itens CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
\q

node run-migration-pedidos.js

# Opção 2: Alterar tabela existente (mantém dados)
psql -U postgres -d alimentacao_escolar
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_contrato_id_fkey;
ALTER TABLE pedidos DROP COLUMN IF EXISTS contrato_id;
ALTER TABLE pedidos ALTER COLUMN escola_id DROP NOT NULL;
\q
```

## 📁 Arquivos Modificados

### Backend
- ✅ `backend/src/migrations/create_pedidos_tables.sql`
- ✅ `backend/src/modules/pedidos/controllers/pedidoController.ts`
- ✅ `backend/src/modules/pedidos/routes/pedidoRoutes.ts`

### Frontend
- ✅ `frontend/src/types/pedido.ts`
- ✅ `frontend/src/services/pedidos.ts`
- ✅ `frontend/src/pages/Pedidos.tsx`
- ✅ `frontend/src/pages/NovoPedido.tsx` (refatorado completamente)
- ✅ `frontend/src/pages/PedidoDetalhe.tsx`

## 🎨 Novos Recursos

### 1. Autocomplete Inteligente
- Busca por nome do produto
- Agrupa por fornecedor
- Mostra preço e unidade
- Mostra contrato

### 2. Resumo Dinâmico
- Total de itens
- Total de fornecedores
- Quantidade total
- Valor total
- Lista de fornecedores (chips)

### 3. Visualização Agrupada
- Itens agrupados por fornecedor
- Fácil identificação de origem
- Informações completas de cada item

## 🔍 Validações Mantidas

- ✅ Pelo menos 1 item obrigatório
- ✅ Quantidades > 0
- ✅ Produtos devem estar em contratos ativos
- ✅ Preços vêm do contrato
- ✅ Transações para integridade

## 📈 Benefícios

### Para o Usuário
1. **Flexibilidade Total** - Adicione produtos de qualquer fornecedor
2. **Menos Pedidos** - 1 pedido ao invés de vários
3. **Mais Rápido** - Não precisa criar pedido por contrato
4. **Melhor Visão** - Vê todos os fornecedores de uma vez

### Para o Sistema
1. **Menos Complexidade** - Não precisa gerenciar múltiplos pedidos
2. **Melhor Rastreamento** - 1 número de pedido para tudo
3. **Mais Eficiente** - Menos registros no banco
4. **Mais Escalável** - Suporta qualquer quantidade de fornecedores

## 🚀 Como Testar

### 1. Atualizar Banco
```bash
cd backend
node run-migration-pedidos.js
```

### 2. Iniciar Backend
```bash
cd backend
npm run dev
```

### 3. Iniciar Frontend
```bash
cd frontend
npm run dev
```

### 4. Testar Criação
```
1. Acessar http://localhost:5173/pedidos/novo
2. Buscar produtos de diferentes fornecedores
3. Adicionar vários produtos
4. Ver resumo com múltiplos fornecedores
5. Salvar
6. Ver detalhes do pedido criado
```

## 📝 Exemplo de Pedido

```json
{
  "escola_id": 5,  // Opcional
  "data_entrega_prevista": "2025-01-20",
  "observacoes": "Pedido mensal",
  "itens": [
    {
      "contrato_produto_id": 1,  // Arroz - Fornecedor A
      "quantidade": 200
    },
    {
      "contrato_produto_id": 15, // Feijão - Fornecedor B
      "quantidade": 150
    },
    {
      "contrato_produto_id": 28, // Óleo - Fornecedor C
      "quantidade": 100
    }
  ]
}
```

Resultado: **1 pedido com 3 fornecedores diferentes!**

## ✨ Destaques

- ✅ **Interface moderna** com autocomplete
- ✅ **Busca inteligente** de produtos
- ✅ **Agrupamento visual** por fornecedor
- ✅ **Resumo em tempo real**
- ✅ **Validações robustas**
- ✅ **Código limpo e organizado**
- ✅ **Totalmente funcional**

## 🎉 Status

**✅ Sistema Refatorado e Pronto!**

- Banco de dados atualizado
- Backend refatorado
- Frontend completamente novo
- Testes realizados
- Documentação atualizada
- Pronto para uso em produção

---

**Sistema de Pedidos Flexíveis v2.0**  
Refatorado com sucesso! 🚀
