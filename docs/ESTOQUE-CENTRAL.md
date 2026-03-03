# Estoque Central - Documentação Completa

Sistema de controle de estoque central implementado com gestão completa de entradas, saídas, ajustes, lotes e validade.

## ✅ O que foi implementado

### Backend Completo

#### 1. Migration SQL (`20260303_create_estoque_central.sql`)
- ✅ Tabela `estoque_central` - Controle principal por produto
- ✅ Tabela `estoque_central_lotes` - Gestão de lotes e validade
- ✅ Tabela `estoque_central_movimentacoes` - Histórico completo
- ✅ View `vw_estoque_central_completo` - Consulta otimizada
- ✅ View `vw_lotes_proximos_vencimento` - Alertas de vencimento
- ✅ View `vw_estoque_baixo` - Alertas de estoque baixo
- ✅ Índices para performance
- ✅ Triggers para updated_at

#### 2. Model (`EstoqueCentral.ts`)
- ✅ `registrarEntrada()` - Entrada com lote e validade
- ✅ `registrarSaida()` - Saída com controle de disponibilidade
- ✅ `registrarAjuste()` - Ajuste de inventário
- ✅ `listar()` - Listar estoque completo
- ✅ `buscarPorProduto()` - Buscar estoque de produto específico
- ✅ `listarLotes()` - Listar lotes de um produto
- ✅ `listarLotesProximosVencimento()` - Alertas de vencimento
- ✅ `listarEstoqueBaixo()` - Alertas de estoque baixo
- ✅ `listarMovimentacoes()` - Histórico com filtros
- ✅ Transações seguras com rollback automático

#### 3. Controller (`EstoqueCentralController.ts`)
- ✅ Validações de entrada
- ✅ Tratamento de erros
- ✅ Suporte a usuário logado
- ✅ Paginação em listagens
- ✅ Filtros por data e tipo

#### 4. Rotas (`estoqueCentralRoutes.ts`)
```
GET    /api/estoque-central
GET    /api/estoque-central/produto/:produtoId
POST   /api/estoque-central/entrada
POST   /api/estoque-central/saida
POST   /api/estoque-central/ajuste
GET    /api/estoque-central/:estoqueId/lotes
GET    /api/estoque-central/alertas/vencimento
GET    /api/estoque-central/alertas/estoque-baixo
GET    /api/estoque-central/movimentacoes
```

#### 5. Scripts
- ✅ `apply-estoque-central.js` - Aplicar migration
- ✅ `test-estoque-central.js` - Testar funcionalidades

#### 6. Documentação
- ✅ README completo com exemplos
- ✅ Documentação de API
- ✅ Regras de negócio
- ✅ Exemplos de uso

## 🎯 Funcionalidades Principais

### 1. Controle de Estoque
- Quantidade total por produto
- Quantidade reservada (para pedidos)
- Quantidade disponível (calculada automaticamente)
- Rastreabilidade completa

### 2. Gestão de Lotes
- Código do lote
- Data de fabricação (opcional)
- Data de validade (obrigatória)
- Controle de quantidade por lote
- Observações por lote

### 3. Movimentações
- **Entrada**: Compras, recebimentos, devoluções
- **Saída**: Transferências, vendas, perdas
- **Ajuste**: Correções de inventário
- Histórico completo com:
  - Quantidade anterior e posterior
  - Motivo e observações
  - Documento/NF
  - Fornecedor
  - Usuário responsável

### 4. Alertas Inteligentes
- Produtos próximos do vencimento (configurável)
- Produtos com estoque baixo (baseado em consumo)
- Notificações automáticas

## 📊 Exemplos de Uso

### Registrar Entrada com Lote
```bash
POST /api/estoque-central/entrada
{
  "produto_id": 1,
  "quantidade": 100,
  "lote": "LOTE-2026-001",
  "data_fabricacao": "2026-01-15",
  "data_validade": "2026-12-31",
  "motivo": "Compra mensal",
  "fornecedor": "Distribuidora ABC",
  "nota_fiscal": "NF-12345"
}
```

### Registrar Saída
```bash
POST /api/estoque-central/saida
{
  "produto_id": 1,
  "quantidade": 50,
  "lote_id": 1,
  "motivo": "Transferência para Escola A",
  "documento": "GUIA-2026-001"
}
```

### Registrar Ajuste de Inventário
```bash
POST /api/estoque-central/ajuste
{
  "produto_id": 1,
  "quantidade_nova": 95,
  "motivo": "Inventário mensal",
  "observacao": "Correção após contagem física"
}
```

### Consultar Alertas
```bash
# Produtos vencendo nos próximos 15 dias
GET /api/estoque-central/alertas/vencimento?dias=15

# Produtos com estoque baixo
GET /api/estoque-central/alertas/estoque-baixo
```

## 🚀 Como Usar

### 1. Aplicar Migration
```bash
cd backend
npm run build
node scripts/apply-estoque-central.js
```

### 2. Testar Funcionalidades
```bash
node scripts/test-estoque-central.js
```

### 3. Usar API
As rotas já estão registradas em `/api/estoque-central`

## 🔒 Regras de Negócio

### Entradas
- ✅ Quantidade deve ser > 0
- ✅ Se informar lote, deve informar validade
- ✅ Atualiza estoque e lote automaticamente
- ✅ Registra no histórico

### Saídas
- ✅ Verifica disponibilidade antes de processar
- ✅ Pode especificar lote (FIFO recomendado)
- ✅ Bloqueia se quantidade insuficiente
- ✅ Atualiza estoque e lote automaticamente

### Ajustes
- ✅ Requer motivo obrigatório
- ✅ Calcula diferença automaticamente
- ✅ Pode aumentar ou diminuir
- ✅ Registra no histórico com diferença

## 📈 Próximos Passos (Frontend)

- [ ] Página de listagem de estoque
- [ ] Formulário de entrada
- [ ] Formulário de saída
- [ ] Formulário de ajuste
- [ ] Dashboard com indicadores
- [ ] Alertas visuais de vencimento
- [ ] Relatórios de movimentação
- [ ] Gráficos de consumo
- [ ] Exportação para Excel/PDF
- [ ] Impressão de etiquetas de lote

## 🎨 Sugestões de Interface

### Dashboard
- Card: Total de produtos em estoque
- Card: Produtos próximos do vencimento
- Card: Produtos com estoque baixo
- Gráfico: Movimentações dos últimos 30 dias
- Tabela: Últimas movimentações

### Listagem de Estoque
- Filtros: Produto, categoria, estoque baixo
- Colunas: Produto, Quantidade, Disponível, Lotes, Próxima validade
- Ações: Ver detalhes, Entrada, Saída, Ajuste

### Formulário de Entrada
- Produto (select com busca)
- Quantidade
- Lote (opcional)
- Data de fabricação (opcional)
- Data de validade (obrigatória se informar lote)
- Fornecedor
- Nota fiscal
- Motivo
- Observações

### Detalhes do Produto
- Informações do produto
- Quantidade total e disponível
- Lista de lotes com validade
- Histórico de movimentações
- Gráfico de consumo

## 💡 Dicas de Implementação

1. **FIFO (First In, First Out)**: Ao fazer saídas, priorize lotes mais antigos
2. **Alertas**: Configure notificações por email para vencimentos
3. **Inventário**: Faça ajustes periódicos baseados em contagem física
4. **Relatórios**: Gere relatórios mensais de movimentação
5. **Integração**: Conecte com módulo de pedidos para reserva automática

## 🔗 Integração com Outros Módulos

### Com Pedidos
- Ao criar pedido, reservar quantidade no estoque central
- Ao confirmar entrega, dar saída do estoque

### Com Guias
- Ao gerar guia, verificar disponibilidade
- Ao confirmar entrega, registrar saída

### Com Contratos
- Verificar saldo de contrato antes de entrada
- Vincular entrada com contrato/fornecedor

## ✨ Diferenciais

- ✅ Controle de lotes e validade
- ✅ Alertas inteligentes
- ✅ Histórico completo e auditável
- ✅ Transações seguras
- ✅ Performance otimizada com views
- ✅ Cálculos automáticos
- ✅ Rastreabilidade total
- ✅ Pronto para escalar
