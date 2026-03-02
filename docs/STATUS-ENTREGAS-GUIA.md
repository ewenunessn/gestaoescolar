# Status Automático de Entregas na Guia de Demanda

## Problema Resolvido

Quando entregas eram realizadas através do app entregador, o status dos itens na guia de demanda não era atualizado automaticamente, permanecendo como "pendente" mesmo após entregas parciais ou totais.

## Solução Implementada

### 1. Cálculo Automático de Status no Backend

Modificado os métodos `listarProdutosPorEscola` e `listarProdutosPorGuia` no `GuiaModel` para calcular automaticamente o status baseado nas entregas realizadas:

```typescript
CASE 
  WHEN COALESCE(gpe.quantidade_total_entregue, 0) >= gpe.quantidade THEN 'entregue'
  WHEN COALESCE(gpe.quantidade_total_entregue, 0) > 0 THEN 'parcial'
  WHEN gpe.status = 'em_rota' THEN 'em_rota'
  WHEN gpe.status = 'programada' THEN 'programada'
  WHEN gpe.status = 'cancelado' THEN 'cancelado'
  ELSE 'pendente'
END as status_calculado
```

### 2. Atualização Automática do Status na Coluna

Modificado o método `criar` no `HistoricoEntregaModel` para atualizar automaticamente a coluna `status` em `guia_produto_escola` quando uma entrega é registrada:

```sql
UPDATE guia_produto_escola
SET 
  status = CASE 
    WHEN (SELECT COALESCE(SUM(quantidade_entregue), 0) FROM historico_entregas WHERE guia_produto_escola_id = $1) >= quantidade THEN 'entregue'
    WHEN (SELECT COALESCE(SUM(quantidade_entregue), 0) FROM historico_entregas WHERE guia_produto_escola_id = $1) > 0 THEN 'parcial'
    ELSE status
  END
WHERE id = $1
```

Isso garante que:
- O status é atualizado IMEDIATAMENTE quando uma entrega é registrada
- Não depende apenas do cálculo na query de listagem
- O status persiste no banco de dados

### 2. Lógica de Status

O status é calculado automaticamente seguindo esta ordem de prioridade:

1. **Entregue**: Quando `quantidade_total_entregue >= quantidade` (entrega completa)
2. **Parcial**: Quando `quantidade_total_entregue > 0` mas menor que a quantidade total (entrega parcial)
3. **Em Rota**: Quando o status manual está definido como "em_rota"
4. **Programada**: Quando o status manual está definido como "programada"
5. **Cancelado**: Quando o status manual está definido como "cancelado"
6. **Pendente**: Status padrão quando nenhuma das condições acima é atendida

### 3. Novo Status "Parcial"

Adicionado novo status "parcial" para indicar quando uma entrega foi realizada parcialmente:

- **Cor**: Amarelo (warning)
- **Ícone**: CheckCircle
- **Significado**: Parte da quantidade foi entregue, mas ainda há saldo pendente

### 4. Deleção em Cascata

A foreign key `guia_produto_escola_id` na tabela `historico_entregas` já está configurada com `ON DELETE CASCADE`, garantindo que:

- Quando um item da guia é deletado
- Todos os históricos de entrega relacionados são automaticamente deletados
- Não há necessidade de código adicional para limpeza

## Exemplos de Uso

### Exemplo 1: Entrega Total
```
Quantidade programada: 100 kg
Quantidade entregue: 100 kg
Status: ENTREGUE (verde)
```

### Exemplo 2: Entrega Parcial
```
Quantidade programada: 100 kg
Quantidade entregue: 50 kg
Status: PARCIAL (amarelo)
Saldo pendente: 50 kg
```

### Exemplo 3: Múltiplas Entregas Parciais
```
Quantidade programada: 100 kg
Entrega 1: 30 kg → Status: PARCIAL
Entrega 2: 40 kg → Status: PARCIAL (total: 70 kg)
Entrega 3: 30 kg → Status: ENTREGUE (total: 100 kg)
```

### Exemplo 4: Entrega Excedente
```
Quantidade programada: 100 kg
Quantidade entregue: 105 kg
Status: ENTREGUE (verde)
Observação: Sistema permite entrega maior que o programado
```

## Interface do Usuário

### Cores de Status

- 🟢 **Verde (success)**: Entregue
- 🟡 **Amarelo (warning)**: Parcial ou Pendente
- 🔵 **Azul (info)**: Em Rota
- ⚪ **Cinza (default)**: Programada
- 🔴 **Vermelho (error)**: Cancelado

### Opções no Formulário

O select de status agora inclui:
1. Pendente (Pronto para entrega)
2. Programada (Aguardando)
3. Em Rota
4. **Parcial (Entrega parcial realizada)** ← NOVO
5. Entregue
6. Cancelado

## Fluxo de Atualização

1. **Entregador realiza entrega** (app mobile/web)
   - Cria registro em `historico_entregas`
   - Atualiza `quantidade_total_entregue` em `guia_produto_escola`
   - Atualiza `entrega_confirmada` se quantidade total foi entregue

2. **Backend calcula status** (ao listar itens)
   - Compara `quantidade_total_entregue` com `quantidade`
   - Retorna status calculado automaticamente

3. **Frontend exibe status** (GuiasDemanda.tsx)
   - Mostra chip colorido com status atual
   - Atualiza automaticamente ao recarregar a página

## Arquivos Modificados

### Backend
- `backend/src/modules/guias/models/Guia.ts`
  - `listarProdutosPorEscola()`: Adicionado cálculo de status
  - `listarProdutosPorGuia()`: Adicionado cálculo de status

- `backend/src/modules/entregas/models/HistoricoEntrega.ts`
  - `criar()`: Adicionada atualização automática do status na coluna
  - `deletar()`: Adicionada atualização automática do status ao deletar histórico

- `backend/scripts/atualizar-status-entregas.js`
  - Script para atualizar status de itens existentes (executar uma vez)

### Frontend
- `frontend/src/pages/GuiasDemanda.tsx`
  - `getStatusColor()`: Adicionado cor para status "parcial"
  - `getStatusIcon()`: Adicionado ícone para status "parcial"
  - Formulário: Adicionada opção "parcial" no select
  - Batch: Adicionada opção "parcial" no select

### Banco de Dados
- `backend/src/migrations/20250228_create_historico_entregas.sql`
  - Foreign key com `ON DELETE CASCADE` já configurada

## Script de Correção

Para atualizar o status de todos os itens existentes que já têm entregas, execute:

```bash
cd backend
node scripts/atualizar-status-entregas.js
```

Este script:
- Atualiza o status de todos os itens com entregas registradas
- Mostra um resumo das atualizações por status
- Deve ser executado uma única vez após o deploy

## Testes Recomendados

### Teste 1: Entrega Parcial
1. Criar item na guia com 100 kg
2. Realizar entrega de 50 kg pelo app
3. Verificar que status mudou para "PARCIAL"
4. Verificar que saldo pendente é 50 kg

### Teste 2: Entrega Total
1. Criar item na guia com 100 kg
2. Realizar entrega de 100 kg pelo app
3. Verificar que status mudou para "ENTREGUE"
4. Verificar que saldo pendente é 0 kg

### Teste 3: Múltiplas Entregas
1. Criar item na guia com 100 kg
2. Realizar entrega de 30 kg → Status: PARCIAL
3. Realizar entrega de 40 kg → Status: PARCIAL (70 kg total)
4. Realizar entrega de 30 kg → Status: ENTREGUE (100 kg total)

### Teste 4: Deleção em Cascata
1. Criar item na guia
2. Realizar algumas entregas
3. Deletar o item da guia
4. Verificar que históricos de entrega foram deletados automaticamente

## Observações Importantes

1. **Status Manual vs Automático**: O status "entregue" e "parcial" são calculados automaticamente. Os outros status (programada, em_rota, cancelado) podem ser definidos manualmente.

2. **Prioridade**: O status calculado (entregue/parcial) tem prioridade sobre o status manual quando há entregas registradas.

3. **Retroativo**: A mudança é retroativa - todos os itens com entregas existentes terão o status atualizado automaticamente na próxima consulta.

4. **Performance**: O cálculo é feito na query SQL, não há impacto significativo na performance.

5. **Consistência**: O status sempre reflete o estado real das entregas, não pode ficar desatualizado.
