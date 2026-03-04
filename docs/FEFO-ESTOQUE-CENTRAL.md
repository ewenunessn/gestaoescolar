# Sistema FEFO - Estoque Central

## 📋 Resumo das Mudanças

O sistema de Estoque Central foi refatorado para implementar o método FEFO (First Expired, First Out / Primeiro que Vence, Primeiro que Sai) de forma automática e obrigatória.

## 🎯 Objetivos Alcançados

1. ✅ **Lote obrigatório na entrada**: Toda entrada de estoque DEVE ter lote e data de validade
2. ✅ **FEFO automático na saída**: Sistema escolhe automaticamente os lotes mais próximos do vencimento
3. ✅ **Quantidades calculadas**: Quantidade total e disponível são calculadas dinamicamente a partir dos lotes
4. ✅ **Múltiplos lotes por saída**: Uma saída pode usar vários lotes automaticamente se necessário

## 🔄 Mudanças no Backend

### Database (Migration)
- Removidas colunas `quantidade`, `quantidade_reservada`, `quantidade_disponivel` da tabela `estoque_central`
- Criada view `vw_estoque_central_completo` que calcula quantidades dinamicamente
- Criada função `obter_lotes_fefo()` para ordenação FEFO

### Model (`EstoqueCentral.ts`)

#### Interface `CriarEntradaData`
```typescript
{
  produto_id: number;
  quantidade: number;
  lote: string;              // ✅ OBRIGATÓRIO
  data_validade: string;     // ✅ OBRIGATÓRIO
  data_fabricacao?: string;  // Opcional
  motivo?: string;
  observacao?: string;
  documento?: string;
  fornecedor?: string;
  nota_fiscal?: string;
}
```

#### Interface `CriarSaidaData`
```typescript
{
  produto_id: number;
  quantidade: number;
  motivo?: string;
  observacao?: string;
  documento?: string;
  // ❌ lote_id REMOVIDO - FEFO automático
}
```

#### Método `registrarEntrada()`
- Lote e data de validade são obrigatórios
- Cria ou atualiza lote automaticamente
- Se lote já existe, soma a quantidade

#### Método `registrarSaida()`
- Busca lotes ordenados por `data_validade ASC, created_at ASC` (FEFO)
- Retira automaticamente dos lotes mais próximos do vencimento
- Pode usar múltiplos lotes em uma única saída
- Valida se há quantidade suficiente antes de processar

### Controller (`EstoqueCentralController.ts`)

#### `POST /api/estoque-central/entrada`
Validações:
- `produto_id` obrigatório
- `quantidade` obrigatório e > 0
- `lote` obrigatório
- `data_validade` obrigatório

#### `POST /api/estoque-central/saida`
Validações:
- `produto_id` obrigatório
- `quantidade` obrigatório e > 0
- `motivo` opcional
- ❌ `lote_id` não é mais aceito

## 📱 Mudanças no Mobile App

### `EstoqueCentralEntradaScreen.tsx`
- Removido switch "Usar Lote"
- Lote é sempre obrigatório
- Campos de lote e data de validade sempre visíveis
- Validação: lote e data_validade são obrigatórios

### `EstoqueCentralSaidaScreen.tsx`
- Removido dropdown de seleção de lote
- Removida função `carregarLotes()`
- Adicionado card informativo sobre FEFO automático
- Interface simplificada: apenas produto, quantidade e motivo

### `estoqueCentral.ts` (API)

#### Interface `EntradaData`
```typescript
{
  produto_id: number;
  quantidade: number;
  lote: string;              // ✅ OBRIGATÓRIO
  data_validade: string;     // ✅ OBRIGATÓRIO
  data_fabricacao?: string;
  motivo?: string;
  observacao?: string;
  documento?: string;
  fornecedor?: string;
  nota_fiscal?: string;
}
```

#### Interface `SaidaData`
```typescript
{
  produto_id: number;
  quantidade: number;
  motivo?: string;
  observacao?: string;
  documento?: string;
  // ❌ lote_id REMOVIDO
}
```

## 🧪 Testes

Execute o script de teste para verificar o funcionamento:

```bash
node backend/scripts/test-fefo-estoque.js
```

O teste:
1. Cria 3 lotes com datas de validade diferentes (30, 60 e 90 dias)
2. Registra saída de 35 unidades
3. Verifica que o sistema usou primeiro o lote que vence em 30 dias (30 unidades)
4. Verifica que o sistema usou o segundo lote (5 unidades restantes)
5. Confirma que as quantidades foram calculadas corretamente

## 📊 Exemplo de Uso

### Entrada de Estoque
```javascript
POST /api/estoque-central/entrada
{
  "produto_id": 1,
  "quantidade": 100,
  "lote": "LOTE-2026-001",
  "data_validade": "2026-12-31",
  "data_fabricacao": "2026-01-15",
  "fornecedor": "Fornecedor ABC",
  "nota_fiscal": "NF-12345"
}
```

### Saída de Estoque (FEFO Automático)
```javascript
POST /api/estoque-central/saida
{
  "produto_id": 1,
  "quantidade": 50,
  "motivo": "Transferência para Escola A",
  "documento": "GUIA-2026-001"
}
```

O sistema automaticamente:
- Busca os lotes do produto ordenados por data de validade
- Retira 50 unidades dos lotes mais próximos do vencimento
- Pode usar múltiplos lotes se necessário
- Registra todas as movimentações

## ✅ Benefícios

1. **Redução de desperdício**: Produtos mais próximos do vencimento são usados primeiro
2. **Rastreabilidade**: Cada movimentação está vinculada a um lote específico
3. **Automação**: Usuário não precisa escolher manualmente qual lote usar
4. **Integridade**: Quantidades sempre corretas, calculadas a partir dos lotes
5. **Simplicidade**: Interface mais simples para o usuário final

## 🔍 Consultas Úteis

### Ver estoque completo com quantidades calculadas
```sql
SELECT * FROM vw_estoque_central_completo;
```

### Ver lotes ordenados por FEFO
```sql
SELECT * FROM obter_lotes_fefo(1); -- produto_id = 1
```

### Ver lotes próximos do vencimento
```sql
SELECT * FROM vw_lotes_proximos_vencimento WHERE dias_para_vencer <= 30;
```

## 📝 Notas Importantes

- Toda entrada DEVE ter lote e data de validade
- Saída usa FEFO automaticamente, usuário não escolhe o lote
- Ajuste de estoque ainda permite especificar lote_id (para correções)
- Quantidades são sempre calculadas dinamicamente, nunca armazenadas como valores fixos
- Sistema valida se há quantidade suficiente antes de processar saída

## 🚀 Próximos Passos

- [ ] Adicionar alertas de lotes próximos do vencimento no dashboard
- [ ] Implementar relatório de movimentações por lote
- [ ] Adicionar gráficos de entrada/saída por período
- [ ] Implementar reserva de estoque para pedidos futuros
