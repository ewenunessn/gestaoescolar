# Estoque Central

Sistema completo de controle de estoque central com gestão de entradas, saídas, ajustes, lotes e validade.

## Funcionalidades

### 1. Controle de Estoque
- Registro de quantidade por produto
- Quantidade reservada (para pedidos pendentes)
- Quantidade disponível (calculada automaticamente)

### 2. Gestão de Lotes
- Controle de lotes por produto
- Data de fabricação e validade
- Rastreabilidade completa
- Alertas de vencimento

### 3. Movimentações
- **Entrada**: Compras, recebimentos, devoluções
- **Saída**: Transferências para escolas, vendas, perdas
- **Ajuste**: Correções de inventário

### 4. Alertas Inteligentes
- Produtos próximos do vencimento (configurável)
- Produtos com estoque baixo (baseado em média de consumo)

## Estrutura do Banco de Dados

### Tabelas

#### `estoque_central`
Controle principal do estoque por produto.

```sql
- id: Identificador único
- produto_id: Referência ao produto
- quantidade: Quantidade total em estoque
- quantidade_reservada: Quantidade reservada para pedidos
- quantidade_disponivel: Calculado automaticamente (quantidade - reservada)
```

#### `estoque_central_lotes`
Controle de lotes e validade.

```sql
- id: Identificador único
- estoque_central_id: Referência ao estoque
- lote: Código do lote
- data_fabricacao: Data de fabricação (opcional)
- data_validade: Data de validade (obrigatório)
- quantidade: Quantidade do lote
- quantidade_reservada: Quantidade reservada do lote
- quantidade_disponivel: Calculado automaticamente
- observacao: Observações sobre o lote
```

#### `estoque_central_movimentacoes`
Histórico completo de movimentações.

```sql
- id: Identificador único
- estoque_central_id: Referência ao estoque
- lote_id: Referência ao lote (opcional)
- tipo: entrada | saida | ajuste
- quantidade: Quantidade movimentada (positivo ou negativo)
- quantidade_anterior: Quantidade antes da movimentação
- quantidade_posterior: Quantidade após a movimentação
- motivo: Motivo da movimentação
- observacao: Observações adicionais
- documento: Número do documento (NF, pedido, etc)
- fornecedor: Nome do fornecedor (para entradas)
- nota_fiscal: Número da nota fiscal
- usuario_id: Usuário que realizou a movimentação
- usuario_nome: Nome do usuário
```

### Views

#### `vw_estoque_central_completo`
Visão completa do estoque com informações do produto.

#### `vw_lotes_proximos_vencimento`
Lotes que vencem nos próximos 30 dias.

#### `vw_estoque_baixo`
Produtos com estoque abaixo de 10% da média de consumo mensal.

## API Endpoints

### Consultas

```
GET /api/estoque-central
GET /api/estoque-central/produto/:produtoId
GET /api/estoque-central/:estoqueId/lotes
GET /api/estoque-central/movimentacoes?estoque_id=1&tipo=entrada
GET /api/estoque-central/alertas/vencimento?dias=30
GET /api/estoque-central/alertas/estoque-baixo
```

### Movimentações

#### Registrar Entrada
```
POST /api/estoque-central/entrada
{
  "produto_id": 1,
  "quantidade": 100,
  "lote": "LOTE-2026-001",
  "data_fabricacao": "2026-01-15",
  "data_validade": "2026-12-31",
  "motivo": "Compra",
  "fornecedor": "Fornecedor XYZ",
  "nota_fiscal": "NF-12345",
  "observacao": "Primeira compra do ano"
}
```

#### Registrar Saída
```
POST /api/estoque-central/saida
{
  "produto_id": 1,
  "quantidade": 50,
  "lote_id": 1,
  "motivo": "Transferência para Escola A",
  "documento": "GUIA-2026-001",
  "observacao": "Entrega mensal"
}
```

#### Registrar Ajuste
```
POST /api/estoque-central/ajuste
{
  "produto_id": 1,
  "quantidade_nova": 95,
  "lote_id": 1,
  "motivo": "Inventário - correção de contagem",
  "observacao": "Diferença encontrada no inventário"
}
```

## Regras de Negócio

### Entradas
- Quantidade deve ser maior que zero
- Se informar lote, deve informar data de validade
- Atualiza quantidade total do estoque
- Cria ou atualiza lote se informado
- Registra movimentação no histórico

### Saídas
- Quantidade deve ser maior que zero
- Verifica disponibilidade antes de processar
- Se informar lote, verifica disponibilidade no lote
- Atualiza quantidade total do estoque
- Atualiza quantidade do lote se informado
- Registra movimentação no histórico

### Ajustes
- Pode aumentar ou diminuir quantidade
- Requer motivo obrigatório
- Calcula diferença automaticamente
- Atualiza estoque e lote se informado
- Registra movimentação no histórico

## Exemplos de Uso

### 1. Receber Compra com Lote
```javascript
const entrada = await api.post('/api/estoque-central/entrada', {
  produto_id: 5,
  quantidade: 200,
  lote: 'LOTE-2026-003',
  data_validade: '2027-06-30',
  fornecedor: 'Distribuidora ABC',
  nota_fiscal: 'NF-98765',
  motivo: 'Compra mensal'
});
```

### 2. Transferir para Escola
```javascript
const saida = await api.post('/api/estoque-central/saida', {
  produto_id: 5,
  quantidade: 50,
  lote_id: 3,
  motivo: 'Transferência Escola Municipal Centro',
  documento: 'GUIA-2026-045'
});
```

### 3. Corrigir Inventário
```javascript
const ajuste = await api.post('/api/estoque-central/ajuste', {
  produto_id: 5,
  quantidade_nova: 145,
  motivo: 'Inventário mensal',
  observacao: 'Encontradas 5 unidades a menos que o sistema'
});
```

### 4. Consultar Produtos Vencendo
```javascript
const alertas = await api.get('/api/estoque-central/alertas/vencimento?dias=15');
// Retorna produtos que vencem nos próximos 15 dias
```

### 5. Verificar Estoque Baixo
```javascript
const baixo = await api.get('/api/estoque-central/alertas/estoque-baixo');
// Retorna produtos com estoque abaixo do recomendado
```

## Instalação

1. Aplicar migration:
```bash
cd backend
npm run build
node scripts/apply-estoque-central.js
```

2. Testar funcionalidades:
```bash
node scripts/test-estoque-central.js
```

## Próximos Passos

- [ ] Interface web para gestão do estoque
- [ ] Relatórios de movimentação
- [ ] Integração com pedidos (reserva automática)
- [ ] Notificações de vencimento por email
- [ ] Dashboard com indicadores
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Código de barras para lotes
- [ ] Integração com balanças
