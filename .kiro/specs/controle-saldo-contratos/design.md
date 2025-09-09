# Design Document

## Overview

Esta funcionalidade reformula o sistema de controle de saldo de fornecedores para ser baseado nos contratos individuais, permitindo controle granular por item contratado com sistema de movimentações para registrar o consumo dos produtos. O sistema atual de saldo de fornecedores será mantido, mas será criado um novo módulo específico para controle de estoque/consumo dos produtos contratados.

## Architecture

### Separação de Responsabilidades

1. **Saldo de Fornecedores** (existente): Controla valores monetários (créditos, débitos, pagamentos)
2. **Saldo de Contratos** (novo): Controla quantidades de produtos disponíveis nos contratos

### Estrutura de Dados

```
Fornecedor
├── Saldo de Fornecedor (existente)
└── Contratos
    ├── Contrato 1
    │   ├── Item A (quantidade disponível)
    │   ├── Item B (quantidade disponível)
    │   └── Movimentações de Consumo
    └── Contrato 2
        ├── Item C (quantidade disponível)
        └── Movimentações de Consumo
```

## Components and Interfaces

### Backend Models

#### 1. MovimentacaoConsumoContrato (Novo)

```typescript
interface MovimentacaoConsumoContrato {
  id: number;
  contrato_produto_id: number;
  tipo: 'CONSUMO' | 'ESTORNO' | 'AJUSTE';
  quantidade_utilizada: number;
  valor_utilizado?: number; // Opcional: valor monetário equivalente
  justificativa: string;
  data_movimentacao: string;
  usuario_id: number;
  observacoes?: string;
  documento_referencia?: string; // Ex: número da guia de entrega
  created_at: string;
  updated_at: string;
}
```

#### 2. SaldoContratoItem (Calculado dinamicamente)

```typescript
interface SaldoContratoItem {
  contrato_produto_id: number;
  produto_id: number;
  produto_nome: string;
  produto_unidade: string;
  contrato_id: number;
  contrato_numero: string;
  
  // Quantidades
  quantidade_original: number;
  quantidade_aditivos: number;
  quantidade_total: number; // original + aditivos
  quantidade_utilizada: number;
  quantidade_disponivel: number; // total - utilizada
  
  // Valores
  valor_unitario: number;
  valor_total_disponivel: number;
  
  // Status
  status: 'DISPONIVEL' | 'BAIXO_ESTOQUE' | 'ESGOTADO';
  percentual_utilizado: number;
}
```

### Frontend Components

#### 1. SaldoContratosPage (Nova página principal)

```typescript
interface SaldoContratosPageProps {
  fornecedorId: number;
  fornecedorNome: string;
}
```

**Funcionalidades:**
- Lista todos os contratos do fornecedor
- Filtros por contrato, produto, status
- Pesquisa por nome do produto
- Indicadores visuais de baixo estoque/esgotado

#### 2. ContratoItensTable (Componente de tabela)

**Colunas:**
- Contrato (número e período)
- Produto (nome e unidade)
- Qtd. Original
- Qtd. Aditivos
- Qtd. Total
- Qtd. Utilizada
- Qtd. Disponível
- Valor Unitário
- Valor Disponível
- Status
- Ações (Registrar Consumo, Histórico)

#### 3. RegistrarConsumoDialog (Modal para movimentações)

**Campos:**
- Quantidade/Valor a ser consumido
- Justificativa (obrigatório)
- Data da movimentação
- Documento de referência (opcional)
- Observações (opcional)

#### 4. HistoricoMovimentacoesDialog (Modal de histórico)

**Funcionalidades:**
- Lista movimentações do item
- Filtros por data e tipo
- Paginação
- Detalhes de cada movimentação

## Data Models

### Tabela: movimentacoes_consumo_contratos

```sql
CREATE TABLE movimentacoes_consumo_contratos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contrato_produto_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('CONSUMO', 'ESTORNO', 'AJUSTE')),
  quantidade_utilizada DECIMAL(10,3) NOT NULL,
  valor_utilizado DECIMAL(12,2),
  justificativa TEXT NOT NULL,
  data_movimentacao DATE NOT NULL,
  usuario_id INTEGER NOT NULL,
  observacoes TEXT,
  documento_referencia TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
```

### Índices para Performance

```sql
CREATE INDEX idx_movimentacoes_consumo_contrato_produto 
ON movimentacoes_consumo_contratos(contrato_produto_id, data_movimentacao DESC);

CREATE INDEX idx_movimentacoes_consumo_data 
ON movimentacoes_consumo_contratos(data_movimentacao DESC);
```

### Views para Consultas Otimizadas

```sql
CREATE VIEW view_saldo_contratos_itens AS
SELECT 
  cp.id as contrato_produto_id,
  cp.produto_id,
  p.nome as produto_nome,
  p.unidade as produto_unidade,
  cp.contrato_id,
  c.numero as contrato_numero,
  c.data_inicio,
  c.data_fim,
  
  -- Quantidades base
  cp.limite as quantidade_original,
  COALESCE(aditivos.quantidade_adicional, 0) as quantidade_aditivos,
  (cp.limite + COALESCE(aditivos.quantidade_adicional, 0)) as quantidade_total,
  
  -- Quantidades utilizadas
  COALESCE(consumo.quantidade_utilizada, 0) as quantidade_utilizada,
  (cp.limite + COALESCE(aditivos.quantidade_adicional, 0) - COALESCE(consumo.quantidade_utilizada, 0)) as quantidade_disponivel,
  
  -- Valores
  cp.preco as valor_unitario,
  ((cp.limite + COALESCE(aditivos.quantidade_adicional, 0) - COALESCE(consumo.quantidade_utilizada, 0)) * cp.preco) as valor_total_disponivel,
  
  -- Status calculado
  CASE 
    WHEN (cp.limite + COALESCE(aditivos.quantidade_adicional, 0) - COALESCE(consumo.quantidade_utilizada, 0)) <= 0 THEN 'ESGOTADO'
    WHEN (COALESCE(consumo.quantidade_utilizada, 0) / (cp.limite + COALESCE(aditivos.quantidade_adicional, 0))) >= 0.9 THEN 'BAIXO_ESTOQUE'
    ELSE 'DISPONIVEL'
  END as status,
  
  -- Percentual utilizado
  CASE 
    WHEN (cp.limite + COALESCE(aditivos.quantidade_adicional, 0)) > 0 
    THEN (COALESCE(consumo.quantidade_utilizada, 0) / (cp.limite + COALESCE(aditivos.quantidade_adicional, 0))) * 100
    ELSE 0
  END as percentual_utilizado

FROM contrato_produtos cp
JOIN produtos p ON cp.produto_id = p.id
JOIN contratos c ON cp.contrato_id = c.id
LEFT JOIN (
  SELECT 
    contrato_produto_id,
    SUM(quantidade_adicional) as quantidade_adicional
  FROM aditivos_contratos_itens
  GROUP BY contrato_produto_id
) aditivos ON cp.id = aditivos.contrato_produto_id
LEFT JOIN (
  SELECT 
    contrato_produto_id,
    SUM(CASE WHEN tipo = 'CONSUMO' THEN quantidade_utilizada ELSE -quantidade_utilizada END) as quantidade_utilizada
  FROM movimentacoes_consumo_contratos
  GROUP BY contrato_produto_id
) consumo ON cp.id = consumo.contrato_produto_id;
```

## Error Handling

### Validações de Negócio

1. **Quantidade Insuficiente**: Não permitir consumo maior que disponível
2. **Contrato Vencido**: Alertar sobre contratos vencidos
3. **Justificativa Obrigatória**: Validar preenchimento da justificativa
4. **Data Futura**: Não permitir datas futuras para movimentações

### Tratamento de Erros

```typescript
class ConsumoContratoError extends Error {
  constructor(
    message: string,
    public code: 'QUANTIDADE_INSUFICIENTE' | 'CONTRATO_VENCIDO' | 'DADOS_INVALIDOS',
    public details?: any
  ) {
    super(message);
    this.name = 'ConsumoContratoError';
  }
}
```

## Testing Strategy

### Testes Unitários

1. **Modelos de Dados**
   - Criação de movimentações
   - Cálculo de saldos
   - Validações de negócio

2. **Controllers**
   - Endpoints de API
   - Tratamento de erros
   - Autorização

### Testes de Integração

1. **Fluxo Completo**
   - Criar contrato → Adicionar aditivo → Registrar consumo → Verificar saldo
   - Múltiplas movimentações no mesmo item
   - Estorno de movimentações

2. **Performance**
   - Consultas com muitos contratos
   - Histórico com muitas movimentações
   - Filtros e pesquisas

### Testes E2E

1. **Interface do Usuário**
   - Navegação entre contratos
   - Registro de consumo
   - Visualização de histórico
   - Filtros e pesquisas

## API Endpoints

### Contratos e Itens

```
GET /api/fornecedores/:id/contratos/saldos
- Lista todos os itens de contratos com saldos

GET /api/fornecedores/:id/contratos/:contratoId/itens
- Lista itens específicos de um contrato

GET /api/contratos/itens/:itemId/saldo
- Detalhes do saldo de um item específico
```

### Movimentações

```
POST /api/contratos/itens/:itemId/movimentacoes
- Registra nova movimentação de consumo

GET /api/contratos/itens/:itemId/movimentacoes
- Lista histórico de movimentações

PUT /api/movimentacoes-consumo/:id
- Edita movimentação (apenas observações)

DELETE /api/movimentacoes-consumo/:id
- Remove movimentação (com validações)
```

### Relatórios

```
GET /api/fornecedores/:id/relatorio-consumo
- Relatório de consumo por período

GET /api/contratos/:id/relatorio-saldo
- Relatório de saldo do contrato
```

## Integration Points

### Sistema Existente

1. **Saldo de Fornecedores**: Mantém funcionamento independente
2. **Contratos**: Utiliza dados existentes de contratos e produtos
3. **Aditivos**: Integra com sistema de aditivos para cálculo correto das quantidades
4. **Usuários**: Utiliza sistema de autenticação existente

### Guias de Entrega

Futura integração para consumo automático baseado nas entregas:
- Quando guia é confirmada → Registra consumo automático
- Permite ajustes manuais posteriores
- Rastreabilidade completa

## Performance Considerations

### Otimizações

1. **View Materializada**: Para consultas frequentes de saldo
2. **Índices Compostos**: Para filtros combinados
3. **Cache**: Para dados de contratos ativos
4. **Paginação**: Para listas grandes de movimentações

### Monitoramento

1. **Queries Lentas**: Identificar consultas que demoram > 1s
2. **Volume de Dados**: Monitorar crescimento das tabelas
3. **Uso de Memória**: Cache e views materializadas