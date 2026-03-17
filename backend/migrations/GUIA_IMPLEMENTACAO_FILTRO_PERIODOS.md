# 📘 Guia: Implementar Filtro de Períodos Ocultos

**Data:** 16/03/2026  
**Versão:** 1.0.0

---

## 🎯 Objetivo

Este guia explica como adicionar o filtro de períodos ocultos nas queries de listagem do sistema.

---

## 🔧 Helper Criado

Arquivo: `backend/src/utils/periodosHelper.ts`

### Funções Disponíveis

#### 1. `getFiltroPeríodosVisiveis(alias)`
Retorna apenas a condição WHERE.

```typescript
import { getFiltroPeríodosVisiveis } from '../utils/periodosHelper';

const filtro = getFiltroPeríodosVisiveis('per');
// Retorna: "(per.ocultar_dados = false OR per.ocultar_dados IS NULL OR per.id IS NULL)"
```

#### 2. `getJoinPeriodosVisiveis(tabela, alias, aliasPeriodos)`
Retorna JOIN e WHERE separados.

```typescript
import { getJoinPeriodosVisiveis } from '../utils/periodosHelper';

const { join, where } = getJoinPeriodosVisiveis('pedidos', 'p', 'per');
// join: "LEFT JOIN periodos per ON p.periodo_id = per.id"
// where: "(per.ocultar_dados = false OR per.ocultar_dados IS NULL OR per.id IS NULL)"
```

---

## 📝 Como Implementar

### Método 1: Query Nova (Recomendado)

Para queries novas ou que você está reescrevendo:

```typescript
import { getJoinPeriodosVisiveis } from '../utils/periodosHelper';

export const listarPedidos = async (req: Request, res: Response) => {
  const { join, where } = getJoinPeriodosVisiveis('pedidos', 'p');
  
  const query = `
    SELECT p.*
    FROM pedidos p
    ${join}
    WHERE ${where}
    ORDER BY p.created_at DESC
  `;
  
  const result = await db.query(query);
  res.json({ data: result.rows });
};
```

### Método 2: Query Existente com WHERE

Para queries que já têm WHERE:

```typescript
const query = `
  SELECT p.*
  FROM pedidos p
  LEFT JOIN periodos per ON p.periodo_id = per.id
  WHERE p.status = 'aprovado'
    AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
  ORDER BY p.created_at DESC
`;
```

### Método 3: Query Existente sem WHERE

Para queries sem WHERE:

```typescript
const query = `
  SELECT p.*
  FROM pedidos p
  LEFT JOIN periodos per ON p.periodo_id = per.id
  WHERE (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
  ORDER BY p.created_at DESC
`;
```

---

## 📋 Controllers a Atualizar

### Prioridade Alta (Listagens Principais)

#### 1. Pedidos/Compras
**Arquivo:** `backend/src/modules/compras/controllers/compraController.ts`

**Função:** `listarPedidos()`

**Query Atual:**
```sql
FROM pedidos p
WHERE ${whereClause}
```

**Query Atualizada:**
```sql
FROM pedidos p
LEFT JOIN periodos per ON p.periodo_id = per.id
WHERE ${whereClause}
  AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
```

#### 2. Guias de Demanda
**Arquivo:** `backend/src/controllers/guiaController.ts` (se existir)

**Query Atual:**
```sql
FROM guias g
WHERE ...
```

**Query Atualizada:**
```sql
FROM guias g
LEFT JOIN periodos per ON g.periodo_id = per.id
WHERE ...
  AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
```

#### 3. Cardápios
**Arquivo:** `backend/src/controllers/cardapioController.ts` (se existir)

**Query Atual:**
```sql
FROM cardapios c
WHERE ...
```

**Query Atualizada:**
```sql
FROM cardapios c
LEFT JOIN periodos per ON c.periodo_id = per.id
WHERE ...
  AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
```

### Prioridade Média (Dashboards e Relatórios)

#### 4. Dashboard PNAE
**Arquivo:** `backend/src/controllers/pnaeController.ts`

Já usa período ativo, mas pode precisar de ajustes em queries específicas.

#### 5. Planejamento de Compras
**Arquivo:** `backend/src/controllers/planejamentoComprasController.ts`

Verificar queries que listam pedidos históricos.

### Prioridade Baixa (Detalhes e Operações Específicas)

#### 6. Faturamentos
**Arquivo:** `backend/src/modules/faturamentos/controllers/faturamentoController.ts`

Queries que buscam pedidos para faturamento.

#### 7. Recebimentos
**Arquivo:** `backend/src/modules/recebimentos/controllers/recebimentoController.ts`

Queries que listam pedidos para recebimento.

---

## ⚠️ Importante

### O que NÃO Filtrar

❌ **Não adicionar filtro em:**
- Queries de detalhes por ID (GET /pedidos/:id)
- Queries de atualização (UPDATE)
- Queries de deleção (DELETE)
- Queries de contagem para admin/auditoria
- Queries que já filtram por período específico

### Quando Adicionar Filtro

✅ **Adicionar filtro em:**
- Listagens gerais (GET /pedidos, GET /guias, etc.)
- Dashboards e estatísticas
- Relatórios que não especificam período
- Autocomplete e buscas
- Contagens para usuários finais

---

## 🧪 Como Testar

### 1. Criar Período de Teste

```sql
INSERT INTO periodos (ano, descricao, data_inicio, data_fim, ativo, ocultar_dados)
VALUES (2023, 'Teste 2023', '2023-01-01', '2023-12-31', false, true);
```

### 2. Criar Pedido no Período

```sql
INSERT INTO pedidos (numero, data_pedido, periodo_id, ...)
VALUES ('PED-2023-000001', '2023-06-15', (SELECT id FROM periodos WHERE ano = 2023), ...);
```

### 3. Testar Listagem

```bash
curl http://localhost:3000/api/pedidos
```

**Resultado Esperado:**
- Pedido de 2023 NÃO deve aparecer na lista
- Apenas pedidos de períodos não ocultos devem aparecer

### 4. Exibir Dados

```sql
UPDATE periodos SET ocultar_dados = false WHERE ano = 2023;
```

### 5. Testar Novamente

```bash
curl http://localhost:3000/api/pedidos
```

**Resultado Esperado:**
- Pedido de 2023 DEVE aparecer na lista

---

## 📊 Exemplo Completo

### Antes (sem filtro)

```typescript
export const listarPedidos = async (req: Request, res: Response) => {
  const query = `
    SELECT 
      p.*,
      u.nome as usuario_nome
    FROM pedidos p
    JOIN usuarios u ON p.usuario_criacao_id = u.id
    WHERE p.status = $1
    ORDER BY p.created_at DESC
  `;
  
  const result = await db.query(query, ['aprovado']);
  res.json({ data: result.rows });
};
```

### Depois (com filtro)

```typescript
import { getJoinPeriodosVisiveis } from '../utils/periodosHelper';

export const listarPedidos = async (req: Request, res: Response) => {
  const { join, where } = getJoinPeriodosVisiveis('pedidos', 'p');
  
  const query = `
    SELECT 
      p.*,
      u.nome as usuario_nome
    FROM pedidos p
    JOIN usuarios u ON p.usuario_criacao_id = u.id
    ${join}
    WHERE p.status = $1
      AND ${where}
    ORDER BY p.created_at DESC
  `;
  
  const result = await db.query(query, ['aprovado']);
  res.json({ data: result.rows });
};
```

---

## 🔍 Verificação

### Checklist de Implementação

Para cada controller atualizado:

- [ ] Importou o helper
- [ ] Adicionou LEFT JOIN com periodos
- [ ] Adicionou condição WHERE para ocultar_dados
- [ ] Testou com período oculto
- [ ] Testou com período visível
- [ ] Verificou que detalhes por ID ainda funcionam
- [ ] Documentou a mudança

---

## 📚 Referências

- `backend/src/utils/periodosHelper.ts` - Helper functions
- `backend/migrations/20260316_add_ocultar_dados_periodos.sql` - Migração
- `backend/migrations/OCULTAR_DADOS_PERIODOS.md` - Documentação da funcionalidade

---

**Última atualização:** 16/03/2026  
**Versão:** 1.0.0
