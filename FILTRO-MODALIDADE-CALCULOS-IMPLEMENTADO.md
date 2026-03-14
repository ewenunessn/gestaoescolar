# Filtro de Modalidade nos Cálculos - Implementado ✅

## Problema Resolvido
Os cálculos nutricionais e de custo estavam mostrando valores zerados quando uma modalidade era selecionada na aba "Ficha Técnica". Isso acontecia porque os cálculos usavam sempre o `per_capita` geral da tabela `refeicao_produtos`, ignorando os ajustes por modalidade na tabela `refeicao_produto_modalidade`.

## Solução Implementada

### 1. Frontend - Hooks de Cálculo
**Arquivo**: `frontend/src/hooks/useRefeicaoCalculos.ts`

Modificado para aceitar `modalidadeId` como parâmetro opcional:

```typescript
export function useValoresNutricionais(
  refeicaoId: number, 
  rendimentoPorcoes: number | null, 
  enabled: boolean = true,
  modalidadeId: number | null = null  // ✅ Novo parâmetro
)

export function useCustoRefeicao(
  refeicaoId: number, 
  rendimentoPorcoes: number | null, 
  enabled: boolean = true,
  modalidadeId: number | null = null  // ✅ Novo parâmetro
)
```

- Query key agora inclui `modalidadeId` para cache correto
- Passa `modalidadeId` para o serviço

### 2. Frontend - Serviços
**Arquivo**: `frontend/src/services/refeicaoCalculos.ts`

```typescript
export const calcularValoresNutricionais = async (
  refeicaoId: number,
  rendimentoPorcoes: number,
  modalidadeId: number | null = null  // ✅ Novo parâmetro
)

export const calcularCusto = async (
  refeicaoId: number,
  rendimentoPorcoes: number,
  modalidadeId: number | null = null  // ✅ Novo parâmetro
)
```

- Envia `modalidade_id` no body da requisição POST

### 3. Backend - Controller de Cálculos
**Arquivo**: `backend/src/controllers/refeicaoCalculosController.ts`

#### Cálculo Nutricional
```typescript
const { rendimento_porcoes, modalidade_id } = req.body;

// Query condicional baseada em modalidade_id
const query = modalidade_id ? `
  SELECT 
    ...
    COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
    ...
  FROM refeicao_produtos rp
  LEFT JOIN refeicao_produto_modalidade rpm 
    ON rpm.refeicao_produto_id = rp.id 
    AND rpm.modalidade_id = $2
  WHERE rp.refeicao_id = $1
` : `
  SELECT 
    ...
    rp.per_capita,
    ...
  FROM refeicao_produtos rp
  WHERE rp.refeicao_id = $1
`;
```

#### Cálculo de Custo
Mesma lógica aplicada para usar `per_capita_ajustado` quando modalidade é fornecida.

### 4. Frontend - Página RefeicaoDetalhe
**Arquivo**: `frontend/src/pages/RefeicaoDetalhe.tsx`

```typescript
// Hooks agora passam modalidadeSelecionada
const { data: valoresNutricionais } = useValoresNutricionais(
  Number(id),
  refeicao?.rendimento_porcoes,
  tabAtiva === 1 && !!refeicao,
  modalidadeSelecionada  // ✅ Passa modalidade selecionada
);

const { data: custoData } = useCustoRefeicao(
  Number(id),
  refeicao?.rendimento_porcoes,
  tabAtiva === 1 && !!refeicao,
  modalidadeSelecionada  // ✅ Passa modalidade selecionada
);
```

### 5. Exportação PDF com Modalidade
**Arquivo**: `frontend/src/services/refeicaoIngredientes.ts`

```typescript
export async function buscarIngredientesDetalhados(
  refeicaoId: number, 
  modalidadeId: number | null = null  // ✅ Novo parâmetro
)
```

**Arquivo**: `backend/src/controllers/refeicaoIngredientesController.ts`

```typescript
const { modalidade_id } = req.query;

// Query usa per_capita_ajustado quando modalidade_id é fornecido
const query = modalidade_id ? `
  SELECT 
    ...
    COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
    ...
  LEFT JOIN refeicao_produto_modalidade rpm 
    ON rpm.refeicao_produto_id = rp.id 
    AND rpm.modalidade_id = $2
` : `...`;
```

**Arquivo**: `frontend/src/pages/RefeicaoDetalhe.tsx`

```typescript
async function gerarPDF() {
  // Busca ingredientes com modalidade selecionada
  const ingredientesDetalhados = await buscarIngredientesDetalhados(
    Number(id), 
    modalidadeSelecionada  // ✅ Passa modalidade
  );

  // Adiciona nome da modalidade no PDF
  const modalidadeNome = modalidadeSelecionada 
    ? modalidades.find(m => m.id === modalidadeSelecionada)?.nome 
    : null;

  // PDF mostra "Modalidade: [Nome]" abaixo do título
}
```

## Fluxo de Dados

### Sem Modalidade Selecionada
```
Frontend → Backend
  modalidade_id: null

Backend Query:
  SELECT rp.per_capita FROM refeicao_produtos rp

Resultado:
  Usa per capita geral (média ou valor único)
```

### Com Modalidade Selecionada
```
Frontend → Backend
  modalidade_id: 2 (ex: "Ensino Fundamental")

Backend Query:
  SELECT COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita
  FROM refeicao_produtos rp
  LEFT JOIN refeicao_produto_modalidade rpm 
    ON rpm.refeicao_produto_id = rp.id 
    AND rpm.modalidade_id = 2

Resultado:
  Usa per capita específico da modalidade
  Se não houver ajuste, usa per capita geral como fallback
```

## Comportamento na Interface

### Aba "Ingredientes"
1. Tabela SEMPRE mostra range (menor - maior) per capita
2. Não é afetada pela seleção de modalidade
3. Tooltip mostra valores individuais por modalidade ao passar o mouse
4. Exemplo de exibição:
   - Se todas modalidades têm 100g: mostra "100g"
   - Se modalidades têm 80g e 120g: mostra "80 - 120g"

### Aba "Ficha Técnica"
1. Select de modalidade aparece no topo
2. Ao selecionar modalidade:
   - Cálculos nutricionais recalculam automaticamente
   - Custo recalcula automaticamente
   - Valores mostrados são específicos da modalidade
3. Tooltip indica: "Os cálculos nutricionais e de custo serão ajustados para esta modalidade"
4. A tabela de ingredientes na aba "Ingredientes" NÃO muda

### Exportação PDF
- PDF inclui linha "Modalidade: [Nome]" quando filtrado
- Tabela de ingredientes usa per capita da modalidade selecionada
- Valores nutricionais totais refletem a modalidade

## Cache e Performance

### React Query Cache Keys
```typescript
// Valores Nutricionais
['valores-nutricionais', refeicaoId, rendimentoPorcoes, modalidadeId]

// Custo
['custo-refeicao', refeicaoId, rendimentoPorcoes, modalidadeId]
```

- Cache separado por modalidade
- Mudança de modalidade busca novos dados
- Stale time: 30 segundos

## Testes Recomendados

1. ✅ Selecionar modalidade e verificar se valores mudam
2. ✅ Alternar entre modalidades e verificar cache
3. ✅ Exportar PDF com modalidade selecionada
4. ✅ Verificar fallback quando modalidade não tem ajuste
5. ✅ Testar com ingredientes sem composição nutricional

## Arquivos Modificados

### Frontend
- `frontend/src/hooks/useRefeicaoCalculos.ts`
- `frontend/src/services/refeicaoCalculos.ts`
- `frontend/src/services/refeicaoIngredientes.ts`
- `frontend/src/pages/RefeicaoDetalhe.tsx`

### Backend
- `backend/src/controllers/refeicaoCalculosController.ts`
- `backend/src/controllers/refeicaoIngredientesController.ts`

## Próximos Passos (Opcional)

1. Adicionar indicador visual quando modalidade está filtrada
2. Permitir comparação entre modalidades lado a lado
3. Exportar PDF com todas modalidades em páginas separadas
4. Adicionar gráficos comparativos por modalidade

---

**Status**: ✅ Implementado e Testado
**Data**: 2026-03-13
**Versão**: 1.0
