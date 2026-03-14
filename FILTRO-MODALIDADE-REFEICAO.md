# Filtro de Modalidade em Refeições - IMPLEMENTADO ✅

## Funcionalidade

Permite visualizar a refeição com os valores de per capita específicos de cada modalidade de ensino.

## O que foi implementado

### 1. Seletor de Modalidade

**Localização:** Logo após os breadcrumbs, antes dos botões de ação

**Características:**
- Select com todas as modalidades ativas
- Primeira modalidade selecionada por padrão
- Texto explicativo: "Os valores de per capita e cálculos serão ajustados para esta modalidade"

### 2. Filtro de Per Capita

Quando uma modalidade é selecionada:
- Tabela mostra apenas o per capita daquela modalidade
- Tooltip mostra: "Per capita para [Modalidade]: XXg"

Quando nenhuma modalidade está selecionada (modo geral):
- Tabela mostra range (menor - maior)
- Tooltip mostra todos os valores por modalidade

### 3. Lógica de Filtro

```typescript
const associacoesFiltradas = associacoes.map(assoc => {
  if (!modalidadeSelecionada || !assoc.per_capita_por_modalidade) {
    return assoc;
  }
  
  const ajuste = assoc.per_capita_por_modalidade.find(
    m => m.modalidade_id === modalidadeSelecionada
  );
  
  return {
    ...assoc,
    per_capita_efetivo: ajuste ? ajuste.per_capita : assoc.per_capita,
  };
});
```

## Comportamento Visual

### Modo Geral (sem filtro)
```
┌────────────────────────────────────────┐
│ Visualizar para: [Todas as Modalidades]│
└────────────────────────────────────────┘

Tabela:
Arroz: 80 - 120g  (hover: Creche: 80g, Pré: 100g, Fund: 120g)
Feijão: 100g      (hover: valor único)
```

### Modo Filtrado (Creche selecionada)
```
┌────────────────────────────────────────┐
│ Visualizar para: [Creche ▼]            │
└────────────────────────────────────────┘

Tabela:
Arroz: 80g   (hover: Per capita para Creche: 80g)
Feijão: 100g (hover: Per capita para Creche: 100g)
```

## Interface RefeicaoProduto Atualizada

```typescript
interface RefeicaoProduto {
  id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'unidades';
  ordem?: number;
  produto?: Produto;
  per_capita_por_modalidade?: Array<{
    modalidade_id: number;
    modalidade_nome: string;
    per_capita: number;
  }>;
  per_capita_efetivo?: number; // NOVO: Per capita filtrado
}
```

## SortableRow Props Atualizada

```typescript
interface SortableRowProps {
  assoc: RefeicaoProduto;
  onRemove: () => void;
  onEdit: () => void;
  modalidadeSelecionada: number | null; // NOVO
}
```

## Estados Adicionados

```typescript
const [modalidades, setModalidades] = useState<Modalidade[]>([]);
const [modalidadeSelecionada, setModalidadeSelecionada] = useState<number | null>(null);
```

## Carregamento de Dados

```typescript
const [produtosData, associacoesData, modalidadesData] = await Promise.all([
  listarProdutos(),
  listarProdutosDaRefeicao(Number(id)),
  listarModalidades(), // NOVO
]);

const ativas = modalidadesData.filter(m => m.ativo);
setModalidades(ativas);

// Selecionar primeira modalidade por padrão
if (ativas.length > 0) {
  setModalidadeSelecionada(ativas[0].id);
}
```

## Próximos Passos

### Ajustar Cálculos Nutricionais
- [ ] Passar modalidadeSelecionada para useValoresNutricionais
- [ ] Backend calcular com per capita da modalidade
- [ ] Exibir valores ajustados na Ficha Técnica

### Ajustar Cálculo de Custo
- [ ] Passar modalidadeSelecionada para useCustoRefeicao
- [ ] Backend calcular com per capita da modalidade
- [ ] Exibir custo ajustado

### Ajustar PDF
- [ ] Passar modalidadeSelecionada para gerarPDF
- [ ] Incluir modalidade no título do PDF
- [ ] Usar per capita da modalidade na tabela
- [ ] Ajustar valores nutricionais e custo

## Exemplo de Uso

1. Usuário abre página de refeição
2. Select mostra "Creche" (primeira modalidade)
3. Tabela mostra per capita específico da Creche
4. Usuário muda para "Fundamental"
5. Tabela atualiza instantaneamente
6. Valores nutricionais e custo serão recalculados (próximo passo)

## Benefícios

1. **Visualização Contextual**: Ver refeição do ponto de vista de cada modalidade
2. **Planejamento Preciso**: Nutricionista vê exatamente o que cada faixa etária receberá
3. **Validação**: Verificar se porções estão adequadas para cada idade
4. **Flexibilidade**: Alternar entre modalidades facilmente
5. **Base para Cálculos**: Preparação para ajustar cálculos nutricionais e custo

## Arquivos Modificados

- ✅ `frontend/src/pages/RefeicaoDetalhe.tsx`
  - Import de listarModalidades
  - Estados para modalidades
  - Carregamento de modalidades
  - Select de modalidade na UI
  - Função de filtro de associações
  - SortableRow atualizado com lógica condicional
  - Props modalidadeSelecionada passada para SortableRow

## Status

✅ **FASE 1 COMPLETA: Filtro Visual Implementado**

Próxima fase: Ajustar cálculos nutricionais, custo e PDF pela modalidade selecionada.
