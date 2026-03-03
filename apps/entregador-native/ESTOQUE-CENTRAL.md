# Estoque Central - App Entregador Native

Funcionalidade completa de gestão de estoque central integrada ao app entregador.

## ✅ Funcionalidades Implementadas

### 1. Listagem de Estoque
- Visualização de todos os produtos em estoque
- Busca por nome do produto
- Filtros: Todos, Estoque Baixo, Vencendo
- Indicadores visuais de quantidade
- Alertas de validade
- Pull to refresh

### 2. Detalhes do Produto
- Informações completas do estoque
- Quantidade total, disponível e reservada
- Lista de lotes com validade
- Histórico de movimentações
- Ações rápidas (entrada, saída, ajuste)

### 3. Registrar Entrada
- Seleção de produto
- Quantidade
- Controle de lote (opcional)
  - Código do lote
  - Data de fabricação (opcional)
  - Data de validade (obrigatória)
- Informações adicionais
  - Motivo
  - Fornecedor
  - Nota fiscal
  - Documento
  - Observações

### 4. Registrar Saída
- Seleção de produto
- Seleção de lote (opcional)
- Quantidade
- Motivo (obrigatório)
- Documento
- Observações
- Validação de disponibilidade

### 5. Ajustar Estoque
- Correção de quantidade após inventário
- Cálculo automático de diferença
- Motivo obrigatório
- Confirmação antes de salvar
- Alerta sobre uso correto

## 🎨 Interface

### Telas Criadas
1. `EstoqueCentralScreen` - Listagem principal
2. `EstoqueCentralDetalhesScreen` - Detalhes do produto
3. `EstoqueCentralEntradaScreen` - Formulário de entrada
4. `EstoqueCentralSaidaScreen` - Formulário de saída
5. `EstoqueCentralAjusteScreen` - Formulário de ajuste

### Componentes
- Cards informativos
- Badges coloridos por status
- DatePicker para datas
- Picker para seleção
- FAB com menu de ações
- Indicadores de loading
- Pull to refresh

## 🔗 Integração

### API Client (`estoqueCentral.ts`)
```typescript
- listarEstoqueCentral()
- buscarEstoquePorProduto(produtoId)
- listarLotes(estoqueId)
- registrarEntrada(dados)
- registrarSaida(dados)
- registrarAjuste(dados)
- listarMovimentacoes(estoqueId, tipo, limit)
- listarLotesProximosVencimento(dias)
- listarEstoqueBaixo()
```

### Navegação
Adicionado ao `App.tsx`:
- EstoqueCentral
- EstoqueCentralDetalhes
- EstoqueCentralEntrada
- EstoqueCentralSaida
- EstoqueCentralAjuste

### Home Screen
Adicionado card de acesso rápido ao estoque central

## 📱 Como Usar

### Acessar Estoque
1. Na tela inicial, clique em "Acessar Estoque"
2. Visualize a lista de produtos
3. Use a busca ou filtros para encontrar produtos

### Registrar Entrada
1. Na lista de estoque, clique no FAB (+)
2. Selecione "Registrar Entrada"
3. Escolha o produto
4. Informe a quantidade
5. Opcionalmente, adicione informações de lote
6. Preencha dados adicionais
7. Confirme

### Registrar Saída
1. Acesse os detalhes de um produto
2. Clique em "Registrar Saída"
3. Informe a quantidade
4. Selecione o lote (se houver)
5. Informe o motivo
6. Confirme

### Ajustar Estoque
1. Acesse os detalhes de um produto
2. Clique em "Ajustar Estoque"
3. Informe a nova quantidade
4. Veja a diferença calculada
5. Informe o motivo
6. Confirme o ajuste

## 🎯 Regras de Negócio

### Entradas
- Quantidade deve ser > 0
- Se informar lote, validade é obrigatória
- Data de validade deve ser futura
- Atualiza estoque automaticamente

### Saídas
- Quantidade deve ser > 0
- Verifica disponibilidade antes
- Motivo é obrigatório
- Pode especificar lote
- Bloqueia se insuficiente

### Ajustes
- Quantidade não pode ser negativa
- Motivo é obrigatório
- Mostra diferença antes de confirmar
- Alerta sobre uso correto

## 🎨 Cores e Indicadores

### Quantidade
- Verde (#10b981): Disponível
- Amarelo (#f59e0b): Estoque baixo
- Vermelho (#dc2626): Sem estoque

### Validade
- Verde: Mais de 30 dias
- Amarelo: 8-30 dias
- Vermelho: Menos de 7 dias ou vencido

### Movimentações
- Verde: Entrada
- Vermelho: Saída
- Amarelo: Ajuste

## 📦 Dependências Adicionais

```json
{
  "@react-native-picker/picker": "^2.x",
  "@react-native-community/datetimepicker": "^8.x",
  "date-fns": "^3.x"
}
```

## 🚀 Próximos Passos

- [ ] Modo offline com sincronização
- [ ] Leitura de código de barras para lotes
- [ ] Relatórios de movimentação
- [ ] Notificações de vencimento
- [ ] Exportação de dados
- [ ] Fotos dos produtos
- [ ] Histórico detalhado por lote
- [ ] Gráficos de consumo

## 💡 Dicas de Uso

1. **FIFO**: Ao fazer saídas, priorize lotes mais antigos
2. **Inventário**: Use ajustes apenas após contagem física
3. **Lotes**: Sempre informe lote para produtos perecíveis
4. **Alertas**: Verifique regularmente produtos vencendo
5. **Documentação**: Sempre informe motivo e documento

## 🔒 Segurança

- Requer autenticação
- Registra usuário em cada movimentação
- Validações no frontend e backend
- Transações atômicas no banco
- Histórico imutável

## ✨ Diferenciais

- Interface intuitiva e responsiva
- Validações em tempo real
- Feedback visual claro
- Navegação fluida
- Offline-first ready
- Performance otimizada
