# Compras e Programacao

## Visao Geral

🟢 O componente Compras e Programacao gerencia pedidos de compra, itens de pedido, geracao de compras a partir de guias e a programacao de entrega por escola.
🟢 Ele conecta contratos ativos, produtos, quantidades planejadas, datas previstas e valores monetarios para transformar demanda operacional em pedido de compra executavel.
🟢 O componente tambem oferece fluxos assincronos de planejamento, merge de itens e publicacao de eventos realtime para atualizar o frontend.

## Responsabilidades

- 🟢 Listar, buscar, criar, editar, excluir e alterar status de compras/pedidos.
- 🟢 Calcular `valor_total` do pedido a partir dos itens e do `preco_unitario` dos contratos.
- 🟢 Expor estatisticas de compras e resumo por tipo de fornecedor.
- 🟢 Listar produtos disponiveis e produtos de um contrato para compor compras.
- 🟢 Validar e iniciar geracao de compra a partir de guia.
- 🟢 Iniciar jobs assincronos de geracao de compra e expor status por `job_id`.
- 🟢 Planejar compras por competencia, gerar guias/pedidos e listar jobs do usuario.
- 🟢 Listar programacoes de entrega por item do pedido.
- 🟢 Salvar programacoes completas de um item, incluindo escolas e quantidades.
- 🟢 Recalcular quantidade, menor data de entrega, valor do item e valor do pedido apos salvar programacoes.
- 🟢 Mesclar itens de pedido do mesmo produto/pedido em uma programacao consolidada.
- 🟢 Publicar eventos realtime apos criacao de compra, alteracao de programacao e merge de itens.

## Interface

### Compras

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/compras` | HTTP | Sim | Lista compras com permissao de leitura em `compras`. | 🟢 |
| `GET /api/compras/:id` | HTTP | Sim | Busca detalhe do pedido. | 🟢 |
| `GET /api/compras/estatisticas` | HTTP | Sim | Retorna estatisticas agregadas. | 🟢 |
| `GET /api/compras/:id/resumo-tipo-fornecedor` | HTTP | Sim | Retorna resumo por tipo de fornecedor do pedido. | 🟢 |
| `GET /api/compras/produtos-disponiveis` | HTTP | Sim | Lista produtos disponiveis para compra. | 🟢 |
| `GET /api/compras/contrato/:contrato_id/produtos` | HTTP | Sim | Lista produtos de um contrato especifico. | 🟢 |
| `POST /api/compras` | HTTP | Sim | Cria compra manual com permissao de escrita. | 🟢 |
| `PUT /api/compras/:id` | HTTP | Sim | Atualiza compra/pedido. | 🟢 |
| `PATCH /api/compras/:id/status` | HTTP | Sim | Atualiza status do pedido. | 🟢 |
| `DELETE /api/compras/:id` | HTTP | Sim | Exclui pedido. | 🟢 |

### Geracao e jobs

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `POST /api/compras/gerar-da-guia` | HTTP | Sim | Valida ou gera compra a partir de guia no fluxo sincronizado. | 🟢 |
| `POST /api/compras/gerar-da-guia/async` | HTTP | Sim | Inicia geracao assincrona de compra a partir da guia. | 🟢 |
| `GET /api/compras/jobs/:id` | HTTP | Sim | Busca status de job de geracao de compra. | 🟢 |
| `POST /api/planejamento-compras/calcular-por-competencia` | HTTP | Sim | Calcula demanda por competencia. | 🟢 |
| `POST /api/planejamento-compras/gerar-guias` | HTTP | Sim | Gera guias no fluxo sincronizado. | 🟢 |
| `POST /api/planejamento-compras/gerar-guias-async` | HTTP | Sim | Inicia geracao assincrona de guias. | 🟢 |
| `POST /api/planejamento-compras/gerar-pedido-da-guia` | HTTP | Sim | Gera pedido a partir da guia no fluxo sincronizado. | 🟢 |
| `POST /api/planejamento-compras/gerar-pedido-da-guia-async` | HTTP | Sim | Inicia geracao assincrona de pedido. | 🟢 |
| `GET /api/planejamento-compras/jobs/:id` | HTTP | Sim | Busca status do job de planejamento. | 🟢 |
| `GET /api/planejamento-compras/jobs` | HTTP | Sim | Lista jobs do usuario. | 🟢 |
| `POST /api/planejamento-compras/gerar-pedidos` | HTTP | Sim | Gera pedidos por periodo. | 🟢 |

### Programacao de entrega

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/compras/itens/:pedido_item_id/programacoes` | HTTP | Sim | Lista programacoes do item do pedido. | 🟢 |
| `PUT /api/compras/itens/:pedido_item_id/programacoes` | HTTP | Sim | Salva array completo de programacoes do item. | 🟢 |
| `POST /api/compras/itens/mesclar` | HTTP | Sim | Mescla 2 ou mais itens do mesmo produto/pedido. | 🟢 |

### Estruturas principais

```ts
type StatusCompra =
  | "rascunho"
  | "pendente"
  | "aprovado"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "cancelado"
  | "recebido_parcial"
  | "concluido"
  | "suspenso";

type ProgramacaoEntrega = {
  id?: number;
  data_entrega: string;
  observacoes?: string;
  escolas: Array<{
    escola_id: number;
    quantidade: number;
  }>;
};
```

🟢 `pedido_itens` armazena `quantidade`, `preco_unitario`, `valor_total` e `data_entrega_prevista`.
🟢 `pedido_item_programacoes` representa a granularidade de entrega por data e por escola.
🟡 O codigo evidencia dois conjuntos de status de compra entre model e controller; a compatibilizacao final deve ser validada no OpenAPI e na revisao.

## Regras de Negocio

- 🟢 Todas as rotas de `compraRoutes` exigem autenticacao.
- 🟢 Leituras de compras exigem `requireLeitura('compras')`.
- 🟢 Escritas de compras e programacoes exigem `requireEscrita('compras')`.
- 🟢 Criacao de compra abre transacao (`BEGIN`) antes de persistir pedido e itens.
- 🟢 Criacao de compra exige usuario autenticado.
- 🟢 Criacao de compra define numero do pedido e status inicial `pendente`.
- 🟢 Para cada item da compra, o backend busca `contrato_produto`.
- 🟢 Produto e contrato precisam estar ativos para o item ser aceito.
- 🟢 Quantidade do item deve ser maior que zero.
- 🟢 `valor_total` do pedido e soma de `quantidade * preco_unitario` de todos os itens.
- 🟢 Em erro durante a criacao, a transacao sofre `ROLLBACK`.
- 🟢 Alteracao de status da compra aceita apenas valores do conjunto validado pelo controller.
- 🟢 Programacoes devem ser enviadas como array.
- 🟢 Salvar programacoes remove programacoes nao enviadas ou todas, dependendo da presenca de ids no payload.
- 🟢 Cada programacao salva recria suas escolas com quantidade maior que zero.
- 🟢 A quantidade do item e recalculada pela soma das quantidades das escolas programadas.
- 🟢 A menor `data_entrega` entre programacoes atualiza a data prevista do item.
- 🟢 `valor_total` do item e recalculado como `quantidade * preco_unitario`.
- 🟢 `valor_total` do pedido e recalculado pela soma dos itens apos salvar programacoes.
- 🟢 Salvar programacoes publica evento realtime `compras/programacao_updated`.
- 🟢 Merge de itens exige ao menos 2 itens.
- 🟢 Merge de itens exige que todos os itens pertençam ao mesmo `produto_id` e `pedido_id`.
- 🟢 No merge, o primeiro item vira destino e os demais sao removidos.
- 🟢 O merge soma quantidades por escola e escolhe a menor data de entrega.
- 🟢 A programacao consolidada e recriada no item destino.
- 🟢 O merge recalcula quantidade, data e valor do item destino e do pedido.
- 🟢 O merge publica evento realtime `itens_merged`.
- 🟢 `planejamentoComprasRoutes` exige autenticacao e RBAC granular com `guias`/`compras`.
- 🟢 Geracao de pedido a partir da guia cria pedido com status `pendente`.
- 🟢 Geracao de pedido a partir da guia tambem cria `pedido_item_programacoes` a partir dos dados da guia.
- 🟢 Planejamento recalcula `valor_total` do pedido apos inserir itens e programacoes.

## Fluxo Principal

### Compra manual

1. 🟢 Usuario acessa compras.
2. 🟢 Frontend carrega pedidos, estatisticas, produtos disponiveis e contratos conforme a tela.
3. 🟢 Usuario monta uma compra manual com itens.
4. 🟢 Backend autentica e valida permissao de escrita em `compras`.
5. 🟢 Backend abre transacao e busca `contrato_produto` para cada item.
6. 🟢 Backend valida contrato/produto ativos e quantidade positiva.
7. 🟢 Backend calcula `valor_total`.
8. 🟢 Backend insere `pedido` e `pedido_itens`.
9. 🟢 Backend confirma a transacao, publica realtime e retorna `201`.

### Geracao por guia

1. 🟢 Usuario escolhe gerar compra a partir de uma guia.
2. 🟢 Frontend chama `/api/compras/gerar-da-guia` ou rota equivalente de `planejamento-compras`.
3. 🟢 Backend identifica contratos/precos para os produtos da guia.
4. 🟢 Backend cria pedido com status `pendente`.
5. 🟢 Backend cria `pedido_itens` e respectivas `pedido_item_programacoes`.
6. 🟢 Backend recalcula `valor_total` final do pedido.

### Programacao de entrega

1. 🟢 Usuario abre a tela de programacao de um item ou o ajuste em massa do pedido.
2. 🟢 Frontend carrega programacoes existentes, escolas e pedido.
3. 🟢 Usuario envia o array completo de programacoes.
4. 🟢 Backend inicia transacao.
5. 🟢 Backend remove programacoes antigas conforme ids enviados.
6. 🟢 Backend atualiza ou cria cada programacao.
7. 🟢 Backend remove escolas antigas da programacao e reinsere apenas as com quantidade maior que zero.
8. 🟢 Backend recalcula quantidade, menor data de entrega e valores.
9. 🟢 Backend confirma a transacao e publica realtime.

### Merge de itens

1. 🟢 Usuario seleciona itens de um pedido para mesclar.
2. 🟢 Backend valida que existem ao menos dois itens.
3. 🟢 Backend valida que todos pertencem ao mesmo pedido e produto.
4. 🟢 Backend escolhe o primeiro item como destino.
5. 🟢 Backend consolida quantidades por escola e menor data.
6. 🟢 Backend remove programacoes antigas e itens secundarios.
7. 🟢 Backend recria a programacao consolidada no item destino.
8. 🟢 Backend recalcula item e pedido e publica evento de merge.

## Fluxos Alternativos

- 🟢 **Usuario nao autenticado na criacao:** backend retorna HTTP 401.
- 🟢 **Contrato ou produto inativo na compra:** backend executa rollback e retorna HTTP 400.
- 🟢 **Quantidade invalida na compra:** backend executa rollback e retorna HTTP 400.
- 🟢 **Programacoes fora do formato array:** backend retorna HTTP 400.
- 🟢 **Programacao sem ids enviados:** backend remove todas as programacoes antigas do item antes de recriar.
- 🟢 **Merge com menos de 2 itens:** backend retorna HTTP 400.
- 🟢 **Merge de itens de produtos ou pedidos diferentes:** backend executa rollback e retorna HTTP 400.
- 🟢 **Fluxo assincrono de compra:** frontend consulta `jobs/:id` ate o job concluir.

## Cenarios de Borda

- 🟢 **Programacao com escolas zeradas:** escolas com quantidade `0` nao devem ser regravadas na programacao.
- 🟢 **Datas diferentes no merge:** a programacao consolidada deve usar a menor data de entrega entre os itens mesclados.
- 🟢 **Recalculo encadeado:** qualquer alteracao em programacao deve propagar para quantidade do item e `valor_total` do pedido.
- 🟢 **Compra derivada da guia com muitos itens:** o fluxo de planejamento precisa persistir pedido, itens e programacoes mantendo consistencia do total final.
- 🟢 **Permissoes do modulo planejamento:** as rotas de `planejamento-compras` exigem permissao granular em `guias` e `compras`.
- 🟡 **Conjunto de status:** o model inclui mais estados do que o controller valida explicitamente; esse contrato de status precisa ser harmonizado.

## Dependencias

- 🟢 `middleware/authMiddleware` - autentica compras e planejamento.
- 🟢 `middleware/permissionMiddleware` - controla leitura/escrita do modulo `compras`.
- 🟢 `backend/src/modules/compras/controllers/compraController.ts` - CRUD de compras e resumos.
- 🟢 `backend/src/modules/compras/controllers/programacaoEntregaController.ts` - programacoes e merge de itens.
- 🟢 `backend/src/modules/compras/controllers/compraGenerationController.ts` - geracao/validacao de compra da guia e jobs.
- 🟢 `backend/src/modules/compras/controllers/planejamentoComprasController.ts` - endpoints de planejamento e jobs.
- 🟢 `backend/src/modules/compras/services/PlanejamentoComprasService.ts` - geracao de guias/pedidos e recalculo de totais.
- 🟢 `backend/src/modules/compras/services/CompraGenerationService.ts` - fluxo de geracao de compra em background.
- 🟢 `backend/src/modules/compras/models/Compra.ts` - persistencia de pedidos.
- 🟢 `backend/src/modules/compras/models/CompraItem.ts` - persistencia de itens e totais.
- 🟢 `services/realtimeEvents` - publicacao de eventos de compra/programacao.
- 🟢 `frontend/src/modules/compras/pages/Compras.tsx` - lista de compras.
- 🟢 `frontend/src/modules/compras/pages/CompraDetalhe.tsx` - detalhe, merge e navegacao para ajuste.
- 🟢 `frontend/src/modules/compras/pages/CompraForm.tsx` - formulario de compra manual.
- 🟢 `frontend/src/modules/programacao/pages/ProgramacaoEntregaScreen.tsx` - programacao por item.
- 🟢 `frontend/src/modules/programacao/pages/AjusteProgramacoesScreen.tsx` - ajuste em massa do pedido.
- 🟢 `frontend/src/modules/programacao/pages/AjusteGuiaDemandaScreen.tsx` - integracao com ajuste da guia.

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Todas as rotas de `compraRoutes` exigem autenticacao. | `backend/src/modules/compras/routes/compraRoutes.ts:30` | 🟢 |
| Seguranca | Leituras e escritas de compras usam `requireLeitura('compras')` e `requireEscrita('compras')`. | `backend/src/modules/compras/routes/compraRoutes.ts:33` | 🟢 |
| Seguranca | `planejamentoComprasRoutes` exige autenticacao e permissao granular por operacao. | `backend/src/modules/compras/routes/planejamentoComprasRoutes.ts` | 🟢 |
| Disponibilidade | Geracao assincrona expõe `job_id` e endpoint de consulta de status. | `backend/src/modules/compras/routes/compraRoutes.ts:35` | 🟢 |
| Integridade | Criacao de compra usa transacao com rollback em caso de erro. | `_reversa_sdd/flowcharts/compras-criarCompra.md` | 🟢 |
| Integridade | Salvar programacoes recalcula quantidade do item e valores do item/pedido. | `backend/src/modules/compras/controllers/programacaoEntregaController.ts:140` | 🟢 |
| Integridade | Merge de itens recalcula item destino e valor total do pedido. | `backend/src/modules/compras/controllers/programacaoEntregaController.ts:279` | 🟢 |
| Observabilidade | Eventos realtime sao publicados apos criacao/ajuste/merge. | `backend/src/modules/compras/controllers/programacaoEntregaController.ts:4` | 🟡 |

> 🟢 Inferido a partir do codigo e dos fluxos Reversa de compras e programacao.

## Criterios de Aceitacao

```gherkin
Cenario: Criar compra manual
Dado um usuario autenticado com escrita em compras
Quando ele envia itens vinculados a contratos ativos com quantidade positiva
Entao o backend deve criar o pedido em transacao com status pendente e valor_total calculado

Cenario: Bloquear compra com contrato inativo
Dado um item apontando para contrato ou produto inativo
Quando o usuario tenta criar a compra
Entao o backend deve executar rollback e retornar erro de validacao

Cenario: Salvar programacoes de um item
Dado um item de pedido existente
Quando o usuario envia um array de programacoes com escolas e quantidades
Entao o backend deve recriar as programacoes, recalcular quantidade do item e atualizar o valor_total do pedido

Cenario: Bloquear payload invalido de programacoes
Dado um pedido_item existente
Quando o usuario envia programacoes em formato diferente de array
Entao o backend deve retornar HTTP 400

Cenario: Mesclar itens compativeis
Dado ao menos dois itens do mesmo pedido e do mesmo produto
Quando o usuario solicita a mesclagem
Entao o backend deve consolidar quantidades por escola, manter a menor data e recalcular item e pedido

Cenario: Bloquear merge incompatível
Dado itens de pedidos diferentes ou produtos diferentes
Quando o usuario tenta mesclar esses itens
Entao o backend deve executar rollback e retornar HTTP 400

Cenario: Iniciar geracao assincrona de compra
Dado um usuario com escrita em compras
Quando ele solicita gerar compra da guia no fluxo assincrono
Entao o backend deve retornar um job_id para acompanhamento

Cenario: Gerar pedido da guia
Dado uma guia valida com produtos contratualizados
Quando o usuario solicita gerar pedido da guia
Entao o backend deve criar pedido, itens e programacoes iniciais com valor_total recalculado
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Criacao e manutencao de compras | Must | Nucleo do processo de aquisicao. | 🟢 |
| Programacao de entrega por escola | Must | Traduz o pedido agregado em distribuicao executavel. | 🟢 |
| Recalculo de totais | Must | Mantem coerencia financeira entre itens e pedido. | 🟢 |
| Geracao da compra a partir da guia | Should | Acelera o fluxo operacional baseado na demanda consolidada. | 🟢 |
| Jobs assincronos de planejamento | Should | Melhora UX e escalabilidade para operacoes pesadas. | 🟢 |
| Merge de itens | Could | Ferramenta de saneamento e consolidacao operacional. | 🟢 |

> 🟢 Prioridade inferida pelo papel central das compras entre guias, contratos e entregas.

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/compras/routes/compraRoutes.ts` | Rotas de compras, programacoes e jobs | 🟢 |
| `backend/src/modules/compras/controllers/compraController.ts` | CRUD de compras, status, estatisticas e resumos | 🟢 |
| `backend/src/modules/compras/controllers/programacaoEntregaController.ts` | `listarProgramacoes`, `salvarProgramacoes`, `mesclarItens` | 🟢 |
| `backend/src/modules/compras/controllers/compraGenerationController.ts` | Geracao/validacao de compra da guia e status do job | 🟢 |
| `backend/src/modules/compras/routes/planejamentoComprasRoutes.ts` | Rotas de planejamento e jobs | 🟢 |
| `backend/src/modules/compras/controllers/planejamentoComprasController.ts` | Calculo por competencia, gerar guias/pedidos e jobs | 🟢 |
| `backend/src/modules/compras/services/PlanejamentoComprasService.ts` | Geracao de pedidos/programacoes e recalculo de totais | 🟢 |
| `backend/src/modules/compras/services/CompraGenerationService.ts` | Geracao em background | 🟢 |
| `backend/src/modules/compras/models/Compra.ts` | Modelo de pedidos | 🟢 |
| `backend/src/modules/compras/models/CompraItem.ts` | Modelo de itens do pedido | 🟢 |
| `frontend/src/modules/compras/pages/Compras.tsx` | Lista de compras e acesso a ajuste | 🟢 |
| `frontend/src/modules/compras/pages/CompraDetalhe.tsx` | Detalhe, merge e resumo de itens | 🟢 |
| `frontend/src/modules/compras/pages/CompraForm.tsx` | Formulario de compra manual | 🟢 |
| `frontend/src/modules/programacao/pages/ProgramacaoEntregaScreen.tsx` | Programacao por item | 🟢 |
| `frontend/src/modules/programacao/pages/AjusteProgramacoesScreen.tsx` | Ajuste em massa das programacoes | 🟢 |
| `frontend/src/modules/programacao/pages/AjusteGuiaDemandaScreen.tsx` | Integracao entre compras e ajuste da guia | 🟢 |
| `_reversa_sdd/flowcharts/compras.md` | Fluxo macro de compras | 🟢 |
| `_reversa_sdd/flowcharts/compras-criarCompra.md` | Fluxo de criacao da compra | 🟢 |
| `_reversa_sdd/flowcharts/compras-salvarProgramacoes.md` | Fluxo de salvar programacoes | 🟢 |
| `_reversa_sdd/flowcharts/programacao.md` | Fluxo macro de programacao | 🟢 |
| `_reversa_sdd/flowcharts/programacao-salvar.md` | Fluxo de salvar programacoes com update/insert | 🟢 |
| `_reversa_sdd/flowcharts/programacao-mesclar.md` | Fluxo de mesclar itens | 🟢 |

## Notas de Hardening

- [Implementacao 2026-04-30] `planejamentoComprasRoutes.ts` passou a exigir RBAC granular: geracao/calculo de guias usa `guias`, geracao de pedidos usa `compras` e consulta de jobs usa leitura em `compras`.
