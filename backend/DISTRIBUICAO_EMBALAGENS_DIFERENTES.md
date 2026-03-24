# Distribuição com Embalagens Diferentes

## Problema

Quando o produto tem uma embalagem de distribuição (ex: 900g) mas o contrato fornece embalagens menores (ex: 450g), surge a dúvida: como distribuir para as escolas?

## Exemplo Real: Óleo de Soja

### Cenário:
- **Produto (Distribuição):** Óleo, 900g por unidade
- **Contrato (Compra):** Óleo, 450g por unidade
- **Fator de conversão:** 0.5 (450g / 900g)

### Demanda:
- 13 escolas precisam de 1 unidade de 900g cada
- Total: 13 × 900g = 11.700g

### Pedido:
- Quantidade: 13 ÷ 0.5 = 26 unidades de 450g
- Total: 26 × 450g = 11.700g ✅

### Distribuição:
Cada escola que esperava 1 unidade de 900g receberá **2 unidades de 450g**:

| Escola | Demanda | Recebe | Total |
|--------|---------|--------|-------|
| Escola A | 1 × 900g | 2 × 450g | 900g ✅ |
| Escola B | 1 × 900g | 2 × 450g | 900g ✅ |
| ... | ... | ... | ... |
| Escola M | 1 × 900g | 2 × 450g | 900g ✅ |

**Total:** 13 escolas × 2 garrafas = 26 garrafas de 450g

## Como o Sistema Funciona

### 1. Guia de Demanda
A guia mostra a necessidade das escolas na **unidade de distribuição** (900g):
```
Escola A: 1 unidade (900g)
Escola B: 1 unidade (900g)
...
Total: 13 unidades
```

### 2. Pedido de Compra
O pedido é gerado na **unidade de compra** (450g):
```
Produto: Óleo de Soja
Quantidade: 26 unidades (450g cada)
Fornecedor: Distribuidora Mesquita
```

### 3. Programação de Entrega
A programação mostra a **distribuição para as escolas**:
```
Escola A: 1 unidade (mas receberá 2 de 450g)
Escola B: 1 unidade (mas receberá 2 de 450g)
...
```

### 4. Entrega Física
Na hora da entrega, o entregador:
1. Recebe 26 garrafas de 450g
2. Entrega 2 garrafas para cada escola
3. Cada escola recebe o equivalente a 900g

## Cálculo Automático

O sistema calcula automaticamente quantas embalagens de compra são necessárias para cada escola:

```javascript
// Para cada escola:
quantidade_demanda = 1 unidade de 900g
fator_conversao = 0.5
quantidade_entrega = quantidade_demanda / fator_conversao
quantidade_entrega = 1 / 0.5 = 2 unidades de 450g
```

## Vantagens

1. **Flexibilidade:** Permite comprar em embalagens diferentes das distribuídas
2. **Economia:** Pode aproveitar melhores preços em embalagens menores
3. **Precisão:** Garante que cada escola receba exatamente a quantidade necessária
4. **Rastreabilidade:** O sistema mantém registro de ambas as unidades

## Casos de Uso

### Caso 1: Embalagem menor (como o óleo)
- Distribuição: 1kg
- Compra: 500g
- Fator: 0.5
- Escola recebe: 2 embalagens de 500g = 1kg ✅

### Caso 2: Embalagem maior
- Distribuição: 500g
- Compra: 1kg
- Fator: 2
- Escola recebe: 0.5 embalagens de 1kg = 500g
- **Atenção:** Neste caso, pode ser necessário dividir embalagens

### Caso 3: Embalagens iguais
- Distribuição: 1kg
- Compra: 1kg
- Fator: 1
- Escola recebe: 1 embalagem de 1kg = 1kg ✅

## Recomendações

1. **Preferir embalagens menores:** Facilita a distribuição exata
2. **Usar múltiplos:** Embalagens de compra que sejam divisores da distribuição
3. **Documentar:** Deixar claro no pedido que as embalagens são diferentes
4. **Treinar equipe:** Entregadores devem saber fazer a conversão

## Observação Importante

A **guia de demanda** sempre mostra na unidade de distribuição (900g) porque:
- É a unidade que as escolas entendem
- É a unidade usada nos cardápios
- É a unidade padrão do produto

O **pedido de compra** mostra na unidade de compra (450g) porque:
- É a unidade que o fornecedor vende
- É a unidade do contrato
- É a unidade que será entregue fisicamente

O sistema faz a conversão automaticamente entre as duas unidades!
