# Correção de Problema de Timezone em Datas

## Problema Identificado

Ao trabalhar com datas no sistema, foi identificado um problema onde:
- Usuário seleciona: 03/03/2026 até 04/03/2026
- Sistema exibe/filtra: 02/03/2026 até 03/03/2026

Isso ocorre devido a um deslocamento de 1 dia causado por problemas de timezone.

## Causa Raiz

### 1. Frontend/Mobile - Conversão de Data para String

**Código problemático:**
```typescript
const hoje = new Date().toISOString().split('T')[0];
```

**Problema:**
- `new Date()` cria uma data no timezone local (ex: GMT-3 para Brasília)
- `toISOString()` converte para UTC (GMT+0)
- Se for 23:00 do dia 03/03 em GMT-3, será 02:00 do dia 04/03 em UTC
- Ao fazer `.split('T')[0]`, pegamos "2026-04-04" ao invés de "2026-03-03"

### 2. Backend - Comparação de TIMESTAMP com DATE

**Código problemático:**
```sql
WHERE data_entrega >= $1  -- $1 = '2026-03-03'
```

**Problema:**
- `data_entrega` é do tipo TIMESTAMP (inclui hora e timezone)
- Ao comparar com uma string de data, o PostgreSQL faz conversão implícita
- A conversão pode usar UTC ao invés do timezone local
- Isso causa deslocamento de 1 dia dependendo do horário

## Solução Implementada

### 1. Frontend/Mobile - Função Utilitária

Criado arquivo `apps/entregador-native/src/utils/dateUtils.ts`:

```typescript
export function obterDataAtual(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
```

**Benefícios:**
- Usa métodos que trabalham no timezone local
- Não faz conversão para UTC
- Garante que a data seja exatamente a que o usuário vê

### 2. Backend - Uso de DATE() nas Queries

**Código corrigido:**
```sql
WHERE DATE(data_entrega) >= $1  -- Compara apenas a parte da data
```

**Benefícios:**
- `DATE()` extrai apenas a parte da data do TIMESTAMP
- Ignora a hora e timezone
- Comparação é feita apenas com ano-mês-dia

## Arquivos Corrigidos

### Frontend/Mobile
- `apps/entregador-native/src/utils/dateUtils.ts` (novo)
- `apps/entregador-native/src/screens/FiltroManualScreen.tsx`
- `apps/entregador-native/src/screens/ComprovantesScreen.tsx`

### Backend
- `backend/src/modules/entregas/models/ComprovanteEntrega.ts`
  - Removida duplicação do método `listar`
  - Adicionado `DATE()` nas comparações de data
  - Renomeado método para `listarPorEscola` onde apropriado

## Áreas que Podem Ter o Mesmo Problema

Identificadas outras áreas que usam o padrão problemático:

### Frontend
- `frontend/src/pages/Romaneio.tsx`
- `frontend/src/pages/GuiasDemanda.tsx`
- `frontend/src/pages/SaldoContratosModalidades.tsx`
- `frontend/src/pages/DemandaForm.tsx`
- `frontend/src/pages/DemandasLista.tsx`
- `frontend/src/pages/NovoPedido.tsx`
- `frontend/src/pages/EditarPedido.tsx`

### Backend
- `backend/src/modules/guias/models/Guia.ts`
- `backend/src/modules/entregas/models/Entrega.ts`

## Recomendações

1. **Sempre usar funções utilitárias** para converter datas ao invés de `toISOString().split('T')[0]`

2. **No backend, sempre usar DATE()** ao comparar TIMESTAMP com strings de data:
   ```sql
   -- ❌ Errado
   WHERE data_entrega >= '2026-03-03'
   
   -- ✅ Correto
   WHERE DATE(data_entrega) >= '2026-03-03'
   ```

3. **Considerar usar DATE ao invés de TIMESTAMP** para campos que não precisam de hora:
   - Se o campo só armazena dia/mês/ano, use tipo DATE
   - Se precisa de hora exata, use TIMESTAMP WITH TIME ZONE

4. **Testar com diferentes timezones** ao trabalhar com datas

## Testes Recomendados

1. Selecionar data de hoje e verificar se filtra corretamente
2. Selecionar intervalo de datas e verificar se inclui os dias corretos
3. Testar próximo à meia-noite (23:00-01:00) para verificar mudança de dia
4. Testar com usuários em diferentes timezones (se aplicável)
