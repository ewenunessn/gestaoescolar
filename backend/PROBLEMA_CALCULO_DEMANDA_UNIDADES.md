# Problema: Cálculo de Demanda para Produtos em Unidades

## Situação Atual

**Produto**: Ovo De Galinha (ID 169)
**Escola**: CMEI Berço da Liberdade (410 alunos)
**Data**: 22/03/2026
**Quantidade na Guia**: 684 unidades
**Per Capita Esperada**: 1 unidade/aluno

## Cálculo Esperado vs Real

### Esperado
```
Quantidade = Alunos × Per Capita × Frequência
```

**Cenário 1: 1 refeição com ovo**
```
410 alunos × 1 ovo × 1 refeição = 410 ovos
```

**Cenário 2: 2 refeições com ovo**
```
410 alunos × 1 ovo × 2 refeições = 820 ovos
```

### Real
```
684 ovos ÷ 410 alunos = 1,67 ovos/aluno
```

❌ **Não bate com nenhuma lógica!**

## Possíveis Causas

### 1. Erro no Cálculo de Demanda
O sistema pode estar:
- Multiplicando por fator de correção errado
- Somando valores duplicados
- Usando per capita em gramas ao invés de unidades

### 2. Frequência Incorreta
- Contando refeições duplicadas
- Somando dias letivos errados
- Incluindo modalidades duplicadas

### 3. Conversão Errada de Unidades
- Convertendo unidades para kg e depois de volta
- Aplicando peso quando não deveria
- Usando fator de divisão antigo

## Onde Está o Cálculo

O cálculo de demanda está em:
- `backend/src/controllers/planejamentoComprasController.ts`
- Função: `calcularDemandaPeriodo()` ou `calcularDemandaPorCompetencia()`

## Solução Necessária

### 1. Verificar Lógica de Cálculo

Para produtos em UNIDADES (não kg), o cálculo deve ser:

```typescript
// Para produtos em UNIDADES
if (produto.unidade_distribuicao === 'Unidade' || produto.unidade_distribuicao === 'un') {
  quantidade = alunos × perCapita × frequencia;
  // NÃO aplicar fator de correção
  // NÃO converter para kg
  // NÃO multiplicar por peso
}

// Para produtos em KG
else {
  quantidade = alunos × perCapitaGramas × frequencia × fatorCorrecao / 1000;
}
```

### 2. Verificar Frequência

A frequência deve contar:
- Quantas vezes o produto aparece no cardápio
- Quantos dias letivos no período
- Quantas refeições por dia

```typescript
frequencia = diasLetivos × refeicoesComProdutoPorDia
```

### 3. Não Aplicar Conversões Desnecessárias

Para produtos em unidades:
- ❌ NÃO converter para kg
- ❌ NÃO aplicar fator de correção (perda/rendimento)
- ❌ NÃO multiplicar por peso
- ✅ Usar valor direto: alunos × per capita × frequência

## Exemplo Prático

### Cardápio de Março
- Dia 22/03: Café da manhã com ovo (1 ovo per capita)
- Dia 22/03: Almoço SEM ovo
- Dia 25/03: Almoço com ovo (1 ovo per capita)

### Cálculo Correto
```
Dia 22/03: 410 alunos × 1 ovo × 1 refeição = 410 ovos
Dia 25/03: 410 alunos × 1 ovo × 1 refeição = 410 ovos
Total: 820 ovos no mês
```

### Por Entrega
Se agrupar por data de entrega:
```
22/03: 410 ovos
25/03: 410 ovos
```

## Verificação Necessária

1. **Verificar cardápios de março**
   - Quantas refeições têm ovo?
   - Qual a per capita em cada refeição?

2. **Verificar cálculo de demanda**
   - Como está sendo calculado?
   - Está aplicando conversões erradas?

3. **Verificar dados na guia**
   - De onde vem o valor 684?
   - Foi calculado automaticamente ou inserido manualmente?

## Próximos Passos

1. ✅ Identificar onde está o cálculo de demanda
2. ⏳ Verificar lógica para produtos em unidades
3. ⏳ Corrigir cálculo se necessário
4. ⏳ Recalcular guia de março
5. ⏳ Validar resultado

## Impacto

Se o cálculo estiver errado:
- ❌ Compra quantidade errada de produtos
- ❌ Desperdício ou falta de alimentos
- ❌ Custo incorreto
- ❌ Dados inconsistentes

## Urgência

🔴 **ALTA** - Afeta diretamente a compra de alimentos e pode causar desperdício ou falta.
