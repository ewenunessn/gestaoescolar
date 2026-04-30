# Estoque e Ledger

## Visao Geral

- 🟢 O componente Estoque e Ledger registra entradas, saidas, ajustes e transferencias como eventos append-only na tabela `estoque_eventos`.
- 🟢 O saldo nao e persistido como valor canonico por item; ele e projetado pela soma de `quantidade_delta` em consultas de saldo central e escolar.
- 🟢 O modulo cobre dois escopos operacionais: `central` e `escola`, com regras especificas para escrita, leitura, transferencia e operacao offline no app mobile escolar.
- 🟡 Lotes, validade e alertas coexistem com o ledger principal em leitura/compatibilidade de telas, indicando uma transicao parcial entre modelo legado e modelo orientado a eventos.

## Responsabilidades

- 🟢 Registrar movimentacoes de estoque central: `entrada`, `saida` e `ajuste`.
- 🟢 Registrar movimentacoes de estoque escolar: `entrada`, `saida` e `ajuste`.
- 🟢 Registrar transferencias do estoque central para uma escola em transacao unica com dois eventos correlatos.
- 🟢 Validar quantidade positiva e bloquear saldo negativo quando a operacao nao permite extrapolacao.
- 🟢 Converter ajustes absolutos em `quantidade_delta` a partir do saldo atual.
- 🟢 Expor projecoes de saldo central e saldo escolar para telas web e integracoes.
- 🟢 Expor timeline de movimentacoes por escopo, produto e escola.
- 🟢 Expor lotes, alertas e consultas auxiliares do estoque central para a interface operacional.
- 🟢 Publicar atualizacoes realtime para telas de estoque central e escolar.
- 🟡 Sincronizar movimentacoes offline do app `apps/estoque-escolar-mobile` com fila local e retentativas.

## Interface

### Estoque central

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/estoque-central` | HTTP | Sim | Lista a posicao atual do estoque central. | 🟢 |
| `GET /api/estoque-central/posicao` | HTTP | Sim | Alias de compatibilidade para a mesma listagem. | 🟢 |
| `GET /api/estoque-central/produto/:produtoId` | HTTP | Sim | Busca detalhe de um produto no estoque central. | 🟢 |
| `GET /api/estoque-central/:estoqueId/lotes` | HTTP | Sim | Lista lotes associados ao item consultado. | 🟢 |
| `GET /api/estoque-central/alertas` | HTTP | Sim | Retorna alertas consolidados do estoque central. | 🟢 |
| `GET /api/estoque-central/alertas/vencimento` | HTTP | Sim | Lista lotes proximos do vencimento. | 🟢 |
| `GET /api/estoque-central/alertas/estoque-baixo` | HTTP | Sim | Lista itens abaixo do nivel esperado. | 🟢 |
| `GET /api/estoque-central/movimentacoes` | HTTP | Sim | Lista timeline de eventos/movimentacoes do estoque central. | 🟢 |
| `POST /api/estoque-central/simular-saida` | HTTP | Sim | Simula baixa sem persistencia definitiva para apoiar operacao. | 🟢 |
| `POST /api/estoque-central/entrada` | HTTP | Sim | Registra entrada no estoque central. | 🟢 |
| `POST /api/estoque-central/saida` | HTTP | Sim | Registra saida no estoque central. | 🟢 |
| `POST /api/estoque-central/ajuste` | HTTP | Sim | Registra ajuste absoluto convertido em delta. | 🟢 |
| `POST /api/estoque-central/transferencias` | HTTP | Sim | Transfere saldo do central para uma escola. | 🟢 |

### Estoque escolar

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/estoque-escolar/escolas/:escolaId` | HTTP | Sim | Lista saldo escolar por produto. | 🟢 |
| `GET /api/estoque-escolar/escolas/:escolaId/dashboard` | HTTP | Sim | Alias para consumo de dashboard escolar. | 🟢 |
| `GET /api/estoque-escolar/escolas/:escolaId/produtos/:produtoId` | HTTP | Sim | Busca detalhe de um item no estoque da escola. | 🟢 |
| `GET /api/estoque-escolar/escolas/:escolaId/historico` | HTTP | Sim | Lista historico de movimentacoes da escola. | 🟢 |
| `GET /api/estoque-escolar/escolas/:escolaId/eventos` | HTTP | Sim | Alias do historico de eventos escolares. | 🟢 |
| `GET /api/estoque-escolar/escolas/:escolaId/operacao` | HTTP | Sim | Retorna configuracao de modo operacional da escola. | 🟢 |
| `POST /api/estoque-escolar/escolas/:escolaId/movimentacoes` | HTTP | Sim | Registra entrada, saida ou ajuste escolar. | 🟢 |

### Estruturas principais

```ts
type StockScope = "central" | "escola";

type StockEventOrigin =
  | "recebimento"
  | "transferencia"
  | "portal_escola"
  | "central_operador"
  | "sistema"
  | "estorno";

type StockEventType =
  | "recebimento_central"
  | "transferencia_para_escola"
  | "entrada_manual_escola"
  | "saida_central"
  | "saida_escola"
  | "ajuste_estoque"
  | "estorno_evento";

type StockEventInput = {
  tenant_id?: string | null;
  escopo: StockScope;
  escola_id?: number;
  produto_id: number;
  lote_id?: number;
  tipo_evento: StockEventType;
  origem: StockEventOrigin;
  quantidade_delta: number;
  quantidade_absoluta?: number;
  motivo?: string;
  observacao?: string;
  referencia_tipo?: string;
  referencia_id?: number;
  usuario_id?: number;
  usuario_nome_snapshot?: string;
  data_evento?: string;
  evento_estornado_id?: number;
};
```

- 🟢 `estoque_eventos` e a fonte canonica dos movimentos.
- 🟢 `estoque_operacao_escola` define `modo_operacao`, `permite_ajuste_escola` e `permite_lancamento_central` por escola.
- 🟢 As views `vw_estoque_saldo_escola` e `vw_estoque_saldo_central` materializam a ideia de projecao por soma de eventos.
- 🟡 `lote_id` existe no schema do ledger, mas a cobertura funcional de lotes aparece distribuida entre modelo legado, telas e modais mobile.

## Regras de Negocio

- 🟢 Toda movimentacao deve possuir quantidade finita e maior que zero no input de negocio.
- 🟢 `saida_central` e `saida_escola` bloqueiam persistencia quando `saldoAtual + quantidade_delta < 0`.
- 🟢 `ajuste_estoque` nao grava o absoluto diretamente como saldo final; o sistema calcula `quantidade_delta = quantidade_absoluta - saldoAtual`.
- 🟢 Ajuste com `quantidade_absoluta < 0` e rejeitado.
- 🟢 Transferencia para escola exige `escola_id`, `produto_id` e `quantidade` validos.
- 🟢 Transferencia grava dois eventos na mesma transacao: um negativo em `central` e um positivo em `escola`.
- 🟢 Quando `permitirSaldoNegativoCentral` for falso ou ausente, a transferencia valida saldo disponivel antes de debitar o central.
- 🟢 Eventos podem carregar `referencia_tipo` e `referencia_id` para correlacao com recebimentos, documentos ou integracoes.
- 🟢 A timeline ordena por `data_evento DESC, id DESC`.
- 🟢 Projecoes de saldo escolar consideram apenas eventos com `escopo = 'escola'` da escola consultada.
- 🟢 Projecoes de saldo central descontam reservas oriundas de `guia_produto_escola` com guias abertas e itens entregaveis.
- 🟢 A tela de estoque central trata `quantidade_disponivel`, `quantidade_reservada` e `quantidade_total` como indicadores distintos.
- 🟢 Desde 2026-04-30, estoque central e estoque escolar usam `authenticateToken` com RBAC no modulo `estoque`.
- 🟡 O modo operacional escolar (`escola`, `central`, `hibrido`) existe no schema e na rota de configuracao, mas a matriz completa de restricoes por modo precisa de validacao adicional.

## Fluxo Principal

### Movimentacao central

1. 🟢 Usuario autenticado acessa a tela `EstoqueCentral`.
2. 🟢 Frontend chama a rota de escrita correspondente: `entrada`, `saida` ou `ajuste`.
3. 🟢 Controller valida payload, permissao de escrita e contexto do usuario.
4. 🟢 `EstoqueLedgerService.registrarMovimentacaoCentral` consulta o saldo atual do produto no escopo `central`.
5. 🟢 O service monta o evento de negocio com `buildCentralMovementEvent`.
6. 🟢 Em `saida`, o service valida saldo suficiente.
7. 🟢 Em `ajuste`, o service recalcula o delta a partir de `quantidade_absoluta`.
8. 🟢 O evento e gravado em `estoque_eventos`.
9. 🟢 O backend publica atualizacao realtime e a UI recalcula indicadores/listagens.

### Movimentacao escolar

1. 🟢 Operador escolar ou app mobile seleciona produto, tipo de movimento e quantidade.
2. 🟢 Frontend ou app chama `POST /api/estoque-escolar/escolas/:escolaId/movimentacoes`.
3. 🟢 `registrarMovimentacaoEscolar` consulta saldo atual da escola para o produto.
4. 🟢 O evento escolar e montado com `buildSchoolMovementEvent`.
5. 🟢 Saidas validam saldo; ajustes convertem absoluto em delta.
6. 🟢 O evento e persistido no ledger com `escopo = 'escola'`.
7. 🟢 O modulo publica atualizacao realtime do dominio escolar.

### Transferencia central para escola

1. 🟢 Usuario inicia transferencia no estoque central.
2. 🟢 Backend valida `escola_id`, `produto_id` e `quantidade`.
3. 🟢 O service abre transacao.
4. 🟢 O saldo atual do central e consultado.
5. 🟢 Se saldo negativo nao for permitido, o service bloqueia a operacao insuficiente.
6. 🟢 O backend grava evento negativo em `central` com tipo `transferencia_para_escola`.
7. 🟢 O backend grava evento positivo correspondente em `escola`.
8. 🟢 A transacao e confirmada.
9. 🟢 As telas central e escolar recebem refletidos o debito e o credito.

### Sincronizacao offline do app escolar

1. 🟡 O operador registra entrada, saida ou ajuste no app mobile.
2. 🟡 Sem conectividade, o app adiciona a operacao em `@sync_pending_items`.
3. 🟡 O gerenciador monitora conectividade e reprocessa a fila quando o dispositivo volta ao modo online.
4. 🟡 Cada item e reenviado individualmente para a API.
5. 🟡 Em sucesso, o item sai da fila e atualiza `last_sync`.
6. 🟡 Em falha, o contador de tentativas aumenta ate o limite de retentativas.

## Fluxos Alternativos

- 🟢 **Quantidade invalida:** o service retorna erro `"Quantidade invalida para a movimentacao"`.
- 🟢 **Saldo insuficiente em saida:** o service retorna erro `"Saldo insuficiente para a movimentacao"`.
- 🟢 **Transferencia com saldo central insuficiente:** a transacao nao grava nenhum dos dois eventos.
- 🟢 **Ajuste para zero:** o delta pode ser negativo e zerar o saldo, desde que o absoluto informado seja `0`.
- 🟡 **Transferencia permitindo saldo negativo:** o debit central pode ficar abaixo de zero quando `permitirSaldoNegativoCentral = true`.
- 🟡 **Offline excede tentativas:** o app remove o item da fila e registra erro local de sincronizacao.
- 🟡 **Correlacao de destino em timeline central:** quando o evento central nao possui `escola_id`, a projection tenta inferir a escola de destino por `referencia_*` ou proximidade temporal.

## Cenarios de Borda

- 🟢 **Ajuste concorrente sobre saldo desatualizado:** como o delta do ajuste e calculado a partir do saldo lido na transacao corrente, leituras fora desse contexto podem divergir do valor percebido pelo operador.
- 🟢 **Transferencia parcialmente relacionada na leitura:** a persistencia grava os dois eventos, mas a associacao visual na timeline depende de `referencia_tipo`/`referencia_id` ou janela temporal de ate 60 segundos.
- 🟡 **Produto sem eventos anteriores:** a projecao deve retornar saldo `0` e ainda exibir o produto ativo em listagens abrangentes.
- 🟡 **Escola em modo operacional restrito:** a tabela `estoque_operacao_escola` sugere bloqueios condicionais de ajuste/lancamento, mas a enforcement completa precisa ser confirmada controller a controller.
- 🟡 **Lote virtual no mobile:** quando nao ha lotes reais, o app pode representar um "Estoque Principal" virtual para viabilizar consulta e historico.

## Dependencias

- 🟢 `backend/src/modules/estoque/routes/estoqueCentralRoutes.ts` - superficie HTTP do estoque central.
- 🟢 `backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts` - superficie HTTP do estoque escolar.
- 🟢 `backend/src/modules/estoque/controllers/EstoqueCentralController.ts` - handlers de leitura, escrita, lotes, alertas e transferencia.
- 🟢 `backend/src/modules/estoque/controllers/estoqueEscolarController.ts` - handlers escolares, historico e configuracao operacional.
- 🟢 `backend/src/modules/estoque/services/estoqueLedgerService.ts` - nucleo de escrita append-only e validacoes de saldo.
- 🟢 `backend/src/modules/estoque/services/estoqueProjectionService.ts` - projecoes de saldo e timeline.
- 🟢 `backend/src/modules/estoque/services/estoqueSchemaService.ts` - schema do ledger, tabela operacional e views auxiliares.
- 🟢 `backend/src/modules/estoque/services/estoqueIntegracaoService.ts` - integracoes e reaproveitamento operacional do estoque.
- 🟢 `backend/src/modules/estoque/services/estoqueLedgerService.test.ts` - evidencias automatizadas de regras do ledger.
- 🟢 `backend/src/modules/estoque/services/estoqueIntegracaoService.test.ts` - cobertura de integracoes do modulo.
- 🟢 `frontend/src/modules/estoque/pages/EstoqueCentral.tsx` - tela central com entrada, saida, ajuste e transferencia.
- 🟢 `frontend/src/modules/estoque/pages/EstoqueEscolar.tsx` - tela web escolar com movimentos e realtime.
- 🟢 `frontend/src/modules/estoque/pages/EstoqueEscolaPortal.tsx` - superficie portal/consulta escolar.
- 🟢 `frontend/src/modules/estoque/pages/EstoqueMovimentacoes.tsx` - timeline e filtros operacionais.
- 🟢 `frontend/src/modules/estoque/pages/EstoqueLotes.tsx` - listagem de lotes, validade e status.
- 🟢 `frontend/src/modules/estoque/pages/EstoqueAlertas.tsx` - leitura de alertas.
- 🟡 `apps/estoque-escolar-mobile/src/hooks/useSyncManager.ts` - fila offline e sincronizacao.
- 🟡 `apps/estoque-escolar-mobile/src/hooks/useEstoque.ts` - facade mobile do dominio de estoque escolar.
- 🟡 `apps/estoque-escolar-mobile/src/components/ModalLotesEstoque.tsx` - validacao de lotes por movimento.
- 🟡 `_reversa_sdd/flowcharts/estoque.md` - fluxo macro do modulo.
- 🟡 `_reversa_sdd/flowcharts/estoque-registrarMovimento.md` - fluxo de escrita e validacao.
- 🟡 `_reversa_sdd/flowcharts/estoque-transferencia.md` - fluxo transacional de transferencia.
- 🟡 `_reversa_sdd/flowcharts/estoque-syncMobile.md` - fluxo offline do app escolar.

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Rotas do estoque central exigem autenticacao e permissao de leitura/escrita no modulo `estoque`. | `backend/src/modules/estoque/routes/estoqueCentralRoutes.ts` | 🟢 |
| Seguranca | Rotas do estoque escolar exigem JWT e permissao de leitura/escrita no modulo `estoque`. | `backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts` | 🟢 |
| Integridade | Escritas do ledger usam transacao para garantir atomicidade da operacao. | `backend/src/modules/estoque/services/estoqueLedgerService.ts` | 🟢 |
| Integridade | Transferencias central->escola persistem os dois lados no mesmo contexto transacional. | `backend/src/modules/estoque/services/estoqueLedgerService.ts` | 🟢 |
| Integridade | O saldo corrente e derivado pela soma de `quantidade_delta`, evitando atualizacao destrutiva de saldo canonico. | `backend/src/modules/estoque/services/estoqueProjectionService.ts` | 🟢 |
| Escalabilidade | Indices por escopo/produto, escola/produto e data suportam consultas frequentes do ledger. | `backend/src/modules/estoque/services/estoqueSchemaService.ts` | 🟢 |
| Observabilidade | A UI usa atualizacoes realtime para refletir movimentacoes sem reload completo. | `frontend/src/modules/estoque/pages/EstoqueCentral.tsx` | 🟢 |
| Resiliencia | O app escolar possui fila local com retentativas para sincronizar operacoes offline. | `_reversa_sdd/flowcharts/estoque-syncMobile.md` | 🟡 |

> 🟢 Inferido do codigo backend, telas web, app mobile e fluxos Reversa do modulo de estoque.

## Criterios de Aceitacao

```gherkin
Cenario: Registrar entrada no estoque central
Dado um usuario autenticado com escrita no modulo estoque
Quando ele envia uma entrada valida para um produto
Entao o sistema deve gravar um evento `recebimento_central` com delta positivo

Cenario: Bloquear saida central sem saldo
Dado um produto com saldo central insuficiente
Quando o operador tenta registrar uma saida
Entao o sistema deve rejeitar a movimentacao com erro de saldo insuficiente

Cenario: Ajustar saldo escolar por valor absoluto
Dado uma escola com saldo atual conhecido para um produto
Quando o operador informa um ajuste absoluto
Entao o sistema deve converter esse valor em `quantidade_delta` relativo ao saldo atual e persistir o evento

Cenario: Transferir estoque do central para escola
Dado um produto com saldo central suficiente
Quando o usuario solicita uma transferencia para uma escola
Entao o sistema deve gravar um debito no escopo central e um credito no escopo escola na mesma transacao

Cenario: Exibir saldo central com reservas
Dado guias abertas que reservam parte do estoque de um produto
Quando a tela de estoque central consulta a projecao
Entao o sistema deve retornar quantidade total, reservada e disponivel como campos distintos

Cenario: Sincronizar movimento offline do app escolar
Dado uma movimentacao registrada sem conectividade no app mobile
Quando a conectividade for restabelecida
Entao o item pendente deve ser reenviado para a API e removido da fila em caso de sucesso
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Escrita append-only do ledger | Must | E o nucleo de consistencia do dominio de estoque. | 🟢 |
| Projecoes de saldo central e escolar | Must | Sem elas nao ha operacao de consulta nem validacao de saldo. | 🟢 |
| Transferencia central para escola | Must | Conecta abastecimento central ao consumo descentralizado. | 🟢 |
| Validacao de saldo insuficiente | Must | Impede saidas e transferencias inconsistentes. | 🟢 |
| Alertas, lotes e timeline operacional | Should | Sustentam a operacao diaria e leitura de risco/validade. | 🟢 |
| Sincronizacao offline do app escolar | Should | Importante para operacao em campo com conectividade intermitente. | 🟡 |
| Modos operacionais por escola | Could | Ja existe no schema, mas a maturidade funcional parece parcial. | 🟡 |

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/estoque/routes/estoqueCentralRoutes.ts` | Rotas HTTP do estoque central | 🟢 |
| `backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts` | Rotas HTTP do estoque escolar | 🟢 |
| `backend/src/modules/estoque/services/estoqueLedgerService.ts` | `appendEvent`, `registrarMovimentacaoCentral`, `registrarMovimentacaoEscolar`, `registrarTransferenciaParaEscola` | 🟢 |
| `backend/src/modules/estoque/services/estoqueProjectionService.ts` | `listarSaldoCentral`, `listarSaldoEscolar`, `listarMovimentacoes` | 🟢 |
| `backend/src/modules/estoque/services/estoqueSchemaService.ts` | `buildEstoqueLedgerSchemaSql`, `ensureEstoqueLedgerSchema` | 🟢 |
| `backend/src/modules/estoque/controllers/EstoqueCentralController.ts` | Entradas, saidas, ajustes, lotes, alertas e transferencia | 🟢 |
| `backend/src/modules/estoque/controllers/estoqueEscolarController.ts` | Historico, item escolar, configuracao e movimentacao | 🟢 |
| `backend/src/modules/estoque/services/estoqueLedgerService.test.ts` | Validacoes e comportamento do ledger | 🟢 |
| `frontend/src/modules/estoque/pages/EstoqueCentral.tsx` | Operacao central e indicadores | 🟢 |
| `frontend/src/modules/estoque/pages/EstoqueEscolar.tsx` | Operacao escolar web | 🟢 |
| `frontend/src/modules/estoque/pages/EstoqueMovimentacoes.tsx` | Timeline, filtros e leitura de movimentos | 🟢 |
| `frontend/src/modules/estoque/pages/EstoqueLotes.tsx` | Lotes e validade | 🟢 |
| `apps/estoque-escolar-mobile/src/hooks/useSyncManager.ts` | Fila offline e reenvio | 🟡 |
| `apps/estoque-escolar-mobile/src/components/ModalLotesEstoque.tsx` | Validacoes por lote e por quantidade | 🟡 |
| `_reversa_sdd/flowcharts/estoque.md` | Fluxo macro do dominio | 🟡 |
| `_reversa_sdd/flowcharts/estoque-registrarMovimento.md` | Fluxo de validacao e persistencia | 🟡 |
| `_reversa_sdd/flowcharts/estoque-transferencia.md` | Fluxo transacional de transferencia | 🟡 |
| `_reversa_sdd/flowcharts/estoque-syncMobile.md` | Fluxo offline e sincronizacao | 🟡 |

## Notas de Revisao

- 🟢 [Implementacao 2026-04-30] O estoque escolar foi migrado de `devAuthMiddleware` para `authenticateToken` + `requireLeitura('estoque')`/`requireEscrita('estoque')`.
