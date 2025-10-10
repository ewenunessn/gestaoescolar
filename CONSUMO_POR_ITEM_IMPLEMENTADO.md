# ✅ Consumo por Item Implementado

## 📋 Resumo

Implementado sistema de registro e reversão de consumo **item por item** no faturamento, permitindo controle granular sobre o consumo de cada produto em cada modalidade.

## 🔧 Alterações Realizadas

### 1. **Backend - Banco de Dados**

#### Migration: `add_consumo_item_columns.sql`
```sql
ALTER TABLE faturamento_itens 
ADD COLUMN IF NOT EXISTS consumo_registrado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_consumo TIMESTAMP;
```

**Executado em:**
- ✅ Banco local
- ✅ Banco Neon (produção)

### 2. **Backend - Service**

#### Arquivo: `backend/src/modules/pedidos/services/FaturamentoService.ts`

**Novos Métodos:**

```typescript
// Registrar consumo de um item específico
async registrarConsumoItem(faturamentoId: number, itemId: number): Promise<void>

// Reverter consumo de um item específico
async reverterConsumoItem(faturamentoId: number, itemId: number): Promise<void>
```

**Funcionalidades:**
- ✅ Registro individual de consumo por item
- ✅ Validação de saldo antes de registrar
- ✅ Atualização do saldo do contrato
- ✅ Registro no histórico de saldo
- ✅ Locks (FOR UPDATE) para evitar race conditions
- ✅ Reversão de consumo com restauração de saldo
- ✅ Transações atômicas

### 3. **Backend - Controller**

#### Arquivo: `backend/src/modules/pedidos/controllers/faturamentoController.ts`

**Novos Endpoints:**

```typescript
POST /api/faturamentos/:id/itens/:itemId/registrar-consumo
POST /api/faturamentos/:id/itens/:itemId/reverter-consumo
```

**Atualizado:**
- ✅ Método `obterResumoFaturamento` agora retorna:
  - `faturamento_item_id` - ID do item
  - `consumo_registrado` - Status do consumo
  - `data_consumo` - Data do registro

### 4. **Backend - Model**

#### Arquivo: `backend/src/modules/pedidos/models/Faturamento.ts`

**Atualizado:**
- ✅ Método `buscarItens` agora retorna campos de consumo

### 5. **Backend - Routes**

#### Arquivo: `backend/src/modules/pedidos/routes/faturamentoRoutes.ts`

**Novas Rotas:**
```typescript
router.post('/:id/itens/:itemId/registrar-consumo', registrarConsumoItem);
router.post('/:id/itens/:itemId/reverter-consumo', reverterConsumoItem);
```

### 6. **Frontend - Types**

#### Arquivo: `frontend/src/types/faturamento.ts`

**Atualizados:**

```typescript
export interface FaturamentoItem {
  // ... campos existentes
  consumo_registrado?: boolean;
  data_consumo?: string;
}

export interface ItemCalculado {
  // ... campos existentes
  divisoes: {
    faturamento_item_id?: number;
    // ... campos existentes
    consumo_registrado?: boolean;
    data_consumo?: string;
  }[];
}

export interface Faturamento {
  // ... campos existentes
  pedido_numero?: string;
  status: 'gerado' | 'processado' | 'cancelado' | 'consumido';
}
```

### 7. **Frontend - Service**

#### Arquivo: `frontend/src/services/faturamento.ts`

**Novos Métodos:**

```typescript
async registrarConsumoItem(faturamentoId: number, itemId: number): Promise<void>
async reverterConsumoItem(faturamentoId: number, itemId: number): Promise<void>
```

### 8. **Frontend - Interface**

#### Arquivo: `frontend/src/pages/FaturamentoDetalhe.tsx`

**Novas Funcionalidades:**

1. **Tabela de Itens Atualizada:**
   - ✅ Coluna "STATUS" mostrando se o consumo foi registrado
   - ✅ Coluna "AÇÕES" com botões por item:
     - Botão "Registrar" (verde) - para itens pendentes
     - Botão "Reverter" (vermelho) - para itens consumidos

2. **Handlers:**
   ```typescript
   handleRegistrarConsumoItem(itemId: number)
   handleReverterConsumoItem(itemId: number)
   ```

3. **Atualização Automática:**
   - ✅ Após registrar/reverter, a página recarrega os dados
   - ✅ Status visual atualizado em tempo real

## 🎯 Fluxo de Uso

### Registrar Consumo por Item

1. Usuário acessa detalhes do faturamento
2. Clica em "Ver Detalhes" de um contrato
3. Visualiza lista de itens com status
4. Clica em "Registrar" no item desejado
5. Sistema:
   - Valida saldo disponível
   - Registra consumo no banco
   - Atualiza saldo do contrato
   - Registra no histórico
   - Atualiza interface

### Reverter Consumo por Item

1. Usuário acessa detalhes do faturamento
2. Clica em "Ver Detalhes" de um contrato
3. Visualiza lista de itens consumidos
4. Clica em "Reverter" no item desejado
5. Sistema:
   - Restaura saldo do contrato
   - Remove registro de consumo
   - Registra reversão no histórico
   - Atualiza interface

## 🔒 Segurança e Integridade

### Validações Implementadas

1. **Saldo Insuficiente:**
   ```typescript
   if (saldoDisponivel < item.quantidade_modalidade) {
     throw new SaldoInsuficienteError(...)
   }
   ```

2. **Item Já Consumido:**
   ```typescript
   if (item.consumo_registrado) {
     throw new Error('Item já teve consumo registrado')
   }
   ```

3. **Item Não Consumido:**
   ```typescript
   if (!item.consumo_registrado) {
     throw new Error('Item não teve consumo registrado')
   }
   ```

### Locks e Transações

```typescript
// Lock nos registros durante toda a transação
FOR UPDATE

// Transação atômica
BEGIN
  -- Validações
  -- Atualizações
  -- Histórico
COMMIT
```

## 📊 Histórico de Saldo

Cada operação registra no histórico:

```typescript
{
  tipo: 'consumo_item' | 'reversao_consumo_item',
  quantidade: number,
  saldo_anterior: number,
  saldo_novo: number,
  faturamento_id: number,
  faturamento_item_id: number,
  observacao: string
}
```

## 🎨 Interface Visual

### Status dos Itens

- 🟡 **Pendente** - Chip amarelo "Pendente"
- 🟢 **Consumido** - Chip verde "Consumido"

### Botões de Ação

- 🟢 **Registrar** - Botão verde contained
- 🔴 **Reverter** - Botão vermelho outlined

### Feedback ao Usuário

- ✅ Mensagens de sucesso
- ❌ Mensagens de erro detalhadas
- 🔄 Loading durante processamento
- 📊 Atualização automática dos dados

## 🧪 Testes Necessários

### Backend
- [ ] Testar registro de consumo individual
- [ ] Testar reversão de consumo individual
- [ ] Testar validação de saldo
- [ ] Testar locks e race conditions
- [ ] Testar histórico de saldo

### Frontend
- [ ] Testar interface de registro
- [ ] Testar interface de reversão
- [ ] Testar atualização de status
- [ ] Testar mensagens de erro
- [ ] Testar loading states

## 📝 Próximos Passos

1. ✅ Implementação completa
2. ⏳ Testes unitários
3. ⏳ Testes de integração
4. ⏳ Testes de interface
5. ⏳ Documentação de API
6. ⏳ Deploy em produção

## 🎉 Benefícios

1. **Controle Granular:** Registro item por item
2. **Flexibilidade:** Possibilidade de reverter consumos específicos
3. **Rastreabilidade:** Histórico completo de cada operação
4. **Segurança:** Validações e locks para integridade
5. **Usabilidade:** Interface intuitiva e visual clara

---

**Status:** ✅ Implementado e pronto para testes
**Data:** 10/10/2025
**Autor:** Sistema de Faturamento
