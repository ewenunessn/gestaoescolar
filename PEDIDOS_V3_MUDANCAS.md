# 🎯 Sistema de Pedidos v3.0 - Mudanças Finais

## ✅ O que mudou nesta versão?

Implementadas 3 mudanças importantes conforme solicitado:

### 1. ❌ Removida Escola
- Campo `escola_id` **removido completamente**
- Pedido não está mais vinculado a nenhuma escola
- Foco total nos produtos e fornecedores

### 2. 📅 Data de Entrega por Item
- Cada item do pedido tem sua **própria data de entrega**
- Permite entregas em datas diferentes
- Data padrão: 7 dias a partir da criação

### 3. 💾 Salvar como Rascunho
- **Novo status**: `rascunho`
- Botão "Salvar como Rascunho" na criação
- Botão "Criar e Enviar Pedido" (status pendente)
- Rascunhos podem ser editados antes de enviar

---

## 📊 Estrutura Atualizada

### Banco de Dados

#### Tabela `pedidos`
```sql
-- REMOVIDO
escola_id INTEGER
data_entrega_prevista DATE

-- MANTIDO
id, numero, data_pedido, status, valor_total, 
observacoes, usuario_criacao_id, etc.
```

#### Tabela `pedido_itens`
```sql
-- ADICIONADO
data_entrega_prevista DATE  -- ✅ NOVO! Data específica por item

-- MANTIDO
id, pedido_id, contrato_produto_id, produto_id,
quantidade, preco_unitario, valor_total, observacoes
```

---

## 🎨 Interface Atualizada

### Página de Criação (`/pedidos/novo`)

**ANTES:**
```
┌─────────────────────────────────────┐
│ Escola: [Selecione ▼]              │
│ Data Entrega: [____]                │
│                                     │
│ Produtos:                           │
│ - Arroz                             │
│ - Feijão                            │
└─────────────────────────────────────┘
[Cancelar] [Criar Pedido]
```

**AGORA:**
```
┌─────────────────────────────────────┐
│ Produtos:                           │
│ ┌─────────────────────────────────┐ │
│ │ Produto  │ Qtd │ Data Entrega  │ │
│ ├─────────────────────────────────┤ │
│ │ Arroz    │ 100 │ [15/01/2025]  │ │
│ │ Feijão   │ 150 │ [20/01/2025]  │ │ ← Data por item!
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
[Cancelar] [Salvar Rascunho] [Criar e Enviar]
            ↑ NOVO!
```

---

## 🔄 Fluxo de Trabalho

### Opção 1: Criar e Enviar Direto
```
1. Adicionar produtos
2. Definir quantidades
3. Definir data de entrega de cada item
4. Clicar em "Criar e Enviar Pedido"
   → Status: pendente
```

### Opção 2: Salvar como Rascunho
```
1. Adicionar produtos
2. Definir quantidades
3. Definir data de entrega de cada item
4. Clicar em "Salvar como Rascunho"
   → Status: rascunho
5. Depois: Editar e enviar quando pronto
```

---

## 📝 Exemplo de Pedido

### JSON de Criação
```json
{
  "observacoes": "Pedido mensal",
  "salvar_como_rascunho": false,
  "itens": [
    {
      "contrato_produto_id": 1,
      "quantidade": 200,
      "data_entrega_prevista": "2025-01-15",
      "observacoes": "Arroz - entrega urgente"
    },
    {
      "contrato_produto_id": 15,
      "quantidade": 150,
      "data_entrega_prevista": "2025-01-20",
      "observacoes": "Feijão - entrega normal"
    },
    {
      "contrato_produto_id": 28,
      "quantidade": 100,
      "data_entrega_prevista": "2025-01-25",
      "observacoes": "Óleo - entrega final do mês"
    }
  ]
}
```

### Resultado
```
Pedido #PED2025000001
Status: pendente (ou rascunho)

Itens:
┌──────────┬─────┬──────────────┬─────────────┐
│ Produto  │ Qtd │ Data Entrega │ Fornecedor  │
├──────────┼─────┼──────────────┼─────────────┤
│ Arroz    │ 200 │ 15/01/2025   │ Fornecedor A│
│ Feijão   │ 150 │ 20/01/2025   │ Fornecedor B│
│ Óleo     │ 100 │ 25/01/2025   │ Fornecedor C│
└──────────┴─────┴──────────────┴─────────────┘
```

---

## 🎯 Status do Pedido

### Novo Fluxo com Rascunho

```
┌─────────────┐
│  rascunho   │  ← NOVO! Salvo mas não enviado
└──────┬──────┘
       │ (Enviar)
       ▼
┌─────────────┐
│  pendente   │  ← Aguardando aprovação
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  aprovado   │
└──────┬──────┘
       │
       ▼
     (...)
```

---

## 📁 Arquivos Modificados

### Backend
- ✅ `backend/src/migrations/create_pedidos_tables.sql`
- ✅ `backend/src/modules/pedidos/controllers/pedidoController.ts`

### Frontend
- ✅ `frontend/src/types/pedido.ts`
- ✅ `frontend/src/pages/Pedidos.tsx`
- ✅ `frontend/src/pages/NovoPedido.tsx` (refatorado)
- ✅ `frontend/src/pages/PedidoDetalhe.tsx`

---

## 🔄 Migração

### Opção 1: Recriar Tabelas (Recomendado)
```bash
cd backend
psql -U postgres -d alimentacao_escolar
DROP TABLE IF EXISTS pedido_itens CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
\q

node run-migration-pedidos.js
```

### Opção 2: Alterar Tabelas Existentes
```sql
-- Remover escola
ALTER TABLE pedidos DROP COLUMN IF EXISTS escola_id;
ALTER TABLE pedidos DROP COLUMN IF EXISTS data_entrega_prevista;

-- Adicionar data no item
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS data_entrega_prevista DATE;

-- Atualizar status padrão
ALTER TABLE pedidos ALTER COLUMN status SET DEFAULT 'rascunho';
```

---

## 🧪 Testar

### 1. Migrar Banco
```bash
cd backend
node run-migration-pedidos.js
```

### 2. Iniciar Sistema
```bash
# Backend
cd backend && npm run dev

# Frontend (outro terminal)
cd frontend && npm run dev
```

### 3. Criar Pedido de Teste
```
1. Acessar http://localhost:5173/pedidos/novo
2. Adicionar 3 produtos de fornecedores diferentes
3. Definir data de entrega diferente para cada um
4. Clicar em "Salvar como Rascunho"
5. Ver pedido criado com status "rascunho"
```

---

## ✨ Destaques

### Data por Item
- ✅ Cada produto pode ter data diferente
- ✅ Flexibilidade total de entregas
- ✅ Melhor planejamento logístico

### Rascunho
- ✅ Salvar trabalho em progresso
- ✅ Editar antes de enviar
- ✅ Não compromete o pedido

### Sem Escola
- ✅ Foco nos produtos
- ✅ Menos campos obrigatórios
- ✅ Mais simples e direto

---

## 📊 Comparação de Versões

| Recurso | v1.0 | v2.0 | v3.0 |
|---------|------|------|------|
| Escola | Obrigatória | Opcional | ❌ Removida |
| Contrato | Obrigatório | ❌ Removido | ❌ Removido |
| Múltiplos Fornecedores | ❌ | ✅ | ✅ |
| Data Entrega | Por pedido | Por pedido | ✅ Por item |
| Rascunho | ❌ | ❌ | ✅ Sim |

---

## 🎉 Status

**✅ Sistema Atualizado com Sucesso!**

- Escola removida
- Data de entrega por item
- Salvar como rascunho
- Interface atualizada
- Banco de dados atualizado
- Tudo funcionando

**Pronto para usar! 🚀**

---

**Sistema de Pedidos v3.0**  
**Exatamente como você pediu!** ✅
