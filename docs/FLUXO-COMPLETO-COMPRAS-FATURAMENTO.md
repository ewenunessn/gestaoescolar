# Fluxo Completo: Compras → Faturamento → Distribuição por Modalidades

## Entendimento Correto do Sistema

### O Papel de Cada Módulo

```
COMPRAS (pedidos)
  ↓ Cria ordem de compra com itens
  
FATURAMENTO
  ↓ Distribui itens por MODALIDADE
  ↓ (Creche, Pré-escola, Fundamental, EJA)
  
RECEBIMENTO
  ↓ Confirma entrega física
  
ESTOQUE CENTRAL
  ↓ Armazena produtos
  
GUIAS DE ENTREGA
  ↓ Distribui para ESCOLAS
  
ESTOQUE ESCOLAR
  ↓ Cada escola recebe
  
CONSUMO
  ↓ Merenda preparada
```

---

## Como Funciona o Faturamento

### Estrutura de Dados

```sql
-- 1. COMPRA (pedido)
pedidos (
  id: 1
  numero: "COMP-MAR2026000001"
  data_pedido: "2026-03-01"
  valor_total: 10000.00
  status: "pendente"
)

-- 2. ITENS DA COMPRA (sem modalidade)
pedido_itens (
  id: 1
  pedido_id: 1
  produto_id: 5 (Arroz)
  quantidade: 2000 kg
  preco_unitario: 5.00
  valor_total: 10000.00
)

-- 3. FATURAMENTO (cabeçalho)
faturamentos_pedidos (
  id: 1
  pedido_id: 1
  data_faturamento: "2026-03-05"
  usuario_id: 10
  observacoes: "Distribuição mensal"
)

-- 4. ITENS DO FATURAMENTO (COM MODALIDADE) ← AQUI É A MÁGICA!
faturamentos_itens (
  id: 1
  faturamento_pedido_id: 1
  pedido_item_id: 1
  modalidade_id: 1 (Creche)
  quantidade_alocada: 400 kg
  preco_unitario: 5.00
  valor_total: 2000.00
)

faturamentos_itens (
  id: 2
  faturamento_pedido_id: 1
  pedido_item_id: 1
  modalidade_id: 2 (Pré-escola)
  quantidade_alocada: 500 kg
  preco_unitario: 5.00
  valor_total: 2500.00
)

faturamentos_itens (
  id: 3
  faturamento_pedido_id: 1
  pedido_item_id: 1
  modalidade_id: 3 (Fundamental)
  quantidade_alocada: 900 kg
  preco_unitario: 5.00
  valor_total: 4500.00
)

faturamentos_itens (
  id: 4
  faturamento_pedido_id: 1
  pedido_item_id: 1
  modalidade_id: 4 (EJA)
  quantidade_alocada: 200 kg
  preco_unitario: 5.00
  valor_total: 1000.00
)
```

### Resumo Visual

```
COMPRA: 2000 kg de Arroz
    ↓
FATURAMENTO distribui:
    ├─ Creche: 400 kg (20%)
    ├─ Pré-escola: 500 kg (25%)
    ├─ Fundamental: 900 kg (45%)
    └─ EJA: 200 kg (10%)
```

---

## Fluxo Detalhado Passo a Passo

### Passo 1: Criar Compra (Pedido)

**Responsável**: Gestor de Compras

```typescript
POST /api/pedidos
{
  "observacoes": "Compra mensal de março",
  "competencia_mes_ano": "2026-03",
  "itens": [
    {
      "contrato_produto_id": 15,
      "quantidade": 2000,
      "data_entrega_prevista": "2026-03-10"
    },
    {
      "contrato_produto_id": 18,
      "quantidade": 1500,
      "data_entrega_prevista": "2026-03-10"
    }
  ]
}
```

**Resultado**:
- Cria pedido com número automático
- Itens SEM modalidade ainda
- Status: "pendente"

---

### Passo 2: Criar Faturamento e Distribuir por Modalidade

**Responsável**: Gestor Financeiro / Nutricionista

```typescript
POST /api/faturamentos
{
  "pedido_id": 1,
  "observacoes": "Distribuição conforme cardápio mensal",
  "itens": [
    // Arroz (2000 kg) dividido por modalidade
    {
      "pedido_item_id": 1,
      "modalidade_id": 1, // Creche
      "quantidade_alocada": 400,
      "preco_unitario": 5.00
    },
    {
      "pedido_item_id": 1,
      "modalidade_id": 2, // Pré-escola
      "quantidade_alocada": 500,
      "preco_unitario": 5.00
    },
    {
      "pedido_item_id": 1,
      "modalidade_id": 3, // Fundamental
      "quantidade_alocada": 900,
      "preco_unitario": 5.00
    },
    {
      "pedido_item_id": 1,
      "modalidade_id": 4, // EJA
      "quantidade_alocada": 200,
      "preco_unitario": 5.00
    },
    
    // Feijão (1500 kg) dividido por modalidade
    {
      "pedido_item_id": 2,
      "modalidade_id": 1, // Creche
      "quantidade_alocada": 300,
      "preco_unitario": 6.00
    },
    {
      "pedido_item_id": 2,
      "modalidade_id": 2, // Pré-escola
      "quantidade_alocada": 400,
      "preco_unitario": 6.00
    },
    {
      "pedido_item_id": 2,
      "modalidade_id": 3, // Fundamental
      "quantidade_alocada": 650,
      "preco_unitario": 6.00
    },
    {
      "pedido_item_id": 2,
      "modalidade_id": 4, // EJA
      "quantidade_alocada": 150,
      "preco_unitario": 6.00
    }
  ]
}
```

**Validações do Sistema**:
```typescript
// 1. Verifica se soma das quantidades não excede o pedido
const totalAlocado = itens
  .filter(i => i.pedido_item_id === 1)
  .reduce((sum, i) => sum + i.quantidade_alocada, 0);

if (totalAlocado > pedidoItem.quantidade) {
  throw new Error('Quantidade alocada excede quantidade do pedido');
}

// 2. Permite alocar menos (parcial)
// Exemplo: Pedido de 2000 kg, mas aloca apenas 1800 kg
// Os 200 kg restantes podem ser alocados depois
```

---

### Passo 3: Consultar Distribuição

**Endpoint**: `GET /api/faturamentos/pedido/:pedidoId`

**Resposta**:
```json
{
  "success": true,
  "data": [
    {
      "faturamento_id": 1,
      "pedido_numero": "COMP-MAR2026000001",
      "produto_nome": "Arroz Tipo 1",
      "modalidade_nome": "Creche",
      "quantidade_alocada": 400,
      "preco_unitario": 5.00,
      "valor_total": 2000.00
    },
    {
      "faturamento_id": 1,
      "pedido_numero": "COMP-MAR2026000001",
      "produto_nome": "Arroz Tipo 1",
      "modalidade_nome": "Pré-escola",
      "quantidade_alocada": 500,
      "preco_unitario": 5.00,
      "valor_total": 2500.00
    },
    // ... outros itens
  ]
}
```

---

### Passo 4: Resumo por Modalidade

**Endpoint**: `GET /api/faturamentos/:id/resumo`

**Resposta**:
```json
{
  "success": true,
  "data": [
    {
      "modalidade_nome": "Creche",
      "modalidade_repasse": 1.50,
      "total_itens": 2,
      "quantidade_total": 700,
      "valor_total_modalidade": 3800.00
    },
    {
      "modalidade_nome": "Pré-escola",
      "modalidade_repasse": 1.00,
      "total_itens": 2,
      "quantidade_total": 900,
      "valor_total_modalidade": 4900.00
    },
    {
      "modalidade_nome": "Fundamental",
      "modalidade_repasse": 0.50,
      "total_itens": 2,
      "quantidade_total": 1550,
      "valor_total_modalidade": 8400.00
    },
    {
      "modalidade_nome": "EJA",
      "modalidade_repasse": 0.40,
      "total_itens": 2,
      "quantidade_total": 350,
      "valor_total_modalidade": 1900.00
    }
  ]
}
```

---

## Por Que Faturamento Distribui por Modalidade?

### Razões Legais e Operacionais

1. **PNAE - Programa Nacional de Alimentação Escolar**
   - Cada modalidade tem valor de repasse diferente
   - Creche: R$ 1,50/aluno/dia
   - Pré-escola: R$ 1,00/aluno/dia
   - Fundamental: R$ 0,50/aluno/dia
   - EJA: R$ 0,40/aluno/dia

2. **Prestação de Contas ao FNDE**
   - Precisa comprovar quanto foi gasto em cada modalidade
   - Relatório obrigatório: "Quanto do recurso da Creche foi usado?"

3. **Cardápios Diferentes**
   - Creche: Mais leite, frutas, papinhas
   - Fundamental: Mais arroz, feijão, proteínas
   - EJA: Refeições noturnas diferentes

4. **Controle Orçamentário**
   - Cada modalidade tem orçamento separado
   - Não pode usar dinheiro da Creche no Fundamental

---

## Exemplo Real Completo

### Cenário: Secretaria Municipal com 50 Escolas

**Dados**:
- 2.000 alunos na Creche
- 3.000 alunos na Pré-escola
- 8.000 alunos no Fundamental
- 1.000 alunos na EJA
- **Total: 14.000 alunos**

**Compra de Arroz**: 2.000 kg

### Cálculo de Distribuição por Modalidade

```typescript
// Proporção de alunos
const proporcoes = {
  creche: 2000 / 14000 = 0.143 (14.3%)
  preEscola: 3000 / 14000 = 0.214 (21.4%)
  fundamental: 8000 / 14000 = 0.571 (57.1%)
  eja: 1000 / 14000 = 0.071 (7.1%)
}

// Distribuição do arroz
const distribuicao = {
  creche: 2000 * 0.143 = 286 kg
  preEscola: 2000 * 0.214 = 428 kg
  fundamental: 2000 * 0.571 = 1142 kg
  eja: 2000 * 0.071 = 142 kg
}

// Ajuste de arredondamento
// Total: 286 + 428 + 1142 + 142 = 1998 kg
// Faltam 2 kg → adiciona no Fundamental
// Final: 286 + 428 + 1144 + 142 = 2000 kg ✓
```

### Faturamento Criado

```sql
INSERT INTO faturamentos_itens VALUES
  (1, 1, 1, 1, 286, 5.00),  -- Creche
  (2, 1, 1, 2, 428, 5.00),  -- Pré-escola
  (3, 1, 1, 3, 1144, 5.00), -- Fundamental
  (4, 1, 1, 4, 142, 5.00);  -- EJA
```

---

## Relatórios Gerados

### Relatório 1: Valor por Modalidade

```sql
SELECT 
  m.nome as modalidade,
  m.valor_repasse,
  COUNT(DISTINCT e.id) as total_escolas,
  SUM(em.quantidade_alunos) as total_alunos,
  SUM(fi.valor_total) as valor_gasto,
  ROUND(
    SUM(fi.valor_total) / SUM(em.quantidade_alunos),
    2
  ) as per_capita
FROM faturamentos_itens fi
JOIN modalidades m ON fi.modalidade_id = m.id
JOIN escola_modalidades em ON m.id = em.modalidade_id
JOIN escolas e ON em.escola_id = e.id
WHERE fi.faturamento_pedido_id = 1
GROUP BY m.id, m.nome, m.valor_repasse;
```

**Resultado**:
```
Modalidade    | Repasse | Escolas | Alunos | Gasto    | Per Capita
--------------|---------|---------|--------|----------|------------
Creche        | 1.50    | 15      | 2000   | 1430.00  | 0.72
Pré-escola    | 1.00    | 20      | 3000   | 2140.00  | 0.71
Fundamental   | 0.50    | 45      | 8000   | 5720.00  | 0.72
EJA           | 0.40    | 10      | 1000   | 710.00   | 0.71
```

### Relatório 2: Conformidade PNAE

```sql
-- Verifica se per capita está dentro do permitido
SELECT 
  m.nome,
  m.valor_repasse as repasse_fnde,
  ROUND(SUM(fi.valor_total) / SUM(em.quantidade_alunos), 2) as per_capita_real,
  CASE 
    WHEN ROUND(SUM(fi.valor_total) / SUM(em.quantidade_alunos), 2) <= m.valor_repasse 
    THEN '✓ Conforme'
    ELSE '✗ Acima do repasse'
  END as status
FROM faturamentos_itens fi
JOIN modalidades m ON fi.modalidade_id = m.id
JOIN escola_modalidades em ON m.id = em.modalidade_id
GROUP BY m.id, m.nome, m.valor_repasse;
```

---

## Vantagens do Sistema Atual

### ✅ Pontos Fortes

1. **Separação Clara de Responsabilidades**
   - Compras: Cria ordem de compra
   - Faturamento: Distribui por modalidade
   - Recebimento: Confirma entrega
   - Estoque: Armazena

2. **Flexibilidade**
   - Pode criar faturamento parcial
   - Pode ajustar distribuição depois
   - Pode ter múltiplos faturamentos por pedido

3. **Rastreabilidade**
   - Sabe exatamente quanto cada modalidade recebeu
   - Facilita prestação de contas
   - Atende PNAE

4. **Controle Financeiro**
   - Valor por modalidade
   - Per capita calculado
   - Conformidade com repasse FNDE

---

## Fluxo Completo Revisado

```
1. PLANEJAMENTO
   ├─ Nutricionista cria cardápios por modalidade
   └─ Sistema calcula demanda total

2. COMPRA (Pedido)
   ├─ Gestor cria pedido com itens
   ├─ Quantidade total (sem modalidade)
   └─ Status: "pendente"

3. FATURAMENTO ← DISTRIBUI POR MODALIDADE
   ├─ Gestor/Nutricionista aloca itens
   ├─ Divide por: Creche, Pré, Fund, EJA
   ├─ Valida: soma não excede pedido
   └─ Gera relatórios por modalidade

4. APROVAÇÃO
   ├─ Nutricionista aprova
   ├─ Financeiro aprova
   └─ Secretário aprova

5. RECEBIMENTO
   ├─ Fornecedor entrega
   ├─ Almoxarife confere
   └─ Atualiza estoque central

6. DISTRIBUIÇÃO PARA ESCOLAS
   ├─ Cria guias por escola
   ├─ Considera modalidade da escola
   └─ Motorista entrega

7. ESTOQUE ESCOLAR
   ├─ Escola recebe
   └─ Atualiza estoque local

8. CONSUMO
   └─ Merenda preparada
```

---

## Conclusão

### O Sistema Está Correto!

O módulo de **faturamento** é quem distribui os itens por **modalidade**, não por escola.

**Por quê?**
- Modalidade = Tipo de aluno (Creche, Pré, Fund, EJA)
- Escola = Local físico

**Fluxo**:
1. Compra → Quantidade total
2. Faturamento → Divide por modalidade
3. Guias → Divide por escola

**Exemplo**:
```
Compra: 2000 kg arroz
    ↓
Faturamento:
    ├─ Creche: 400 kg
    ├─ Pré: 500 kg
    ├─ Fund: 900 kg
    └─ EJA: 200 kg
    ↓
Guias de Entrega:
    ├─ Escola A (tem Creche + Pré): 150 kg
    ├─ Escola B (tem Fund): 200 kg
    ├─ Escola C (tem todas): 300 kg
    └─ ... (outras escolas)
```

**Nota Revisada do Módulo de Compras**: 6.5/10

O sistema está melhor do que eu pensava inicialmente! O faturamento resolve a distribuição por modalidade. Mas ainda falta:
- Vínculo direto com escolas na compra
- Workflow de aprovação
- Relatórios FNDE automáticos

---

**Documento atualizado em**: 2026-03-07  
**Autor**: Kiro AI  
**Status**: Compreensão corrigida
