# Implementação Concluída: Cálculo por Embalagem

## Resumo
Sistema agora calcula demanda considerando o peso da embalagem dos produtos, convertendo automaticamente de kg para unidades (pacotes, caixas, etc.) quando aplicável.

## Alterações Realizadas

### 1. Tipos e Interfaces
**Arquivo**: `backend/src/controllers/planejamentoComprasController.ts`

```typescript
interface ProdutoDemanda {
  produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_kg: number;
  quantidade_embalagens?: number; // NOVO: Quantidade em unidades
  peso_embalagem?: number; // NOVO: Peso da embalagem em gramas
  por_escola: DemandaEscola[];
}
```

### 2. Funções Helper Criadas

#### `converterParaEmbalagem()`
Converte kg para número de embalagens (arredonda para cima):
```typescript
function converterParaEmbalagem(quantidade_kg: number, peso_embalagem_g: number): number {
  const quantidadeGramas = quantidade_kg * 1000;
  return Math.ceil(quantidadeGramas / peso_embalagem_g);
}
```

#### `aplicarConversaoEmbalagem()`
Decide se deve converter ou manter em kg:
```typescript
function aplicarConversaoEmbalagem(
  quantidade_kg: number,
  peso_g: number | null,
  unidade_distribuicao: string | null
): { quantidade: number; unidade: string; quantidade_embalagens?: number }
```

**Lógica**:
- Se `peso > 0` E `unidade_distribuicao !== "Quilograma"` → Converte para unidades
- Caso contrário → Mantém em kg

### 3. Queries Atualizadas

#### `calcularDemandaPeriodo()`
Adicionado campo `p.peso as peso_embalagem` na query de refeições:
```sql
SELECT
  ...
  p.peso as peso_embalagem,
  ...
FROM cardapio_refeicoes_dia crd
...
```

#### `calcularDemandaPorCompetencia()`
Adicionado campo `p.peso as peso_embalagem` na query de refeições:
```sql
SELECT 
  ...
  p.peso as peso_embalagem,
  ...
FROM cardapio_refeicoes_dia crd
...
```

### 4. Lógica de Cálculo Atualizada

#### Em `calcularDemandaPeriodo()`
```typescript
// Ao criar novo produto no mapa
const conversao = aplicarConversaoEmbalagem(
  qtdKg,
  ref.peso_embalagem ? Number(ref.peso_embalagem) : null,
  ref.unidade
);

totais.set(produto_id, {
  produto_id,
  produto_nome: ref.produto_nome,
  unidade: conversao.unidade, // Pode ser "Pacote", "Caixa", etc
  quantidade_kg: 0,
  quantidade_embalagens: conversao.quantidade_embalagens,
  peso_embalagem: ref.peso_embalagem ? Number(ref.peso_embalagem) : undefined,
  por_escola: [],
});

// No retorno final, recalcular com total
const conversao = aplicarConversaoEmbalagem(
  p.quantidade_kg,
  p.peso_embalagem || null,
  p.unidade
);

return {
  ...p,
  quantidade_embalagens: conversao.quantidade_embalagens,
  unidade: conversao.unidade,
  ...
};
```

## Exemplos de Uso

### Exemplo 1: Bolacha - Pacote de 345g

**Dados do Produto**:
- Nome: Bolacha Maria
- Peso: 345 (gramas)
- Unidade Distribuição: "Pacote"
- Per capita: 50g
- Fator correção: 1.0

**Cálculo**:
- 100 alunos × 50g × 10 dias = 50.000g = 50kg
- 50.000g ÷ 345g/pacote = 144,93 → **145 pacotes**

**Resultado**:
```json
{
  "produto_id": 123,
  "produto_nome": "Bolacha Maria",
  "unidade": "Pacote",
  "quantidade_kg": 50,
  "quantidade_embalagens": 145,
  "peso_embalagem": 345
}
```

### Exemplo 2: Arroz - Quilograma

**Dados do Produto**:
- Nome: Arroz Branco
- Peso: null (ou 0)
- Unidade Distribuição: "Quilograma"
- Per capita: 100g
- Fator correção: 1.05

**Cálculo**:
- 100 alunos × 105g × 20 dias = 210.000g = 210kg

**Resultado**:
```json
{
  "produto_id": 456,
  "produto_nome": "Arroz Branco",
  "unidade": "Quilograma",
  "quantidade_kg": 210,
  "quantidade_embalagens": undefined,
  "peso_embalagem": undefined
}
```

### Exemplo 3: Leite - Caixa de 1L (1000g)

**Dados do Produto**:
- Nome: Leite Integral
- Peso: 1000 (gramas)
- Unidade Distribuição: "Caixa"
- Per capita: 200ml = 200g
- Fator correção: 1.0

**Cálculo**:
- 100 alunos × 200g × 15 dias = 300.000g = 300kg
- 300.000g ÷ 1000g/caixa = 300 → **300 caixas**

**Resultado**:
```json
{
  "produto_id": 789,
  "produto_nome": "Leite Integral",
  "unidade": "Caixa",
  "quantidade_kg": 300,
  "quantidade_embalagens": 300,
  "peso_embalagem": 1000
}
```

## Compatibilidade

### Produtos Existentes
✅ **Sem peso definido**: Continuam funcionando em kg (comportamento atual)
✅ **Com unidade "Quilograma"**: Continuam em kg mesmo com peso definido
✅ **Com peso e outra unidade**: Convertidos automaticamente para unidades

### Não Requer Migração
O sistema funciona com os dados existentes. Produtos sem peso continuam em kg.

## Próximos Passos

### Backend
- ✅ Implementar conversão em `calcularDemandaPeriodo`
- ✅ Implementar conversão em `calcularDemandaPorCompetencia`
- ✅ Adicionar campos `peso_embalagem` nas queries
- ⏳ Atualizar `gerarPedidosPorPeriodo` (já usa a função helper)
- ⏳ Atualizar controller de demanda (`demandaController.ts`)

### Frontend
- ⏳ Atualizar exibição em `PlanejamentoCompras.tsx`
- ⏳ Atualizar exibição em `Demanda.tsx`
- ⏳ Atualizar exibição em `GuiaDetalhe.tsx`
- ⏳ Mostrar formato: "145 Pacotes (50kg)"

### Testes
- ⏳ Testar com bolacha (345g)
- ⏳ Testar com leite em caixa (1L)
- ⏳ Testar com produtos em kg (arroz, feijão)
- ⏳ Testar com produtos sem peso definido

## Data
23/03/2026

## Status
🟢 **Implementação Backend Concluída**
🟡 **Frontend Pendente**
