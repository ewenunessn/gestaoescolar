# 📊 Fator de Correção e Índice de Cocção

## 🎯 Conceitos Fundamentais

### 1. Fator de Correção (FC)
**Definição**: Representa a perda de peso do alimento durante o **pré-preparo** (limpeza, descascamento, retirada de partes não comestíveis).

**Fórmula**: 
```
FC = Peso Bruto / Peso Líquido
```

**Quando usar**: ANTES do cozimento, no momento da compra.

**Exemplos**:
- **Batata**: 1000g bruto → 850g líquido → FC = 1.18 (perde 18%)
- **Carne com osso**: 1000g bruto → 700g líquido → FC = 1.43 (perde 43%)
- **Alface**: 1000g bruto → 800g líquido → FC = 1.25 (perde 25%)
- **Arroz**: 1000g bruto → 1000g líquido → FC = 1.0 (não perde)

### 2. Índice de Cocção (IC)
**Definição**: Representa a **mudança de peso** do alimento durante o **cozimento**.

**Fórmula**: 
```
IC = Peso Cozido / Peso Cru (limpo)
```

**Quando usar**: DURANTE o cozimento.

**Exemplos**:
- **Arroz**: 100g cru → 250g cozido → IC = 2.5 (ganha 150%)
- **Macarrão**: 100g cru → 200g cozido → IC = 2.0 (ganha 100%)
- **Feijão**: 100g cru → 220g cozido → IC = 2.2 (ganha 120%)
- **Carne bovina**: 100g crua → 70g cozida → IC = 0.7 (perde 30%)
- **Frango**: 100g cru → 75g cozido → IC = 0.75 (perde 25%)
- **Legumes**: 100g crus → 90g cozidos → IC = 0.9 (perde 10%)
- **Salada crua**: 100g → 100g → IC = 1.0 (não muda)

---

## 🧮 Cálculos Corretos

### Fluxo Completo:

```
1. Per Capita Final (o que a pessoa come) = 100g
2. Peso Cru Necessário = Per Capita Final / IC
3. Peso Bruto a Comprar = Peso Cru Necessário × FC
```

### Exemplo Prático: Arroz

**Dados**:
- Per Capita Final (cozido): 150g
- Índice de Cocção: 2.5 (arroz absorve água)
- Fator de Correção: 1.0 (arroz não perde no pré-preparo)

**Cálculo**:
```
1. Peso Cru Necessário = 150g / 2.5 = 60g
2. Peso Bruto a Comprar = 60g × 1.0 = 60g
```

**Resultado**: Comprar 60g de arroz cru para servir 150g cozido.

### Exemplo Prático: Carne Bovina

**Dados**:
- Per Capita Final (cozida): 100g
- Índice de Cocção: 0.7 (carne perde água)
- Fator de Correção: 1.2 (carne perde gordura/osso na limpeza)

**Cálculo**:
```
1. Peso Cru Necessário = 100g / 0.7 = 142.86g
2. Peso Bruto a Comprar = 142.86g × 1.2 = 171.43g
```

**Resultado**: Comprar 171.43g de carne bruta para servir 100g cozida.

### Exemplo Prático: Batata Cozida

**Dados**:
- Per Capita Final (cozida): 120g
- Índice de Cocção: 0.95 (batata perde pouca água)
- Fator de Correção: 1.18 (batata perde casca)

**Cálculo**:
```
1. Peso Cru Necessário = 120g / 0.95 = 126.32g
2. Peso Bruto a Comprar = 126.32g × 1.18 = 149.06g
```

**Resultado**: Comprar 149.06g de batata com casca para servir 120g cozida.

---

## 📋 Tabela de Referência

| Alimento | Fator Correção (FC) | Índice Cocção (IC) | Observação |
|----------|---------------------|-------------------|------------|
| Arroz | 1.00 | 2.50 | Absorve muita água |
| Macarrão | 1.00 | 2.00 | Absorve água |
| Feijão | 1.05 | 2.20 | Catação + absorve água |
| Carne bovina | 1.20 | 0.70 | Perde gordura + água |
| Frango | 1.15 | 0.75 | Perde pele + água |
| Batata | 1.18 | 0.95 | Perde casca + pouca água |
| Cenoura | 1.10 | 0.90 | Perde casca + pouca água |
| Alface | 1.25 | 1.00 | Perde folhas ruins, não cozinha |
| Tomate | 1.05 | 1.00 | Pouca perda, não cozinha |
| Óleo | 1.00 | 1.00 | Sem perda, não cozinha |

---

## 🎯 Implementação no Sistema

### 1. Banco de Dados
```sql
-- Produtos
fator_correcao NUMERIC(10, 3) DEFAULT 1.0  -- Perda no pré-preparo
indice_coccao NUMERIC(10, 3) DEFAULT 1.0   -- Mudança no cozimento
```

### 2. Cálculo no Backend
```typescript
// Per capita que o aluno vai comer (cozido)
const perCapitaFinal = 150; // gramas

// Calcular quanto precisa cru
const pesoCruNecessario = perCapitaFinal / produto.indice_coccao;

// Calcular quanto precisa comprar (bruto)
const pesoBrutoComprar = pesoCruNecessario * produto.fator_correcao;
```

### 3. Exibição no Frontend
- **Per Capita Líquido**: O que o aluno come (cozido)
- **Per Capita Bruto**: O que precisa comprar (considerando FC e IC)

---

## ⚠️ Erros Comuns a Evitar

### ❌ ERRADO:
```typescript
// Multiplicar per capita por fator de correção diretamente
const pesoComprar = perCapita * fatorCorrecao; // ERRADO!
```

### ✅ CORRETO:
```typescript
// Considerar índice de cocção primeiro, depois fator de correção
const pesoCru = perCapita / indiceCoccao;
const pesoComprar = pesoCru * fatorCorrecao;
```

---

## 🔍 Validações

1. **Fator de Correção**: Sempre ≥ 1.0 (nunca ganha peso na limpeza)
2. **Índice de Cocção**: Pode ser > 1.0 (ganha peso) ou < 1.0 (perde peso)
3. **Alimentos crus**: IC = 1.0 (saladas, frutas)
4. **Alimentos sem perda**: FC = 1.0 (arroz, óleo, açúcar)

---

## 📝 Notas Importantes

1. **Ordem importa**: Sempre calcular IC antes de FC
2. **Unidades**: Todos os cálculos em gramas ou mililitros
3. **Precisão**: Usar 3 casas decimais para evitar erros de arredondamento
4. **Documentação**: Sempre documentar a fonte dos valores (TACO, IBGE, etc.)

---

**Data de criação**: 24/03/2026
**Versão**: 1.0.0
**Status**: ✅ Documentado
