# Faturamentos

## Visao Geral

- 🟢 O componente Faturamentos aloca quantitativos de itens de pedido por modalidade para fins de faturamento e consumo financeiro.
- 🟢 O cabecalho de faturamento e separado dos itens, permitindo faturamento vazio inicial e posterior composicao/edicao.
- 🟢 O status do faturamento deriva do consumo de seus itens (`gerado` vs `consumido`) e nao deve alterar o status operacional do pedido na criacao.

## Responsabilidades

- 🟢 Criar faturamento para um pedido com ou sem itens iniciais.
- 🟢 Validar que a quantidade alocada por item nao excede o disponivel do pedido.
- 🟢 Listar faturamentos por pedido.
- 🟢 Expor resumo por modalidades e resumo estruturado por contrato/fornecedor/modalidade.
- 🟢 Atualizar faturamento recriando seus itens.
- 🟢 Atualizar status manualmente.
- 🟢 Registrar consumo total do faturamento ou consumo item a item.
- 🟢 Reverter consumo de item.
- 🟢 Remover itens de uma modalidade/contrato de um faturamento.
- 🟢 Excluir faturamento.

## Interface

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/faturamentos/pedido/:pedidoId` | HTTP | Sim | Lista faturamentos do pedido. | 🟢 |
| `GET /api/faturamentos/pedido/:pedidoId/resumo` | HTTP | Sim | Resumo por modalidade. | 🟢 |
| `GET /api/faturamentos/:faturamentoId/relatorio-tipo-fornecedor` | HTTP | Sim | Relatorio por tipo de fornecedor e modalidade. | 🟢 |
| `GET /api/faturamentos/:id/resumo` | HTTP | Sim | Resumo estruturado do faturamento. | 🟢 |
| `GET /api/faturamentos/:id` | HTTP | Sim | Detalhe do faturamento. | 🟢 |
| `POST /api/faturamentos` | HTTP | Sim | Cria faturamento. | 🟢 |
| `PUT /api/faturamentos/:id` | HTTP | Sim | Atualiza faturamento. | 🟢 |
| `PATCH /api/faturamentos/:id/status` | HTTP | Sim | Atualiza status. | 🟢 |
| `POST /api/faturamentos/:id/registrar-consumo` | HTTP | Sim | Marca todos os itens como consumidos. | 🟢 |
| `POST /api/faturamentos/:id/itens/:itemId/registrar-consumo` | HTTP | Sim | Marca item como consumido. | 🟢 |
| `POST /api/faturamentos/:id/itens/:itemId/reverter-consumo` | HTTP | Sim | Reverte consumo do item. | 🟢 |
| `DELETE /api/faturamentos/:id/remover-modalidade` | HTTP | Sim | Remove itens por contrato/modalidade. | 🟢 |
| `DELETE /api/faturamentos/:id` | HTTP | Sim | Exclui faturamento. | 🟢 |

### Estruturas principais

```ts
type ItemFaturamento = {
  pedido_item_id: number;
  modalidade_id: number;
  quantidade_alocada: number;
  preco_unitario: number;
};

type FaturamentoInput = {
  pedido_id: number;
  observacoes?: string;
  itens: ItemFaturamento[];
};
```

## Regras de Negocio

- 🟢 Todas as rotas exigem autenticacao.
- 🟢 Leituras usam `requireLeitura('faturamentos')`.
- 🟢 Escritas usam `requireEscrita('faturamentos')`.
- 🟢 O pedido precisa existir para criar faturamento.
- 🟢 O payload sempre exige `itens`, mesmo que vazio.
- 🟢 Para cada item, `quantidade_alocada` nao pode exceder o disponivel do `pedido_item`, descontando alocacoes anteriores.
- 🟢 Criacao de faturamento nao deve alterar o status do pedido.
- 🟢 Atualizacao remove todos os itens existentes do faturamento e reinsere o conjunto novo.
- 🟢 `status` aceito manualmente: `gerado`, `consumido`, `cancelado`.
- 🟢 Consumo total marca todos os itens como consumidos e recalcula status.
- 🟢 Consumo individual e reversao recalculam status por agregacao dos itens.
- 🟢 O status automatico e `consumido` quando todos os itens tem `consumo_registrado = true`; caso contrario `gerado`.
- 🟢 Remocao por modalidade exige `contrato_id` e `modalidade_id`.

## Fluxo Principal

1. 🟢 Usuario abre faturamentos de um pedido.
2. 🟢 Lista faturamentos existentes e resumos.
3. 🟢 Ao criar, informa observacoes e alocacoes por item/modalidade.
4. 🟢 Backend valida existencia do pedido e disponibilidade de quantidade.
5. 🟢 Backend cria cabecalho e itens em transacao.
6. 🟢 Usuario pode editar o faturamento recriando o conjunto de itens.
7. 🟢 Quando houver consumo, backend marca itens consumidos e recalcula status do faturamento.

## Fluxos Alternativos

- 🟢 **Pedido inexistente:** retorna 404.
- 🟢 **Item nao pertence ao pedido:** retorna 404.
- 🟢 **Quantidade alocada acima do disponivel:** retorna 400.
- 🟢 **Faturamento inexistente:** retorna 404 em leitura/escrita.
- 🟢 **Status manual invalido:** retorna 400.
- 🟢 **Falha transacional:** executa rollback.

## Cenarios de Borda

- 🟢 **Faturamento vazio:** o cabecalho pode ser criado sem itens iniciais.
- 🟢 **Edicao concorrente:** a validacao da disponibilidade exclui o proprio faturamento na soma de `ja_alocado`.
- 🟡 **Pedido com mesmo produto em multiplas modalidades:** o resumo precisa preservar agrupamento por contrato/modalidade.
- 🟡 **Consumo parcial:** o status deve continuar `gerado` ate o ultimo item ser consumido.

## Dependencias

- 🟢 `backend/src/modules/faturamentos/routes/faturamentoRoutes.ts`
- 🟢 `backend/src/modules/faturamentos/controllers/faturamentoController.ts`
- 🟡 `_reversa_sdd/flowcharts/faturamento.md`
- 🟡 `_reversa_sdd/flowcharts/faturamento-criarAtualizar.md`
- 🟡 `_reversa_sdd/flowcharts/faturamento-consumo.md`

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Rotas usam autenticacao e RBAC do slug `faturamentos`. | `backend/src/modules/faturamentos/routes/faturamentoRoutes.ts` | 🟢 |
| Integridade | Criacao, atualizacao, consumo e remocao usam transacao. | `backend/src/modules/faturamentos/controllers/faturamentoController.ts` | 🟢 |
| Integridade | Status do pedido nao deve ser alterado durante criacao de faturamento. | `backend/src/modules/faturamentos/controllers/faturamentoController.ts` | 🟢 |
| Observabilidade | Resumos estruturados agregam contrato, fornecedor, modalidade e item. | `backend/src/modules/faturamentos/controllers/faturamentoController.ts` | 🟢 |

## Criterios de Aceitacao

```gherkin
Cenario: Criar faturamento com itens validos
Dado um pedido existente
Quando o usuario envia itens com quantidade alocada dentro do disponivel
Entao o sistema deve criar o cabecalho e os itens do faturamento em transacao

Cenario: Bloquear alocacao acima do disponivel
Dado um pedido item com saldo disponivel menor que a quantidade_alocada
Quando o usuario tenta criar ou editar o faturamento
Entao o backend deve retornar erro 400

Cenario: Registrar consumo total
Dado um faturamento com itens nao consumidos
Quando o usuario chama registrar-consumo
Entao todos os itens devem ser marcados como consumidos e o status deve ser recalculado

Cenario: Reverter consumo de item
Dado um item de faturamento marcado como consumido
Quando o usuario chama reverter-consumo
Entao o item deve voltar a `consumo_registrado = false` e o status do faturamento deve ser recalculado
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Criar e editar faturamento | Must | Fluxo principal do modulo. | 🟢 |
| Validar disponibilidade por item | Must | Mantem consistencia com o pedido. | 🟢 |
| Registrar consumo | Must | Fecha o ciclo financeiro do faturamento. | 🟢 |
| Resumos e relatorios | Should | Importantes para conferencias e fechamento. | 🟢 |
| Remocao por modalidade | Could | Operacao de ajuste pontual. | 🟢 |

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/faturamentos/routes/faturamentoRoutes.ts` | Rotas do modulo | 🟢 |
| `backend/src/modules/faturamentos/controllers/faturamentoController.ts` | CRUD, resumos, consumo e remocoes | 🟢 |
| `_reversa_sdd/flowcharts/faturamento.md` | Fluxo macro | 🟡 |
| `_reversa_sdd/flowcharts/faturamento-criarAtualizar.md` | Criacao/atualizacao | 🟡 |
| `_reversa_sdd/flowcharts/faturamento-consumo.md` | Consumo e reversao | 🟡 |
