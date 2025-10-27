# Sistema de Lotes com Data de Validade - Estoque Escolar Mobile

## 📋 Funcionalidades Implementadas

### 1. **Controle de Lotes por Produto**
- Cada produto pode ter múltiplos lotes com quantidades e datas de validade diferentes
- Visualização de lotes diretamente na lista de estoque
- Indicadores visuais de status dos lotes (ativo, próximo ao vencimento, vencido)

### 2. **Movimentação por Lotes**
- **Entrada**: Cadastro de novos lotes com data de fabricação e validade
- **Saída**: Seleção de lotes específicos para retirada (FIFO automático)
- **Ajuste**: Correção de quantidades por lote

### 3. **Interface Intuitiva**
- Modal dedicado para gerenciar lotes durante movimentações
- Seleção automática do tipo de movimento baseado no contexto
- Validações em tempo real para evitar erros

### 4. **Detalhes dos Lotes**
- Modal completo com informações de cada lote
- Status visual baseado na proximidade do vencimento
- Histórico e rastreabilidade por lote

## 🔧 Componentes Criados

### `ModalLotesEstoque.tsx`
Modal principal para movimentação por lotes:
- Seleção de tipo de movimento (entrada/saída/ajuste)
- Formulário dinâmico baseado no tipo selecionado
- Validações específicas por tipo de movimento
- Suporte a múltiplos lotes em uma única operação

### `ModalDetalhesLotes.tsx`
Modal de visualização detalhada:
- Lista completa de lotes do produto
- Informações de validade e status
- Acesso rápido para movimentação
- Ordenação inteligente (ativos primeiro, por vencimento)

### Atualizações em `ItemEstoque.tsx`
- Seção de lotes na visualização do item
- Indicadores de validade por lote
- Contador de lotes disponíveis
- Cores dinâmicas baseadas no status

## 📊 Tipos de Dados

### `LoteEstoque`
```typescript
interface LoteEstoque {
  id: number;
  produto_id: number;
  lote: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  data_fabricacao?: string;
  data_validade?: string;
  fornecedor_id?: number;
  observacoes?: string;
  status: 'ativo' | 'vencido' | 'bloqueado';
  created_at: string;
  updated_at: string;
}
```

### `MovimentoLote`
```typescript
interface MovimentoLote {
  lote_id?: number;
  lote?: string;
  quantidade: number;
  data_validade?: string;
  data_fabricacao?: string;
  observacoes?: string;
}
```

## 🔄 Fluxo de Uso

### Entrada de Produtos
1. Usuário seleciona "Movimentar" em um produto
2. Sistema detecta se deve usar lotes (produtos perecíveis/medicamentos)
3. Modal de lotes abre com tipo "Entrada" selecionado
4. Usuário adiciona lotes com quantidades e datas
5. Sistema valida e registra a entrada

### Saída de Produtos
1. Sistema mostra lotes disponíveis automaticamente
2. Usuário seleciona quantidades por lote
3. Validação impede saída maior que disponível
4. Processamento FIFO (primeiro a vencer, primeiro a sair)

### Visualização
1. Toque no item abre detalhes dos lotes
2. Visualização de status de validade
3. Acesso rápido para movimentação

## 🎨 Indicadores Visuais

### Status de Validade
- **Verde**: Lote normal (>7 dias para vencer)
- **Laranja**: Próximo ao vencimento (≤7 dias)
- **Vermelho**: Vencido
- **Cinza**: Esgotado

### Badges e Contadores
- Número total de lotes por produto
- Quantidade disponível por lote
- Dias restantes para vencimento

## 🔗 Integração com Backend

### Endpoints Utilizados
- `GET /api/estoque-central/produtos/{id}/lotes` - Listar lotes
- `POST /api/estoque-central/lotes` - Criar lote
- `POST /api/estoque-central/saidas` - Processar saída
- `POST /api/estoque-escola/{id}/movimentacao` - Registrar movimento

### Sincronização
- Busca automática de lotes ao carregar estoque
- Atualização em tempo real após movimentações
- Cache local para melhor performance

## 📱 Experiência do Usuário

### Automação Inteligente
- Detecção automática de produtos que precisam de lotes
- Seleção automática do modal apropriado
- Validações contextuais por tipo de movimento

### Feedback Visual
- Cores dinâmicas baseadas no status
- Animações suaves nas transições
- Mensagens de erro específicas e claras

### Acessibilidade
- Textos descritivos para leitores de tela
- Contrastes adequados para visibilidade
- Botões com área de toque adequada

## 🚀 Próximos Passos

1. **Relatórios de Validade**: Dashboard com produtos próximos ao vencimento
2. **Alertas Push**: Notificações automáticas de vencimento
3. **Código de Barras**: Leitura automática de lotes
4. **Transferências**: Movimentação de lotes entre escolas
5. **Auditoria**: Rastreabilidade completa por lote

## 🔧 Configuração

O sistema está totalmente integrado e funcional. Para usar:

1. Produtos com categoria "Perecível" ou "Medicamento" automaticamente usam lotes
2. Outros produtos podem ser configurados manualmente
3. Datas de validade são opcionais mas recomendadas
4. Sistema funciona offline com sincronização posterior

---

**Desenvolvido para otimizar o controle de estoque escolar com foco na segurança alimentar e rastreabilidade.**