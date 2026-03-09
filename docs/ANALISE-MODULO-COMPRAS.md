# Análise do Módulo de Compras (Pedidos)

## Nomenclatura Atual vs Correta

### ❌ Nomenclatura Atual (Incorreta)
- Tabela: `pedidos`
- Controller: `pedidoController.ts`
- Rotas: `/api/pedidos`
- Variáveis: `pedido`, `listarPedidos`, `criarPedido`

### ✅ Nomenclatura Correta (Sugerida)
- Tabela: `compras` ou `ordens_compra`
- Controller: `compraController.ts`
- Rotas: `/api/compras`
- Variáveis: `compra`, `listarCompras`, `criarCompra`

**Justificativa**: O módulo gerencia ordens de compra baseadas em contratos com fornecedores, não pedidos de clientes/escolas.

---

## Estrutura Atual

### Tabelas
```sql
pedidos (
  id, numero, data_pedido, status, valor_total,
  observacoes, usuario_criacao_id, usuario_aprovacao_id,
  data_aprovacao, competencia_mes_ano, created_at, updated_at
)

pedido_itens (
  id, pedido_id, contrato_produto_id, produto_id,
  quantidade, preco_unitario, valor_total,
  data_entrega_prevista, observacoes, created_at, updated_at
)
```

### Status do Pedido/Compra
- `pendente` - Aguardando processamento
- `recebido_parcial` - Parcialmente recebido
- `concluido` - Totalmente recebido
- `suspenso` - Temporariamente suspenso
- `cancelado` - Cancelado

### Funcionalidades Implementadas

1. **listarPedidos** (listarCompras)
   - Filtros: status, contrato_id, escola_id, data_inicio, data_fim
   - Paginação
   - Agregações: total_itens, quantidade_total, total_fornecedores
   - ✅ Funcionalidade completa

2. **buscarPedido** (buscarCompra)
   - Detalhes do pedido/compra
   - Lista de itens com informações de produto, contrato, fornecedor
   - Cálculo de saldo disponível
   - ✅ Funcionalidade completa

3. **criarPedido** (criarCompra)
   - Validação de itens
   - Geração automática de número (formato: PED-MMMYYYYNNNNNN)
   - Validação de contrato ativo
   - Cálculo automático de valor total
   - Transação atômica
   - ✅ Funcionalidade completa

4. **atualizarPedido** (atualizarCompra)
   - Atualização de observações e competência
   - Adição/remoção/atualização de itens
   - Recálculo de valor total
   - ✅ Funcionalidade completa

5. **atualizarStatusPedido** (atualizarStatusCompra)
   - Mudança de status
   - Registro de usuário aprovador
   - ✅ Funcionalidade completa

6. **excluirPedido** (excluirCompra)
   - Exclusão lógica com transação
   - ✅ Funcionalidade completa

7. **obterEstatisticasPedidos** (obterEstatisticasCompras)
   - Total de pedidos por status
   - Valor total por status
   - ✅ Funcionalidade completa

8. **listarProdutosContrato**
   - Lista produtos disponíveis em um contrato
   - Mostra saldo disponível
   - ✅ Funcionalidade completa

9. **listarTodosProdutosDisponiveis**
   - Lista todos os produtos de contratos ativos
   - Agrupa por produto
   - ✅ Funcionalidade completa

10. **resumoTipoFornecedorPedido**
    - Relatório de compras por tipo de fornecedor
    - ✅ Funcionalidade completa

---

## Avaliação: É um Bom Módulo de Gestão de Compras?

### ✅ Pontos Fortes

1. **Integração com Contratos**
   - Compras baseadas em contratos pré-estabelecidos
   - Validação de produtos contratados
   - Controle de preços contratuais
   - Rastreamento de fornecedores

2. **Controle de Fluxo**
   - Múltiplos status (pendente → recebido_parcial → concluído)
   - Aprovação de compras
   - Histórico de alterações

3. **Gestão Financeira**
   - Cálculo automático de valores
   - Controle por competência (mês/ano)
   - Relatórios de valores por status

4. **Rastreabilidade**
   - Numeração única automática
   - Registro de usuário criador e aprovador
   - Timestamps de criação e atualização

5. **Funcionalidades Avançadas**
   - Paginação e filtros robustos
   - Estatísticas e relatórios
   - Transações atômicas (ACID)
   - Validações de negócio

### ⚠️ Pontos de Melhoria

1. **Nomenclatura Confusa**
   - "Pedidos" sugere pedidos de clientes, não ordens de compra
   - Pode causar confusão com outros módulos

2. **Falta de Workflow de Aprovação**
   - Não há múltiplos níveis de aprovação
   - Não há limite de alçada por valor
   - Não há fluxo de cotação/licitação

3. **Ausência de Funcionalidades**
   - Não há gestão de recebimento parcial detalhado
   - Não há controle de qualidade no recebimento
   - Não há gestão de devoluções
   - Não há integração com estoque (entrada automática)
   - Não há controle de prazo de entrega

4. **Relatórios Limitados**
   - Faltam relatórios de performance de fornecedores
   - Faltam análises de preço médio
   - Faltam alertas de atraso de entrega

5. **Auditoria Incompleta**
   - Não há log de alterações detalhado
   - Não há histórico de mudanças de status

---

## Recomendações

### Curto Prazo (Essencial)

1. **Renomear Módulo**
   ```
   pedidos → compras
   pedido_itens → compra_itens
   pedidoController → compraController
   /api/pedidos → /api/compras
   ```

2. **Adicionar Campos Faltantes**
   ```sql
   ALTER TABLE pedidos ADD COLUMN escola_id INTEGER REFERENCES escolas(id);
   ALTER TABLE pedidos ADD COLUMN data_entrega_prevista DATE;
   ALTER TABLE pedidos ADD COLUMN data_entrega_real DATE;
   ```

3. **Melhorar Validações**
   - Validar saldo disponível no contrato
   - Validar limite de compra por usuário
   - Validar datas de entrega

### Médio Prazo (Importante)

4. **Implementar Workflow de Aprovação**
   - Tabela `compras_aprovacoes` com múltiplos níveis
   - Regras de alçada por valor
   - Notificações automáticas

5. **Integrar com Recebimentos**
   - Módulo de recebimento já existe
   - Criar vínculo automático compra → recebimento
   - Atualizar status automaticamente

6. **Adicionar Relatórios**
   - Performance de fornecedores
   - Análise de preços
   - Alertas de atraso

### Longo Prazo (Desejável)

7. **Gestão de Cotações**
   - Processo de cotação antes da compra
   - Comparação de preços
   - Histórico de cotações

8. **Integração com Estoque**
   - Entrada automática no estoque ao receber
   - Baixa automática de saldo contratual
   - Alertas de ruptura

9. **Auditoria Completa**
   - Log detalhado de todas as alterações
   - Histórico de status com timestamps
   - Rastreamento de quem fez o quê

---

## Conclusão

### Nota Geral: 7.5/10

**É um bom módulo?** Sim, mas com ressalvas.

**Pontos Positivos:**
- Funcionalidades core bem implementadas
- Integração sólida com contratos
- Transações atômicas e validações
- Código limpo e organizado

**Pontos Negativos:**
- Nomenclatura incorreta (crítico)
- Falta de workflow de aprovação
- Integração limitada com outros módulos
- Relatórios básicos

**Recomendação Final:**
O módulo é funcional e atende necessidades básicas de gestão de compras, mas precisa de:
1. Renomeação urgente (pedidos → compras)
2. Workflow de aprovação
3. Melhor integração com recebimentos e estoque
4. Relatórios mais robustos

Com essas melhorias, seria um módulo de gestão de compras de nível profissional (9/10).

---

**Data da Análise**: 2026-03-07  
**Analisado por**: Kiro AI  
**Versão do Sistema**: 1.0
