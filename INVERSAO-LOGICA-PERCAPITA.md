# Inversão da Lógica Per Capita: Líquido → Bruto

## Contexto

Anteriormente, o sistema funcionava assim:
- Usuário cadastrava per capita BRUTO (quantidade de compra)
- Sistema calculava per capita LÍQUIDO (consumo) dividindo pelo fator de correção
- Fórmula: `líquido = bruto / fator_correcao`

## Nova Lógica (Implementada)

Agora o sistema funciona de forma mais intuitiva:
- Usuário cadastra per capita LÍQUIDO (consumo efetivo)
- Sistema calcula per capita BRUTO (quantidade de compra) multiplicando pelo fator de correção
- Fórmula: `bruto = liquido * fator_correcao`

## Justificativa

Esta inversão faz mais sentido porque:
1. O nutricionista pensa em termos de CONSUMO (quanto o aluno vai comer)
2. O fator de correção serve para calcular quanto COMPRAR considerando perdas
3. É mais natural definir "preciso de 100g de arroz cozido" do que "preciso comprar 120g de arroz cru"

## Mudanças Implementadas

### Frontend

#### 1. AdicionarIngredienteDialog.tsx
- Campo alterado para "Per Capita Líquido (consumo)"
- Alert mostra "Per Capita Bruto (compra)" calculado
- Fórmula: `bruto = liquido * fator_correcao`

#### 2. EditarIngredienteDialog.tsx
- Campo alterado para "Per Capita Líquido (consumo)" no modo simples
- Campos alterados para "Per Capita Líquido" no modo avançado
- Alert/texto auxiliar mostra "Bruto" calculado
- Fórmula: `bruto = liquido * fator_correcao`

#### 3. RefeicaoDetalhe.tsx

**Tabela de Ingredientes:**
- Coluna 1: "Per Capita Líquido" (destaque em azul)
- Coluna 2: "Per Capita Bruto" (texto normal)
- Ordem invertida para priorizar o líquido

**Tooltips:**
- Mostram: `{modalidade}: {per_capita}g (líquido) → {bruto}g (bruto)`
- Fórmula: `bruto = liquido * fator_correcao`

**Cálculos de Range:**
```typescript
// Per capita cadastrado é LÍQUIDO
const perCapitasLiquido = [...];
const minPerCapitaLiquido = Math.min(...perCapitasLiquido);
const maxPerCapitaLiquido = Math.max(...perCapitasLiquido);

// Calcular BRUTO = líquido * fator
const minPerCapitaBruto = minPerCapitaLiquido * fatorCorrecao;
const maxPerCapitaBruto = maxPerCapitaLiquido * fatorCorrecao;
```

**PDF (Ficha Técnica):**
- Coluna 1: "Líq." (destaque em azul)
- Coluna 2: "Bruto" (texto normal)
- Usa `per_capita_bruto` retornado pelo backend

### Backend

#### 1. refeicaoCalculosController.ts

**Cálculo Nutricional:**
```typescript
// Per capita cadastrado é LÍQUIDO (consumo)
let quantidadeGramasLiquido = ing.per_capita;
if (ing.tipo_medida === 'unidades') {
  quantidadeGramasLiquido = ing.per_capita * 100;
}

// Calcular proporção usando quantidade LÍQUIDA
const proporcao = quantidadeGramasLiquido / 100;
```

**Cálculo de Custo:**
```typescript
// Per capita cadastrado é LÍQUIDO (consumo)
// Para calcular custo, precisamos do BRUTO (compra)
const fatorCorrecao = ing.fator_correcao || 1.0;
const perCapitaBruto = ing.per_capita * fatorCorrecao;

// Calcular custo baseado no per capita BRUTO
if (ing.tipo_medida === 'gramas') {
  const quantidadeKg = perCapitaBruto / 1000;
  custo = quantidadeKg * ing.preco_unitario;
} else {
  custo = perCapitaBruto * ing.preco_unitario;
}
```

**Detalhamento retorna:**
```typescript
{
  quantidade_liquida: ing.per_capita,
  quantidade_bruta: perCapitaBruto,
  fator_correcao: fatorCorrecao,
  // ...
}
```

#### 2. refeicaoIngredientesController.ts

```typescript
// Per capita cadastrado é LÍQUIDO (consumo)
let quantidadeGramasLiquido = ing.per_capita;
if (ing.tipo_medida === 'unidades') {
  quantidadeGramasLiquido = ing.per_capita * 100;
}

// Calcular per capita BRUTO (compra) = líquido * fator
const fatorCorrecao = ing.fator_correcao || 1.0;
const perCapitaBruto = ing.per_capita * fatorCorrecao;

return {
  per_capita: ing.per_capita, // LÍQUIDO (consumo)
  per_capita_liquido: ing.per_capita, // Explícito
  per_capita_bruto: perCapitaBruto, // BRUTO (compra)
  // ...
};
```

## Banco de Dados

**IMPORTANTE:** O valor salvo na coluna `per_capita` da tabela `refeicao_produtos` agora representa o per capita LÍQUIDO (consumo).

Não é necessária migração porque:
1. A interpretação do valor mudou, mas o valor em si continua válido
2. O fator de correção já estava salvo na tabela `produtos`
3. Os cálculos agora usam a nova lógica automaticamente

## Fluxo Completo

### Cadastro de Ingrediente
1. Nutricionista define: "100g de arroz cozido" (LÍQUIDO)
2. Sistema mostra: "Comprar 120g de arroz cru" (BRUTO, se fator = 1.2)
3. Salva no banco: `per_capita = 100` (LÍQUIDO)

### Cálculo Nutricional
1. Busca `per_capita = 100` (LÍQUIDO)
2. Calcula valores nutricionais baseado em 100g
3. Usa tabela `produto_composicao_nutricional`

### Cálculo de Custo
1. Busca `per_capita = 100` (LÍQUIDO)
2. Calcula `bruto = 100 * 1.2 = 120g` (BRUTO)
3. Calcula custo: `120g * preço_por_kg`

### Visualização
- Tabela mostra: "100g (líquido) | 120g (bruto)"
- PDF mostra: "Líq: 100g | Bruto: 120g"
- Tooltip explica a diferença

## Testes Necessários

- [ ] Adicionar ingrediente com fator de correção > 1.0
- [ ] Verificar cálculo de bruto em tempo real
- [ ] Editar ingrediente e verificar valores
- [ ] Verificar tabela de ingredientes (ordem das colunas)
- [ ] Verificar tooltips (fórmula invertida)
- [ ] Exportar PDF e verificar colunas
- [ ] Calcular valores nutricionais (deve usar líquido)
- [ ] Calcular custo (deve usar bruto)
- [ ] Testar com modalidades diferentes
- [ ] Testar com fator de correção = 1.0 (sem diferença)

## Consistência Terminológica

Em todo o sistema:
- **Per Capita Líquido** = Consumo efetivo (o que o aluno come)
- **Per Capita Bruto** = Quantidade de compra (considerando perdas)
- **Fator de Correção** = Multiplicador para calcular bruto a partir do líquido

## Status

✅ Frontend atualizado (AdicionarIngredienteDialog, EditarIngredienteDialog, RefeicaoDetalhe)
✅ Backend atualizado (refeicaoCalculosController, refeicaoIngredientesController)
✅ PDF atualizado (ordem das colunas invertida)
✅ Tooltips e labels atualizados
✅ Cálculos nutricionais usando líquido
✅ Cálculos de custo usando bruto

## Próximos Passos

1. Testar fluxo completo no ambiente de desenvolvimento
2. Validar cálculos com dados reais
3. Verificar se há outros lugares que precisam ser atualizados
4. Documentar para a equipe de nutrição
