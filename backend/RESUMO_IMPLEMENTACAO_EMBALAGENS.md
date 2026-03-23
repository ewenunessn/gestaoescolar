# Resumo da Implementação - Cálculo de Embalagens

## Status: ✅ CONCLUÍDO

## Objetivo
Calcular demanda em unidades de embalagem (pacotes, caixas, etc.) ao invés de apenas kg, considerando o peso da embalagem definido no produto.

## Exemplo Prático
- **Bolacha de 345g**: 50kg → 145 pacotes
- **Alho de 500g**: 3.12kg → 7 pacotes

## Implementação Backend

### 1. Funções Helper Criadas

**Arquivo**: `backend/src/controllers/planejamentoComprasController.ts`

```typescript
// Converter kg para unidades de embalagem (arredonda para cima)
function converterParaEmbalagem(quantidade_kg: number, peso_embalagem_g: number): number {
  const quantidadeGramas = quantidade_kg * 1000;
  return Math.ceil(quantidadeGramas / peso_embalagem_g);
}

// Aplicar conversão se aplicável
function aplicarConversaoEmbalagem(
  quantidade_kg: number,
  peso_g: number | null,
  unidade_distribuicao: string | null
): { quantidade: number; unidade: string; quantidade_embalagens?: number } {
  const unidadeLower = (unidade_distribuicao || '').toLowerCase().trim();
  const isKg = unidadeLower === 'quilograma' || unidadeLower === 'kg' || unidadeLower === 'kilo';
  
  if (peso_g && peso_g > 0 && unidade_distribuicao && !isKg) {
    const quantidadeEmbalagens = converterParaEmbalagem(quantidade_kg, peso_g);
    return {
      quantidade: quantidadeEmbalagens,
      unidade: unidade_distribuicao,
      quantidade_embalagens: quantidadeEmbalagens
    };
  }
  
  return {
    quantidade: quantidade_kg,
    unidade: unidade_distribuicao || 'kg'
  };
}
```

### 2. Interface Atualizada

```typescript
interface ProdutoDemanda {
  produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_kg: number;
  quantidade_embalagens?: number; // Quantidade em unidades de embalagem
  peso_embalagem?: number; // Peso da embalagem em gramas
  por_escola: DemandaEscola[];
}
```

### 3. Funções Atualizadas

✅ **calcularDemandaPeriodo()** - Aplica conversão ao calcular demanda
✅ **calcularDemandaPorCompetencia()** - Aplica conversão em todas as respostas
✅ **gerarGuiasDemanda()** - Usa conversão ao criar itens da guia
✅ **gerarPedidosPorPeriodo()** - Usa as funções helper

### 4. Lógica de Conversão

```
SE peso > 0 E unidade_distribuicao !== "Quilograma"
  ENTÃO converter para unidades
  SENÃO manter em kg
```

### 5. Queries Atualizadas

Todas as queries agora incluem:
```sql
p.peso as peso_embalagem,
p.unidade_distribuicao as unidade
```

## Implementação Frontend

### 1. Interfaces TypeScript

**Arquivo**: `frontend/src/services/planejamentoCompras.ts`

Adicionados campos:
- `quantidade_embalagens?: number`
- `peso_embalagem?: number`

### 2. Componente PlanejamentoCompras

**Arquivo**: `frontend/src/pages/PlanejamentoCompras.tsx`

Exibição condicional em todas as tabs:
```tsx
{prod.quantidade_embalagens ? (
  <>
    <strong>{prod.quantidade_embalagens}</strong> {prod.unidade}
    <span style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '8px' }}>
      ({toNum(prod.quantidade_kg).toFixed(2)}kg)
    </span>
  </>
) : (
  `${toNum(prod.quantidade_kg).toFixed(2)} kg`
)}
```

## Exemplo de Resposta da API

```json
{
  "demanda_por_produto": [
    {
      "produto_id": 123,
      "produto_nome": "Alho",
      "unidade": "Pacote",
      "quantidade_total_kg": 3.12,
      "quantidade_embalagens": 7,
      "peso_embalagem": 500
    },
    {
      "produto_id": 124,
      "produto_nome": "Arroz",
      "unidade": "Quilograma",
      "quantidade_total_kg": 187.38
    }
  ]
}
```

## Testes Realizados

✅ Alho (500g/pacote): 3.12kg → 7 Pacotes
✅ Logs confirmam conversão funcionando
✅ Frontend exibe corretamente

## Arquivos Modificados

### Backend
1. `backend/src/controllers/planejamentoComprasController.ts`
   - Funções helper adicionadas
   - Interface ProdutoDemanda atualizada
   - Conversão aplicada em todas as funções
   - Queries atualizadas

### Frontend
1. `frontend/src/services/planejamentoCompras.ts`
   - Interfaces atualizadas
2. `frontend/src/pages/PlanejamentoCompras.tsx`
   - Exibição condicional implementada

## Próximos Passos (Opcional)

1. Atualizar módulo de Demanda (`demandaController.ts`)
2. Atualizar página de Demanda (`frontend/src/pages/Demanda.tsx`)
3. Atualizar componente GuiaDetalhe

## Observações Importantes

- Quantidade em kg é mantida para cálculos de preço
- Arredondamento para cima garante quantidade suficiente
- Produtos sem peso definido continuam em kg
- Campo `unidade_distribuicao` é usado (não `unidade_compra`)
- Conversão só acontece se unidade não for "Quilograma"
