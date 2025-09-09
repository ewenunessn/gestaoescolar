# Design Document - Módulo de Pedido de Compra

## Overview

O módulo de Pedido de Compra será implementado seguindo a arquitetura existente do sistema, utilizando Node.js/Express no backend e React/TypeScript no frontend. O design foca em criar uma experiência similar a marketplaces, com catálogo de produtos, carrinho de compras e geração de pedidos organizados por fornecedor.

## Architecture

### Backend Architecture
- **Controllers**: Gerenciam a lógica de negócio para produtos, carrinho e pedidos
- **Routes**: Definem endpoints RESTful seguindo padrão `/api/`
- **Models**: Interfaces TypeScript para entidades de dados
- **Services**: Lógica de negócio complexa e validações
- **Middlewares**: Autenticação e validação de dados

### Frontend Architecture
- **Pages**: Componentes de página para Catálogo e Carrinho
- **Components**: Componentes reutilizáveis (ProductCard, CartItem, etc.)
- **Services**: Chamadas API usando axios com retry
- **Context**: Estado global do carrinho usando React Context
- **Hooks**: Custom hooks para lógica reutilizável

## Components and Interfaces

### Backend Models

```typescript
// Produto com informações contratuais
interface ProdutoContrato {
  id: number;
  produto_id: number;
  contrato_id: number;
  fornecedor_id: number;
  nome_produto: string;
  nome_fornecedor: string;
  preco_contratual: number;
  quantidade_contratual: number;
  quantidade_disponivel: number; // quantidade_contratual - quantidade_já_pedida
}

// Item do carrinho
interface CarrinhoItem {
  id: number;
  usuario_id: number;
  produto_id: number;
  contrato_id: number;
  fornecedor_id: number;
  quantidade: number;
  preco_unitario: number;
  created_at: string;
}

// Pedido
interface Pedido {
  id: number;
  fornecedor_id: number;
  usuario_id: number;
  numero_pedido: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
  valor_total: number;
  created_at: string;
}

// Item do pedido
interface PedidoItem {
  id: number;
  pedido_id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}
```

### Frontend Components

```typescript
// Catálogo de produtos
interface CatalogoProps {
  contratoId?: number;
  filtros?: ProdutoFiltros;
}

// Card de produto
interface ProductCardProps {
  produto: ProdutoContrato;
  noCarrinho: boolean;
  onAddToCart: (produto: ProdutoContrato, quantidade: number) => void;
}

// Modal de detalhes do produto
interface ProductDetailModalProps {
  produto: ProdutoContrato | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (quantidade: number) => void;
}

// Carrinho de compras
interface CarrinhoProps {
  itens: CarrinhoItemAgrupado[];
  onUpdateQuantity: (itemId: number, quantidade: number) => void;
  onRemoveItem: (itemId: number) => void;
  onConfirmOrder: (fornecedorId: number) => void;
}

// Item agrupado por fornecedor
interface CarrinhoItemAgrupado {
  fornecedor_id: number;
  nome_fornecedor: string;
  itens: CarrinhoItem[];
  subtotal: number;
}
```

## Data Models

### Database Schema

```sql
-- Tabela para itens do carrinho (temporário)
CREATE TABLE carrinho (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  contrato_id INTEGER NOT NULL,
  fornecedor_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id),
  FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
);

-- Tabela de pedidos
CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_pedido TEXT UNIQUE NOT NULL,
  fornecedor_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDENTE',
  valor_total DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabela de itens do pedido
CREATE TABLE pedido_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);
```

### Context State Management

```typescript
interface CarrinhoContextType {
  itens: CarrinhoItem[];
  loading: boolean;
  error: string | null;
  adicionarItem: (produto: ProdutoContrato, quantidade: number) => Promise<void>;
  atualizarQuantidade: (itemId: number, quantidade: number) => Promise<void>;
  removerItem: (itemId: number) => Promise<void>;
  confirmarPedido: (fornecedorId: number) => Promise<string>;
  carregarCarrinho: () => Promise<void>;
  limparCarrinho: () => void;
  getItensPorFornecedor: () => CarrinhoItemAgrupado[];
  getTotalGeral: () => number;
}
```

## API Endpoints

### Produtos
- `GET /api/produtos/catalogo` - Lista produtos com informações contratuais
- `GET /api/produtos/catalogo/:id` - Detalhes de um produto específico

### Carrinho
- `POST /api/carrinho/adicionar` - Adiciona item ao carrinho
- `GET /api/carrinho` - Lista itens do carrinho do usuário
- `PUT /api/carrinho/alterar` - Altera quantidade de item
- `DELETE /api/carrinho/:itemId` - Remove item do carrinho
- `DELETE /api/carrinho/limpar` - Limpa carrinho completo

### Pedidos
- `POST /api/pedidos` - Cria novo pedido
- `GET /api/pedidos` - Lista pedidos do usuário
- `GET /api/pedidos/:id` - Detalhes de um pedido

## Error Handling

### Backend Error Handling
- Validação de dados de entrada com middleware personalizado
- Tratamento de erros de banco de dados
- Logs estruturados para auditoria
- Respostas padronizadas de erro

### Frontend Error Handling
- Interceptors do axios para tratamento global
- Estados de loading e error em componentes
- Feedback visual para usuário (snackbars, alerts)
- Retry automático para falhas de rede

### Validation Rules
- Quantidade não pode exceder limite contratual
- Preços devem ser validados contra valores contratuais
- Usuário só pode acessar seu próprio carrinho
- Contratos devem estar ativos para permitir pedidos

## Testing Strategy

### Backend Testing
- Testes unitários para controllers e services
- Testes de integração para endpoints
- Mocks para banco de dados
- Validação de schemas de dados

### Frontend Testing
- Testes unitários para componentes
- Testes de integração para fluxos completos
- Mocks para chamadas API
- Testes de acessibilidade

### Test Cases Prioritários
1. Adicionar produto ao carrinho com validação de quantidade
2. Atualizar quantidade no carrinho com limites contratuais
3. Confirmar pedido e limpar itens do fornecedor
4. Validação de produtos indisponíveis
5. Comportamento com falhas de rede

## Performance Considerations

### Backend Optimizations
- Índices de banco para consultas frequentes
- Cache de produtos contratuais
- Paginação para listas grandes
- Queries otimizadas com JOINs

### Frontend Optimizations
- Lazy loading de componentes
- Debounce em campos de busca
- Memoização de cálculos pesados
- Virtual scrolling para listas grandes

## Security Considerations

### Authentication & Authorization
- JWT tokens para autenticação
- Middleware de autorização em todas as rotas
- Validação de propriedade de recursos (carrinho, pedidos)

### Data Validation
- Sanitização de inputs
- Validação de tipos e ranges
- Prevenção de SQL injection
- Rate limiting em endpoints críticos

### Business Logic Security
- Validação de limites contratuais no backend
- Verificação de contratos ativos
- Auditoria de todas as operações críticas

## Integration Points

### Existing System Integration
- Utilização de tabelas existentes (produtos, contratos, fornecedores)
- Integração com sistema de autenticação atual
- Compatibilidade com módulo de recebimento existente

### Future Integrations
- Sistema de aprovação de pedidos
- Integração com ERP externo
- Notificações por email/SMS
- Dashboard executivo