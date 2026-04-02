# Custo do Cardápio - Indicador de Agricultura Familiar

## Visão Geral

Esta funcionalidade adiciona um indicador visual no card de custo do cardápio mostrando o percentual de recursos destinados à Agricultura Familiar. O indicador usa um gráfico de rosca (doughnut) com o percentual exibido no centro, facilitando o acompanhamento da conformidade com a Lei 11.947/2009 (PNAE).

## Mudanças Implementadas

### 1. Backend - Controller de Cardápio

**Arquivo:** `backend/src/modules/cardapios/controllers/cardapioController.ts`

#### Modificações na Query SQL

A query que busca os produtos das refeições foi modificada para incluir o tipo de fornecedor:

```typescript
LEFT JOIN LATERAL (
  SELECT cp.preco_unitario, f.tipo_fornecedor
  FROM contrato_produtos cp
  INNER JOIN contratos c ON c.id = cp.contrato_id
  INNER JOIN fornecedores f ON c.fornecedor_id = f.id
  WHERE cp.produto_id = p.id
    AND c.ativo = true
    AND cp.ativo = true
  ORDER BY c.data_inicio DESC
  LIMIT 1
) cp_lat ON p.id IS NOT NULL
```

#### Cálculo de Custos por Tipo de Fornecedor

Foi adicionado um Map para acumular os custos por tipo de fornecedor:

```typescript
const custosPorTipoFornecedor = new Map<string, number>();

// Durante o processamento dos produtos
refeicao.produtos.forEach((produto: any) => {
  const tipoFornecedor = produto.tipo_fornecedor || 'CONVENCIONAL';
  const custoProduto = produto.custo_por_aluno * qtdAlunosModalidade;
  const custoAtualTipo = custosPorTipoFornecedor.get(tipoFornecedor) || 0;
  custosPorTipoFornecedor.set(tipoFornecedor, custoAtualTipo + custoProduto);
});
```

#### Resposta da API

A resposta agora inclui um novo campo `detalhes_por_tipo_fornecedor`:

```json
{
  "custo_total": 15000.00,
  "total_alunos": 500,
  "total_refeicoes": 20,
  "detalhes_por_refeicao": [...],
  "detalhes_por_modalidade": [...],
  "detalhes_por_tipo_fornecedor": [
    {
      "tipo_fornecedor": "AGRICULTURA_FAMILIAR",
      "valor_total": 4500.00,
      "percentual": 30.0
    },
    {
      "tipo_fornecedor": "CONVENCIONAL",
      "valor_total": 10500.00,
      "percentual": 70.0
    }
  ]
}
```

### 2. Frontend - Interface TypeScript

**Arquivo:** `frontend/src/services/cardapiosModalidade.ts`

Foi atualizada a interface `CustoCardapio` para incluir:

```typescript
export interface CustoCardapio {
  // ... campos existentes
  detalhes_por_tipo_fornecedor?: Array<{
    tipo_fornecedor: string;
    valor_total: number;
    percentual: number;
  }>;
}
```

Também foi adicionado o campo `tipo_fornecedor` nos produtos:

```typescript
produtos: Array<{
  // ... campos existentes
  tipo_fornecedor?: string;
}>;
```

### 3. Frontend - Componente de Modal

**Arquivo:** `frontend/src/components/CustoCardapioDetalheModal.tsx`

#### Mapeamento de Labels e Cores

```typescript
const TIPO_FORNECEDOR_LABELS: Record<string, string> = {
  'CONVENCIONAL': 'Convencional',
  'AGRICULTURA_FAMILIAR': 'Agricultura Familiar',
  'COOPERATIVA_AF': 'Cooperativa AF',
  'ASSOCIACAO_AF': 'Associação AF',
  'empresa': 'Empresa',
  'cooperativa': 'Cooperativa',
  'individual': 'Individual'
};

const TIPO_FORNECEDOR_COLORS: Record<string, string> = {
  'CONVENCIONAL': '#1976d2',
  'AGRICULTURA_FAMILIAR': '#2e7d32',
  'COOPERATIVA_AF': '#388e3c',
  'ASSOCIACAO_AF': '#43a047',
  'empresa': '#1976d2',
  'cooperativa': '#388e3c',
  'individual': '#f57c00'
};
```

#### Seção de Distribuição por Tipo de Fornecedor

Foi adicionada uma nova seção no modal que exibe cards coloridos para cada tipo de fornecedor:

- **Card com borda colorida** identificando o tipo
- **Valor total** gasto com aquele tipo
- **Barra de progresso** visual mostrando o percentual
- **Percentual numérico** do total

#### Modal de Produtos

O modal de produtos de uma refeição agora também exibe o tipo de fornecedor de cada produto com um chip colorido.

### 4. Frontend - Card de Custo no Cardápio Calendário

**Arquivo:** `frontend/src/pages/CardapioCalendario.tsx`

#### Gráfico de Rosca (Doughnut) - Agricultura Familiar

Foi adicionado um indicador visual focado exclusivamente no percentual de Agricultura Familiar:

**Características:**
- **Gráfico de rosca** (doughnut) de 150x150px
- **Percentual no centro** em destaque
- **Cores dinâmicas:**
  - Verde (#2e7d32) quando atende a meta PNAE (≥30%)
  - Laranja (#f57c00) quando abaixo da meta (<30%)
- **Indicador de conformidade:** "✓ Atende PNAE" ou "⚠ Abaixo da meta"
- **Valor total** de Agricultura Familiar em BRL
- **Meta mínima** exibida (30%)

#### Cálculo do Percentual

O sistema soma automaticamente os valores de:
- `AGRICULTURA_FAMILIAR`
- `COOPERATIVA_AF`
- `ASSOCIACAO_AF`

E calcula o percentual em relação ao custo total do cardápio.

## Tipos de Fornecedor Suportados

### Padrão PNAE (Lei 11.947/2009)
- `CONVENCIONAL` - Fornecedor convencional
- `AGRICULTURA_FAMILIAR` - Agricultura Familiar
- `COOPERATIVA_AF` - Cooperativa de Agricultura Familiar
- `ASSOCIACAO_AF` - Associação de Agricultura Familiar

### Padrão Antigo (compatibilidade)
- `empresa` - Empresa
- `cooperativa` - Cooperativa
- `individual` - Individual

## Exemplo de Uso

1. Acesse um cardápio no sistema
2. Clique no botão "Calcular Custo"
3. O modal exibirá:
   - Resumo geral com custo total e por aluno
   - **Nova seção:** Distribuição por Tipo de Fornecedor
   - Detalhamento por dia e refeição
4. Ao clicar em "Ver Produtos" de uma refeição:
   - Cada produto mostrará seu tipo de fornecedor

### Card de Custo no Cardápio Calendário

No cardápio calendário, o card de custo agora exibe na parte inferior:

1. **Gráfico de Rosca:** Indicador visual do percentual de Agricultura Familiar
2. **Percentual no Centro:** Valor destacado no meio do gráfico
3. **Indicador de Conformidade:** Badge mostrando se atende ou não a meta PNAE
4. **Valor Total AF:** Montante em reais destinado à Agricultura Familiar
5. **Meta Mínima:** Referência visual da meta de 30%

#### Características do Indicador:
- Tamanho compacto (150x150px) para caber no card lateral
- Cor verde quando ≥30% (atende PNAE)
- Cor laranja quando <30% (abaixo da meta)
- Tooltip com detalhes ao passar o mouse
- Cálculo automático somando todos os tipos relacionados a AF

## Benefícios

1. **Foco na Conformidade PNAE:** Indicador dedicado ao percentual de Agricultura Familiar
2. **Visualização Imediata:** Percentual destacado no centro do gráfico
3. **Alerta Visual:** Cores diferentes indicam se atende ou não a meta
4. **Simplicidade:** Interface limpa focada na informação mais importante
5. **Rastreabilidade:** Identifica a origem dos produtos no cardápio
6. **Acessibilidade:** Informação disponível tanto no card lateral quanto no modal detalhado

## Tecnologias Utilizadas

- **Backend:** PostgreSQL com queries otimizadas usando LATERAL JOIN
- **Frontend:** React + TypeScript + Material-UI
- **Gráficos:** Chart.js 4.5.0 + react-chartjs-2 5.3.0 (Doughnut Chart)
- **Formatação:** Intl.NumberFormat para valores monetários em BRL

## Observações

- Se um produto não tiver contrato ativo, o tipo de fornecedor será `CONVENCIONAL` por padrão
- Os percentuais são calculados automaticamente com base no valor total
- A ordenação dos cards é por valor total (maior para menor)
- As cores são consistentes em todo o sistema para facilitar a identificação visual
