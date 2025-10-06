# Módulo de Pedidos de Compra

Sistema completo de criação e gestão de pedidos de compra baseados nos itens cadastrados nos contratos.

## Estrutura

```
pedidos/
├── models/
│   ├── Pedido.ts          # Model de pedidos
│   └── PedidoItem.ts      # Model de itens do pedido
├── controllers/
│   └── pedidoController.ts # Lógica de negócio
└── routes/
    └── pedidoRoutes.ts     # Rotas da API
```

## Funcionalidades

### 1. Criação de Pedidos
- Pedidos baseados em contratos ativos
- Seleção de produtos cadastrados no contrato
- Cálculo automático de valores
- Geração automática de número do pedido (formato: PEDYYYYNNNNNN)

### 2. Gestão de Status
- **rascunho**: Pedido em elaboração
- **pendente**: Aguardando aprovação
- **aprovado**: Aprovado para processamento
- **em_separacao**: Em processo de separação
- **enviado**: Enviado para entrega
- **entregue**: Entregue na escola
- **cancelado**: Cancelado

### 3. Controle de Aprovação
- Registro de usuário que criou o pedido
- Registro de usuário que aprovou
- Data de aprovação

## API Endpoints

### Listar Pedidos
```
GET /api/pedidos
Query params:
  - status: filtrar por status
  - contrato_id: filtrar por contrato
  - escola_id: filtrar por escola
  - data_inicio: data inicial
  - data_fim: data final
  - page: página (padrão: 1)
  - limit: itens por página (padrão: 50)
```

### Buscar Pedido
```
GET /api/pedidos/:id
Retorna pedido completo com itens
```

### Criar Pedido
```
POST /api/pedidos
Body:
{
  "contrato_id": 1,
  "escola_id": 1,
  "data_entrega_prevista": "2025-01-15",
  "observacoes": "Entrega urgente",
  "itens": [
    {
      "contrato_produto_id": 1,
      "quantidade": 100,
      "observacoes": "Produto A"
    },
    {
      "contrato_produto_id": 2,
      "quantidade": 50
    }
  ]
}
```

### Atualizar Pedido
```
PUT /api/pedidos/:id
Body:
{
  "data_entrega_prevista": "2025-01-20",
  "observacoes": "Nova observação"
}
Nota: Apenas pedidos em rascunho ou pendentes podem ser editados
```

### Atualizar Status
```
PATCH /api/pedidos/:id/status
Body:
{
  "status": "aprovado"
}
```

### Cancelar Pedido
```
POST /api/pedidos/:id/cancelar
Body:
{
  "motivo": "Motivo do cancelamento"
}
```

### Estatísticas
```
GET /api/pedidos/estatisticas
Retorna:
  - Total de pedidos por status
  - Valores totais
  - Pedidos por mês
  - Pedidos por escola
```

### Listar Produtos do Contrato
```
GET /api/pedidos/contrato/:contrato_id/produtos
Retorna produtos disponíveis no contrato para criar pedido
```

## Validações

### Criação de Pedido
- Contrato deve existir e estar ativo
- Escola deve existir
- Deve ter pelo menos um item
- Produtos devem estar cadastrados no contrato
- Quantidades devem ser maiores que zero

### Atualização de Status
- Status deve ser válido
- Pedidos entregues ou cancelados não podem mudar de status

### Cancelamento
- Pedidos entregues não podem ser cancelados
- Pedidos já cancelados não podem ser cancelados novamente

## Banco de Dados

### Tabela: pedidos
```sql
- id: SERIAL PRIMARY KEY
- numero: VARCHAR(50) UNIQUE
- contrato_id: INTEGER (FK)
- escola_id: INTEGER (FK)
- data_pedido: DATE
- data_entrega_prevista: DATE
- status: VARCHAR(20)
- valor_total: DECIMAL(10,2)
- observacoes: TEXT
- usuario_criacao_id: INTEGER (FK)
- usuario_aprovacao_id: INTEGER (FK)
- data_aprovacao: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Tabela: pedido_itens
```sql
- id: SERIAL PRIMARY KEY
- pedido_id: INTEGER (FK)
- contrato_produto_id: INTEGER (FK)
- produto_id: INTEGER (FK)
- quantidade: DECIMAL(10,3)
- preco_unitario: DECIMAL(10,2)
- valor_total: DECIMAL(10,2)
- observacoes: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Migration

Para criar as tabelas no banco de dados:

```bash
node backend/run-migration-pedidos.js
```

## Exemplo de Uso

### 1. Listar produtos disponíveis no contrato
```javascript
GET /api/pedidos/contrato/1/produtos
```

### 2. Criar pedido
```javascript
POST /api/pedidos
{
  "contrato_id": 1,
  "escola_id": 5,
  "data_entrega_prevista": "2025-01-20",
  "observacoes": "Pedido mensal",
  "itens": [
    {
      "contrato_produto_id": 10,
      "quantidade": 200
    },
    {
      "contrato_produto_id": 11,
      "quantidade": 150
    }
  ]
}
```

### 3. Aprovar pedido
```javascript
PATCH /api/pedidos/123/status
{
  "status": "aprovado"
}
```

### 4. Acompanhar entrega
```javascript
PATCH /api/pedidos/123/status
{
  "status": "em_separacao"
}

PATCH /api/pedidos/123/status
{
  "status": "enviado"
}

PATCH /api/pedidos/123/status
{
  "status": "entregue"
}
```

## Integrações

O módulo de pedidos se integra com:
- **Contratos**: Busca produtos e preços
- **Escolas**: Destino dos pedidos
- **Fornecedores**: Via contratos
- **Usuários**: Controle de criação e aprovação
- **Produtos**: Itens do pedido

## Próximas Melhorias

- [ ] Integração com estoque (baixa automática ao entregar)
- [ ] Notificações por email
- [ ] Relatórios em PDF
- [ ] Histórico de alterações
- [ ] Anexos de documentos
- [ ] Rastreamento de entrega
- [ ] Dashboard de pedidos
