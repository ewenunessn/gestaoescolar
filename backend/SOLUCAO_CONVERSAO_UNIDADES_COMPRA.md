# Solução: Conversão entre Unidades de Distribuição e Compra

## Problema Identificado

Quando geramos pedidos de compra, precisamos converter:
- **Demanda calculada**: Em unidades de distribuição (ex: 7 pacotes de 500g)
- **Pedido de compra**: Em unidades de compra do contrato (ex: caixas de 5kg)

## Estrutura de Dados

### Tabela `produtos`
- `peso` - Peso da embalagem de distribuição em gramas (ex: 500)
- `unidade_distribuicao` - Unidade de distribuição (ex: "Pacote")

### Tabela `contrato_produtos`
- `peso_embalagem` - Peso da embalagem de compra em gramas (ex: 5000)
- `unidade_compra` - Unidade de compra (ex: "Caixa")
- `fator_conversao` - Fator de conversão manual (opcional)

## Estratégia de Conversão

### Opção 1: Conversão via Peso (Recomendada)

**Sempre usar KG como unidade intermediária**

```
Demanda: 7 pacotes × 500g = 3.500kg
Compra: 3.500kg ÷ 5.000g = 0.7 caixas → arredondar para 1 caixa
```

**Vantagens:**
- Consistente e previsível
- Funciona para qualquer combinação de unidades
- Mantém rastreabilidade

**Implementação:**
```typescript
function converterParaUnidadeCompra(
  quantidade_kg: number,
  peso_embalagem_compra_g: number,
  unidade_compra: string
): { quantidade: number; unidade: string } {
  if (!peso_embalagem_compra_g || peso_embalagem_compra_g <= 0) {
    // Sem peso definido, manter em kg
    return { quantidade: quantidade_kg, unidade: 'kg' };
  }
  
  const quantidadeGramas = quantidade_kg * 1000;
  const quantidadeEmbalagens = Math.ceil(quantidadeGramas / peso_embalagem_compra_g);
  
  return {
    quantidade: quantidadeEmbalagens,
    unidade: unidade_compra || 'UN'
  };
}
```

### Opção 2: Fator de Conversão Manual

Para casos especiais onde a conversão por peso não é adequada:

```typescript
function converterComFatorManual(
  quantidade_distribuicao: number,
  fator_conversao: number,
  unidade_compra: string
): { quantidade: number; unidade: string } {
  const quantidadeCompra = Math.ceil(quantidade_distribuicao * fator_conversao);
  return { quantidade: quantidadeCompra, unidade: unidade_compra };
}
```

**Exemplo:**
- Fator: 0.1 (10 pacotes = 1 caixa)
- Demanda: 7 pacotes
- Compra: 7 × 0.1 = 0.7 → 1 caixa

## Fluxo Completo

### 1. Cálculo de Demanda (Distribuição)
```
Cardápio → Per Capita → Demanda em KG → Converter para unidade_distribuicao
Resultado: 7 Pacotes (3.5kg)
```

### 2. Geração de Pedido (Compra)
```
Demanda em KG (3.5kg) → Buscar contrato → Converter para unidade_compra
Resultado: 1 Caixa (5kg)
```

### 3. Armazenamento no Pedido
```sql
pedido_itens:
  - quantidade: 1 (quantidade de compra)
  - unidade: 'Caixa' (unidade de compra)
  - quantidade_kg: 3.5 (quantidade original para auditoria)
  - preco_unitario: 25.00 (preço por caixa)
  - valor_total: 25.00 (1 × 25.00)
```

## Implementação Proposta

### 1. Adicionar Campos em `pedido_itens`

```sql
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS quantidade_kg NUMERIC(12,3);
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS unidade VARCHAR(50);
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS quantidade_distribuicao NUMERIC(12,3);
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS unidade_distribuicao VARCHAR(50);
```

### 2. Função Helper de Conversão

```typescript
interface ConversaoCompra {
  quantidade_compra: number;
  unidade_compra: string;
  quantidade_kg: number;
  quantidade_distribuicao?: number;
  unidade_distribuicao?: string;
}

function converterDemandaParaCompra(
  quantidade_kg: number,
  produto: {
    peso_distribuicao_g?: number;
    unidade_distribuicao?: string;
  },
  contrato: {
    peso_embalagem_g?: number;
    unidade_compra?: string;
    fator_conversao?: number;
  }
): ConversaoCompra {
  // Calcular quantidade em unidade de distribuição (para referência)
  let quantidade_distribuicao: number | undefined;
  if (produto.peso_distribuicao_g && produto.peso_distribuicao_g > 0) {
    quantidade_distribuicao = Math.ceil((quantidade_kg * 1000) / produto.peso_distribuicao_g);
  }
  
  // Converter para unidade de compra
  let quantidade_compra: number;
  let unidade_compra: string;
  
  if (contrato.fator_conversao && contrato.fator_conversao > 0) {
    // Usar fator de conversão manual se disponível
    quantidade_compra = Math.ceil((quantidade_distribuicao || quantidade_kg) * contrato.fator_conversao);
    unidade_compra = contrato.unidade_compra || 'UN';
  } else if (contrato.peso_embalagem_g && contrato.peso_embalagem_g > 0) {
    // Usar conversão por peso
    const quantidadeGramas = quantidade_kg * 1000;
    quantidade_compra = Math.ceil(quantidadeGramas / contrato.peso_embalagem_g);
    unidade_compra = contrato.unidade_compra || 'UN';
  } else {
    // Sem conversão, manter em kg
    quantidade_compra = quantidade_kg;
    unidade_compra = 'kg';
  }
  
  return {
    quantidade_compra,
    unidade_compra,
    quantidade_kg,
    quantidade_distribuicao,
    unidade_distribuicao: produto.unidade_distribuicao
  };
}
```

### 3. Atualizar Geração de Pedidos

```typescript
// Ao criar pedido_item
const conversao = converterDemandaParaCompra(
  produto.quantidade_kg,
  {
    peso_distribuicao_g: produto.peso,
    unidade_distribuicao: produto.unidade_distribuicao
  },
  {
    peso_embalagem_g: contrato.peso_embalagem,
    unidade_compra: contrato.unidade_compra,
    fator_conversao: contrato.fator_conversao
  }
);

await client.query(`
  INSERT INTO pedido_itens (
    pedido_id, contrato_produto_id, produto_id,
    quantidade, unidade, quantidade_kg,
    quantidade_distribuicao, unidade_distribuicao,
    preco_unitario, valor_total, data_entrega_prevista
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
`, [
  pedido_id,
  contrato.contrato_produto_id,
  produto.produto_id,
  conversao.quantidade_compra,
  conversao.unidade_compra,
  conversao.quantidade_kg,
  conversao.quantidade_distribuicao,
  conversao.unidade_distribuicao,
  contrato.preco_unitario,
  conversao.quantidade_compra * contrato.preco_unitario,
  periodo.data_inicio
]);
```

## Exemplo Prático

### Cenário: Alho

**Produto:**
- Peso distribuição: 500g
- Unidade distribuição: "Pacote"

**Demanda Calculada:**
- 3.5kg = 7 pacotes

**Contrato:**
- Peso embalagem: 5000g (5kg)
- Unidade compra: "Caixa"
- Preço: R$ 25,00/caixa

**Conversão:**
```
3.5kg ÷ 5kg = 0.7 caixas → arredondar para 1 caixa
```

**Pedido Gerado:**
```
quantidade: 1
unidade: "Caixa"
quantidade_kg: 3.5
quantidade_distribuicao: 7
unidade_distribuicao: "Pacote"
preco_unitario: 25.00
valor_total: 25.00
```

## Exibição no Frontend

### Planejamento de Compras
```
Alho: 7 Pacotes (3.5kg)
```

### Pedido de Compra
```
Alho: 1 Caixa (3.5kg necessários, 7 pacotes)
Preço: R$ 25,00/caixa
Total: R$ 25,00
```

### Detalhes do Item
```
Demanda: 7 Pacotes (3.5kg)
Compra: 1 Caixa de 5kg
Sobra: 1.5kg (3 pacotes)
```

## Vantagens da Solução

1. **Consistência**: KG como unidade intermediária
2. **Flexibilidade**: Suporta qualquer combinação de unidades
3. **Rastreabilidade**: Mantém quantidade original e convertida
4. **Auditoria**: Permite verificar conversões
5. **Transparência**: Mostra sobras e diferenças

## Próximos Passos

1. ✅ Adicionar campos em `pedido_itens`
2. ✅ Implementar função de conversão
3. ✅ Atualizar `gerarPedidosPorPeriodo()`
4. ✅ Atualizar `gerarPedidoDaGuia()`
5. ✅ Atualizar frontend para exibir conversões
6. ✅ Adicionar validações e alertas de sobra
