# Implementação Concluída: Conversão de Unidades de Distribuição para Compra

## Data: 23/03/2026
## Status: ✅ IMPLEMENTADO

## Problema Resolvido

Quando geramos pedidos de compra, precisamos converter:
- **Demanda** (unidade de distribuição): 7 pacotes de 500g = 3.5kg
- **Pedido** (unidade de compra): 1 caixa de 5kg

## Solução Implementada

### 1. Migration Criada

**Arquivo**: `backend/migrations/20260323_add_unidades_pedido_itens.sql`

Novos campos em `pedido_itens`:
- `quantidade_kg` - Quantidade original em kg (auditoria)
- `unidade` - Unidade de compra (ex: "Caixa")
- `quantidade_distribuicao` - Quantidade em unidade de distribuição (ex: 7)
- `unidade_distribuicao` - Unidade de distribuição (ex: "Pacote")

### 2. Função de Conversão

**Arquivo**: `backend/src/controllers/planejamentoComprasController.ts`

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
): ConversaoCompra
```

### 3. Lógica de Conversão

**Prioridade 1: Fator de Conversão Manual**
```
SE fator_conversao existe
  quantidade_compra = quantidade_distribuicao × fator_conversao
  Exemplo: 7 pacotes × 0.1 = 0.7 → 1 caixa
```

**Prioridade 2: Conversão por Peso**
```
SE peso_embalagem_compra existe
  quantidade_compra = quantidade_kg ÷ (peso_embalagem_compra / 1000)
  Exemplo: 3.5kg ÷ 5kg = 0.7 → 1 caixa
```

**Fallback: Manter em KG**
```
SE nenhuma conversão disponível
  quantidade_compra = quantidade_kg
  unidade_compra = "kg"
```

### 4. Queries Atualizadas

**Busca de Contratos** (2 locais):
- `gerarPedidosPorPeriodo()`
- `gerarPedidoDaGuia()`

Campos adicionados:
```sql
cp.peso_embalagem,
cp.unidade_compra,
cp.fator_conversao,
p.peso as peso_distribuicao,
p.unidade_distribuicao
```

**Inserção de Itens** (2 locais):
```sql
INSERT INTO pedido_itens (
  pedido_id, contrato_produto_id, produto_id,
  quantidade, unidade, quantidade_kg,
  quantidade_distribuicao, unidade_distribuicao,
  preco_unitario, valor_total, data_entrega_prevista, observacoes
) VALUES (...)
```

### 5. Fluxo Completo

#### Passo 1: Cálculo de Demanda
```
Cardápio → Per Capita → Demanda em KG
3.5kg → Converter para distribuição → 7 Pacotes
```

#### Passo 2: Buscar Contrato
```
Produto: Alho
Contrato: Caixa de 5kg, R$ 25,00/caixa
```

#### Passo 3: Converter para Compra
```
converterDemandaParaCompra(
  3.5kg,
  { peso_distribuicao_g: 500, unidade_distribuicao: "Pacote" },
  { peso_embalagem_g: 5000, unidade_compra: "Caixa" }
)
→ { quantidade_compra: 1, unidade_compra: "Caixa", quantidade_kg: 3.5, ... }
```

#### Passo 4: Criar Pedido
```sql
pedido_itens:
  quantidade: 1
  unidade: "Caixa"
  quantidade_kg: 3.5
  quantidade_distribuicao: 7
  unidade_distribuicao: "Pacote"
  preco_unitario: 25.00
  valor_total: 25.00
```

## Exemplo Prático Completo

### Cenário: Alho

**Cadastro do Produto:**
```
Nome: Alho
Peso: 500g
Unidade Distribuição: Pacote
```

**Cadastro do Contrato:**
```
Produto: Alho
Fornecedor: Fornecedor X
Peso Embalagem: 5000g (5kg)
Unidade Compra: Caixa
Preço: R$ 25,00/caixa
```

**Demanda Calculada:**
```
Cardápio: Alho aparece 1x no período
Alunos: 250
Per Capita: 1g
Fator Correção: 1.0
Cálculo: 250 × 1g × 1 = 0.25kg
Total: 3.5kg (somando todas as escolas)
Distribuição: 7 Pacotes
```

**Conversão para Compra:**
```
Entrada: 3.5kg
Cálculo: 3.5kg ÷ 5kg = 0.7 caixas
Arredondamento: Math.ceil(0.7) = 1 caixa
Saída: 1 Caixa
```

**Pedido Gerado:**
```
Item:
  Produto: Alho
  Quantidade: 1 Caixa
  Quantidade KG: 3.5kg
  Quantidade Distribuição: 7 Pacotes
  Preço Unitário: R$ 25,00
  Valor Total: R$ 25,00
  
Observação: Sobra de 1.5kg (3 pacotes)
```

## Benefícios da Solução

1. **Consistência**: KG como unidade intermediária universal
2. **Flexibilidade**: Suporta qualquer combinação de unidades
3. **Rastreabilidade**: Mantém todas as quantidades (kg, distribuição, compra)
4. **Auditoria**: Permite verificar conversões e sobras
5. **Transparência**: Mostra claramente o que foi pedido vs necessário
6. **Preço Correto**: Calcula valor baseado na unidade de compra do contrato

## Arquivos Modificados

1. `backend/migrations/20260323_add_unidades_pedido_itens.sql` - ✅ Criado
2. `backend/src/controllers/planejamentoComprasController.ts` - ✅ Atualizado
   - Interface `ConversaoCompra` adicionada
   - Função `converterDemandaParaCompra()` implementada
   - Queries de contratos atualizadas (2x)
   - Inserção de itens atualizada (2x)

## Próximos Passos

### Backend
1. ✅ Executar migration
2. ⏳ Testar geração de pedidos
3. ⏳ Validar conversões

### Frontend
1. ⏳ Atualizar exibição de pedidos para mostrar conversões
2. ⏳ Adicionar tooltip com detalhes da conversão
3. ⏳ Mostrar alertas de sobra quando relevante

### Exemplo de Exibição no Frontend
```
Pedido #PED-MAR2026000001

Item: Alho
├─ Quantidade: 1 Caixa de 5kg
├─ Necessário: 3.5kg (7 Pacotes)
├─ Sobra: 1.5kg (3 Pacotes)
├─ Preço: R$ 25,00/caixa
└─ Total: R$ 25,00
```

## Comandos para Executar

### 1. Executar Migration
```bash
psql -U postgres -d seu_banco -f backend/migrations/20260323_add_unidades_pedido_itens.sql
```

### 2. Reiniciar Backend
```bash
cd backend
npm run dev
```

### 3. Testar
```bash
# Gerar pedido e verificar conversões
curl -X POST http://localhost:3000/api/planejamento-compras/gerar-pedidos \
  -H "Content-Type: application/json" \
  -d '{"competencia":"2026-03","periodos":[{"data_inicio":"2026-03-01","data_fim":"2026-03-31"}]}'
```

## Observações Importantes

- Arredondamento sempre para cima (Math.ceil) garante quantidade suficiente
- Quantidade em kg é mantida para cálculos de preço e auditoria
- Fator de conversão manual tem prioridade sobre conversão por peso
- Produtos sem peso ou fator definido continuam em kg
- Sobras são calculáveis: `sobra_kg = (quantidade_compra × peso_embalagem_g / 1000) - quantidade_kg`
