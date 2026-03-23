# Implementação: Cálculo de Demanda por Embalagem

## Objetivo
Modificar o sistema de cálculo de demanda para considerar o peso da embalagem dos produtos, permitindo que produtos vendidos em pacotes/unidades (como bolacha de 345g) sejam calculados em número de pacotes, não apenas em kg.

## Situação Atual

### Campos Disponíveis
- `produtos.peso` - Peso da embalagem em gramas (NUMERIC)
- `produtos.unidade_distribuicao` - Unidade de distribuição (ex: "Quilograma", "Pacote", "Unidade")
- `contrato_produtos.peso_embalagem` - Peso da embalagem no contrato (NUMERIC)
- `contrato_produtos.unidade_compra` - Unidade de compra no contrato (VARCHAR(50))
- `contrato_produtos.fator_conversao` - Fator de conversão (NUMERIC(12,4))

### Lógica Atual
1. **Per capita** é cadastrado em gramas (líquido)
2. **Fator de correção** converte líquido → bruto
3. **Cálculo**: `alunos × per_capita_bruto × vezes_no_periodo = kg`
4. **Resultado**: Sempre em kg

### Problema
Para produtos como bolacha (pacote de 345g), o resultado em kg (ex: 5.2kg) não é prático. O gestor precisa saber quantos pacotes comprar (ex: 16 pacotes).

## Solução Proposta

### 1. Usar Campos Existentes
- `produtos.peso` - Peso da embalagem em gramas
- `produtos.unidade_distribuicao` - Nome da unidade (ex: "Pacote", "Unidade", "Caixa")

### 2. Lógica de Conversão
```typescript
// Se o produto tem peso definido e unidade_distribuicao não é "Quilograma"
if (produto.peso && produto.peso > 0 && produto.unidade_distribuicao !== 'Quilograma') {
  // Converter kg para unidades de embalagem
  const quantidadeGramas = quantidade_kg * 1000;
  const quantidadeEmbalagens = Math.ceil(quantidadeGramas / produto.peso);
  
  return {
    quantidade: quantidadeEmbalagens,
    unidade: produto.unidade_distribuicao,
    quantidade_kg_original: quantidade_kg,
    peso_embalagem: produto.peso
  };
} else {
  // Manter em kg
  return {
    quantidade: quantidade_kg,
    unidade: 'kg',
    quantidade_kg_original: quantidade_kg
  };
}
```

### 3. Exemplo Prático

#### Bolacha - Pacote de 345g
- **Per capita**: 50g (líquido)
- **Fator correção**: 1.0
- **Per capita bruto**: 50g
- **Alunos**: 100
- **Vezes no período**: 10 dias

**Cálculo atual**:
```
100 alunos × 50g × 10 vezes = 50.000g = 50kg
```

**Cálculo proposto**:
```
50kg = 50.000g
50.000g ÷ 345g/pacote = 144,93 → 145 pacotes
```

**Resultado exibido**: "145 Pacotes (50kg)"

## Arquivos a Modificar

### 1. `backend/src/controllers/planejamentoComprasController.ts`

#### Função: `calcularDemandaPeriodo`
- Adicionar busca de `peso` e `unidade_distribuicao` na query de produtos
- Aplicar conversão após calcular quantidade_kg
- Retornar tanto quantidade em unidades quanto em kg

#### Função: `calcularDemandaPorCompetencia`
- Adicionar busca de `peso` e `unidade_distribuicao` na query de refeições
- Aplicar conversão no cálculo de demanda
- Exibir ambas as unidades no resultado

#### Função: `gerarPedidosPorPeriodo`
- Já busca contratos, adicionar peso do produto
- Aplicar conversão ao criar itens do pedido
- Manter quantidade_kg para cálculo de preço

#### Função: `gerarGuiasDemanda`
- **JÁ IMPLEMENTADO** ✅
- Usa `embalagemMap` com `peso` e `unidade_compra`
- Converte kg → unidades com `converterParaEmbalagem`

### 2. `backend/src/modules/estoque/controllers/demandaController.ts`

#### Função: `calcularDemanda`
- Adicionar busca de `peso` e `unidade_distribuicao`
- Aplicar conversão no resultado final
- Exibir quantidade em unidades + kg

### 3. Frontend - Exibição

#### Componentes a Atualizar
- `frontend/src/pages/PlanejamentoCompras.tsx`
- `frontend/src/pages/Demanda.tsx`
- `frontend/src/components/GuiaDetalhe.tsx`

#### Formato de Exibição
```tsx
{produto.peso && produto.unidade_distribuicao !== 'Quilograma' ? (
  <>
    <strong>{produto.quantidade_embalagens}</strong> {produto.unidade_distribuicao}
    <span className="text-gray-500 text-sm ml-2">
      ({produto.quantidade_kg.toFixed(2)}kg)
    </span>
  </>
) : (
  <>{produto.quantidade_kg.toFixed(2)}kg</>
)}
```

## Benefícios

1. **Praticidade**: Gestor vê diretamente quantos pacotes/unidades comprar
2. **Precisão**: Arredondamento para cima garante quantidade suficiente
3. **Flexibilidade**: Produtos em kg continuam funcionando normalmente
4. **Rastreabilidade**: Mantém quantidade_kg para cálculos de preço e auditoria

## Compatibilidade

### Produtos Existentes
- Produtos sem `peso` definido: continuam em kg (comportamento atual)
- Produtos com `unidade_distribuicao = "Quilograma"`: continuam em kg
- Produtos com `peso` e outra unidade: convertidos automaticamente

### Migração
Não é necessária migração de dados. O sistema funciona com os campos existentes.

## Próximos Passos

1. ✅ Documentar solução
2. ⏳ Implementar conversão em `calcularDemandaPeriodo`
3. ⏳ Implementar conversão em `calcularDemandaPorCompetencia`
4. ⏳ Implementar conversão em `gerarPedidosPorPeriodo`
5. ⏳ Atualizar frontend para exibir ambas as unidades
6. ⏳ Testar com produtos reais (bolacha, leite em caixa, etc.)

## Data
23/03/2026
