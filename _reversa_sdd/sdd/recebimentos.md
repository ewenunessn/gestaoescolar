# Recebimentos

## Visao Geral

- 🟢 O componente Recebimentos registra a entrada fisica de itens comprados no estoque central.
- 🟢 O fluxo parte de pedidos pendentes ou parciais, navega por fornecedor e item e persiste um recebimento transacional.
- 🟢 Cada recebimento gera evento `recebimento_central` no ledger de estoque e pode alterar o status do pedido para `recebido_parcial` ou `concluido`.

## Responsabilidades

- 🟢 Listar pedidos pendentes/parciais com agregados de recebimento.
- 🟢 Listar pedidos concluidos recentes.
- 🟢 Listar fornecedores de um pedido com progresso e atraso.
- 🟢 Listar itens de um fornecedor dentro do pedido com saldo pendente.
- 🟢 Registrar recebimento de item com metadados de lote, fabricacao, validade e nota fiscal.
- 🟢 Inserir evento de recebimento no estoque central.
- 🟢 Atualizar status do pedido apos o recebimento.
- 🟢 Publicar realtime para `compras` e `estoque_central`.
- 🟢 Expor historico de recebimentos por item e por pedido.

## Interface

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/recebimentos/pedidos-pendentes` | HTTP | Sim | Lista pedidos pendentes ou parciais. | 🟢 |
| `GET /api/recebimentos/pedidos-concluidos` | HTTP | Sim | Lista pedidos concluidos. | 🟢 |
| `GET /api/recebimentos/pedidos/:pedidoId/fornecedores` | HTTP | Sim | Lista fornecedores do pedido. | 🟢 |
| `GET /api/recebimentos/pedidos/:pedidoId/fornecedores/:fornecedorId/itens` | HTTP | Sim | Lista itens do fornecedor. | 🟢 |
| `GET /api/recebimentos/itens/:pedidoItemId/recebimentos` | HTTP | Sim | Lista recebimentos do item. | 🟢 |
| `GET /api/recebimentos/pedidos/:pedidoId/historico` | HTTP | Sim | Lista historico consolidado do pedido. | 🟢 |
| `POST /api/recebimentos/registrar` | HTTP | Sim | Registra recebimento. | 🟢 |

### Estrutura principal

```ts
type RegistrarRecebimentoInput = {
  pedidoId: number;
  pedidoItemId: number;
  quantidadeRecebida: number;
  observacoes?: string;
  lote?: string;
  dataFabricacao?: string;
  dataValidade?: string;
  notaFiscal?: string;
};
```

## Regras de Negocio

- 🟢 Todas as rotas exigem autenticacao.
- 🟢 Leituras usam `requireLeitura('recebimentos')`.
- 🟢 Escrita usa `requireEscrita('recebimentos')`.
- 🟢 `quantidadeRecebida` deve ser maior que zero.
- 🟢 O item do pedido precisa existir dentro do pedido informado.
- 🟢 A quantidade recebida nao pode exceder o saldo pendente.
- 🟢 O recebimento abre transacao explicita.
- 🟢 O sistema grava o recebimento na tabela `recebimentos`.
- 🟢 O sistema acrescenta evento no ledger de estoque central via `buildRecebimentoCentralEvent`.
- 🟢 O status do pedido vira `concluido` quando todos os itens estiverem completos; caso contrario, `recebido_parcial`.
- 🟢 A observacao do recebimento concatena lote, fabricacao, validade e NF quando presentes.
- 🟢 O evento realtime de `compras.received` carrega `pedido_item_id` e `pedido_status`.
- 🟢 O evento realtime de `estoque_central.updated` carrega tipo de movimentacao e quantidade recebida.

## Fluxo Principal

1. 🟢 Usuario acessa pedidos pendentes.
2. 🟢 Seleciona pedido e depois fornecedor.
3. 🟢 Visualiza itens e saldo pendente por item.
4. 🟢 Informa quantidade recebida e metadados do lote/nota.
5. 🟢 Backend valida usuario, item, saldo e quantidade.
6. 🟢 Backend insere o registro em `recebimentos`.
7. 🟢 Backend adiciona evento `recebimento_central` no ledger.
8. 🟢 Backend recalcula o status do pedido.
9. 🟢 Backend faz commit e publica realtime.

## Fluxos Alternativos

- 🟢 **Usuario nao autenticado:** retorna 401.
- 🟢 **Quantidade menor ou igual a zero:** retorna 400.
- 🟢 **Item do pedido inexistente:** retorna 404.
- 🟢 **Quantidade acima do saldo pendente:** retorna 400 com detalhe do saldo.
- 🟢 **Falha em qualquer etapa transacional:** executa rollback integral.

## Cenarios de Borda

- 🟢 **Recebimento fracionado em varias entradas:** o saldo pendente precisa considerar a soma historica de `recebimentos`.
- 🟢 **Metadados vazios:** lote/NF/fabricacao/validade nao devem gerar observacao com ruido vazio.
- 🟡 **Pedido com multiplos fornecedores:** a navegacao por fornecedor nao pode misturar saldos entre contratos distintos.
- 🟡 **Pedido concluido logo no ultimo recebimento:** o status precisa virar `concluido` no mesmo commit.

## Dependencias

- 🟢 `backend/src/modules/recebimentos/routes/recebimentoRoutes.ts`
- 🟢 `backend/src/modules/recebimentos/controllers/recebimentoController.ts`
- 🟢 `backend/src/modules/estoque/services/estoqueLedgerService.ts`
- 🟢 `backend/src/modules/estoque/services/estoqueIntegracaoService.ts`
- 🟢 `services/realtimeEvents`
- 🟡 `_reversa_sdd/flowcharts/recebimentos.md`
- 🟡 `_reversa_sdd/flowcharts/recebimentos-registrar.md`
- 🟡 `_reversa_sdd/flowcharts/recebimentos-mobile.md`

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Rotas exigem autenticacao e RBAC de `recebimentos`. | `backend/src/modules/recebimentos/routes/recebimentoRoutes.ts` | 🟢 |
| Integridade | Registro de recebimento usa transacao com rollback. | `backend/src/modules/recebimentos/controllers/recebimentoController.ts` | 🟢 |
| Integridade | Estoque central e atualizado pelo ledger no mesmo fluxo do recebimento. | `backend/src/modules/recebimentos/controllers/recebimentoController.ts` | 🟢 |
| Observabilidade | Publica realtime para compras e estoque central. | `backend/src/modules/recebimentos/controllers/recebimentoController.ts` | 🟢 |

## Criterios de Aceitacao

```gherkin
Cenario: Registrar recebimento valido
Dado um pedido item com saldo pendente
Quando o operador registra uma quantidadeRecebida valida
Entao o sistema deve persistir o recebimento, atualizar o estoque central e recalcular o status do pedido

Cenario: Bloquear recebimento acima do saldo
Dado um item com saldo pendente menor que a quantidade informada
Quando o operador tenta registrar o recebimento
Entao o backend deve retornar erro 400 e nao persistir nada

Cenario: Concluir pedido no ultimo recebimento
Dado um pedido cujo ultimo item ainda nao esta completo
Quando o ultimo saldo pendente for recebido
Entao o status final do pedido deve ser `concluido`

Cenario: Consultar historico por item
Dado um pedido item com recebimentos anteriores
Quando o usuario consulta `itens/:pedidoItemId/recebimentos`
Entao o backend deve retornar a lista ordenada por data_recebimento desc
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Registrar recebimento | Must | Fluxo central do abastecimento fisico. | 🟢 |
| Atualizar estoque central | Must | O recebimento precisa refletir saldo disponivel. | 🟢 |
| Recalcular status do pedido | Must | Impacta compras e execucao posterior. | 🟢 |
| Historico e consultas por fornecedor/item | Should | Necessario para operacao e auditoria. | 🟢 |
| Metadados de lote/NF | Should | Importante para rastreabilidade sanitária e operacional. | 🟢 |

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/recebimentos/routes/recebimentoRoutes.ts` | Rotas do modulo | 🟢 |
| `backend/src/modules/recebimentos/controllers/recebimentoController.ts` | Listagens e `registrarRecebimento` | 🟢 |
| `backend/src/modules/estoque/services/estoqueLedgerService.ts` | Append de eventos | 🟢 |
| `backend/src/modules/estoque/services/estoqueIntegracaoService.ts` | `buildRecebimentoCentralEvent` | 🟢 |
| `_reversa_sdd/flowcharts/recebimentos.md` | Fluxo macro | 🟡 |
| `_reversa_sdd/flowcharts/recebimentos-registrar.md` | Fluxo de registro | 🟡 |
