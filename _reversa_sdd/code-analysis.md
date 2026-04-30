# Analise de Codigo - gestaoescolar

Gerado pelo Reversa Archaeologist em 2026-04-29.

Escala de confianca usada:

- CONFIRMADO: extraido diretamente do codigo.
- INFERIDO: baseado em padroes do projeto, pode estar errado.
- LACUNA: requer validacao humana.

## Modulo: abastecimento

### Identificacao

- Status: CONFIRMADO.
- Caminho principal: `frontend/src/modules/abastecimento`.
- Arquivos primarios:
  - `frontend/src/modules/abastecimento/pages/Abastecimento.tsx`
  - `frontend/src/modules/abastecimento/status.ts`
- Tipo: modulo frontend de visao operacional.
- Backend proprio: LACUNA/ausente no modulo; a tela consome servicos de outros dominios (`guias`, `compras`, `entregas`).

### Proposito

CONFIRMADO: o modulo monta a pagina `/abastecimento`, uma visao consolidada do ciclo operacional de demanda, guia, compra, programacao e entrega. Ele apresenta metricas agregadas, atalhos de fluxo e listas recentes de guias e pedidos.

### Dependencias Diretas

CONFIRMADO:

- `guiaService.listarCompetencias()` de `frontend/src/services/guiaService.ts`.
- `pedidosService.listar({ limit: 5 })` de `frontend/src/services/pedidos.ts`.
- `entregaService.obterEstatisticas()` de `frontend/src/modules/entregas/services/entregaService.ts`.
- `useNavigate` de `react-router-dom`.
- `usePageTitle` de `frontend/src/contexts/PageTitleContext`.
- Componentes compartilhados `PageContainer` e `PageHeader`.
- Material UI (`Box`, `Button`, `Chip`, `CircularProgress`, `Divider`, `Paper`, `Stack`, `Typography`, `useTheme`).

### Funcoes e Metodos Principais

#### `getAbastecimentoStatus(group, value)`

- Arquivo: `frontend/src/modules/abastecimento/status.ts`.
- Parametros:
  - `group: keyof typeof ABASTECIMENTO_STATUS`
  - `value: string | null | undefined`
- Retorno: objeto `{ label: string; color: string }`.
- Confianca: CONFIRMADO.
- Regra: busca o status dentro do grupo solicitado. Se o valor for nulo, indefinido ou desconhecido, retorna fallback `{ label: value || "Sem status", color: "default" }`.

#### `formatCurrency(value)`

- Arquivo: `frontend/src/modules/abastecimento/pages/Abastecimento.tsx`.
- Parametros: `value: number | undefined`.
- Retorno: string formatada como moeda `pt-BR` em BRL.
- Confianca: CONFIRMADO.
- Regra: converte `undefined`, `null` implicito via `value || 0`, ou valor falsy para zero antes da formatacao.

#### `formatDate(value)`

- Arquivo: `frontend/src/modules/abastecimento/pages/Abastecimento.tsx`.
- Parametros: `value: string | undefined`.
- Retorno: data local `pt-BR` ou `"Sem data"`.
- Confianca: CONFIRMADO.

#### `Abastecimento()`

- Arquivo: `frontend/src/modules/abastecimento/pages/Abastecimento.tsx`.
- Parametros: nenhum.
- Retorno: componente React.
- Confianca: CONFIRMADO.
- Responsabilidades:
  - definir titulo da pagina como `Abastecimento`;
  - carregar resumo de guias, pedidos e entregas;
  - tolerar falha parcial de cada fonte de dados;
  - calcular metricas agregadas;
  - renderizar fluxo operacional, listas recentes e atalhos.

#### `carregarResumo()`

- Arquivo: funcao interna de `Abastecimento()`.
- Parametros: nenhum.
- Retorno: `Promise<void>`.
- Confianca: CONFIRMADO.
- Fluxo:
  - ativa loading;
  - executa tres chamadas em paralelo com `Promise.allSettled`;
  - se o componente ainda estiver ativo, aplica resultados individuais;
  - em falhas, registra mensagens em `errors` e zera somente o estado afetado;
  - desativa loading.

#### Componentes auxiliares

CONFIRMADO:

- `ListHeader({ title, actionLabel, onAction })`: cabecalho de lista com botao de acao.
- `ListRow({ title, subtitle, chip, onClick })`: linha clicavel para guia/pedido.
- `LoadingRow()`: indicador de carregamento.
- `EmptyRow({ text })`: estado vazio.
- `ShortcutButton({ icon, label, onClick })`: botao de atalho operacional.

### Algoritmos e Logica Nao Trivial

#### Carregamento tolerante a falha parcial

CONFIRMADO: `carregarResumo` usa `Promise.allSettled` para que falha em uma fonte nao impeça exibicao das demais. Cada resultado e tratado separadamente:

- guias com sucesso: `setGuias(value.slice(0, 5))`;
- guias com erro: mensagem "Nao foi possivel carregar guias." e lista vazia;
- pedidos com sucesso: aceita tanto `value.data` quanto `value`, depois limita a 5;
- pedidos com erro: mensagem "Nao foi possivel carregar pedidos." e lista vazia;
- entregas com sucesso: mescla resultado com `initialEntregaResumo`;
- entregas com erro: mensagem "Nao foi possivel carregar entregas." e resumo zerado.

#### Protecao contra atualizacao apos desmontagem

CONFIRMADO: o efeito de carregamento usa flag local `active`. No cleanup, `active = false`. Depois das chamadas assíncronas, se `!active`, a funcao retorna antes de atualizar estado.

#### Calculo de metricas

CONFIRMADO: `useMemo` calcula quatro metricas:

- quantidade de guias recentes;
- total de itens somando `guia.total_itens`;
- quantidade de pedidos recentes;
- soma de `pedido.valor_total` formatada em BRL;
- itens pendentes e entregues;
- percentual de entrega arredondado;
- total de escolas.

#### Fallbacks defensivos de dados

CONFIRMADO:

- arrays sao validados com `Array.isArray`;
- campos numericos opcionais sao convertidos com `Number(campo || 0)`;
- entregas sao mescladas com `initialEntregaResumo` para garantir chaves default;
- status desconhecido e exibido com cor `default`.

### Fluxo de Controle da Tela

CONFIRMADO:

1. Montagem do componente.
2. `useEffect` define o titulo da pagina.
3. `useEffect` inicia carregamento remoto.
4. A pagina renderiza cabecalho, metricas e, conforme estado:
   - loading;
   - dados parciais;
   - estados vazios;
   - listas de guias/pedidos.
5. Cliques de acoes usam `navigate` para abrir a etapa correspondente.

### Regras de Negocio Capturadas

CONFIRMADO:

- O fluxo de abastecimento e apresentado nesta ordem: guias de demanda, compras/pedidos, entregas, romaneio/comprovantes.
- Guias recentes sao limitadas aos 5 primeiros registros retornados.
- Pedidos recentes sao limitados aos 5 primeiros registros retornados.
- A pagina aceita dados parciais e avisa o usuario em um bloco de "Dados parciais".
- O botao primario "Gerar guia de demanda" direciona para `/guias-demanda`.

INFERIDO:

- A tela funciona como cockpit de navegacao e acompanhamento, nao como ponto de mutacao direta de abastecimento.
- A regra operacional real de gerar guias, compras, entregas e comprovantes vive em modulos dependentes, principalmente `guias`, `compras`, `entregas`, `programacao` e `estoque`.

### Estados de Dominio

CONFIRMADO em `ABASTECIMENTO_STATUS`:

- Guia:
  - `aberta`: "Em revisao", cor `warning`.
  - `fechada`: "Concluida", cor `success`.
  - `cancelada`: "Cancelada", cor `error`.
- Item de guia:
  - `pendente`: "Pendente", cor `warning`.
  - `programada`: "Programada", cor `info`.
  - `parcial`: "Parcial", cor `warning`.
  - `entregue`: "Entregue", cor `success`.
  - `cancelado`: "Cancelado", cor `error`.
- Pedido:
  - `pendente`: "Pendente", cor `warning`.
  - `recebido_parcial`: "Recebido parcial", cor `info`.
  - `concluido`: "Concluido", cor `success`.
  - `suspenso`: "Suspenso", cor `secondary`.
  - `cancelado`: "Cancelado", cor `error`.

### Rotas e Navegacao

CONFIRMADO:

- `/abastecimento`: rota da propria pagina, registrada em `frontend/src/routes/AppRouter.tsx`.
- `/guias-demanda`: geracao/consulta de guias.
- `/compras`: pedidos/compras.
- `/entregas`: execucao de entregas.
- `/romaneio`: documentos operacionais.
- `/gestao-rotas`: organizacao de rotas.
- `/comprovantes-entrega`: consulta de comprovantes.
- `/guias-demanda/:guia_id`: detalhe de guia recente.
- `/compras/:pedido.id`: detalhe de pedido recente.

### Estruturas de Dados Locais

Resumo; ver `_reversa_sdd/data-dictionary.md` para o dicionario detalhado.

- `GuiaResumo`
- `PedidoResumo`
- `EntregaResumo`
- `FlowStepId`
- `ABASTECIMENTO_FLOW_STEPS`
- `ABASTECIMENTO_STATUS`

### Tratamento de Erros

CONFIRMADO:

- Erros de guias, pedidos e entregas sao independentes.
- A UI mostra mensagem concatenada em `Dados parciais`.
- Nao ha retry local no modulo `abastecimento`.
- O servico de pedidos usa `apiWithRetry`, mas isso pertence ao modulo/servico dependente.

### Lacunas

- LACUNA: a ordenacao dos "5 recentes" depende da ordem retornada pelas APIs; a tela nao ordena localmente.
- LACUNA: o tipo real de resposta de `pedidosService.listar` pode variar entre array direto e objeto com `data`; a tela aceita ambos.
- LACUNA: permissao da rota `/abastecimento` usa `moduloSlug="planejamento_compras"` no roteador, mas a regra de permissao em si esta fora deste modulo.

## Modulo: cardapios

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/cardapios`.
- Frontend: `frontend/src/modules/cardapios`.
- Servicos frontend relacionados: `frontend/src/services/cardapios.ts` e `frontend/src/services/cardapiosModalidade.ts`.
- Tipo: modulo full-stack de cardapios, refeicoes/preparacoes, modalidades e calendario alimentar.

### Proposito

CONFIRMADO: o modulo gerencia cardapios mensais por modalidade, composicao de dias com refeicoes, preparacoes/ingredientes, calculos nutricionais/custos e visualizacoes em calendario, detalhe e pagina publica de ficha tecnica.

### Arquivos Primarios

Backend:

- `backend/src/modules/cardapios/controllers/cardapioController.ts`
- `backend/src/modules/cardapios/controllers/modalidadeController.ts`
- `backend/src/modules/cardapios/controllers/refeicaoController.ts`
- `backend/src/modules/cardapios/controllers/refeicaoProdutoController.ts`
- `backend/src/modules/cardapios/models/Modalidade.ts`
- `backend/src/modules/cardapios/models/Refeicao.ts`
- `backend/src/modules/cardapios/models/RefeicaoProduto.ts`
- `backend/src/modules/cardapios/routes/cardapioRoutes.ts`
- `backend/src/modules/cardapios/routes/modalidadeRoutes.ts`
- `backend/src/modules/cardapios/routes/refeicaoRoutes.ts`
- `backend/src/modules/cardapios/routes/refeicaoProdutoRoutes.ts`
- `backend/src/modules/cardapios/routes/tipoRefeicaoRoutes.ts`

Frontend:

- `frontend/src/modules/cardapios/pages/CardapiosModalidade.tsx`
- `frontend/src/modules/cardapios/pages/CardapioCalendario.tsx`
- `frontend/src/modules/cardapios/pages/CardapioDetalhe.tsx`
- `frontend/src/modules/cardapios/pages/CardapioPublico.tsx`
- `frontend/src/services/cardapiosModalidade.ts`
- `frontend/src/services/cardapios.ts`

### Rotas Backend

CONFIRMADO:

- `/api/cardapios`
  - `GET /`: lista cardapios por modalidade, com filtros `modalidade_id`, `mes`, `ano`, `ativo`.
  - `GET /:id`: busca cardapio.
  - `GET /:cardapioId/refeicoes`: lista refeicoes do cardapio.
  - `POST /`: cria cardapio.
  - `PUT /:id`: edita cardapio.
  - `DELETE /:id`: remove cardapio.
  - `POST /:cardapioId/refeicoes`: adiciona refeicao ao dia.
  - `DELETE /refeicoes/:id`: remove refeicao do dia.
  - `GET /:cardapioId/custo`: calcula custo do cardapio.
- `/api/modalidades`
  - leitura publica de lista e detalhe;
  - escrita autenticada para criar, editar, remover, desativar e reativar;
  - categorias financeiras de modalidade.
- `/api/refeicoes`
  - `GET /:id/ficha-tecnica`: rota publica.
  - demais rotas autenticadas com permissoes `refeicoes`.
  - CRUD, duplicacao, toggle ativo e produtos da refeicao.
- `/api/refeicao-produtos`
  - rotas alternativas para listar/adicionar/editar/remover produtos de refeicao.

### Autenticacao e Permissoes

CONFIRMADO:

- Rotas de cardapio usam `authenticateToken` em todo o router.
- Leitura de cardapios usa `requireLeitura('cardapios')`.
- Escrita de cardapios usa `requireEscrita('cardapios')`.
- Rotas de refeicoes tem ficha tecnica publica antes do middleware de autenticacao.
- Leitura/escrita de refeicoes usa permissoes `refeicoes`.
- Algumas rotas de modalidade permitem leitura sem autenticacao, mas escrita requer `authenticateToken`.

### Funcoes Principais - Cardapios

#### `listarCardapiosModalidade(req, res)`

CONFIRMADO:

- Usa cache com chave composta por filtros.
- Aplica periodo do usuario via `obterPeriodoUsuario(req.user?.id)`.
- Filtra por modalidade, mes, ano e ativo.
- Agrega quantidade de refeicoes, dias e modalidades vinculadas.
- Ordena por ano desc, mes desc e nome.

#### `criarCardapioModalidade(req, res)`

CONFIRMADO:

- Exige `modalidades_ids`, `nome`, `mes` e `ano`.
- Insere em `cardapios_modalidade`.
- Insere vinculos em `cardapio_modalidades` com `ON CONFLICT DO NOTHING`.
- Retorna cardapio completo com ids e nomes de modalidades.
- Invalida cache de `cardapios`.

#### `editarCardapioModalidade(req, res)`

CONFIRMADO:

- Atualiza campos principais com `COALESCE` em parte dos campos.
- Se `modalidades_ids` vier preenchido, apaga vinculos anteriores e recria os vinculos.
- Retorna 404 se o cardapio nao existir.
- Invalida cache do cardapio.

#### `adicionarRefeicaoDia(req, res)`

CONFIRMADO:

- Exige `refeicao_id`, `dia` e `tipo_refeicao`.
- Insere em `cardapio_refeicoes_dia`.
- Trata violacao unica (`23505`) como erro de negocio: preparacao ja adicionada no mesmo dia/tipo.

#### `calcularCustoCardapio(req, res)`

CONFIRMADO:

- Busca cardapio e modalidades vinculadas.
- Se nao houver modalidades, retorna custo total zero.
- Define data de referencia como primeiro dia do mes/ano do cardapio.
- Busca quantidade vigente de alunos por modalidade em `escola_modalidades_historico`.
- Busca refeicoes, produtos, per capita, fator de correcao, peso de embalagem, preco unitario e tipo de fornecedor.
- Agrupa por `refeicao_dia_id` + `modalidade_id`.
- Calcula custo por aluno e custo total por modalidade.
- Calcula distribuicao por tipo de fornecedor e percentual sobre custo total.

### Algoritmo de Custo do Cardapio

CONFIRMADO:

Para cada produto de cada refeicao/modalidade:

1. `perCapita = parseFloat(row.per_capita) || 0`.
2. `fatorCorrecao = parseFloat(row.fator_correcao) || 1.0`.
3. `perCapitaBruto = perCapita * fatorCorrecao`.
4. Se `tipo_medida` for `gramas` ou `mililitros`:
   - `proporcaoEmbalagem = perCapitaBruto / pesoEmbalagem`;
   - `custoIngrediente = proporcaoEmbalagem * precoUnitario`.
5. Caso contrario:
   - `custoIngrediente = perCapitaBruto * precoUnitario`.
6. `custoRefeicao = custo_por_aluno * quantidade_alunos_modalidade`.

INFERIDO: `per_capita` representa consumo liquido e `perCapitaBruto` representa quantidade de compra depois do fator de correcao, consistente com a ficha tecnica publica.

### Funcoes Principais - Refeicoes

CONFIRMADO:

- `listarRefeicoes`: lista preparacoes com total de produtos e calculo calorico total considerando per capita ajustado pela primeira modalidade ativa.
- `buscarRefeicao`: busca refeicao e calcula valor calorico total.
- `criarRefeicao`: cria preparacao com dados nutricionais, modo de preparo, rendimento e custo.
- `editarRefeicao`: atualiza preparacao.
- `removerRefeicao`: remove preparacao por delete fisico.
- `toggleAtivoRefeicao`: alterna campo `ativo`.
- `duplicarRefeicao`: transacao que copia a refeicao, seus produtos e configuracoes de per capita por modalidade.
- `buscarFichaTecnica`: rota publica que retorna refeicao, produtos processados, per capita liquido/bruto, nutrientes por porcao e custo total.

### Algoritmo de Duplicacao de Refeicao

CONFIRMADO:

1. Exige nome novo.
2. Abre transacao.
3. Busca refeicao original.
4. Cria nova refeicao com dados da original e `ativo = true`.
5. Copia registros de `refeicao_produtos`.
6. Para cada produto copiado, localiza o produto original correspondente.
7. Copia linhas de `refeicao_produto_modalidade` do produto original para o novo.
8. Faz commit; em erro faz rollback.

### Funcoes Principais - Produtos da Refeicao

CONFIRMADO:

- `listarRefeicaoProdutos`: lista produtos com dados do produto, unidade e per capita por modalidade.
- `adicionarRefeicaoProduto`: valida `produto_id`, `per_capita`/`per_capita_por_modalidade`, `tipo_medida` e limites; insere com transacao e ajustes por modalidade.
- `editarRefeicaoProduto`: valida `per_capita`, `tipo_medida` e limites; atualiza base e recria ajustes por modalidade.
- `removerRefeicaoProduto`: remove associacao.

### Regras de Validacao de Per Capita

CONFIRMADO:

- `tipo_medida` permitido: `gramas` ou `mg`.
- Limite para `mg`: 100000.
- Limite para `gramas`: 10000.
- `per_capita` nao pode ser negativo.
- Na adicao, `per_capita` pode faltar se houver `per_capita_por_modalidade`.
- Na edicao, `per_capita` e obrigatorio.

### Funcoes Principais - Modalidades

CONFIRMADO:

- `resolverCategoriaFinanceira`: atualiza categoria existente se `categoria_financeira_id` vier no body; caso contrario tenta localizar categoria pelo nome normalizado.
- `listarModalidades`: agrega categoria financeira, total de alunos e total de escolas.
- `criarModalidade` e `editarModalidade`: exigem categoria financeira valida.
- `desativarModalidade` e `reativarModalidade`: soft toggle de `ativo`.
- `criarCategoriaFinanceiraModalidade`: normaliza nome, rejeita duplicidade case-insensitive e cria categoria ativa.

### Frontend

CONFIRMADO:

- `CardapiosModalidadePage` lista cardapios, filtra por mes/ano/modalidade/status, cria/edita/remove cardapios e monta nome automatico "Cardapio [mes] [ano]".
- `CardapioCalendarioPage` carrega cardapio, refeicoes do cardapio, refeicoes disponiveis, modalidades e eventos letivos; permite adicionar/remover/replicar refeicoes por dia e exportar PDFs.
- `CardapioDetalhe` usa drag-and-drop (`@dnd-kit`) para montar/editar cardapio em detalhe.
- `CardapioPublico` decodifica parametro `data`, carrega refeicoes, abre ficha tecnica publica e gera PDF da ficha.

### Relatorios e Exportacoes

CONFIRMADO:

- `CardapioCalendarioPage` exporta calendario em PDF.
- Exporta frequencia de preparacoes.
- Exporta relatorio detalhado por periodo.
- Usa `pdfMake` inicializado dinamicamente e dados institucionais.

### Entidades Principais

Resumo; ver `_reversa_sdd/data-dictionary.md`.

- `CardapioModalidade`
- `CardapioRefeicaoDia`
- `Modalidade`
- `CategoriaFinanceiraModalidade`
- `Refeicao`
- `RefeicaoProduto`
- `RefeicaoProdutoModalidade`
- `FichaTecnica`

### Tratamento de Erros

CONFIRMADO:

- Controllers respondem 404 quando registros principais nao existem.
- Controllers respondem 400 para campos obrigatorios e validacoes de per capita.
- Duplicidade em refeicao do dia (`23505`) vira erro 400 com mensagem de regra de negocio.
- Operacoes transacionais fazem rollback em erro (`duplicarRefeicao`, `addRefeicaoProduto`, `updateRefeicaoProduto`).

### Lacunas

- LACUNA: ha sobreposicao entre `frontend/src/services/cardapios.ts` e `frontend/src/services/cardapiosModalidade.ts`; a fronteira historica entre ambos precisa de validacao.
- LACUNA: `RefeicaoModel` em `models/Refeicao.ts` usa campos como `tipo`, `horario_inicio` e `horario_fim`, enquanto controller atual usa `categoria`, ficha tecnica e campos nutricionais; pode ser legado parcial.
- LACUNA: algumas rotas de modalidade tem leitura sem autenticacao; confirmar se isso e intencional.

## Modulo: compras

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/compras`.
- Frontend: `frontend/src/modules/compras`.
- Servicos frontend: `frontend/src/services/pedidos.ts`, `frontend/src/services/planejamentoCompras.ts`, `frontend/src/services/compraGenerationService.ts`, `frontend/src/services/programacaoEntrega.ts`.
- Tipo: modulo full-stack para pedidos/compras, itens de compra, planejamento de demanda, geracao por guia e programacao de entrega.

### Proposito

CONFIRMADO: o modulo cria, lista, edita, exclui e acompanha compras/pedidos. Tambem converte demandas/guias em pedidos, calcula quantidades de compra/distribuicao, programa entregas por escola e expoe jobs assíncronos para operacoes longas.

### Arquivos Primarios

- `backend/src/modules/compras/controllers/compraController.ts`
- `backend/src/modules/compras/controllers/planejamentoComprasController.ts`
- `backend/src/modules/compras/controllers/compraGenerationController.ts`
- `backend/src/modules/compras/controllers/programacaoEntregaController.ts`
- `backend/src/modules/compras/services/PlanejamentoComprasService.ts`
- `backend/src/modules/compras/services/CompraGenerationService.ts`
- `backend/src/modules/compras/models/Compra.ts`
- `backend/src/modules/compras/models/CompraItem.ts`
- `backend/src/modules/compras/routes/compraRoutes.ts`
- `backend/src/modules/compras/routes/planejamentoComprasRoutes.ts`
- `frontend/src/modules/compras/pages/Compras.tsx`
- `frontend/src/modules/compras/pages/CompraForm.tsx`
- `frontend/src/modules/compras/pages/CompraDetalhe.tsx`

### Rotas Backend

CONFIRMADO:

- `/api/compras`
  - leitura autenticada com `requireLeitura('compras')`: estatisticas, produtos disponiveis, jobs, lista, detalhe, resumo por tipo de fornecedor e produtos de contrato.
  - escrita autenticada com `requireEscrita('compras')`: criar, validar/gerar da guia, iniciar geracao assíncrona, atualizar, alterar status, excluir.
  - programacao de entrega por item: listar/salvar programacoes e mesclar itens.
- `/api/planejamento-compras`
  - autenticado.
  - calcula demanda por competencia.
  - gera guias.
  - gera pedido da guia.
  - oferece versoes síncronas e assíncronas.
  - lista/busca jobs do usuario.

### Entidades Principais

Resumo; ver `_reversa_sdd/data-dictionary.md`.

- `Pedido`
- `PedidoItem`
- `Periodo`
- `ProdutoDemanda`
- `ConversaoCompra`
- `ProgramacaoEntrega`
- `ProgramacaoEscola`
- `Job`

### Funcoes Principais - Compra/Pedido

CONFIRMADO:

- `listarCompras`: lista pedidos com filtros por status, contrato, escola, periodo e paginacao; agrega totais de itens/quantidade.
- `buscarCompra`: retorna pedido detalhado com itens, contrato, fornecedor, escola, unidade, saldo e valores.
- `criarCompra`: transacao que valida usuario, itens, contratos ativos, quantidades e calcula `valor_total` antes de inserir pedido e itens.
- `atualizarCompra`: transacao que permite edicao em qualquer status, recalcula itens e valor total.
- `atualizarStatusCompra`: valida status contra lista permitida e registra motivo como observacao quando enviado.
- `excluirCompra`: transacao que remove pedido e dependencias permitidas.
- `obterEstatisticasCompras`: agrega contagens por status e valores.
- `listarProdutosContrato` e `listarTodosProdutosDisponiveis`: listam produtos com contrato ativo e saldo/quantidade disponivel.
- `resumoTipoFornecedorCompra`: agrega compra por tipo de fornecedor.

### Status de Compra

CONFIRMADO no controller atual:

- `pendente`
- `recebido_parcial`
- `concluido`
- `suspenso`
- `cancelado`

LACUNA: `models/Compra.ts` declara status adicionais/historicos (`rascunho`, `aprovado`, `em_separacao`, `enviado`, `entregue`), enquanto `compraController.ts` usa conjunto operacional diferente. Precisa validar status canonical.

### Algoritmo de Criacao de Compra

CONFIRMADO:

1. Abre transacao.
2. Valida usuario autenticado.
3. Gera numero do pedido quando necessario.
4. Para cada item:
   - busca `contrato_produtos`;
   - valida contrato/produto ativo;
   - valida quantidade positiva;
   - acumula `valor_total += quantidade * preco_unitario`.
5. Insere pedido com status inicial `pendente`.
6. Insere itens com preco unitario e valor total calculado.
7. Faz commit.
8. Publica evento realtime de compra alterada.
9. Em erro, rollback.

### Planejamento e Geracao por Guia

CONFIRMADO:

- `CompraGenerationService` e um facade fino sobre `PlanejamentoComprasService`.
- `validarCompraDaGuia` chama `PlanejamentoComprasService.gerarPedidoDaGuia`.
- `iniciarGeracaoCompraDaGuia` chama `PlanejamentoComprasService.iniciarGeracaoPedido`.
- `PlanejamentoComprasService` tambem gera guias de demanda e pedidos por periodo.
- Operacoes pesadas podem rodar por `JobService`.

### Algoritmos de Conversao de Demanda

CONFIRMADO:

- `normalizarCompetencia(valor)` aceita formato `YYYY-M` ou `YYYY-MM`, valida mes de 1 a 12 e retorna competencia normalizada.
- `converterDemandaParaCompra(quantidade_demanda, produto)` simplifica a regra: demanda = compra na unidade de distribuicao.
- Se unidade for kg/quilograma/kilo, quantidade em kg e distribuicao sao iguais.
- Se unidade nao for kg, quantidade distribuicao e a demanda; se houver peso em gramas, calcula kg como `quantidade_distribuicao * peso_distribuicao_g / 1000`.
- `quantidade_compra` usa `Math.ceil(quantidade_distribuicao)`.
- `converterParaEmbalagem(quantidade_kg, peso_embalagem_g)` converte kg para gramas e arredonda embalagens para cima.

### Programacao de Entrega

CONFIRMADO:

- `listarProgramacoes`: retorna programacoes do item com escolas e quantidade total agregada.
- `salvarProgramacoes`: transacao que remove/recria programacoes, insere escolas com quantidade positiva, recalcula quantidade do item, recalcula valor do item e recalcula valor total do pedido.
- `mesclarItens`: exige ao menos dois itens, valida mesmo produto e pedido, agrega quantidades por escola, cria programacao consolidada, recalcula quantidade/valor do item destino e total do pedido.

### Realtime

CONFIRMADO:

- Compras publicam eventos no dominio `compras`.
- Planejamento publica eventos para `guias` e `compras`.
- Programacao de compra publica evento de alteracao com pedido e item.

### Frontend

CONFIRMADO:

- `Compras.tsx`: tela de lista/acompanhamento.
- `CompraForm.tsx`: tela de criacao/edicao.
- `CompraDetalhe.tsx`: tela de detalhe, itens e operacoes associadas.
- `pedidos.ts`: cliente CRUD de compras com `apiWithRetry`.
- `planejamentoCompras.ts`: cliente para calculo de demanda, geracao de guias, pedidos, jobs e pedido da guia.
- `programacaoEntrega.ts`: cliente para listar/salvar programacoes de item.

### Lacunas

- LACUNA: ha dois caminhos de geracao de pedido da guia (`/api/compras/gerar-da-guia` e `/api/planejamento-compras/gerar-pedido-da-guia`) que convergem para servicos similares; confirmar qual e a rota preferida.
- LACUNA: o status canonical de pedido precisa ser reconciliado entre model antigo, controller atual e UI.
- LACUNA: o arquivo `PlanejamentoComprasService.ts` e extenso e concentra regras de demanda, guias, pedidos e jobs; uma escavacao posterior pode separar subfluxos em specs proprias.

## Modulo: contratos

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/contratos`.
- Frontend: `frontend/src/modules/contratos` e `frontend/src/modules/fornecedores`.
- Servicos frontend: `frontend/src/services/contratos.ts`, `frontend/src/services/fornecedores.ts`, `frontend/src/services/saldoContratosModalidadesService.ts`.
- Tipo: modulo full-stack de contratos, fornecedores, produtos contratados e saldo por modalidade.

### Proposito

CONFIRMADO: o modulo cadastra fornecedores, contratos e produtos contratados, controla disponibilidade por contrato/produto, bloqueia exclusoes inseguras e permite distribuir/consumir saldos por modalidade/categoria financeira.

### Arquivos Primarios

- `backend/src/modules/contratos/controllers/contratoController.ts`
- `backend/src/modules/contratos/controllers/contratoProdutoController.ts`
- `backend/src/modules/contratos/controllers/fornecedorController.ts`
- `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts`
- `backend/src/modules/contratos/models/Contrato.ts`
- `backend/src/modules/contratos/models/ContratoProduto.ts`
- `backend/src/modules/contratos/models/Fornecedor.ts`
- `backend/src/modules/contratos/routes/contratoRoutes.ts`
- `backend/src/modules/contratos/routes/contratoProdutoRoutes.ts`
- `backend/src/modules/contratos/routes/fornecedorRoutes.ts`
- `backend/src/modules/contratos/routes/saldoContratosModalidadesRoutes.ts`
- `frontend/src/modules/contratos/pages/Contratos.tsx`
- `frontend/src/modules/contratos/pages/NovoContrato.tsx`
- `frontend/src/modules/contratos/pages/ContratoDetalhe.tsx`
- `frontend/src/modules/contratos/pages/SaldoContratosModalidades.tsx`
- `frontend/src/modules/fornecedores/pages/Fornecedores.tsx`
- `frontend/src/modules/fornecedores/pages/FornecedorDetalhe.tsx`
- `frontend/src/modules/fornecedores/pages/ItensFornecedor.tsx`

### Rotas Backend

CONFIRMADO:

- `/api/contratos`
  - autenticado em todas as rotas;
  - leitura: estatisticas, busca por produto, lista e detalhe;
  - escrita: criar, editar e remover com `requireEscrita('contratos')`.
- `/api/contrato-produtos`
  - gerencia produtos associados aos contratos.
- `/api/fornecedores`
  - lista/busca/cria/edita/remove fornecedores e verifica relacionamentos.
- `/api/saldo-contratos-modalidades`
  - lista saldos, cadastra/atualiza saldo por modalidade, lista modalidades, produtos de contratos, resumo de alunos, consumo e historico.

### Entidades Principais

Resumo; ver `_reversa_sdd/data-dictionary.md`.

- `Contrato`
- `ContratoProduto`
- `Fornecedor`
- `SaldoContratoModalidade`
- `HistoricoConsumoModalidade`

### Funcoes Principais - Contratos

CONFIRMADO:

- `listarContratos`: agrega fornecedor, valor calculado por produtos ativos e nomes dos produtos.
- `buscarContrato`: busca contrato por id.
- `criarContrato`: insere contrato com numero, fornecedor, datas, valor, status e ativo.
- `editarContrato`: atualiza contrato completo e `updated_at`.
- `removerContrato`: bloqueia exclusao se houver produtos ativos associados; caso contrario apaga fisicamente.
- `obterEstatisticasContratos`: total, ativos, inativos e soma de valores.
- `buscarContratosPorProduto`: exige termo com pelo menos 2 caracteres e busca por produto associado.

### Regras de Contrato

CONFIRMADO:

- Contrato nao pode ser removido enquanto possuir `contrato_produtos` ativos.
- Busca por produto exige termo com minimo de 2 caracteres.
- Rotas de escrita de contrato exigem permissao `contratos`.
- Model legado contem operacoes de saldo financeiro (`reservarSaldo`, `liberarSaldo`, `verificarDisponibilidade`) baseadas em `saldo_disponivel`.

### Funcoes Principais - Produtos Contratados

CONFIRMADO:

- `listarContratoProdutos`: lista todos os itens contratados com produto, unidade e contrato.
- `listarProdutosPorContrato`: lista produtos de um contrato e calcula saldo como `quantidade_contratada - SUM(pedido_itens.quantidade)`.
- `listarProdutosPorFornecedor`: lista produtos ativos dos contratos do fornecedor.
- `criarContratoProduto`: exige contrato, produto, preco unitario e quantidade; valida existencia de contrato e produto; bloqueia duplicidade de produto no mesmo contrato.
- `editarContratoProduto`: atualiza dinamicamente preco, quantidade, marca e ativo.
- `removerContratoProduto`: bloqueia exclusao se o item estiver sendo usado em `pedido_itens`.

### Regras de Produto Contratado

CONFIRMADO:

- Peso e unidade vem do cadastro de produto, nao do contrato.
- Um produto nao pode ser adicionado duas vezes ao mesmo contrato.
- Item contratado usado em pedidos nao pode ser removido.
- Saldo de item por contrato considera consumo em `pedido_itens`.

### Funcoes Principais - Fornecedores

CONFIRMADO:

- `listarFornecedores`: usa cache e retorna tipo de fornecedor.
- `buscarFornecedor`: usa cache e inclui endereco, tipo, datas.
- `criarFornecedor`: cria fornecedor com `tipo_fornecedor` default `CONVENCIONAL`, DAP/CAF e validade opcionais.
- `editarFornecedor`: atualiza dados principais e invalida cache.
- `removerFornecedor`: delete fisico.
- `verificarRelacionamentosFornecedor`: calcula contratos ativos, total de contratos e retorna se pode excluir (`contratosAtivos === 0`).

### Saldo por Modalidade

CONFIRMADO:

- `listarSaldosModalidades` pagina por produtos unicos, depois cruza produtos de contratos com todas as modalidades ativas (`CROSS JOIN modalidades`).
- Cada linha calcula quantidade inicial, consumida, disponivel e valor disponivel por modalidade.
- Filtros: status (`disponivel`, `esgotado`, `baixo_estoque`), numero do contrato, produto, fornecedor e modalidade.
- Estatisticas agregam total de itens, disponiveis, baixo estoque, esgotados, quantidades e valor total disponivel.
- `cadastrarSaldoModalidade` faz upsert manual: se existe atualiza quantidade inicial e recalcula disponivel como `quantidade_inicial - quantidade_consumida`; se nao existe cria com consumida 0.
- `registrarConsumoModalidade` valida quantidade positiva, existencia do saldo e disponibilidade suficiente; incrementa `quantidade_consumida` e registra historico.
- `excluirConsumoModalidade` reverte consumo decrementando `quantidade_consumida` e remove historico.

### Algoritmo de Consumo de Saldo por Modalidade

CONFIRMADO:

1. Valida `quantidade > 0`.
2. Busca saldo em `contrato_produtos_modalidades`.
3. Retorna 404 se nao existir.
4. Compara `quantidade_disponivel` com a quantidade solicitada.
5. Se insuficiente, retorna 400 com quantidade disponivel.
6. Soma quantidade ao campo `quantidade_consumida`.
7. Busca valores atualizados.
8. Cria tabela de historico se necessario.
9. Insere historico de consumo.
10. Retorna quantidade consumida/disponivel atualizada.

### Frontend

CONFIRMADO:

- `Contratos.tsx`: listagem e acompanhamento.
- `NovoContrato.tsx`: cadastro/edicao.
- `ContratoDetalhe.tsx`: detalhes do contrato e produtos.
- `SaldoContratosModalidades.tsx`: controle de saldos por modalidade.
- Telas de fornecedores fazem CRUD e consulta de itens por fornecedor.

### Lacunas

- LACUNA: ha diferenca entre model `Contrato` com `saldo_disponivel` e controller atual que calcula valores por produtos; validar se saldo financeiro ainda e usado.
- LACUNA: `removerFornecedor` faz delete fisico, mas existe `verificarRelacionamentosFornecedor`; confirmar se UI sempre chama verificacao antes de excluir.
- LACUNA: `registrarConsumoModalidade` cria tabela de historico em runtime; validar se isso deveria estar em migration.

## Modulo: demandas

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/demandas`.
- Frontend: `frontend/src/modules/demandas`.
- Servicos frontend: `frontend/src/services/demandas.ts`, `frontend/src/services/demanda.ts`, `frontend/src/services/guiaDemandaGenerationService.ts`, `frontend/src/services/guiaService.ts`, `frontend/src/services/itemGuiaService.ts`.
- Tipo: modulo de demandas formais e operacao de guias de demanda.

### Proposito

CONFIRMADO: o backend `demandas` gerencia registros formais de demandas escolares/oficios. No frontend, o mesmo dominio operacional tambem inclui telas de guias de demanda, geracao assíncrona de guias e ajustes em massa dos itens por produto/escola.

### Arquivos Primarios

- `backend/src/modules/demandas/models/demandaModel.ts`
- `backend/src/modules/demandas/controllers/demandaController.ts`
- `backend/src/modules/demandas/routes/demandaRoutes.ts`
- `frontend/src/modules/demandas/pages/DemandasLista.tsx`
- `frontend/src/modules/demandas/pages/GuiasDemandaLista.tsx`
- `frontend/src/modules/demandas/pages/GuiaDemandaDetalhe.tsx`
- `frontend/src/modules/demandas/pages/GuiaDemandaProdutoItens.tsx`
- `frontend/src/modules/demandas/pages/GuiaDemandaEscolaItens.tsx`
- `frontend/src/modules/demandas/pages/GuiaDemandaAdicionarProduto.tsx`
- `frontend/src/modules/demandas/utils/guiaProdutoAjuste.ts`

### Rotas Backend

CONFIRMADO:

- Todas as rotas de `/api/demandas` usam `authenticateToken`.
- `GET /solicitantes`: lista solicitantes agregados por escola.
- `GET /cardapios-disponiveis`: lista cardapios ativos por competencia ou periodo do usuario.
- `POST /`: cria demanda.
- `GET /`: lista demandas com filtros.
- `GET /:id`: busca demanda.
- `PUT /:id`: atualiza demanda.
- `DELETE /:id`: exclui demanda.
- `PATCH /:id/status`: atualiza status.

### Entidade `Demanda`

CONFIRMADO:

- Tabela fixa: `demandas_escolas`.
- Campos principais: escola, numero de oficio, data de solicitacao, data SEMEAD, objeto, descricao dos itens, resposta SEMEAD, status, observacoes, usuario criador.
- Status permitidos pelo tipo: `pendente`, `enviado_semead`, `atendido`, `nao_atendido`.

### Calculo de Dias de Solicitacao

CONFIRMADO: `dias_solicitacao` e calculado no SQL:

- se `data_semead` for nula: `NULL`;
- se `data_resposta_semead` existir: diferenca entre resposta e `data_semead`;
- caso contrario: diferenca entre `CURRENT_DATE` e `data_semead`.

Esse calculo aparece em criar, listar, buscar, atualizar e atualizar status.

### Listagem e Filtros

CONFIRMADO:

- Filtros aceitos: `escola_id`, `escola_nome`, `objeto`, `status`, `data_inicio`, `data_fim`.
- Busca textual usa `ILIKE` para `escola_nome` e `objeto`.
- Ordenacao backend por `created_at DESC`.
- Frontend `DemandasLista` tambem aplica filtros, ordenacao, paginacao e navegacao por teclado localmente.

### Cardapios Disponiveis para Geracao

CONFIRMADO:

- Se `mes` e `ano` forem enviados, filtra `cardapios_modalidade` por competencia.
- Se nao houver competencia, usa `obterPeriodoUsuario(userId)` e filtra por `periodo_id`.
- Retorna id, nome, mes, ano, modalidades concatenadas e total de refeicoes.

### Guias de Demanda no Frontend

CONFIRMADO:

- `GuiasDemandaLista` lista competencias via `guiaService.listarCompetencias`.
- Gera guias por `iniciarGeracaoGuiaDemanda`, chamando `/guias/geracao-demanda/async`.
- Exige selecao de ao menos um cardapio para gerar guia.
- Usa job progress para acompanhar geracao assíncrona.
- Permite selecionar todos os cardapios disponiveis da competencia.

### Ajuste de Itens de Guia

CONFIRMADO em `guiaProdutoAjuste.ts`:

- `normalizeDateKey`: normaliza data removendo parte `T`.
- `roundByMultiple`: arredonda para 3 casas se nao houver multiplo; se houver multiplo, arredonda para o multiplo mais proximo.
- `applyBulkQuantityAdjustment`: aplica ajuste em linhas selecionadas nos modos:
  - `set`: substitui quantidade;
  - `add`: soma valor;
  - `percent`: aplica percentual.
- Quantidade resultante nunca fica negativa (`Math.max(0, ...)`).
- `summarizeQuantityChange`: soma antes/depois e diff.
- `buildChangedItemUpdates`: compara linhas atuais com originais e produz payloads apenas para campos alterados (`quantidade`, `unidade`, `data_entrega`).

### Regras de Negocio

CONFIRMADO:

- Demandas formais exigem autenticacao.
- Status de demanda e atualizado separadamente por endpoint dedicado.
- Guia de demanda pode ser gerada a partir de cardapios selecionados, competencia e periodos.
- Ajustes em lote de guia preservam somente alteracoes reais no payload enviado ao backend.
- Ajustes percentuais e aditivos nao permitem quantidade final negativa.

### Dependencias

CONFIRMADO:

- `cardapios`: cardapios disponiveis para geracao.
- `guias`: competencias, itens, produtos e status de escolas.
- `planejamento-compras`/geracao de guia: operacao assíncrona.
- `escolas`: demandas formais e filtros/listagens.
- `unidades`: edicao de unidade em itens de guia.

### Lacunas

- LACUNA: o modulo frontend `demandas` cobre guias de demanda, mas o backend de guias vive em `backend/src/modules/guias`; a fronteira real sera detalhada no modulo `guias`.
- LACUNA: `demandasService.atualizarStatus` envia `data_resposta_semead` e `observacoes`, mas o controller de status usa apenas `status`; validar se esses campos deveriam ser persistidos nessa rota.
- LACUNA: `demanda.ts` esta deprecated e apenas reexporta `demandas.ts`; pode ser legado de compatibilidade.

## Modulo: entregas

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/entregas`.
- Frontend web: `frontend/src/modules/entregas`.
- App mobile: `apps/entregador-native`.
- Tipo: modulo operacional de rotas, entrega parcial/total, comprovantes, evidencias e sincronizacao offline.

### Proposito

CONFIRMADO: o modulo coordena a execucao de entregas a escolas a partir de itens de guias marcados `para_entrega`, controla rotas e planejamentos, registra historico de quantidades entregues, movimenta estoque, gera comprovantes e permite operacao offline no aplicativo do entregador.

### Arquivos Primarios

- `backend/src/modules/entregas/routes/entregaRoutes.ts`
- `backend/src/modules/entregas/routes/rotaRoutes.ts`
- `backend/src/modules/entregas/models/Entrega.ts`
- `backend/src/modules/entregas/models/HistoricoEntrega.ts`
- `backend/src/modules/entregas/models/ComprovanteEntrega.ts`
- `backend/src/modules/entregas/models/ComprovanteFoto.ts`
- `backend/src/modules/entregas/models/Rota.ts`
- `backend/src/modules/entregas/models/entregaIdempotency.ts`
- `backend/src/modules/entregas/services/deliveryPhotoPolicy.ts`
- `backend/src/modules/entregas/services/deliveryPhotoStorage.ts`
- `frontend/src/modules/entregas/pages/Entregas.tsx`
- `frontend/src/modules/entregas/pages/Romaneio.tsx`
- `frontend/src/modules/entregas/pages/ComprovantesEntrega.tsx`
- `frontend/src/modules/entregas/pages/ValidarComprovante.tsx`
- `apps/entregador-native/src/contexts/OfflineContext.tsx`
- `apps/entregador-native/src/services/deliveryOutboxCore.ts`
- `apps/entregador-native/src/services/deliveryRemoteChanges.ts`
- `apps/entregador-native/src/utils/qrFilter.ts`

### Rotas Backend

CONFIRMADO:

- `/entregas/*` em `entregaRoutes.ts` exige `authenticateToken` e permissao por `requireLeitura('entregas')` ou `requireEscrita('entregas')`.
- Leitura: escolas, estatisticas, bundle offline, mudancas incrementais, itens por escola, item individual, historico, saldo e comprovantes.
- Escrita: confirmar/cancelar item, deletar historico, criar/cancelar/excluir comprovante, cancelar item de comprovante, solicitar/confirmar foto.
- `/entregas/rotas/*` em `rotaRoutes.ts` usa `optionalAuth` para algumas leituras e `authenticateToken` para escrita.
- Rotas de planejamento cobrem CRUD, planejamento avancado, status por escola e evidencias.

### Entrega de Item

CONFIRMADO:

- A fonte operacional e `guia_produto_escola` filtrada por `para_entrega = true` e guia `status = 'aberta'`.
- `listarEscolasComEntregas`, `listarItensEntregaPorEscola` e `obterEstatisticasEntregas` aceitam filtros de guia, rota, data unica, intervalo e somente pendentes.
- `confirmarEntrega` valida quantidade, entregador, recebedor, assinatura e GPS no controller.
- No model, a confirmacao roda em transacao, bloqueia a linha (`FOR UPDATE`), valida `para_entrega`, saldo pendente e idempotencia por `client_operation_id`.
- A confirmacao registra transferencia de estoque central para escola via `estoqueLedgerService.registrarTransferenciaParaEscolaWithClient`.
- Depois cria `historico_entregas`; `HistoricoEntregaModel.criar` recalcula `quantidade_total_entregue`, `entrega_confirmada` e status (`entregue`/`parcial`).
- O controller publica eventos realtime para `entregas` e `estoque_escolar`.

### Idempotencia Offline

CONFIRMADO:

- `client_operation_id` e normalizado, limitado a 100 caracteres e gravado em `historico_entregas`.
- `buildEntregaIdempotencySchemaSql` adiciona a coluna e um indice unico parcial quando a tabela existe.
- Antes de confirmar, o backend toma `pg_advisory_xact_lock(hashtext(client_operation_id))`.
- Se uma operacao com o mesmo id ja existe no mesmo item, retorna o item atualizado e o `historico_id` existente.
- Se o id foi usado em outro item, retorna erro de negocio.

### Cancelamento de Entrega

CONFIRMADO:

- `cancelarEntrega` bloqueia o item, soma o historico entregue e exige quantidade entregue maior que zero.
- Verifica saldo escolar suficiente antes do estorno.
- Registra dois eventos no ledger: decrementa estoque da escola e devolve estoque ao escopo central.
- Remove registros de `historico_entregas` do item e restaura `guia_produto_escola` para pendente, zerando campos de entrega.

### Comprovantes e Fotos

CONFIRMADO:

- `ComprovanteEntregaModel.criar` gera `numero_comprovante` via funcao SQL `gerar_numero_comprovante()`, insere `comprovantes_entrega` e itens em `comprovante_itens`.
- Busca/listagem usa `vw_comprovantes_completos`.
- Cancelamento simples marca `status = 'cancelado'`; exclusao remove itens, cancelamentos e comprovante.
- Foto de comprovante aceita somente JPEG, tamanho maximo default 5 MB e retencao default 180 dias.
- Upload de foto usa chave `entregas/comprovantes/{comprovanteId}/{uuid}.jpg`, URL assinada de escrita e confirmacao por `storage_key`.
- Leitura da foto exige status `uploaded` e `expires_at > NOW()`, retornando URL assinada de leitura.

### Rotas e Planejamentos

CONFIRMADO:

- `RotaModel.ensureRotasSchema` cria em runtime tabelas de rotas, escolas por rota, planejamentos e status/evidencias.
- Uma escola nao pode estar em duas rotas ativas simultaneamente; `adicionarEscolaRota` verifica qualquer associacao existente.
- Planejamento vincula `guia_id` e `rota_id`, com status `planejado`, `em_andamento`, `concluido` ou `cancelado`.
- Status por escola do planejamento aceita `pendente`, `entregue` e `nao_entregue`, com observacao, foto e assinatura.
- Evidencias podem usar S3 quando variaveis AWS estao configuradas; caso contrario pode persistir data URL/base64.

### App Offline do Entregador

CONFIRMADO:

- O app baixa `offline-bundle` com rotas, escolas por rota e itens por escola.
- Operacoes offline entram em outbox com `client_operation_id` derivado da operacao.
- Estados da outbox: `pending`, `syncing`, `failed_retryable`, `failed_needs_action`, `comprovante_pending`, `foto_pending`, `synced`.
- Sincronizacao executa em fases: confirma entregas, cria comprovantes agrupados, envia foto do comprovante e aplica mudancas remotas.
- Erros HTTP 408, 429, 5xx, erros recuperaveis de saldo/infra e operacoes `syncing` antigas voltam para retry.
- `syncRemoteDeliveryChanges` usa cursor `delivery_sync_cursor` e mergeia alteracoes remotas no cache por escola.
- Projecoes locais recalculam itens pendentes por escola/rota para navegacao offline.

### QR e Romaneio

CONFIRMADO:

- Web `Romaneio` gera payload compacto de QR (`t`, `r`, `di`, `df`, `s`, `rn`, `rns`) via `buildRomaneioQrPayload`.
- App mobile normaliza QR legado e compacto em `normalizeQrFilter`, aceitando todas as rotas (`*`/`todas`) ou lista de rotas.
- Romaneio consulta `/guias/romaneio`, filtrando por data, rota unica ou multiplas rotas.

### Regras de Negocio

CONFIRMADO:

- Entrega nao pode exceder saldo pendente do item.
- Entrega parcial permanece com status `parcial`; somente soma entregue maior ou igual a quantidade programada marca `entregue`.
- Confirmacao de entrega cria movimento de estoque; cancelamento estorna estoque.
- Comprovante exige ao menos um item e dados de escola, entregador e recebedor.
- Uma foto de comprovante enviada nao pode ser substituida por novo upload pendente.
- Escola pertence a no maximo uma rota no cadastro operacional.

### Dependencias

CONFIRMADO:

- `guias`: itens de `guia_produto_escola`, status de guias, romaneio.
- `estoque`: ledger de movimentacao central/escola.
- `escolas`: escolas de rota, comprovantes e entregas.
- `produtos`: nomes, unidades e produto_id.
- `usuarios`: permissao/autenticacao e autor de cancelamento.
- `Supabase Storage`: armazenamento assinado de fotos de comprovante.
- `AWS S3`: evidencias antigas/planejamento quando configurado.

### Lacunas

- LACUNA: `RotaModel.ensureRotasSchema` cria/ altera tabelas em runtime; validar se esse schema deveria estar consolidado em migrations.
- LACUNA: `ComprovanteEntregaModel.cancelarItemEntrega` atualiza `guia_produto_escola` usando `historicoEntregaId` como `id`, apesar do nome indicar `historico_entrega_id`; validar integridade desse cancelamento.
- LACUNA: `rotaRoutes.ts` permite algumas leituras com `optionalAuth` e algumas rotas sem middleware explicito; confirmar se e intencional para app/romaneio.
- LACUNA: ha dois mecanismos de foto/evidencia: Supabase Storage para foto de comprovante e S3/base64 para evidencia de planejamento; validar fronteira e retencao.

## Modulo: escolas

### Identificacao

- Status: CONFIRMADO.
- Backend principal: `backend/src/modules/escolas`.
- Backend vinculado: `backend/src/modules/guias/routes/escolaModalidadeRoutes.ts`, `backend/src/modules/guias/controllers/escolaModalidadeController.ts`.
- Frontend: `frontend/src/modules/escolas`, `frontend/src/services/escolas.ts`.
- Tipo: cadastro de escolas, portal da escola e gestao de alunos por modalidade.

### Proposito

CONFIRMADO: o modulo administra escolas, dados cadastrais e vinculos com modalidades/quantidade de alunos. Tambem oferece portal autenticado para usuarios associados a uma escola visualizarem dashboard, guias, cardapios semanais e comprovantes.

### Arquivos Primarios

- `backend/src/modules/escolas/routes/escolaRoutes.ts`
- `backend/src/modules/escolas/controllers/escolaController.ts`
- `backend/src/modules/escolas/controllers/escolaPortalController.ts`
- `backend/src/modules/escolas/routes/escolaPortalRoutes.ts`
- `backend/src/modules/escolas/models/Escola.ts`
- `backend/src/modules/guias/controllers/escolaModalidadeController.ts`
- `backend/src/modules/guias/services/escolaModalidadeHistoricoService.ts`
- `frontend/src/services/escolas.ts`
- `frontend/src/modules/escolas/pages/Escolas.tsx`
- `frontend/src/modules/escolas/pages/EscolaDetalhes.tsx`
- `frontend/src/modules/escolas/pages/GerenciarAlunosModalidades.tsx`
- `frontend/src/modules/escolas/pages/RelatorioAlunosModalidades.tsx`
- `frontend/src/modules/escolas/pages/PortalEscola.tsx`

### Rotas Backend

CONFIRMADO:

- `/api/escolas` exige `authenticateToken`.
- `GET /api/escolas`: lista escolas com total de alunos e modalidades agregadas.
- `GET /api/escolas/:id`: busca escola por id.
- `POST /api/escolas`, `PUT /api/escolas/:id`, `DELETE /api/escolas/:id`: exigem `requireEscrita('escolas')`.
- `/api/escola-portal/*` exige `authenticateToken` e usa `req.user.escola_id`.
- `/api/escola-modalidades` centraliza vinculos escola-modalidade; leituras nao aplicam middleware no arquivo de rota, escritas exigem `authenticateToken`.

### Cadastro de Escolas

CONFIRMADO:

- `listarEscolas` usa cache `escolas:list:all` e retorna `{ success, data, total }`.
- A listagem agrega `total_alunos` por `SUM(escola_modalidades.quantidade_alunos)` e `modalidades` por `STRING_AGG`.
- Campos atuais do controller: `nome`, `codigo`, `endereco`, `municipio`, `endereco_maps`, `telefone`, `email`, `nome_gestor`, `administracao`, `ativo`.
- Criar/editar invalidam cache da entidade `escolas`.
- `removerEscola` faz `DELETE FROM escolas`, nao soft delete.

### Modelo Legado `EscolaModel`

CONFIRMADO:

- `backend/src/modules/escolas/models/Escola.ts` define uma classe com campos `diretor`, `codigo_inep`, `ativa` e `escolas_modalidades`.
- O controller atual usa queries diretas e tabela `escola_modalidades`.
- O model legado usa `escolas_modalidades` e soft delete `ativa = false`.

### Escola-Modalidade e Historico de Alunos

CONFIRMADO:

- `listarEscolaModalidades` retorna vinculos com `escola_nome` e `modalidade_nome`.
- `criarEscolaModalidade` opera como upsert manual por `(escola_id, modalidade_id)`.
- Quantidade zero remove o vinculo existente e registra historico com operacao `delete`.
- Atualizacao com mesma quantidade retorna sem registrar novo historico.
- Mudancas reais registram `escola_modalidades_historico` com quantidade anterior, quantidade nova, operacao, vigencia, observacao e usuario.
- `invalidarCachesAlunos` invalida caches de escolas, modalidades e `dashboard:stats`.
- Relatorio de alunos por modalidade usa historico: cria snapshot inicial quando necessario, seleciona a ultima versao por escola/modalidade ate `data_referencia` e agrega por escola, por modalidade e total geral.

### Portal da Escola

CONFIRMADO:

- Todas as rotas do portal exigem usuario autenticado com `escola_id`.
- Dashboard retorna dados da escola, modalidades, total de alunos e estatisticas de guias/produtos/pendentes/entregues.
- Guias do portal agrupam itens de `guia_produto_escola` por guia da escola.
- Itens de guia retornam produtos e unidade.
- Cardapios da semana usam modalidades da escola, semana segunda-domingo e tabela `cardapio_modalidades`.
- Comprovantes listam e detalham `comprovantes_entrega` e `comprovante_itens` restritos a `user.escola_id`.

### Frontend

CONFIRMADO:

- `Escolas.tsx` usa React Query (`useEscolas`, `useCriarEscola`, `useExcluirEscola`) e importacao/exportacao com XLSX.
- `frontend/src/services/escolas.ts` mantem cache local de listagem por 60 segundos e deduplica requisicoes simultaneas.
- `EscolaDetalhes.tsx` carrega escola, modalidades e associacoes; permite editar cadastro e adicionar/remover/alterar quantidade de alunos por modalidade.
- `GerenciarAlunosModalidades.tsx` edita matriz escola x modalidade e chama `adicionarEscolaModalidade`, `editarEscolaModalidade` ou `removerEscolaModalidade`.
- `PortalEscola.tsx` consome `/escola-portal/dashboard`, `/cardapios-semana` e `/comprovantes`, alem de gerar PDFs de comprovantes/cardapios.

### Regras de Negocio

CONFIRMADO:

- Usuario do portal precisa estar associado a uma escola.
- Quantidade de alunos por modalidade deve ser numero valido e nao negativo.
- Quantidade zero em escola-modalidade remove o vinculo.
- Historico de alunos preserva vigencia e permite relatorio retroativo por data.
- Relatorio considera apenas linhas com quantidade maior que zero e, por padrao, escolas ativas.

### Dependencias

CONFIRMADO:

- `modalidades`: vinculos, nomes e relatorios de alunos.
- `guias`: portal da escola, itens e estatisticas.
- `cardapios`: cardapios semanais por modalidade.
- `entregas`: comprovantes de entrega no portal.
- `usuarios`: autenticacao e `escola_id` do usuario.
- `cacheService`: cache de listagem e invalidacao.

### Lacunas

- LACUNA: ha divergencia entre `escolaController`/frontend usando `ativo` e `EscolaModel` legado usando `ativa`, alem de tabelas `escola_modalidades` vs `escolas_modalidades`.
- LACUNA: `frontend/src/services/escolas.ts` chama `/escolas/importar-lote`, mas `escolaRoutes.ts` nao declara essa rota; verificar se ha rota registrada em outro lugar.
- LACUNA: leituras de `/api/escola-modalidades` nao exigem autenticacao no arquivo da rota, enquanto escritas exigem; validar se exposicao e intencional.
- LACUNA: `removerEscola` no controller faz delete fisico, enquanto `EscolaModel.excluir` faz soft delete; confirmar comportamento esperado para dados relacionados.

## Modulo: estoque

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/estoque`.
- Frontend web: `frontend/src/modules/estoque`, `frontend/src/services/estoqueCentralService.ts`, `frontend/src/services/estoqueEscolarService.ts`.
- App mobile: `apps/estoque-escolar-mobile`.
- Tipo: estoque central, estoque escolar, ledger de eventos, projecoes e operacao offline/gestor.

### Proposito

CONFIRMADO: o modulo controla saldo de estoque central e escolar por produto usando eventos imutaveis em `estoque_eventos`. Ele oferece entradas, saidas, ajustes, transferencias para escola, historico, alertas e dashboards, com app mobile para gestor escolar.

### Arquivos Primarios

- `backend/src/modules/estoque/routes/estoqueCentralRoutes.ts`
- `backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts`
- `backend/src/modules/estoque/controllers/EstoqueCentralController.ts`
- `backend/src/modules/estoque/controllers/estoqueEscolarController.ts`
- `backend/src/modules/estoque/services/estoqueLedgerService.ts`
- `backend/src/modules/estoque/services/estoqueProjectionService.ts`
- `backend/src/modules/estoque/services/estoqueSchemaService.ts`
- `backend/src/modules/estoque/services/estoqueIntegracaoService.ts`
- `backend/src/modules/estoque/models/EstoqueCentral.ts`
- `frontend/src/services/estoqueCentralService.ts`
- `frontend/src/services/estoqueEscolarService.ts`
- `frontend/src/modules/estoque/pages/EstoqueCentral.tsx`
- `frontend/src/modules/estoque/pages/EstoqueEscolar.tsx`
- `frontend/src/modules/estoque/pages/EstoqueEscolaPortal.tsx`
- `apps/estoque-escolar-mobile/src/services/api.ts`
- `apps/estoque-escolar-mobile/src/hooks/useEstoque.ts`
- `apps/estoque-escolar-mobile/src/hooks/useSyncManager.ts`

### Schema e Fonte de Verdade

CONFIRMADO:

- `ensureEstoqueLedgerSchema` roda na inicializacao e cria `estoque_eventos`, `estoque_operacao_escola`, indices e views `vw_estoque_saldo_escola`/`vw_estoque_saldo_central`.
- `estoque_eventos` registra `escopo` (`central` ou `escola`), escola opcional, produto, lote opcional, tipo, origem, delta, quantidade absoluta, referencia e usuario.
- Saldo atual e soma de `quantidade_delta`.
- Ajuste de estoque e representado como evento com `quantidade_absoluta`; o delta gravado e calculado como `quantidade_absoluta - saldoAtual`.

### Estoque Central

CONFIRMADO:

- Todas as rotas de `/api/estoque-central` exigem `authenticateToken`.
- Leitura exige `requireLeitura('estoque')`; escrita exige `requireEscrita('estoque')`.
- `listar` consulta `estoqueProjectionService.listarSaldoCentral`, com opcao de incluir zerados.
- Se a projecao por ledger falhar por relacao ausente, usa fallback legado em `EstoqueCentralModel`.
- Entradas gravam evento `recebimento_central`.
- Saidas gravam evento `saida_central` e validam que saldo nao fica negativo.
- Ajustes gravam evento `ajuste_estoque` com quantidade absoluta nao negativa.
- Transferencia para escola grava dois eventos atomicos: delta negativo no central e delta positivo na escola.
- Apos movimentos centrais, publica realtime `estoque_central`; transferencia tambem publica `estoque_escolar`.

### Estoque Escolar

CONFIRMADO:

- `/api/estoque-escolar` usa `authenticateToken` e RBAC `estoque` no arquivo de rota.
- `listarEstoqueEscola` usa `estoqueProjectionService.listarSaldoEscolar` e retorna saldo por produto ativo.
- `buscarConfiguracaoOperacaoEscola` le `estoque_operacao_escola`; se ausente retorna default `hibrido`, ajustes permitidos e lancamento central permitido.
- `registrarMovimentacao` aceita `entrada`, `saida` e `ajuste`.
- Origem escolar e `portal_escola` somente quando `req.body.origem === 'portal_escola'`; caso contrario `central_operador`.
- Saida escolar valida saldo suficiente.
- Movimento escolar publica realtime `estoque_escolar` com quantidade posterior.

### Projecoes

CONFIRMADO:

- Projecao escolar lista todos os produtos ativos e agrega eventos de escopo escola por `escola_id`.
- Projecao central calcula:
  - `quantidade_total`: soma de eventos centrais;
  - `quantidade_reservada`: soma de itens de guias abertas pendentes/programadas/parciais;
  - `quantidade_disponivel`: total menos reservado.
- Timeline central/escola le `estoque_eventos`, junta produto/escola e tenta inferir escola destino em transferencias centrais por referencia ou proximidade temporal.

### Tipos de Evento

CONFIRMADO:

- `recebimento_central`
- `transferencia_para_escola`
- `entrada_manual_escola`
- `saida_central`
- `saida_escola`
- `ajuste_estoque`
- `estorno_evento`

### Lotes e Alertas

CONFIRMADO:

- O controller central ainda usa `EstoqueCentralModel` legado para lotes, vencimentos, estoque baixo e alertas.
- Alertas consolidados combinam lotes proximos do vencimento e produtos com estoque baixo/zerado.
- O service frontend tem funcoes para lotes/rastreabilidade/alertas, mas varias URLs nao aparecem nas rotas atuais de `estoqueCentralRoutes.ts`.

### App Mobile Estoque Escolar

CONFIRMADO:

- `apps/estoque-escolar-mobile` autentica gestor por escola/codigo de acesso e armazena token local.
- `ApiService.listarEstoqueEscola` consome endpoint legado `/api/estoque-escola/escola/:id`, adapta resposta e busca lotes por produto para calcular status de validade.
- O app calcula proximo vencimento, dias ate vencimento e flags de lote vencido/critico.
- Algumas operacoes CRUD de item e movimentacao simples sao simuladas localmente quando o backend de Vercel e tratado como somente leitura.
- `useSyncManager` implementa fila offline em AsyncStorage (`@sync_pending_items`) para entrada/saida/ajuste, com auto-sync, lotes, maximo de tentativas e remocao apos sucesso ou excesso de tentativas.

### Regras de Negocio

CONFIRMADO:

- Quantidade de entrada/saida deve ser maior que zero.
- Ajuste usa quantidade absoluta nao negativa.
- Saida central ou escolar nao pode deixar saldo negativo.
- Transferencia central -> escola valida saldo central, exceto quando `permitirSaldoNegativoCentral` e explicitamente verdadeiro.
- Entrega confirmada pode chamar transferencia com saldo central negativo permitido, criando evento escolar mesmo sem saldo central suficiente.
- Reservas do estoque central consideram guias abertas com itens para entrega pendentes, programados ou parciais.

### Dependencias

CONFIRMADO:

- `produtos`: base das projecoes.
- `unidades_medida`: unidade exibida.
- `escolas`: estoque escolar e destino de transferencia.
- `guias`/`guia_produto_escola`: reservas do central e transferencias por entrega.
- `entregas`: confirmacao de entrega movimenta estoque.
- `recebimentos`: eventos de recebimento central.
- `usuarios`: usuario do evento e permissao.
- `realtimeEvents`: atualizacao de telas.

### Lacunas

- LACUNA: ha divergencia entre rotas web atuais (`/api/estoque-escolar`, `/api/estoque-central`) e app mobile legado (`/api/estoque-escola`, `/api/estoque-moderno`, `/api/gestor-escola`).
- LACUNA: `estoqueCentralService.ts` referencia endpoints de lotes/rastreabilidade/saidas/alertas resolver que nao aparecem em `estoqueCentralRoutes.ts`.
- CONFIRMADO: `estoqueEscolarRoutes.ts` foi alinhado ao estoque central e usa JWT + RBAC no modulo `estoque`.
- LACUNA: lotes e alertas ainda dependem de `EstoqueCentralModel` legado, enquanto saldo e timeline usam ledger.
- LACUNA: app mobile simula parte do CRUD/movimentacao quando backend e somente leitura; validar se esse comportamento ainda deve existir.

## Modulo: faturamento

### Identificacao

- Status: CONFIRMADO.
- Backend canonico: `backend/src/modules/faturamentos`.
- Frontend: `frontend/src/modules/faturamento`.
- Servicos frontend: `frontend/src/services/faturamento.ts`, `frontend/src/services/faturamentos.ts`.
- Tipo: faturamento de pedidos de compra por modalidade, contrato, fornecedor e item.

### Proposito

CONFIRMADO: o modulo cria e administra faturamentos vinculados a pedidos de compra, alocando quantidades de itens do pedido por modalidade e preco unitario. Tambem controla status de consumo dos itens faturados e gera resumos por modalidade, contrato, fornecedor e tipo de fornecedor.

### Arquivos Primarios

- `backend/src/modules/faturamentos/routes/faturamentoRoutes.ts`
- `backend/src/modules/faturamentos/controllers/faturamentoController.ts`
- `frontend/src/services/faturamento.ts`
- `frontend/src/services/faturamentos.ts`
- `frontend/src/types/faturamento.ts`
- `frontend/src/modules/faturamento/pages/FaturamentosCompra.tsx`
- `frontend/src/modules/faturamento/pages/FaturamentoModalidades.tsx`
- `frontend/src/modules/faturamento/pages/FaturamentoDetalhe.tsx`
- `frontend/src/modules/faturamento/pages/RelatorioFaturamentoTipoFornecedor.tsx`

### Rotas Backend

CONFIRMADO:

- Todas as rotas de `/api/faturamentos` usam `authenticateToken`.
- Leituras exigem `requireLeitura('faturamentos')`.
- Escritas exigem `requireEscrita('faturamentos')`.
- `GET /pedido/:pedidoId`: lista detalhes de faturamentos do pedido.
- `GET /pedido/:pedidoId/resumo`: usa `vw_faturamentos_resumo_modalidades`.
- `GET /:faturamentoId/relatorio-tipo-fornecedor`: usa `vw_faturamento_tipo_fornecedor_modalidade`.
- `GET /:id/resumo`: retorna estrutura agrupada por contratos/modalidades/itens.
- `POST /`: cria faturamento.
- `PUT /:id`: substitui observacoes e itens do faturamento.
- `PATCH /:id/status`: atualiza status manualmente para `gerado`, `consumido` ou `cancelado`.
- `POST /:id/registrar-consumo`: marca todos os itens como consumidos.
- `POST /:id/itens/:itemId/registrar-consumo`: marca um item como consumido.
- `POST /:id/itens/:itemId/reverter-consumo`: reverte consumo de um item.
- `DELETE /:id/remover-modalidade`: remove itens de contrato/modalidade.
- `DELETE /:id`: exclui faturamento.

### Entidades e Tabelas

CONFIRMADO:

- Cabecalho: `faturamentos_pedidos`.
- Itens: `faturamentos_itens`.
- Cada item referencia `pedido_item_id`, `modalidade_id`, `quantidade_alocada` e `preco_unitario`.
- Detalhes juntam pedidos, pedido_itens, contrato_produtos, contratos, fornecedores, produtos, unidades, modalidades e categorias financeiras.
- `valor_total` e usado quando presente; caso contrario e calculado por `quantidade_alocada * preco_unitario`.

### Criacao de Faturamento

CONFIRMADO:

1. Exige usuario autenticado.
2. Exige `pedido_id`.
3. Exige array `itens`, mas permite array vazio.
4. Verifica se o pedido existe.
5. Para cada item, valida se pertence ao pedido.
6. Calcula disponivel como `pedido_itens.quantidade - SUM(faturamentos_itens.quantidade_alocada)`.
7. Rejeita quantidade alocada maior que disponivel.
8. Insere cabecalho em `faturamentos_pedidos`.
9. Insere itens em `faturamentos_itens`.
10. Nao altera status do pedido; ha verificacao pos-commit para avisar se status mudou indevidamente.

### Atualizacao de Faturamento

CONFIRMADO:

- Exige array `itens`, podendo ser vazio.
- Busca pedido vinculado pelo faturamento.
- Valida quantidades disponiveis excluindo o proprio faturamento (`fp.id != $3`).
- Atualiza observacoes.
- Remove todos os itens antigos do faturamento.
- Reinsere os itens enviados.

### Consumo e Status

CONFIRMADO:

- `atualizarStatusFaturamentoPorItens` conta total de itens e itens com `consumo_registrado = true`.
- Status fica `consumido` somente quando existe ao menos um item e todos os itens foram consumidos.
- Caso contrario status volta para `gerado`.
- Registrar consumo do faturamento marca todos os itens como consumidos e preenche `data_consumo` se nula.
- Registrar consumo de item marca um item especifico com `data_consumo = CURRENT_TIMESTAMP`.
- Reverter consumo de item limpa `consumo_registrado` e `data_consumo`.

### Resumos e Relatorios

CONFIRMADO:

- `obterResumoFaturamento` agrupa itens por contrato, depois modalidade, e acumula quantidade/valor.
- `relatorioTipoFornecedorModalidade` le view `vw_faturamento_tipo_fornecedor_modalidade`.
- `resumoFaturamentoPedido` le view `vw_faturamentos_resumo_modalidades`.
- Frontend `faturamentoService.buscarPorPedido` agrega linhas detalhadas em cabecalhos de faturamento por `faturamento_id`.

### Frontend

CONFIRMADO:

- `FaturamentosCompra.tsx` lista faturamentos de uma compra, agrupa linhas por `faturamento_id`, cria faturamento vazio e navega para edicao.
- `FaturamentoModalidades.tsx` edita alocacoes por modalidade, adiciona/remove itens e salva via `atualizarFaturamento`.
- `FaturamentoDetalhe.tsx` carrega resumo canonico, permite registrar/reverter consumo por item, remover modalidade e excluir faturamento.
- `RelatorioFaturamentoTipoFornecedor.tsx` exibe agrupamento por tipo de fornecedor/modalidade.
- Ha dois services: `faturamentos.ts` com funcoes procedurais e `faturamento.ts` como service canonico usado por telas mais novas.

### Regras de Negocio

CONFIRMADO:

- Faturamento pertence a um pedido.
- Faturamento pode ser criado vazio.
- Faturamento nao deve alterar status do pedido.
- Quantidade total alocada de um `pedido_item` entre faturamentos nao pode exceder a quantidade do pedido.
- Um faturamento so fica `consumido` quando todos os seus itens estao com consumo registrado.
- Remocao de modalidade remove itens filtrados por `contrato_id` e `modalidade_id`.

### Dependencias

CONFIRMADO:

- `compras`: pedidos e pedido_itens.
- `contratos`: contrato_produtos, contratos e fornecedores.
- `modalidades`: modalidade e categoria financeira.
- `produtos`: produto e unidade.
- `usuarios`: criador/usuario.

### Lacunas

- LACUNA: o backend esta no modulo plural `faturamentos`, enquanto frontend/rotas visuais usam `faturamento`; manter alias no plano.
- LACUNA: `faturamentoService.listar` chama `GET /faturamentos` com filtros, mas `faturamentoRoutes.ts` nao declara rota raiz GET.
- LACUNA: `faturamentoService.gerar` envia `itens: []`, ignorando possivel previa calculada; confirmar se criacao vazia seguida de edicao e o fluxo oficial.
- LACUNA: views `vw_faturamentos_resumo_modalidades` e `vw_faturamento_tipo_fornecedor_modalidade` nao foram localizadas ainda em migrations nesta fase; validar no modulo de dados.

## Modulo: faturamentos

### Identificacao

- Status: CONFIRMADO como alias/superficie canonica backend do dominio `faturamento`.
- Backend canonico: `backend/src/modules/faturamentos`.
- Rota API: `/api/faturamentos`.
- Frontend consumidor: `frontend/src/modules/faturamento`.

### Proposito

CONFIRMADO: `faturamentos` e o nome tecnico plural usado no backend e nas permissoes para expor o dominio documentado em `faturamento`. Nao ha um segundo dominio funcional independente; as regras, entidades, fluxos e lacunas de negocio estao registradas no modulo `faturamento`.

### Arquivos Primarios

- `backend/src/modules/faturamentos/routes/faturamentoRoutes.ts`
- `backend/src/modules/faturamentos/controllers/faturamentoController.ts`

### Contrato de Alias

CONFIRMADO:

- O registro de rotas usa permissao `faturamentos`.
- A superficie HTTP fica em `/api/faturamentos`.
- A UI usa nomenclatura singular em pasta e telas (`frontend/src/modules/faturamento`).
- Services frontend coexistem em singular e plural (`faturamento.ts` e `faturamentos.ts`).
- Este item do plano foi mantido separado apenas para rastreabilidade entre inventario scout e implementacao real.

### Lacunas

- LACUNA: decidir no SDD final se o nome de dominio publico deve ser `faturamento` ou `faturamentos`.
- LACUNA: evitar duplicidade de services frontend ao reconstruir ou estabilizar o modulo.

## Modulo: fornecedores

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/contratos/routes/fornecedorRoutes.ts` e `backend/src/modules/contratos/controllers/fornecedorController.ts`.
- Frontend: `frontend/src/modules/fornecedores`.
- Servico frontend: `frontend/src/services/fornecedores.ts`.
- Tipo: cadastro de fornecedores, classificacao PNAE/agricultura familiar e relacionamento com contratos.

### Proposito

CONFIRMADO: o modulo mantem fornecedores usados por contratos, compras, faturamentos, recebimentos, cardapios e indicadores PNAE. Alem do CRUD basico, ele classifica fornecedores por tipo (`CONVENCIONAL`, `AGRICULTURA_FAMILIAR`, `COOPERATIVA_AF`, `ASSOCIACAO_AF` na UI/controlador atual), guarda documentacao DAP/CAF e valida relacionamentos antes da exclusao.

### Arquivos Primarios

- `backend/src/modules/contratos/routes/fornecedorRoutes.ts`
- `backend/src/modules/contratos/controllers/fornecedorController.ts`
- `backend/src/modules/contratos/models/Fornecedor.ts`
- `frontend/src/services/fornecedores.ts`
- `frontend/src/hooks/queries/useFornecedorQueries.ts`
- `frontend/src/modules/fornecedores/pages/Fornecedores.tsx`
- `frontend/src/modules/fornecedores/pages/FornecedorDetalhe.tsx`
- `frontend/src/modules/fornecedores/pages/ItensFornecedor.tsx`
- `frontend/src/components/ConfirmacaoExclusaoFornecedor.tsx`
- `frontend/src/components/ImportacaoFornecedores.tsx`

### Rotas Backend

CONFIRMADO:

- Base HTTP: `/api/fornecedores`, registrada em `backend/src/routes/registerApiRoutes.ts`.
- Todas as rotas usam `authenticateToken`.
- Leituras nao usam `requireLeitura`; qualquer usuario autenticado acessa.
- Escritas usam `requireEscrita('fornecedores')`.
- `GET /`: lista fornecedores com cache `fornecedores:list:all`.
- `GET /:id/relacionamentos`: retorna contratos relacionados e se pode excluir.
- `GET /:id`: busca fornecedor com cache `fornecedores:{id}`.
- `POST /`: cria fornecedor.
- `PUT /:id`: edita fornecedor.
- `DELETE /:id`: remove fornecedor.

### Entidades e Tabelas

CONFIRMADO:

- Tabela principal: `fornecedores`.
- Campos usados pelo controlador atual: `id`, `nome`, `cnpj`, `email`, `endereco`, `ativo`, `tipo_fornecedor`, `dap_caf`, `data_validade_dap`, `created_at`, `updated_at`.
- Modelo legado `backend/src/modules/contratos/models/Fornecedor.ts` define apenas `id`, `nome`, `cnpj`, `email`, `ativo` e cria tabela minima.
- Migrations PNAE adicionam `tipo_fornecedor`, `dap_caf` e `data_validade_dap`.

### CRUD e Cache

CONFIRMADO:

- Listagem retorna `{ success, data, total }` ordenada por nome.
- Busca por id retorna 404 quando nao encontra.
- Criacao insere `nome`, `cnpj`, `email`, `ativo`, `tipo_fornecedor`, `dap_caf`, `data_validade_dap` e `created_at`.
- Edicao sobrescreve os mesmos campos e atualiza `updated_at`.
- Criacao invalida cache da entidade `fornecedores`.
- Edicao/remocao invalidam cache da entidade e id especifico.
- O backend nao valida CNPJ, unicidade ou obrigatoriedade explicitamente; depende do banco/UI.

### Exclusao e Relacionamentos

CONFIRMADO:

- `verificarRelacionamentosFornecedor` busca nome do fornecedor.
- Conta contratos ativos (`ativo = true`) e total de contratos.
- Busca ate 10 contratos relacionados com numero, status, ativo, vigencia, valor total e total de produtos.
- `podeExcluir` e verdadeiro somente quando `contratosAtivos === 0`.
- O endpoint apenas informa se pode excluir; `DELETE /:id` executa `DELETE FROM fornecedores` sem repetir a validacao de relacionamentos.
- A UI `ConfirmacaoExclusaoFornecedor` bloqueia visualmente a exclusao quando ha contratos ativos.

### Frontend

CONFIRMADO:

- `fornecedorService` usa `createCrudService('fornecedores')`.
- `useFornecedores` aplica filtros locais por busca, ativo e cidade, e calcula totais.
- `Fornecedores.tsx` lista em `DataTable`, filtra por status e tipo, exporta Excel, abre modal de criacao/edicao e modal de importacao.
- `Fornecedores.tsx` valida no cliente nome obrigatorio, CNPJ obrigatorio e 14 digitos numericos.
- Tipos exibidos na UI: `CONVENCIONAL`, `AGRICULTURA_FAMILIAR`, `COOPERATIVA_AF`, `ASSOCIACAO_AF`.
- Campos DAP/CAF aparecem somente para tipos de agricultura familiar/cooperativa/associacao.
- `FornecedorDetalhe.tsx` carrega fornecedor e todos os contratos, filtra contratos do fornecedor no cliente, calcula valor de contratos vigentes/expirados e navega para novo contrato ou itens.
- `ItensFornecedor.tsx` tenta listar todos os itens de contratos de um fornecedor em `/fornecedores/:id/itens`.

### Importacao e Exportacao

CONFIRMADO:

- Exportacao gera XLSX local com Nome, CNPJ, Email, Tipo e Ativo.
- `ImportacaoFornecedores` aceita CSV/XLS/XLSX, gera modelos e valida linhas no cliente.
- Importacao aceita linhas com status `valido` ou `aviso`; linhas com `erro` sao descartadas.
- Validacao de importacao usa `validarDocumento`, formata CPF/CNPJ e aceita campo `ativo`.
- Texto da UI afirma upsert por CNPJ e ausencia de duplicidade.

### Regras de Negocio

CONFIRMADO:

- Fornecedor ativo aparece como disponivel no cadastro e em relatorios dependentes.
- Fornecedor pode ser classificado para calculos PNAE/agricultura familiar.
- DAP/CAF e validade sao condicionais na UI para fornecedores de agricultura familiar, cooperativa AF ou associacao AF.
- Exclusao deve ser evitada quando ha contratos ativos, mas essa regra e aplicada pela UI com base no endpoint de relacionamentos.
- Contratos, compras, faturamentos, recebimentos e cardapios usam fornecedor como dimensao de agrupamento e origem de preco/fornecimento.

### Dependencias

CONFIRMADO:

- `contratos`: contratos vinculados, itens e produtos do fornecedor.
- `compras`: pedidos agregam fornecedores por contratos.
- `faturamento`: relatorios por tipo de fornecedor.
- `recebimentos`: fornecedores de pedido e itens pendentes/recebidos.
- `cardapios`: custo por tipo de fornecedor.
- `sistema/PNAE`: compliance, DAP/CAF e percentual de agricultura familiar.
- `usuarios/permissoes`: permissao de escrita `fornecedores`.

### Lacunas

- LACUNA: frontend chama `POST /fornecedores/importar-lote`, mas `fornecedorRoutes.ts` nao declara essa rota.
- LACUNA: frontend chama `GET /fornecedores/:id/itens`, mas `fornecedorRoutes.ts` nao declara essa rota; existe endpoint parecido apenas em recebimentos com pedido: `/api/recebimentos/pedidos/:pedidoId/fornecedores/:fornecedorId/itens`.
- LACUNA: `GET /api/fornecedores` nao exige `requireLeitura('fornecedores')`, diferente do padrao de outros modulos permissionados.
- LACUNA: migration `20260304_add_tipo_fornecedor.sql` usa valores `empresa/cooperativa/individual`, mas controlador/UI atuais usam `CONVENCIONAL/AGRICULTURA_FAMILIAR/COOPERATIVA_AF/ASSOCIACAO_AF`; validar estado real do schema.
- LACUNA: `DELETE /:id` nao revalida contratos ativos no servidor antes de apagar.
- LACUNA: `FornecedorDetalhe.tsx` carrega todos os contratos e filtra no cliente; pode ficar caro em bases grandes.

## Modulo: guias

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/guias`.
- Rota API: `/api/guias`.
- Frontend principal: telas de `frontend/src/modules/demandas` em rotas `/guias-demanda`.
- Servicos frontend: `frontend/src/services/guiaService.ts`, `frontend/src/services/guiaDemandaGenerationService.ts`, `frontend/src/services/itemGuiaService.ts`.
- Tipo: guias de demanda/entrega, programacao de itens por escola, geracao por demanda e base operacional para compras/entregas/estoque.

### Proposito

CONFIRMADO: o modulo cria e mantem guias de demanda por competencia, com itens por produto e escola em `guia_produto_escola`. As guias servem como ponte entre demanda/cardapios, pedidos de compra, programacao de entrega, romaneio, confirmacao de entrega e reservas de estoque.

### Arquivos Primarios

- `backend/src/modules/guias/routes/guiaRoutes.ts`
- `backend/src/modules/guias/controllers/guiaController.ts`
- `backend/src/modules/guias/controllers/guiaDemandaGenerationController.ts`
- `backend/src/modules/guias/models/Guia.ts`
- `backend/src/modules/guias/services/GuiaDemandaGenerationService.ts`
- `backend/src/modules/compras/services/PlanejamentoComprasService.ts`
- `frontend/src/services/guiaService.ts`
- `frontend/src/services/guiaDemandaGenerationService.ts`
- `frontend/src/services/itemGuiaService.ts`
- `frontend/src/modules/demandas/pages/GuiasDemandaLista.tsx`
- `frontend/src/modules/demandas/pages/GuiaDemandaDetalhe.tsx`
- `frontend/src/modules/demandas/pages/GuiaDemandaEscolaItens.tsx`
- `frontend/src/modules/demandas/pages/GuiaDemandaProdutoItens.tsx`
- `frontend/src/modules/programacao/pages/AjusteGuiaDemandaScreen.tsx`

### Rotas Backend

CONFIRMADO:

- Todas as rotas usam `authenticateToken`.
- Leituras usam `requireLeitura('guias')`.
- Escritas usam `requireEscrita('guias')`.
- `GET /competencias`: lista competencias com resumo de status.
- `GET /status-escolas`: lista status por escola para mes/ano e guia opcional.
- `GET /romaneio`: lista itens com data de entrega, escola, produto, rota e status.
- `GET /geracao-demanda/jobs/:id`: consulta status de job de geracao.
- `GET /`: lista guias.
- `GET /:id`: busca guia e produtos.
- `GET /:guiaId/produtos`: lista produtos da guia, com filtro opcional por escola.
- `GET /:guiaId/itens`: lista itens formatados da guia.
- `GET /escola/:escolaId/produtos`: lista produtos de uma escola por mes/ano.
- `GET /:guiaId/ajuste`: agrupa itens por produto/data para ajuste fino.
- `POST /`: cria guia manual.
- `POST /geracao-demanda`: gera guia de demanda sincrona.
- `POST /geracao-demanda/async`: inicia job assíncrono de geracao.
- `PUT /:id`: atualiza observacao da guia.
- `DELETE /:id`: apaga guia e itens/historicos relacionados.
- `POST /:guiaId/produtos`: adiciona item em guia.
- `DELETE /:guiaId/produtos/:produtoId/escolas/:escolaId`: remove item por produto/escola.
- `PUT /:guiaId/produtos/:produtoId/escolas/:escolaId/entrega`: atualiza dados de entrega.
- `PUT /itens/:itemId/para-entrega`: marca/desmarca item para entrega.
- `DELETE /itens/:itemId`: remove item direto por id.
- `POST /escola/:escolaId/produtos`: cria guia se necessario e adiciona produto para escola.
- `PUT /escola/produtos/:itemId`: atualiza item por escola.
- `PUT /:guiaId/ajuste`: salva ajuste fino de quantidades.

### Entidades e Tabelas

CONFIRMADO:

- `guias`: cabecalho da guia, com `mes`, `ano`, `nome`, `observacao`, `status`, `competencia_mes_ano`, `periodo_inicio`, `periodo_fim`, `codigo_guia`, `job_id`, timestamps.
- `guia_produto_escola`: itens por guia/produto/escola, com `quantidade`, `quantidade_demanda`, `unidade`, `lote`, `observacao`, `para_entrega`, `status`, `data_entrega`, campos de confirmacao e snapshot da escola.
- `pedidos.guia_id`: vincula pedido gerado a partir de guia.
- `rotas_entrega` e `rota_escolas`: usadas em status/romaneio.
- `historico_entregas` e `comprovante_itens`: apagados em cascata manual antes de deletar guia.

### Ciclo de Vida Manual

CONFIRMADO:

- Criacao manual rejeita guia com mesmo `mes` e `ano`.
- `GuiaModel.criarGuia` chama funcao SQL `gerar_codigo_guia(mes, ano)` e insere status `aberta`.
- Atualizacao manual altera apenas `observacao`.
- Adicao/remocao por `guiaId/produtos` exige guia existente e status `aberta`.
- Itens adicionados recebem snapshot da escola no momento da inclusao.
- Remocao direta por item (`DELETE /itens/:itemId`) nao valida status da guia.
- Exclusao de guia remove primeiro comprovantes, historico de entregas, itens e depois o cabecalho.

### Geracao por Demanda

CONFIRMADO:

- `guiaDemandaGenerationController` delega para `GuiaDemandaGenerationService`, que por sua vez delega para `PlanejamentoComprasService`.
- Payload esperado: `competencia` no formato `YYYY-MM`, `periodos`, `escola_ids`, `cardapio_ids`, `observacoes`, `considerar_indice_coccao`, `considerar_fator_correcao`.
- `normalizarCompetencia` aceita somente `YYYY-MM`.
- Para cada periodo, `calcularDemandaPeriodo` calcula demanda por produto/escola.
- Se nenhuma demanda e calculada, retorna sucesso operacional com `total_criadas: 0` ou marca job como erro no fluxo async.
- A geracao usa uma unica guia por `competencia_mes_ano`.
- Se a guia ja existe, apaga todos os itens de `guia_produto_escola` da guia e reabre a guia.
- Se nao existe, cria guia com nome `Guia MMM/AAAA`, status `aberta`, competencia e codigo unico.
- Produtos pereciveis geram uma linha por produto/escola/periodo com `data_entrega = periodo.data_inicio`.
- Produtos nao pereciveis sao agregados por produto/escola e usam a menor `data_inicio`.
- Se o produto tem peso de embalagem, converte kg em unidades usando `ceil(kg * 1000 / peso_g)`.
- Insercao e feita em lote por `batchInsertGuiaItens`, em chunks de 500.
- `quantidade_demanda` preserva a quantidade calculada originalmente para comparacao com ajustes manuais.
- Snapshot da escola usa historico de modalidades vigente na menor data de entrega do lote.

### Entrega, Romaneio e Ajuste

CONFIRMADO:

- `listarRomaneio` filtra por data, escola, rota(s) e status; por padrao exclui cancelados e exige `data_entrega IS NOT NULL`.
- Status calculado do item: `entregue` quando total entregue >= quantidade, `parcial` quando total entregue > 0, preserva `programada`/`cancelado`, caso contrario `pendente`.
- Atualizar entrega muda `entrega_confirmada`, `quantidade_entregue`, `data_entrega`, nomes de recebedor/entregador e status `entregue` ou `pendente`.
- `para_entrega` deve ser booleano e controla se item entra no fluxo de entrega.
- Ajuste fino agrupa por produto e data de entrega e permite salvar novas quantidades por `item_id`.

### Realtime

CONFIRMADO:

- Alteracoes publicam eventos no dominio `guias`.
- Acoes publicadas incluem `created`, `updated`, `deleted`, `item_added`, `item_removed`, `item_updated`, `delivery_updated`, `adjusted` e `generated`.
- Frontend invalida/atualiza dominios relacionados (`guias`, `guias-demanda`, `entregas`) via servico realtime.

### Dependencias

CONFIRMADO:

- `demandas`/`cardapios`: origem da demanda calculada.
- `escolas` e `escola_modalidades_historico`: snapshot e calculo por alunos/modalidades.
- `produtos` e `unidades_medida`: itens e unidade/embalagem.
- `compras`: geracao de pedidos a partir de guia.
- `entregas`: romaneio, historico e comprovantes.
- `estoque`: reservas e confirmacao de entrega dependem de itens da guia.
- `rotas`: filtro e ordenacao operacional por escola/rota.
- `usuarios`: job e permissoes.

### Lacunas

- LACUNA: migration `20260315_add_periodo_to_guias_and_guia_id_to_pedidos.sql` preenche `competencia_mes_ano` retroativo como `MM-YYYY`, mas o codigo atual exige e grava `YYYY-MM`.
- LACUNA: `guiaService.adicionarProdutoEscola` chama `POST /guias/:guia_id/produtos`, enquanto a rota dedicada `POST /guias/escola/:escolaId/produtos` existe mas nao e usada por esse metodo.
- LACUNA: criacao manual valida duplicidade por `mes/ano`; geracao por demanda valida/reusa por `competencia_mes_ano`, o que pode divergir em bases antigas.
- LACUNA: remocao direta `DELETE /guias/itens/:itemId` nao verifica se a guia esta aberta.
- LACUNA: `createGuiaTables` cria schema minimo que pode divergir das migrations completas, incluindo `codigo_guia` obrigatorio e campos de snapshot.

## Modulo: nutricao

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/nutricao`.
- Frontend: `frontend/src/modules/nutricao`.
- Servicos frontend: `frontend/src/services/nutricionistas.ts`, `frontend/src/services/gruposIngredientes.ts`, `frontend/src/services/taco.ts`, `frontend/src/services/refeicaoCalculos.ts`, `frontend/src/services/refeicaoIngredientes.ts`.
- Tipo: cadastro tecnico de nutricao, composicao nutricional, grupos de ingredientes, per capita por modalidade e calculos de refeicoes.

### Proposito

CONFIRMADO: o modulo suporta a operacao nutricional do sistema: cadastro de nutricionistas responsaveis por cardapios, busca de alimentos TACO, agrupamento de ingredientes reutilizaveis, ajuste de per capita por modalidade e calculo nutricional/custo de refeicoes a partir de ingredientes e contratos ativos.

### Arquivos Primarios

- `backend/src/modules/nutricao/routes/nutricionistaRoutes.ts`
- `backend/src/modules/nutricao/controllers/nutricionistaController.ts`
- `backend/src/modules/nutricao/routes/gruposIngredientesRoutes.ts`
- `backend/src/modules/nutricao/controllers/gruposIngredientesController.ts`
- `backend/src/modules/nutricao/routes/tacoRoutes.ts`
- `backend/src/modules/nutricao/controllers/tacoController.ts`
- `backend/src/modules/nutricao/routes/refeicaoCalculosRoutes.ts`
- `backend/src/modules/nutricao/controllers/refeicaoCalculosController.ts`
- `backend/src/modules/nutricao/controllers/refeicaoIngredientesController.ts`
- `backend/src/modules/nutricao/routes/refeicaoProdutoModalidadeRoutes.ts`
- `backend/src/modules/nutricao/controllers/refeicaoProdutoModalidadeController.ts`
- `frontend/src/modules/nutricao/pages/Nutricionistas.tsx`
- `frontend/src/modules/nutricao/pages/GruposIngredientes.tsx`
- `frontend/src/modules/nutricao/pages/Refeicoes.tsx`
- `frontend/src/modules/nutricao/pages/Preparacoes.tsx`
- `frontend/src/modules/nutricao/pages/PreparacaoDetalhe.tsx`

### Rotas Backend

CONFIRMADO:

- `/api/nutricionistas`: CRUD protegido por `authenticateToken`, leitura `requireLeitura('nutricionistas')`, escrita `requireEscrita('nutricionistas')`.
- `/api/grupos-ingredientes`: leitura exige `authenticateToken` + `refeicoes` leitura; criacao, edicao, exclusao e `PUT /:id/itens` exigem `refeicoes` escrita.
- `/api/taco/buscar`: busca TACO exige `authenticateToken` + `produtos` leitura.
- `/api/refeicoes/:id/calcular-nutricional`: calculo nutricional protegido por `authenticateToken`.
- `/api/refeicoes/:id/calcular-custo`: calculo de custo protegido por `authenticateToken`.
- `/api/refeicoes/:id/aplicar-calculos`: calcula e salva campos na refeicao, protegido por `authenticateToken` + `refeicoes` escrita.
- `/api/refeicoes/:id/ingredientes-detalhados`: leitura autenticada e protegida por `refeicoes` leitura.
- `/api/refeicao-produto-modalidade/refeicao-produto/:refeicaoProdutoId/ajustes`: lista ajustes.
- `/api/refeicao-produto-modalidade/refeicao-produto/:refeicaoProdutoId/ajustes`: salva ajustes em lote.
- `/api/refeicao-produto-modalidade/refeicao-produto/:refeicaoProdutoId/modalidade/:modalidadeId`: per capita efetivo.
- `/api/refeicao-produto-modalidade/refeicao/:refeicaoId/produtos-modalidades`: lista produtos com ajustes.
- `/api/refeicao-produto-modalidade/ajuste/:id`: deleta ajuste.

### Nutricionistas

CONFIRMADO:

- Tabela: `nutricionistas`.
- Campos obrigatorios na criacao: `nome`, `crn`, `crn_regiao`.
- `crn` e `cpf` possuem unicidade pela migration.
- Listagem aceita filtro `ativo=true|false`, mas cache usa chave unica `nutricionistas:list:all`.
- Remocao verifica se existem cardapios vinculados em `cardapios_modalidade.nutricionista_id`; se houver, bloqueia exclusao.
- Desativacao faz `ativo=false` sem excluir.
- Cardapios possuem `nutricionista_id`, `data_aprovacao_nutricionista` e `observacoes_nutricionista`.

### Grupos de Ingredientes

CONFIRMADO:

- Tabelas: `grupos_ingredientes` e `grupos_ingredientes_itens`.
- Listagem retorna cada grupo com seus itens e `produto_nome`/`fator_correcao`.
- Criacao exige `nome`.
- Atualizacao usa `COALESCE` para nome/descricao.
- Exclusao de grupo depende de `ON DELETE CASCADE` nos itens.
- `salvarItensGrupo` substitui todos os itens do grupo em transacao: apaga os antigos e insere o array recebido.
- Cada item do grupo armazena `produto_id`, `per_capita` e `tipo_medida` (default `gramas`).

### TACO e Composicao Nutricional

CONFIRMADO:

- `GET /api/taco/buscar?q=` exige termo com pelo menos 2 caracteres.
- Busca usa `LOWER(nome) LIKE` e limita a 20 resultados.
- Retorna energia, macros e micronutrientes de `taco_alimentos`.
- Frontend mapeia campos TACO para composicao nutricional do produto.
- Calculos usam `produto_composicao_nutricional` com campos como `energia_kcal`, `proteina_g`, `lipideos_g`, `carboidratos_g`, `fibra_alimentar_g`, minerais e vitaminas.

### Calculos de Refeicao

CONFIRMADO:

- Ingredientes base: `refeicao_produtos`.
- Ajustes por modalidade: `refeicao_produto_modalidade`.
- `modalidade_id` opcional altera o per capita usado via `COALESCE(rpm.per_capita_ajustado, rp.per_capita)`.
- `getQuantidadeLiquida` converte `mg`/`miligramas` para gramas e deixa demais medidas como gramas.
- O codigo explicita que `per_capita` representa alimento pronto/liquido; nao usa indice de coccao nos calculos de refeicao.
- Calculo nutricional soma valores por 100g proporcionalmente ao per capita liquido.
- Resultado retorna totais, por porcao, alertas e ingredientes sem informacao nutricional.
- Alertas atuais: calorias abaixo de 300/acima de 800 kcal, proteina abaixo de 10g, sodio acima de 800mg, fibras abaixo de 3g.
- Calculo de custo busca contrato ativo mais recente por produto via lateral join em `contrato_produtos`/`contratos`.
- Custo usa per capita bruto = per capita liquido * fator_correcao.
- Custo por ingrediente = proporcao da embalagem * preco_unitario; itens sem contrato ativo entram em alertas.
- `aplicarCalculosAutomaticos` recalcula nutricao e custo e atualiza campos agregados em `refeicoes`.

### Ajustes por Modalidade

CONFIRMADO:

- `salvarAjustes` abre transacao, apaga todos os ajustes de um `refeicao_produto_id` e insere os novos.
- `obterPerCapitaEfetivo` informa per capita padrao, per capita efetivo e se existe ajuste.
- `listarProdutosComModalidades` retorna produtos da refeicao com `json_agg` de ajustes por modalidade.
- `deletarAjuste` remove um ajuste por id.

### Dependencias

CONFIRMADO:

- `cardapios`: nutricionista responsavel e uso de refeicoes.
- `produtos`: composicao nutricional, fator de correcao, peso/unidade.
- `contratos`: preco unitario vigente para custo.
- `modalidades`: per capita ajustado por modalidade.
- `refeicoes`/`refeicao_produtos`: base dos calculos.
- `usuarios/permissoes`: permissoes explicitas apenas para nutricionistas.

### Lacunas

- CONFIRMADO: `grupos-ingredientes`, `taco` e rotas de calculos usam `authenticateToken` e RBAC granular com `produtos`/`refeicoes`.
- CONFIRMADO: `GET /refeicoes/:id/ingredientes-detalhados` exige autenticacao e permissao de leitura em `refeicoes`.
- LACUNA: cache de `listarNutricionistas` ignora filtro `ativo`, pois usa sempre `nutricionistas:list:all`.
- LACUNA: existem migrations com nomes de campos nutricionais diferentes (`calorias/proteinas` vs `energia_kcal/proteina_g`); validar schema final aplicado.
- LACUNA: `aplicarCalculosAutomaticos` chama handlers Express como funcoes internas; esse padrao pode retornar objetos simulados e merece teste de integracao.

## Modulo: portal-escola

### Identificacao

- Status: CONFIRMADO.
- Backend: `backend/src/modules/escolas/routes/escolaPortalRoutes.ts`, `backend/src/modules/escolas/controllers/escolaPortalController.ts`.
- Frontend: `frontend/src/modules/portal-escola`.
- Rota API: `/api/escola-portal`.
- Rotas UI: `/portal-escola`, `/portal-escola/cardapio`, `/portal-escola/solicitacoes`, `/portal-escola/comprovantes`, `/portal-escola/alunos`.
- Tipo: portal autenticado para usuario vinculado a uma escola.

### Proposito

CONFIRMADO: o portal-escola oferece uma area operacional restrita a usuarios com `escola_id` no JWT. Ele mostra dados da propria escola, cardapios da semana, comprovantes de entrega, solicitacoes de alimentos, estoque escolar e alunos/modalidades, sempre filtrando por `req.user.escola_id` no backend.

### Arquivos Primarios

- `backend/src/modules/escolas/routes/escolaPortalRoutes.ts`
- `backend/src/modules/escolas/controllers/escolaPortalController.ts`
- `frontend/src/modules/portal-escola/README.md`
- `frontend/src/modules/portal-escola/pages/PortalEscolaHome.tsx`
- `frontend/src/modules/portal-escola/pages/CardapioPage.tsx`
- `frontend/src/modules/portal-escola/pages/SolicitacoesPage.tsx`
- `frontend/src/modules/portal-escola/pages/ComprovantesPage.tsx`
- `frontend/src/modules/portal-escola/pages/AlunosPage.tsx`
- `frontend/src/modules/portal-escola/components/CardapioSemanalPortal.tsx`
- `frontend/src/hooks/useUserRole.ts`
- `frontend/src/routes/AppRouter.tsx`
- `frontend/src/services/solicitacoesAlimentos.ts`

### Rotas Backend do Portal

CONFIRMADO:

- Todas as rotas de `/api/escola-portal` usam `authenticateToken`.
- Nenhuma rota usa `requireLeitura`/`requireEscrita`; o isolamento e feito pelo `escola_id` do token.
- `GET /dashboard`: dados da escola, modalidades, total de alunos e estatisticas de guias.
- `GET /debug-token`: retorna token decodificado.
- `GET /guias`: lista guias relacionadas a itens da escola.
- `GET /guias/:guiaId/itens`: lista itens da guia apenas da escola do usuario.
- `GET /cardapios-semana`: lista cardapios da semana atual para modalidades da escola.
- `GET /comprovantes`: lista comprovantes de entrega da escola, com paginacao simples.
- `GET /comprovantes/:id`: busca comprovante e itens, exigindo `ce.escola_id = user.escola_id`.

### Acesso e Identidade

CONFIRMADO:

- Login inclui `escola_id` e `tipo_secretaria` no JWT.
- `RootRedirect` envia usuarios com `escola_id`, nao admin, para `/portal-escola`.
- `useUserRole` define `isEscolaUser` quando ha `user.escola_id` e o usuario nao e admin.
- Migration `20260317_add_escola_usuarios.sql` adiciona `usuarios.escola_id` e `usuarios.tipo_secretaria`.
- AdminUsuarios exige `escola_id` quando `tipo_secretaria = 'escola'`.

### Dashboard e Alunos

CONFIRMADO:

- `getDashboardEscola` exige `user.escola_id`; caso contrario retorna erro de validacao.
- Busca `escolas` pelo id do token.
- Busca modalidades em `escola_modalidades` junto com `modalidades`.
- Calcula `totalAlunos` somando `quantidade_alunos`.
- Estatisticas contam guias, produtos, pendentes e entregues em `guia_produto_escola`.
- `AlunosPage` reutiliza `/escola-portal/dashboard` para escola, modalidades e total de alunos.

### Cardapios

CONFIRMADO:

- `getCardapiosSemana` busca modalidades da escola por `escola_modalidades`.
- Semana atual e calculada de segunda a domingo; se hoje for domingo, usa a proxima semana.
- Query usa `cardapios_modalidade`, `cardapio_modalidades`, `modalidades`, `cardapio_refeicoes_dia` e `refeicoes`.
- Filtra por modalidades da escola e datas da semana.
- `CardapioPage` exibe cardapio de hoje e cardapio semanal.
- `CardapioSemanalPortal` carrega tipos de refeicao, organiza dias uteis segunda a sabado, abre dialog com ficha tecnica e gera PDF de ficha tecnica.
- Impressao semanal usa `gerarPDFTabela` e dados de instituicao.

### Comprovantes

CONFIRMADO:

- `getComprovantesEscola` lista `comprovantes_entrega` da escola, agregando total de itens e quantidade entregue.
- `getComprovanteDetalhes` valida id e escola do token, retorna dados do comprovante e itens.
- `ComprovantesPage` lista em DataTable, abre dialog de detalhes e gera PDF com codigo de barras do numero do comprovante.

### Solicitacoes de Alimentos

CONFIRMADO:

- A tela do portal usa `frontend/src/services/solicitacoesAlimentos.ts`.
- `GET /api/solicitacoes-alimentos/minhas` lista somente solicitacoes da escola do usuario.
- `POST /api/solicitacoes-alimentos` cria solicitacao para `user.escola_id`.
- `DELETE /api/solicitacoes-alimentos/:id` cancela somente solicitacao da mesma escola e apenas se status for `pendente`.
- Criacao exige ao menos um item.
- Produto informado e normalizado pelo backend; unidade e obtida por produto/unidade_medida quando possivel.
- Criacao dispara notificacao e evento realtime `solicitacoes_alimentos`.
- Frontend atualiza lista ao receber evento realtime desse dominio.

### Navegacao do Portal

CONFIRMADO:

- `PortalEscolaHome` mostra cards de Alimentacao, Documentos, Estoque e Informacoes.
- Card de estoque navega para `/estoque-escola-portal`, que pertence ao modulo de estoque escolar.
- As rotas do portal no `AppRouter` usam `LazyRoute moduloSlug="dashboard"`.
- O README do modulo declara que o portal e separado do modulo de gestao de escolas.

### Dependencias

CONFIRMADO:

- `usuarios`: `escola_id`, `tipo_secretaria` e JWT.
- `escolas`: dados cadastrais da escola.
- `escola_modalidades`/`modalidades`: alunos por modalidade e filtro de cardapios.
- `cardapios`: cardapio semanal e fichas tecnicas.
- `guias`: estatisticas e guias da escola.
- `entregas`: comprovantes de entrega.
- `solicitacoes`: solicitacoes de alimentos.
- `estoque`: portal de estoque escolar.
- `produtos`: itens solicitados.

### Lacunas

- CONFIRMADO: rotas frontend de `/portal-escola` usam slug dedicado `portal_escola`.
- LACUNA: `/api/escola-portal/debug-token` esta disponivel autenticado; avaliar se deve existir em producao.
- LACUNA: backend do portal nao usa `requireLeitura('portal-escola')`; acesso depende exclusivamente de token com `escola_id`.
- LACUNA: ainda existe tela antiga `frontend/src/modules/escolas/pages/PortalEscola.tsx`, paralela ao modulo novo `frontend/src/modules/portal-escola`; confirmar qual e canônica.
- LACUNA: `getCardapiosSemana` usa `escola_modalidades` atual, nao historico por vigencia; pode divergir de cardapios por periodo.
## Modulo: produtos

### Escopo

- Tipo: modulo full-stack de cadastro mestre de produtos, unidades de medida, fatores de preparo, peso de embalagem e composicao nutricional.
- Backend principal: `backend/src/modules/produtos/routes/produtoRoutes.ts` e `backend/src/modules/produtos/controllers/produtoController.ts`.
- Frontend principal: `frontend/src/modules/produtos/pages/Produtos.tsx`, `frontend/src/modules/produtos/pages/ProdutoDetalhe.tsx`, `frontend/src/services/produtos.ts`, `frontend/src/hooks/queries/useProdutoQueries.ts`.
- Suportes relevantes: `frontend/src/types/produto.ts`, `frontend/src/utils/produtoImportUtils.ts`, `frontend/src/services/taco.ts`, `backend/src/modules/unidades/*`, `backend/src/services/unidadesMedidaService.ts`.

### Responsabilidade

CONFIRMADO: o modulo mantem o cadastro base de alimentos/produtos usado por cardapios, refeicoes, contratos, compras, guias, estoque, faturamento e solicitacoes. O cadastro guarda classificacao, unidade de distribuicao, perecibilidade, validade minima, estoque minimo, fator de correcao, indice de coccao, peso da embalagem e composicao nutricional por 100g.

### Rotas Backend

Base registrada: `/api/produtos`.

- `GET /`: lista produtos com unidade, flags `tem_composicao_nutricional` e `tem_contrato`.
- `GET /:id`: busca produto por id.
- `GET /:id/composicao-nutricional`: busca composicao; se nao existir, cria registro vazio.
- `POST /`: cria produto.
- `PUT /:id`: edita produto.
- `PUT /:id/composicao-nutricional`: cria ou atualiza composicao nutricional.
- `POST /standardize-composicao`: padroniza schema da tabela de composicao nutricional.
- `DELETE /:id`: remove produto fisicamente.

Rotas auxiliares de unidade em `/api/unidades-medida`:

- `GET /`: lista unidades ativas.
- `GET /:identificador`: busca por id ou codigo.
- `POST /converter`: converte quantidade entre unidades do mesmo tipo.
- `POST /calcular-fator`: calcula fator de conversao entre unidades.

### Permissoes

CONFIRMADO:

- Todas as rotas de produtos usam `authenticateToken`.
- Leitura (`GET /`, `GET /:id`, composicao) nao chama `requireLeitura('produtos')`; qualquer usuario autenticado acessa.
- Escrita e exclusao usam `requireEscrita('produtos')`.
- `standardizarComposicaoNutricional` ainda exige `user.isSystemAdmin` dentro do controller, alem de `requireEscrita('produtos')`.
- Rotas de unidades de medida nao aplicam `authenticateToken` no arquivo de rotas; validar se ha protecao global no registro de rotas.

### Entidade Produto

CONFIRMADO:

- Campos principais: `id`, `nome`, `descricao`, `tipo_processamento`, `categoria`, `validade_minima`, `imagem_url`, `perecivel`, `ativo`, `estoque_minimo`, `fator_correcao`, `tipo_fator_correcao`, `indice_coccao`, `unidade_medida_id`, `peso`.
- `listarProdutos` junta `unidades_medida` e retorna `unidade` como `um.codigo` ou `UN` por padrao.
- `tem_composicao_nutricional` e derivado da existencia em `produto_composicao_nutricional`.
- `tem_contrato` e derivado de `contrato_produtos` + `contratos` ativos.
- `useProdutos` aplica filtros client-side de busca, categoria e ativo sobre a lista completa.
- `useCategoriasProdutos` deriva categorias a partir da lista de produtos.

### Validacoes e Normalizacao

CONFIRMADO:

- Criacao exige `nome` nao vazio.
- Edicao rejeita `nome` vazio quando enviado.
- `tipo_processamento` aceita: `in natura`, `minimamente processado`, `ingrediente culinario`, `processado`, `ultraprocessado`.
- `fator_correcao` e normalizado por `num()` e deve ser maior ou igual a 1.0 no backend.
- `indice_coccao` deve ser maior que 0.
- `peso` aceita string/numero e e persistido como numero ou `null`.
- `editarProduto` usa `COALESCE` em todos os campos; isso impede limpar alguns campos para `NULL` se o payload enviar `null`.

### Composicao Nutricional

CONFIRMADO:

- Tabela operacional: `produto_composicao_nutricional`, `UNIQUE(produto_id)`, FK `produtos(id) ON DELETE CASCADE`.
- Controller detecta schema `novo` quando existe coluna `energia_kcal`; caso contrario trata como schema `antigo`.
- `ensureProdutoComposicaoTable` cria tabela minima caso ela nao exista.
- `withEnsureRetry` refaz operacao apos criar tabela quando recebe erro PostgreSQL `42P01`.
- Schema novo usa campos como `energia_kcal`, `proteina_g`, `carboidratos_g`, `lipideos_g`, `fibra_alimentar_g`, `sodio_mg`, `calcio_mg`, `ferro_mg`, `vitamina_a_mcg`, `vitamina_c_mg`.
- Schema antigo usa aliases `calorias`, `proteinas`, `carboidratos`, `gorduras`, `fibras`, `sodio`, `vitamina_a`, `vitamina_c`.
- `ProdutoDetalhe` permite editar nutrientes individualmente e carregar dados da TACO via `BuscarTacoDialog`/`mapearTacoParaComposicao`.
- Ao selecionar TACO, a tela salva composicao e pode atualizar automaticamente a categoria do produto.

### Unidades de Medida

CONFIRMADO:

- `unidades_medida` guarda `codigo`, `nome`, `tipo`, `unidade_base_id`, `fator_conversao_base` e `ativo`.
- Migrations criam unidades padrao de massa (`G`, `KG`, `MG`, `T`), volume (`ML`, `L`) e unidade/embalagem (`UN`, `DZ`, `CX`, `PCT`, `FD`, `SC`, etc.).
- `converterUnidade` exige unidades do mesmo tipo.
- Conversoes com fator fixo passam pela unidade base.
- Conversoes envolvendo embalagens dependem de `pesoEmbalagem`.
- `calcularFatorConversao` retorna 1 para mesmas unidades, usa fator base para unidades fixas ou `pesoEmbalagem / pesoProduto` para embalagem.

### Importacao e Exportacao

CONFIRMADO:

- `Produtos.tsx` exporta produtos filtrados para XLSX.
- `produtoImportUtils.ts` gera modelo XLSX/CSV com colunas canonicas: `nome`, `descricao`, `tipo_processamento`, `categoria`, `validade_minima`, `perecivel`, `ativo`, `estoque_minimo`, `fator_correcao`, `tipo_fator_correcao`, `indice_coccao`, `unidade_medida_id`, `peso`.
- A tela importa produtos um a um: se encontra produto existente por nome, usa `PUT /produtos/:id`; caso contrario, `POST /produtos`.
- `frontend/src/services/produtos.ts` declara `importarProdutosLote` chamando `/produtos/importar-lote`, mas a rota nao existe em `produtoRoutes.ts`.

### Dependencias

CONFIRMADO:

- `unidades_medida`: unidade de distribuicao e conversoes.
- `produto_composicao_nutricional`: nutrientes por 100g.
- `contrato_produtos`/`contratos`: flag de contrato ativo e precificacao em outros modulos.
- `refeicao_produtos`: ingredientes de preparacoes.
- `guias`/`guia_produto_escola`: itens de demanda e entrega.
- `estoque_eventos`/estoque: saldo e movimentacoes por produto.
- `solicitacoes_alimentos`: produtos solicitados pelas escolas.
- `TACO`: origem opcional de composicao nutricional.

### Lacunas

- LACUNA: `importarProdutosLote` aponta para `/produtos/importar-lote`, endpoint nao registrado no backend atual.
- LACUNA: `removerProduto` faz delete fisico e comentario assume `ON DELETE CASCADE`; validar impacto em historicos, contratos, guias, estoque e faturamento antes de permitir exclusao real.
- LACUNA: rotas de leitura de produtos nao usam `requireLeitura('produtos')`, embora o frontend proteja `/produtos` por `LazyRoute moduloSlug="produtos"`.
- LACUNA: controller cria/ajusta tabela de composicao em runtime, misturando migracao de schema com request handler.
- LACUNA: `standardizarComposicaoNutricional` mapeia `vitamina_e_mg` a partir de `vitamina_c` e `vitamina_b1_mg` a partir de `vitamina_a`; validar se e regra intencional ou resquicio de migracao.
- LACUNA: frontend de criacao aceita `fator_correcao >= 0`, mas backend exige `>= 1.0`.
- LACUNA: `editarProduto` com `COALESCE` dificulta apagar valores opcionais para `NULL`.
## Modulo: programacao

### Escopo

- Tipo: modulo operacional de programacao e ajuste de entregas/demandas por escola.
- Backend principal: `backend/src/modules/compras/controllers/programacaoEntregaController.ts`, exposto por `backend/src/modules/compras/routes/compraRoutes.ts`.
- Frontend principal: `frontend/src/modules/programacao/pages/ProgramacaoEntregaScreen.tsx`, `frontend/src/modules/programacao/pages/AjusteProgramacoesScreen.tsx`, `frontend/src/modules/programacao/pages/AjusteGuiaDemandaScreen.tsx`.
- Servicos: `frontend/src/services/programacaoEntrega.ts`, `frontend/src/services/pedidos.ts`, `frontend/src/services/guiaService.ts`.
- Tabelas principais: `pedido_item_programacoes`, `pedido_item_programacao_escolas`, `pedido_itens`, `pedidos`, `guia_produto_escola`.

### Responsabilidade

CONFIRMADO: o modulo permite distribuir a quantidade de um item de pedido em uma ou mais datas de entrega, quebrando cada data por escola. Tambem oferece telas matriciais para ajustar simultaneamente programacoes de pedido e quantidades de guia de demanda por produto/escola/data.

### Rotas Backend - Programacao de Pedido

Base real: `/api/compras`.

- `GET /itens/:pedido_item_id/programacoes`
  - `requireLeitura('compras')`
  - lista programacoes do item, agregando escolas em JSON.
- `PUT /itens/:pedido_item_id/programacoes`
  - `requireEscrita('compras')`
  - salva o conjunto completo de programacoes do item.
- `POST /itens/mesclar`
  - `requireEscrita('compras')`
  - mescla itens do mesmo produto e pedido em um item destino.

### Modelo de Dados

CONFIRMADO:

- `pedido_item_programacoes`
  - `id`
  - `pedido_item_id`
  - `data_entrega`
  - `observacoes`
  - timestamps
- `pedido_item_programacao_escolas`
  - `id`
  - `programacao_id`
  - `escola_id`
  - `quantidade`
  - `UNIQUE(programacao_id, escola_id)`
- `pedido_itens.data_entrega_prevista` e sincronizado para a menor data das programacoes.
- `pedido_itens.quantidade` passa a ser a soma das quantidades programadas por escola.
- `pedido_itens.valor_total` e recalculado como `quantidade * preco_unitario`.
- `pedidos.valor_total` e recalculado pela soma dos itens.

### Fluxo: Programacao de Entrega por Item

CONFIRMADO:

1. `ProgramacaoEntregaScreen` recebe `pedidoId` e `itemId` pela rota `/compras/:id/item/:itemId/programacao`.
2. Carrega programacoes do item, escolas ativas e detalhe do pedido.
3. Se nao ha programacoes, cria uma programacao inicial com a data atual.
4. Usuario adiciona/remover datas de entrega.
5. Para cada data, usuario adiciona escolas e quantidades.
6. Ao salvar, frontend envia o array completo para `PUT /compras/itens/:pedidoItemId/programacoes`.
7. Backend remove programacoes ausentes, atualiza existentes, cria novas e recria a lista de escolas de cada programacao.
8. Apenas escolas com quantidade positiva sao inseridas.
9. Backend recalcula quantidade/data/valor do item e total do pedido em transacao.
10. Publica evento realtime de dominio `compras`, action `programacao_updated`.

### Fluxo: Ajuste Matricial de Programacoes

CONFIRMADO:

- Rota frontend: `/compras/:id/programacoes-ajuste`.
- `AjusteProgramacoesScreen` carrega pedido, escolas ativas e programacoes de todos os itens do pedido.
- Tela permite ate 5 colunas simultaneas.
- Cada coluna aponta para um par `itemId + progIdx`.
- Usuario edita quantidade por escola em tabela.
- Ajuste em lote suporta percentual, minimo, maximo e arredondamento.
- Replicacao copia quantidades de uma coluna para outra sem salvar automaticamente.
- Salvamento e por coluna: substitui as escolas daquela programacao e reenvia todas as programacoes do item.

### Fluxo: Ajuste de Guia de Demanda

CONFIRMADO:

- `AjusteGuiaDemandaScreen` opera sobre `/guias/:guiaId/ajuste`.
- Carrega guia, grupos de ajuste e escolas ativas.
- Cada grupo representa produto/data de entrega com escolas e quantidades.
- Tabela mostra quantidade calculada de demanda e quantidade editada.
- Salvamento por coluna envia `{ ajustes: [{ item_id, quantidade }] }` para `PUT /guias/:guiaId/ajuste`.
- Essa tela altera itens de `guia_produto_escola`, nao as tabelas de programacao de pedido.

### Mesclagem de Itens

CONFIRMADO:

- `mesclarItens` exige `item_ids` com pelo menos dois itens.
- Todos os itens devem pertencer ao mesmo `pedido_id` e `produto_id`.
- Primeiro id enviado e o item destino.
- Quantidades sao agregadas por escola em todas as programacoes dos itens.
- Data de entrega consolidada e a menor data entre as programacoes.
- Remove programacoes antigas, remove itens secundarios, cria uma programacao consolidada no item destino e recalcula valores.
- Publica evento realtime `itens_merged`.

### Dependencias

CONFIRMADO:

- `compras`/`pedidos`: pedido, item, quantidade, preco e total.
- `escolas`: quebra de entrega por escola.
- `guias`: ajuste de demanda em `guia_produto_escola`.
- `produtos`: nome/unidade dos itens.
- `realtime`: notificacao de mudancas para dominio `compras`.
- `faturamentos`/`recebimentos`: dependem de quantidades e datas dos itens programados.

### Lacunas

- LACUNA: o modulo usa permissao `compras`/`pedidos` nas rotas/telas, nao um slug proprio `programacao`.
- LACUNA: `salvarProgramacoes` permite salvar array vazio; isso zera `pedido_itens.quantidade`, `valor_total` e `data_entrega_prevista`.
- LACUNA: no update de programacao existente, o backend atualiza por `id` sem confirmar explicitamente se o `id` pertence ao `pedido_item_id` da rota.
- LACUNA: `ProgramacaoEntregaScreen` permite remover a ultima programacao da UI; validar regra de negocio quando o item fica sem escolas/quantidade.
- LACUNA: `AjusteProgramacoesScreen` salva por coluna, mas outras colunas do mesmo item podem estar com estado local desatualizado depois do retorno.
## Modulo: recebimentos

### Escopo

- Tipo: modulo backend/mobile para recebimento parcial ou total de itens de pedidos.
- Backend principal: `backend/src/modules/recebimentos/routes/recebimentoRoutes.ts`, `backend/src/modules/recebimentos/controllers/recebimentoController.ts`.
- App mobile principal: `apps/entregador-native/src/api/recebimentos.ts`, `RecebimentosScreen.tsx`, `RecebimentoFornecedoresScreen.tsx`, `RecebimentoItensScreen.tsx`.
- Migração principal: `backend/src/migrations/20260304_create_recebimentos.sql`.
- Integração estoque: `backend/src/modules/estoque/services/estoqueLedgerService.ts` e `estoqueIntegracaoService.ts`.

### Responsabilidade

CONFIRMADO: o modulo lista pedidos pendentes/parciais e concluidos, agrupa itens por fornecedor, registra recebimentos por item de pedido, controla saldo pendente, atualiza status do pedido e lança entrada no estoque central por evento de ledger.

### Rotas Backend

Base registrada: `/api/recebimentos`.

- `GET /pedidos-pendentes`: pedidos com status `pendente` ou `recebido_parcial`.
- `GET /pedidos-concluidos`: ultimos pedidos com status `concluido`.
- `GET /pedidos/:pedidoId/fornecedores`: fornecedores vinculados aos itens do pedido.
- `GET /pedidos/:pedidoId/fornecedores/:fornecedorId/itens`: itens do fornecedor dentro do pedido.
- `GET /itens/:pedidoItemId/recebimentos`: historico de recebimentos de um item.
- `GET /pedidos/:pedidoId/historico`: historico detalhado via `vw_recebimentos_detalhados`.
- `POST /registrar`: registra recebimento.

### Permissoes

CONFIRMADO:

- Todas as rotas usam `authenticateToken`.
- Leituras usam `requireLeitura('recebimentos')`.
- Registro usa `requireEscrita('recebimentos')`.
- `registrarRecebimento` tambem exige `req.user.id` para gravar `usuario_id`.

### Modelo de Dados

CONFIRMADO:

- `recebimentos`
  - `pedido_id`
  - `pedido_item_id`
  - `quantidade_recebida`
  - `data_recebimento`
  - `observacoes`
  - `usuario_id`
- `quantidade_recebida` possui `CHECK (quantidade_recebida > 0)`.
- Views declaradas: `vw_recebimentos_detalhados` e `vw_resumo_recebimentos_pedido`.
- Controller mais recente usa `produtos` + `unidades_medida` para unidade; a migration inicial da view usa `prod.unidade`, que pode estar defasado frente ao schema refatorado.

### Fluxo Mobile

CONFIRMADO:

1. `RecebimentosScreen` chama `/recebimentos/pedidos-pendentes`.
2. Usuario seleciona pedido.
3. `RecebimentoFornecedoresScreen` chama `/recebimentos/pedidos/:pedidoId/fornecedores`.
4. Usuario seleciona fornecedor.
5. `RecebimentoItensScreen` chama `/recebimentos/pedidos/:pedidoId/fornecedores/:fornecedorId/itens`.
6. Tela mostra quantidade pedida, recebida, saldo, atraso e historico.
7. Ao registrar, app envia `pedidoId`, `pedidoItemId`, `quantidadeRecebida`, observacoes e metadados opcionais (`lote`, fabricacao, validade, nota fiscal).
8. App valida localmente quantidade > 0 e menor/igual ao saldo pendente.
9. Backend repete a validacao com saldo calculado no banco.

### Registro de Recebimento

CONFIRMADO:

- `montarObservacaoRecebimento` concatena observacoes livres com metadados de lote, fabricacao, validade e nota fiscal.
- Backend busca o item por `pedidoItemId` e `pedidoId`.
- Calcula `saldoPendente = pedido_itens.quantidade - SUM(recebimentos.quantidade_recebida)`.
- Rejeita quantidade recebida maior que saldo pendente.
- Insere linha em `recebimentos`.
- Chama `estoqueLedgerService.appendEventWithClient` com evento `recebimento_central`.
- Recalcula se todos os itens do pedido estao completos.
- Atualiza `pedidos.status` para `recebido_parcial` ou `concluido`.
- Publica realtime:
  - dominio `compras`, action `received`;
  - dominio `estoque_central`, action `updated`.

### Estoque Central

CONFIRMADO:

- `buildRecebimentoCentralEvent` cria evento:
  - `escopo = central`
  - `tipo_evento = recebimento_central`
  - `origem = recebimento`
  - `quantidade_delta = quantidadeRecebida`
  - `referencia_tipo = recebimento`
  - `referencia_id = pedido_item_id`
- O recebimento e o evento de estoque rodam na mesma transacao.

### Listagens e Indicadores

CONFIRMADO:

- Pedidos pendentes contam itens totais, fornecedores, valor recebido e itens completos.
- Fornecedores do pedido calculam itens completos, total de recebimentos e itens atrasados.
- Itens por fornecedor retornam quantidade pedida, quantidade recebida, saldo pendente, data prevista, produto, unidade e contrato.
- Mobile colore fornecedores conforme completo, atrasado ou pendente.

### Dependencias

CONFIRMADO:

- `pedidos` e `pedido_itens`: origem do saldo a receber.
- `contrato_produtos`, `contratos`, `fornecedores`: agrupamento por fornecedor.
- `produtos` e `unidades_medida`: nome e unidade do item.
- `usuarios`: responsavel pelo recebimento.
- `estoque`: entrada central por ledger.
- `compras`/`realtime`: status do pedido e notificacoes.

### Lacunas

- LACUNA: a migration inicial da view `vw_recebimentos_detalhados` referencia `prod.unidade`, enquanto controllers atuais usam `unidades_medida`; validar se view foi corrigida por migrations posteriores em todos os ambientes.
- LACUNA: metadados de lote/fabricacao/validade/nota fiscal sao salvos apenas em texto `observacoes`, nao em colunas estruturadas de recebimento.
- LACUNA: `referencia_id` do evento de estoque usa `pedido_item_id`, nao `recebimento.id`; pode dificultar rastrear multiplos recebimentos do mesmo item.
- LACUNA: nao ha endpoint de estorno/cancelamento de recebimento neste modulo.
- LACUNA: listagens nao filtram por periodo/tenant explicitamente no controller; validar dependencia de RLS/middleware global.

## Modulo: rotas

### Escopo

CONFIRMADO: o modulo `rotas` organiza rotas de entrega, associa escolas a uma ordem de visita, cria planejamentos por guia/rota e registra status/evidencias por escola. O backend fica tecnicamente dentro do modulo `entregas`, exposto por `backend/src/modules/entregas/routes/rotaRoutes.ts`, enquanto a UI web fica em `frontend/src/modules/rotas/pages/GestaoRotas.tsx` e `frontend/src/modules/escolas/pages/GerenciarEscolasRota.tsx`. O app entregador consome a mesma base para listar rotas, escolas da rota e montar a navegacao operacional.

### Superficie Backend

CONFIRMADO:

- `registerApiRoutes.ts` monta `rotaRoutes` em `/api/entregas`.
- `GET /rotas`: lista rotas com total de escolas.
- `GET /rotas/:id`: busca rota por id numerico.
- `POST /rotas`: cria rota.
- `PUT /rotas/:id`: atualiza nome, descricao, cor e ativo.
- `DELETE /rotas/:id`: remove fisicamente rota, associacoes e planejamentos relacionados.
- `GET /rotas/:rotaId/escolas`: lista escolas ordenadas da rota.
- `POST /rotas/:rotaId/escolas`: vincula escola a rota.
- `DELETE /rotas/:rotaId/escolas/:escolaId`: remove escola da rota.
- `PUT /rotas/:rotaId/escolas/ordem`: atualiza ordem das escolas.
- `GET /planejamentos`: lista planejamentos com filtros opcionais `guiaId` e `rotaId`.
- `POST /planejamentos`: cria planejamento guia/rota.
- `POST /planejamentos-avancado`: cria varios planejamentos para uma guia e lista de rotas.
- `PUT /planejamentos/:id`: atualiza data, responsavel, observacao e status.
- `DELETE /planejamentos/:id`: remove planejamento.
- `GET /planejamentos/:id/escolas-status`: lista status de escolas de um planejamento.
- `PUT /planejamentos/:id/escolas/:escolaId/status`: atualiza status/evidencia da escola.
- `GET /evidencias`: lista evidencias filtradas por planejamento, rota, status e periodo.
- `GET /escolas-disponiveis`: lista escolas ativas nao associadas a rotas ativas.
- `GET /escolas/:escolaId/verificar-rota`: informa se uma escola ja pertence a uma rota.

### Autenticacao e Permissoes

CONFIRMADO:

- Leituras principais de rotas, escolas da rota, planejamentos, evidencias e auxiliares exigem `authenticateToken` e `requireLeitura('rotas')`.
- Escritas de rotas, vinculos, ordem, planejamentos e status exigem `authenticateToken` e `requireEscrita('rotas')`.
- `GET /escolas-disponiveis` e `GET /escolas/:escolaId/verificar-rota` tambem exigem RBAC de leitura `rotas`.
- O backend aplica `requireLeitura('rotas')` e `requireEscrita('rotas')` por wrapper nomeado no arquivo de rotas.
- No frontend, as telas `/gestao-rotas` e `/gestao-rotas/:rotaId/escolas` sao protegidas por `LazyRoute moduloSlug="rotas"`.

### Modelo e Persistencia

CONFIRMADO:

- `RotaModel.ensureRotasSchema()` cria/garante tabelas em runtime: `rotas_entrega`, `rota_escolas`, `planejamento_entregas` e `entrega_escola_status`.
- A migration `20241216_create_rotas_entregas.sql` cria `rotas_entrega`, `rota_escolas`, `planejamento_entregas`, indices, trigger de `updated_at` e rotas-semente.
- `entrega_escola_status` aparece no `ensureRotasSchema`, mas nao na migration inicial analisada.
- Foreign keys adicionadas no runtime usam `NOT VALID` para evitar falha por dados historicos.
- `planejamento_entregas` possui unicidade por `(guia_id, rota_id)`.

### Regras de Negocio

CONFIRMADO:

- Criacao de rota exige `nome` nao vazio.
- `cor` padrao e `#1976d2`; `ativo` padrao e `true`.
- Edicao trimma `nome` e `descricao` quando enviados.
- Associar escola exige `rotaId` e `escolaId` numericos.
- O backend impede uma escola de estar associada a qualquer outra rota existente; a checagem nao filtra somente rotas ativas.
- Quando `ordem` nao e enviada, o backend usa `MAX(ordem) + 1` dentro da rota.
- Atualizacao de ordem roda em transacao e atualiza cada escola recebida em `escolasOrdem`.
- Status por escola aceita apenas `pendente`, `entregue` ou `nao_entregue`.
- Foto de evidencia pode ser enviada em base64; se credenciais S3 existirem, e feito upload para S3, senao o valor base64 fica armazenado como `foto_url`.
- Planejamento avancado cria um planejamento por rota selecionada; `itensSelecionados` nao gera relacao estrutural e aparece apenas como texto na observacao.

### Fluxo Web

CONFIRMADO:

- `GestaoRotas` carrega `rotaService.listarRotas`.
- A grade mostra cor, nome, descricao, total de escolas, status ativo/inativo e acoes.
- A tela filtra por status e ordena por nome, total de escolas ou status.
- O modal de rota cria/edita `nome`, `descricao`, `cor` e `ativo`.
- A acao "Gerenciar Escolas" navega para `/gestao-rotas/:id/escolas`.
- Exclusao exibe confirmacao de exclusao permanente e chama `rotaService.deletarRota`.
- `GerenciarEscolasRota` carrega rota, todas as escolas e escolas vinculadas em paralelo.
- A tela permite adicionar varias escolas, remover escola e reordenar por drag-and-drop com `@dnd-kit`.
- A UI filtra localmente apenas escolas que ja estao na rota atual; ela nao remove da lista escolas vinculadas a outras rotas antes de enviar ao backend.

### Fluxo Mobile

CONFIRMADO:

- `apps/entregador-native/src/api/rotas.ts` consome `/entregas/rotas` e `/entregas/rotas/:rotaId/escolas`.
- `RotasScreen` tenta montar lista via offline bundle e faz fallback para `listarRotas`.
- A tela aplica filtro vindo do QR Code salvo em `AsyncStorage` (`filtro_qrcode`) com suporte a todas as rotas, lista de rotas ou formato legado `rotaId`.
- O app calcula quantidade de escolas com pendencias a partir de projecao local e outbox.
- `RotaDetalheScreen` lista escolas da rota, calcula pendencias por escola, filtra busca por nome/endereco e abre `EscolaDetalhe`.
- Escolas sem pendencias podem ser ocultadas no detalhe da rota, conforme calculo da projecao de entrega.

### Dependencias

CONFIRMADO:

- `escolas`: origem das unidades visitadas e associadas a rotas.
- `guias`: base de planejamento de entrega por guia/rota.
- `entregas`: compartilhamento de base de API, evidencias, offline bundle e confirmacoes.
- `romaneio`/comprovantes: evidencias e status aparecem no ciclo operacional de entrega.
- `apps/entregador-native`: consumo operacional das rotas em campo.
- `AWS S3`: armazenamento opcional de foto de evidencia.

### Lacunas

- LACUNA: controller retorna mensagem "Rota desativada com sucesso", mas o model executa exclusao fisica de rota, associacoes e planejamentos.
- CONFIRMADO: backend aplica RBAC granular `rotas`; leituras usam `rotas` leitura e mutacoes usam `rotas` escrita, alinhado ao `moduloSlug="rotas"` do frontend.
- LACUNA: schema de rotas e garantido em runtime pelo model, duplicando responsabilidades de migration e podendo esconder drift de banco.
- LACUNA: `entrega_escola_status` nao aparece na migration inicial de rotas analisada.
- LACUNA: UI de gerenciamento de escolas diz que todas as escolas estao disponiveis, mas o backend bloqueia escola ja associada a qualquer rota.
- LACUNA: `listarEscolasDisponiveis` desconsidera apenas rotas ativas, enquanto `adicionarEscolaRota` bloqueia associacao em qualquer rota, inclusive inativa.
- LACUNA: `itensSelecionados` do planejamento avancado nao e persistido como relacao estruturada.

## Modulo: sistema

### Escopo

CONFIRMADO: `sistema` concentra infraestrutura funcional do produto: permissao granular por modulo, configuracao institucional, periodos/anos letivos, calendario letivo, dashboard, PNAE, notificacoes, disparos para escolas e eventos realtime. O modulo nao e uma unica tela; ele aparece como um conjunto de servicos transversais em `backend/src/modules/sistema`, telas em `frontend/src/modules/sistema/pages` e guards de permissao compartilhados.

### Rotas Backend Montadas

CONFIRMADO em `backend/src/routes/registerApiRoutes.ts`:

- `/api/permissoes`: modulos, niveis e permissoes diretas de usuario.
- `/api/instituicao`: dados da instituicao, logo e templates PDF.
- `/api/pnae`: dashboard, relatorios e valores per capita PNAE.
- `/api/periodos`: periodos/exercicios do sistema.
- `/api/calendario-letivo`, `/api/eventos`, `/api/periodos`, `/api/excecoes`: calendario letivo, eventos, periodos avaliativos e excecoes de dias letivos.
- `/api/dashboard`: estatisticas resumidas do dashboard.
- `/api/notificacoes`: inbox de notificacoes do usuario.
- `/api/disparos-notificacao`: campanhas/disparos para usuarios de escolas.
- `/api/events`: stream realtime por Server-Sent Events.

### Permissoes e Guards

CONFIRMADO:

- `PermissionGuard` protege rotas do frontend via `moduloSlug` e nivel minimo padrao `1`.
- `useUserPermissions` carrega `/usuarios/me/permissoes`, combina permissoes de funcao e permissoes diretas, e deixa permissoes diretas sobrescreverem as de funcao.
- Admin (`tipo === 'admin'`) e system admin (`isSystemAdmin`) bypassam guards de frontend e middlewares backend de permissao.
- `permissionMiddleware.ts` define niveis: `0 nenhum`, `1 leitura`, `2 escrita`, `3 total`.
- Backend busca permissao direta em `usuario_permissoes`; se nao houver, busca permissao da `funcao_id` em `funcao_permissoes`.
- Resultado de permissao fica em cache em memoria por 5 minutos.
- `definirPermissoesUsuario` substitui todas as permissoes diretas do usuario dentro de transacao e limpa cache desse usuario.

### Periodos do Sistema

CONFIRMADO:

- Todas as rotas de `/api/periodos` exigem `authenticateToken`; leituras exigem `periodos` leitura e mutacoes administrativas exigem `periodos` escrita.
- `listarPeriodos` agrega total de pedidos, guias e cardapios por periodo.
- `obterPeriodoAtivo` prioriza `usuarios.periodo_selecionado_id`; se ausente, retorna o periodo global `ativo=true`.
- Criacao exige `ano`, `data_inicio` e `data_fim`; rejeita ano duplicado.
- Periodo ativo nao pode ser ocultado.
- Periodo fechado nao pode ser ativado.
- Periodo ativo nao pode ser fechado nem deletado.
- Delecao de periodo e bloqueada quando houver pedidos, guias ou cardapios vinculados.
- Migration cria trigger para manter apenas um periodo ativo e triggers para atribuir `periodo_id` automaticamente a pedidos, guias e cardapios.

### Instituicao e Templates

CONFIRMADO:

- Rotas de instituicao exigem `authenticateToken`.
- `GET /api/instituicao` retorna a instituicao ativa mais recente; se nao existir, cria registro padrao com nome `Secretaria Municipal de Educacao`.
- `PUT /api/instituicao` atualiza dados cadastrais, secretario, departamento, templates e logo via upload multipart.
- Escritas de instituicao, logo base64 e templates exigem permissao de escrita `configuracoes`; leitura permanece autenticada para uso operacional em documentos.
- Upload de logo aceita `jpeg`, `jpg`, `png`, `gif` e `svg`, ate 5MB.
- Logo antiga em arquivo local e removida quando substituida por novo upload de arquivo.
- `POST /api/instituicao/logo-base64` salva logo base64 diretamente em `logo_url`.
- `PUT /api/instituicao/templates/:nome` atualiza chave especifica dentro de `pdf_templates`.

### Calendario Letivo

CONFIRMADO:

- Leituras de calendario/eventos/periodos avaliativos exigem `authenticateToken` e `calendario` leitura.
- Escritas exigem `authenticateToken` e `calendario` escrita.
- `calendario_letivo` define ano, data inicial/final, dias letivos obrigatorios, divisao do ano e dias da semana letivos.
- `eventos_calendario` representa feriados, recessos, reunioes, avaliacoes e outros eventos.
- `periodos_avaliativos` representa bimestres, trimestres ou semestres.
- `dias_letivos_excecoes` sobrescreve regra padrao para tornar dias letivos ou nao letivos.
- A migration valida data final maior que inicial e cria unicidade por ano letivo.

### Dashboard, PNAE e Notificacoes

CONFIRMADO:

- `/api/dashboard/stats` exige autenticacao e permissao de leitura `dashboard`; retorna totais de escolas, alunos e solicitacoes atendidas; usa cache `dashboard:stats`.
- `/api/pnae` exige autenticacao e aplica `requireLeitura('pnae')` ou `requireEscrita('pnae')`.
- PNAE consulta agricultura familiar, per capita, valores per capita, relatorios salvos e dashboard de conformidade.
- `/api/notificacoes` lista as 50 notificacoes mais recentes do usuario autenticado e total nao lido.
- Notificacoes so podem ser marcadas lidas ou excluidas quando pertencem ao usuario autenticado.
- `/api/disparos-notificacao` exige autenticacao e permissao `notificacoes`: leitura para listar e escrita para criar disparos.
- Disparo exige titulo, mensagem e alvo valido (`todas`, `modalidade`, `selecao`).
- Disparo e processado imediatamente: cria registro, seleciona usuarios de escola alvo e insere linhas em `notificacoes`; depois marca status como `enviado` ou `erro`.

### Realtime

CONFIRMADO:

- `/api/events` autentica token via header `Authorization: Bearer` ou query `?token=`.
- Token e validado com `jwt.verify(config.jwtSecret)`.
- Usuario autenticado e passado para `subscribeToRealtimeEvents`.
- Conexao fecha chamando `unsubscribe` no evento `req.close`.

### Bootstrap HTTP

CONFIRMADO:

- `backend/src/index.ts` cria o app Express, aplica CORS, JSON, compressao, paginacao, rate limit em `/api`, arquivos estaticos em `/uploads`, `/health`, `/debug-env` fora de producao, `/api/test-db`, `registerApiRoutes(app)`, rota raiz, 404 e error handler.
- `/health` ativo esta implementado diretamente em `index.ts`, nao por `backend/src/modules/sistema/routes/healthRoutes.ts`.
- `backend/src/routes/registerApiRoutes.ts` registra as rotas `/api/*`, incluindo `/api/events` por `realtimeRoutes`.
- `backend/src/modules/sistema/routes/monitoringRoutes.ts` existe no codigo, mas nao e montado por `registerApiRoutes.ts` no bootstrap atual.

### Frontend

CONFIRMADO:

- Rotas de sistema incluem `/dashboard`, `/modalidades`, `/configuracao-instituicao`, `/editor-templates-pdf`, `/pnae/dashboard`, `/gerenciamento-usuarios`, `/periodos`, `/calendario-letivo`, `/disparos-notificacao`.
- Cada rota usa `LazyRoute` e `PermissionGuard` com slugs especificos (`configuracoes`, `pnae`, `usuarios`, `periodos`, `calendario`, `notificacoes`, etc.).
- `GerenciamentoPeriodos` usa queries dedicadas para CRUD, ativar, fechar, reabrir e deletar periodos.
- `DisparosNotificacao` carrega escolas e modalidades para selecionar destinatarios.
- `frontend/src/services/configService.ts` chama endpoints `/configuracoes`, mas esses endpoints nao aparecem montados em `registerApiRoutes.ts` na versao analisada.

### Lacunas

- CONFIRMADO: `permissoesRoutes.ts` exige `authenticateToken` e `requireAdmin` nos endpoints legados de listar/alterar permissoes.
- LACUNA: `definirPermissoesUsuario` ignora permissoes com `nivel_permissao_id === 1` assumindo que esse ID e sempre "nenhum"; a regra depende de seed/ordem do banco, nao do campo `nivel`.
- DESCONTINUADO: divergencias ligadas a `tenant_id` em `usuario_permissoes` nao entram mais como prioridade porque o uso de tenant foi encerrado por decisao do produto.
- LACUNA: `periodosRoutes` e `calendarioLetivoRoutes` montam subrotas `/periodos`; como ambos entram em `registerApiRoutes`, ha sobreposicao semantica entre periodos do sistema e periodos avaliativos.
- LACUNA: `healthRoutes`, `monitoringRoutes`, `adminDataRoutes` e `systemAdminAuthRoutes` existem no modulo, mas nao aparecem montados em `registerApiRoutes.ts` analisado.
- LACUNA: `frontend/src/services/configService.ts` consome `/configuracoes`, mas nao ha rota correspondente montada em `registerApiRoutes.ts`.
- LACUNA: disparos de notificacao processam envio de forma sincrona no request atual; agendamento existe na tabela, mas controller atual cria somente envio imediato.
- CONFIRMADO: leitura de calendario/eventos no backend exige permissao `calendario`, alinhada ao `moduloSlug="calendario"` do frontend.

## Modulo: solicitacoes

### Escopo

CONFIRMADO: o modulo `solicitacoes` controla solicitacoes de alimentos feitas por usuarios de escola e respondidas pela secretaria. A escola cria solicitacoes com itens de produto; a secretaria visualiza por escola, aceita, recusa, aprova todos ou aprova emergencialmente um item criando/vinculando guias.

### Superficie Backend

CONFIRMADO:

- `registerApiRoutes.ts` monta `solicitacoesAlimentosRoutes` em `/api/solicitacoes-alimentos`.
- Todas as rotas usam `authenticateToken`.
- `GET /minhas`: lista solicitacoes da escola do usuario autenticado.
- `POST /`: cria solicitacao para a escola do usuario autenticado.
- `DELETE /:id`: cancela solicitacao propria da escola.
- `GET /`: lista todas as solicitacoes, com filtros opcionais `status` e `escola_id`.
- `GET /itens/:itemId/analise`: analisa estoque, cobertura por guias e sugestao de atendimento.
- `PATCH /itens/:itemId/aprovar-emergencial`: atende item via guia existente ou guia emergencial.
- `PATCH /itens/:itemId/aceitar`: aceita item pendente.
- `PATCH /itens/:itemId/recusar`: recusa item pendente com justificativa.
- `PATCH /:id/aprovar-tudo`: aceita todos os itens pendentes da solicitacao.

### Regras do Portal Escola

CONFIRMADO:

- Usuario precisa ter `escola_id`; caso contrario recebe erro de validacao.
- Criacao exige array `itens` nao vazio.
- Cada item precisa referenciar produto cadastrado, ativo, com quantidade positiva.
- Nome e unidade do item sao derivados do cadastro de produto/unidade; unidade cai para `UN` quando ausente.
- Ao criar, grava cabecalho em `solicitacoes` e itens em `solicitacoes_itens`.
- Ao criar, envia notificacao para admins via `criarNotificacao` com link `/solicitacoes-alimentos`.
- Cancelamento e permitido apenas para solicitacao da propria escola e somente quando status da solicitacao e `pendente`.
- Criacao e cancelamento publicam realtime no dominio `solicitacoes_alimentos`.

### Regras de Resposta da Secretaria

CONFIRMADO:

- Status de solicitacao que pode receber resposta: `pendente` ou `parcial`.
- Item aceito muda para `aceito`, recebe `respondido_por` e `respondido_em`.
- Item recusado exige `justificativa` nao vazia, muda para `recusado` e registra respondente.
- Aprovar tudo atualiza todos os itens `pendente` para `aceito`.
- Depois de cada resposta, `recalcularStatusSolicitacao` define:
  - `pendente` se todos continuam pendentes;
  - `parcial` se ha mistura de pendentes/respondidos ou aceitos e recusados;
  - `concluida` se todos respondidos sao aceitos/contemplados;
  - `cancelada` se nao ha aceitos/contemplados.
- Atualizacoes publicam realtime `solicitacoes_alimentos` com action `updated`.

### Atendimento Emergencial

CONFIRMADO:

- `SolicitacaoEmergencialService.analisarItem` calcula:
  - saldo central por `estoque_eventos` escopo `central`;
  - saldo da escola por `estoque_eventos` escopo `escola`;
  - cobertura pendente de guias abertas em `guia_produto_escola`;
  - quantidade sugerida e atendimento sugerido.
- `aprovarItemEmergencial` roda em transacao e bloqueia por `pg_advisory_xact_lock(produto_id)`.
- Item sem `produto_id` nao pode ser aprovado emergencialmente.
- Se guias abertas ja cobrem toda a quantidade solicitada, item vira `contemplado`, com `atendimento_tipo = 'guia_existente'`, `quantidade_aprovada = 0` e vinculo `guia_id`/`guia_produto_escola_id`.
- Se ha quantidade descoberta, valida quantidade aprovada maior que zero, menor/igual ao descoberto e menor/igual ao estoque central disponivel.
- Data prevista e obrigatoria para atendimento emergencial.
- O servico reutiliza uma `Guia Emergencial MM/AAAA` aberta da competencia ou cria uma nova guia aberta.
- Item emergencial e inserido ou somado em `guia_produto_escola` para a mesma guia/escola/produto/data.
- O item da solicitacao fica `aceito`, com `atendimento_tipo = 'emergencial'`, quantidade aprovada, data prevista e vinculo da guia.

### Frontend

CONFIRMADO:

- Portal escola `/portal-escola/solicitacoes` usa `listarMinhasSolicitacoes`, `criarSolicitacao` e `cancelarSolicitacao`.
- Tela principal `/solicitacoes-alimentos` lista solicitacoes agrupadas por escola, com contagem total e pendentes.
- Detalhe `/solicitacoes-alimentos/:escolaId` separa pendentes/historico, expande automaticamente solicitacoes pendentes/parciais e permite analisar, aprovar emergencialmente ou recusar itens.
- Status visual de item: `pendente`, `aceito`, `contemplado`, `recusado`; item pendente em solicitacao cancelada e exibido como `Cancelado`.
- Texto de decisao mostra "Guia emergencial" com quantidade/data ou "Atendido por guia existente".

### Persistencia

CONFIRMADO:

- `backend/migrations/migrar-solicitacoes-itens.js` cria as tabelas atuais `solicitacoes` e `solicitacoes_itens`.
- `backend/src/migrations/20260426_solicitacoes_emergenciais.sql` amplia `solicitacoes_itens` com `quantidade_aprovada`, `data_entrega_prevista`, `guia_id`, `guia_produto_escola_id`, `atendimento_tipo` e `observacao_aprovacao`.
- Existe script legado `criar-solicitacoes-alimentos.js` para tabela antiga `solicitacoes_alimentos`.

### Lacunas

- CONFIRMADO: rotas administrativas de listar/analisar solicitacoes exigem `authenticateToken` + `solicitacoes` leitura; aceitar, recusar, aprovar tudo e aprovar emergencialmente exigem `solicitacoes` escrita. Rotas do Portal Escola permanecem autenticadas e filtradas por `req.user.escola_id`.
- LACUNA: scripts de migration de `solicitacoes` sao JavaScript em `backend/migrations`, enquanto a extensao emergencial esta em `backend/src/migrations`; validar ordem de execucao nos ambientes.
- LACUNA: tabela antiga `solicitacoes_alimentos` ainda possui script de criacao, mas controller atual usa `solicitacoes` e `solicitacoes_itens`.
- LACUNA: aceitar item simples nao cria guia nem reserva estoque; apenas muda status do item.
- LACUNA: `aprovarTudo` aceita todos os itens pendentes sem analise de estoque/cobertura.
- LACUNA: criacao de solicitacao consulta produto ativo, mas nao valida saldo ou duplicidade de produto dentro da mesma solicitacao.

## Modulo: unidades

### Escopo

CONFIRMADO: `unidades` padroniza unidades de medida e conversoes entre massa, volume e unidade/embalagens. O modulo expõe API em `/api/unidades-medida`, serviço canônico em `backend/src/services/unidadesMedidaService.ts`, hooks/serviço frontend e um componente `UnidadeMedidaSelect`. O conceito também aparece em produtos, contratos, pedidos, estoque, guias e solicitações para preservar unidade usada em cada contexto.

### Superficie Backend

CONFIRMADO:

- `registerApiRoutes.ts` monta `unidadeMedidaRoutes` em `/api/unidades-medida`.
- `GET /api/unidades-medida`: lista unidades ativas, com filtro opcional `tipo`.
- `GET /api/unidades-medida/:identificador`: busca por id numerico ou por `codigo`, case-insensitive.
- `POST /api/unidades-medida/converter`: converte quantidade entre unidade origem e destino.
- `POST /api/unidades-medida/calcular-fator`: calcula fator de conversao para uso em contratos/produtos.
- Todas as rotas de `/api/unidades-medida` exigem `authenticateToken` e permissao de leitura `produtos`.

### Modelo de Dados

CONFIRMADO:

- `unidades_medida` possui `codigo`, `nome`, `tipo`, `unidade_base_id`, `fator_conversao_base`, `ativo`, timestamps.
- Tipos conhecidos no serviço: `massa`, `volume`, `unidade`.
- Massa usa grama como base: `G = 1`, `KG = 1000`, `MG = 0.001`, `T = 1000000`.
- Volume usa mililitro como base: `ML = 1`, `L = 1000`.
- Unidade usa unidade como base: `UN = 1`, `DZ = 12`, e embalagens como `CX`, `PCT`, `FD`, `SC`, `LT`, `GL`, `BD`, `MC`, `PT`, `VD`, `SH`, `BL`.
- A migration principal adiciona `produtos.unidade_medida_id` e `contrato_produtos.unidade_medida_compra_id`, além de migrar textos antigos para IDs quando possível.

### Conversao Backend

CONFIRMADO:

- `converterUnidade` retorna a quantidade original quando origem e destino sao iguais.
- Origem e destino precisam existir e estar ativos.
- Conversao entre tipos diferentes e rejeitada.
- Se ambas unidades possuem `fator_conversao_base`, converte origem para base e depois base para destino.
- Conversao envolvendo embalagem sem fator exige `pesoEmbalagem`.
- Origem embalagem para destino fixo: `(quantidade * pesoEmbalagem) / fator_destino`.
- Origem fixa para destino embalagem: `(quantidade * fator_origem) / pesoEmbalagem`.
- Conversao entre duas embalagens e rejeitada por falta de contexto.
- `calcularFatorConversao` retorna `1` para mesmas unidades; com fatores fixos retorna `destino.fator_conversao_base / origem.fator_conversao_base`; com embalagem/produto retorna `pesoEmbalagem / pesoProduto`; caso contrario retorna `1`.
- `normalizarUnidade` mapeia nomes/codigos textuais legados para codigos padronizados (`KG`, `G`, `L`, `ML`, `UN`, `DZ`, `CX`, `PCT`, etc.).

### Frontend

CONFIRMADO:

- `frontend/src/services/unidadesMedida.ts` encapsula listar, buscar, converter e calcular fator.
- `useUnidadesMedida(tipo)` usa query key `['unidades-medida', tipo]` e cache/stale time de 1 hora.
- `UnidadeMedidaSelect` usa autocomplete, agrupa opcoes por tipo e exibe `nome (codigo)`.
- `frontend/src/utils/fatorConversao.ts` implementa cálculo local heurístico para UI de contratos/importações:
  - mesma unidade => fator 1;
  - KG/G e L/ML com fatores fixos;
  - embalagens com peso para converter para G/KG/ML/L;
  - retorna `null` quando precisa de fator manual.

### Integrações e Persistência Histórica

CONFIRMADO:

- `produtos.unidade` foi adicionado por migration anterior como texto (`KG`, `L`, `UN`, etc.) e depois coexistiu com `unidade_medida_id`.
- `contrato_produtos.unidade`, `marca` e `peso` foram movidos para o nível do contrato porque um mesmo produto pode ter embalagens diferentes em contratos distintos.
- `pedido_itens` armazena `quantidade` em unidade de compra e campos de rastreabilidade: `quantidade_kg`, `unidade`, `quantidade_distribuicao`, `unidade_distribuicao`.
- `estoque_central_movimentacoes.unidade` preserva a unidade usada no momento da movimentação para não depender de futuras alterações no cadastro de produto.
- Views de estoque/faturamento foram ajustadas por migrations posteriores para usar `unidades_medida` ou campos de unidade disponíveis.

### Cache

CONFIRMADO:

- `listarUnidades` usa cache key fixa `unidades_medida:list:all`.
- `buscarUnidade` usa cache por identificador.
- Frontend também cacheia via React Query por `tipo`.

### Lacunas

- LACUNA: `listarUnidades` usa a mesma cache key `unidades_medida:list:all` mesmo quando recebe filtro `tipo`; uma listagem filtrada pode contaminar ou reutilizar cache de outra listagem.
- LACUNA: rotas de unidades nao possuem autenticação explícita; conversão/listagem ficam públicas dentro da API montada.
- LACUNA: existem duas estratégias convivendo: IDs padronizados em `unidades_medida` e campos textuais legados (`produtos.unidade`, `contrato_produtos.unidade`, `pedido_itens.unidade`).
- LACUNA: migration `20260323_criar_tabela_unidades_medida.sql` referencia IDs fixos para `unidade_base_id` nos inserts; isso depende da sequência gerada naquele ambiente.
- LACUNA: embalagens (`CX`, `PCT`, etc.) foram seedadas com `fator_conversao_base = 1`, mas o serviço usa ausência de fator para detectar embalagem variável; isso pode fazer conversões como se fossem unidade fixa.
- LACUNA: cálculo frontend de fator permite aproximação gramas ≈ mililitros para embalagens, assumindo densidade 1; backend rejeita conversão entre tipos diferentes.

## Modulo: usuarios

### Escopo

CONFIRMADO: `usuarios` cobre autenticação JWT, perfil atual, listagem simples de usuários, gerenciamento administrativo de usuários, funções, permissões diretas e verificação de conflitos de permissão. O módulo se integra diretamente ao sistema de RBAC documentado em `sistema`.

### Rotas Públicas e Perfil

CONFIRMADO:

- `registerApiRoutes.ts` monta `userRoutes` em `/api/usuarios` e `/api/auth`.
- `GET /api/usuarios/system-status`: retorna se o sistema já possui usuários.
- `POST /api/auth/login`: autentica usuário por email/senha.
- `GET /api/usuarios/me`: usa `authenticateToken` e retorna perfil do usuário do token.
- `GET /api/usuarios/me/permissoes`: usa `authenticateToken` e retorna permissões diretas e permissões herdadas por função.
- `GET /api/usuarios/`: lista id, nome, email, tipo, ativo e timestamps sem middleware declarado no arquivo de rotas.

### Login e Token

CONFIRMADO:

- Login exige `email` e `senha`.
- Busca usuário por email em `usuarios`.
- Senha é validada com `bcrypt.compare`.
- Erro de usuário inexistente ou senha inválida retorna mensagem genérica de autenticação.
- `isSystemAdmin` é calculado como `user.tipo === 'admin'`.
- JWT contém `id`, `tipo`, `email`, `nome`, `institution_id`, `escola_id`, `tipo_secretaria` e `isSystemAdmin`.
- `tipo_secretaria` cai para `educacao` quando ausente.
- Token expira conforme `config.jwtExpiresIn`.
- Frontend armazena token e valida sessão chamando `/usuarios/me`.
- `logout` limpa `token`, `user`, `perfil`, `nome`, emite evento `auth-changed` e redireciona para `/login` ou `#/login` no desktop.

### Administração de Usuários

CONFIRMADO:

- `adminUsuariosRoutes` é montado em `/api/admin`.
- Todas as rotas de `/api/admin` usam `authenticateToken` e `requireAdmin`.
- `requireAdmin` aceita `user.tipo === 'admin'` ou `user.isSystemAdmin`.
- `GET /admin/usuarios`: lista usuários com função e escola associadas.
- `POST /admin/usuarios`: cria usuário.
- `PUT /admin/usuarios/:id`: atualiza usuário e opcionalmente senha.
- `DELETE /admin/usuarios/:id`: exclui usuário fisicamente, exceto a própria conta do usuário autenticado.
- Criação exige `nome`, `email` e `senha`.
- Email duplicado é bloqueado.
- Senhas são hashadas com bcrypt custo 10.
- `tipo_secretaria` deve ser `educacao` ou `escola`.
- Se `tipo_secretaria` é `escola`, `escola_id` é obrigatório.
- Alterar `funcao_id` ou `tipo` limpa cache de permissões do usuário.

### Funções e Permissões

CONFIRMADO:

- `ensureAdminTables` cria/garante `funcoes`, `funcao_permissoes` e `usuarios.funcao_id` em runtime.
- `GET /admin/funcoes`: lista funções e permissões de cada função.
- `POST /admin/funcoes`: cria função e permissões em transação.
- `PUT /admin/funcoes/:id`: atualiza função e, se `permissoes` for enviado, substitui permissões da função em transação.
- Atualizar permissões de uma função limpa cache de permissões de todos os usuários vinculados.
- `DELETE /admin/funcoes/:id`: bloqueia exclusão quando há usuários usando a função.
- `GET /admin/modulos` e `/admin/niveis-permissao` fornecem dados auxiliares para UI.
- `GET /admin/usuarios/:id/permissoes` retorna permissões diretas e por função.
- `PUT /admin/usuarios/:id/permissoes` substitui permissões diretas em transação e limpa cache do usuário.
- `GET /admin/usuarios/:id/conflitos` calcula permissões efetivas e aponta conflitos de dependência.

### Verificação de Conflitos

CONFIRMADO:

- Permissões diretas têm prioridade sobre permissões de função no mapa efetivo.
- Usuário vinculado a escola deve ter leitura em `escolas`.
- Nutricionista deve ter leitura em `preparacoes`, `cardapios` e `produtos`.
- Almoxarife deve ter leitura em `estoque` e `produtos`.
- Escrita em `pedidos` requer leitura em `fornecedores` e `contratos`.
- Escrita em `faturamento` requer leitura em `pedidos`.
- Acesso a `demandas` requer leitura em `escolas`.
- Acesso a `cardapios` requer leitura em `produtos`.
- Para admin, permissões `nenhum` em módulos críticos são apenas informativas, pois admin tem bypass.

### Frontend

CONFIRMADO:

- `frontend/src/services/auth.ts` usa `/auth/login`, `/usuarios/me`, armazenamento local e evento `auth-changed`.
- `frontend/src/services/adminUsuarios.ts` encapsula `/admin/usuarios`, `/admin/funcoes`, `/admin/modulos`, `/admin/niveis-permissao`, permissões e conflitos.
- `GerenciamentoUsuarios.tsx` tem duas áreas principais: usuários e funções/permissões.
- Dialog de usuário tem abas de dados e permissões diretas; permissões diretas só ficam disponíveis para usuário existente.
- Dialog de função permite definir permissões por módulo e nível.
- Tela carrega escolas para vincular usuário a escola.

### Persistência

CONFIRMADO:

- `usuarios` possui base: `id`, `nome`, `email`, `senha`, `tipo`, `ativo`, timestamps.
- Migrations adicionam `escola_id`, `tipo_secretaria`, `periodo_selecionado_id` e `funcao_id`.
- `funcoes` e `funcao_permissoes` armazenam permissões herdadas.
- `usuario_permissoes` armazena permissões diretas por usuário e módulo.

### Lacunas

- LACUNA: `register` existe no controller, mas não está montado em `userRoutes.ts` analisado.
- LACUNA: `GET /api/usuarios/` lista usuários sem autenticação explícita no arquivo de rotas.
- CONFIRMADO: `userRoutes.ts` usa `authenticateToken` para `/me` e `/me/permissoes`, alinhado as rotas admin.
- DESCONTINUADO: validacoes multi-tenant de `usuario_permissoes` foram removidas da fila de hardening porque o produto nao usa mais tenant.
- LACUNA: exclusão admin de usuário é delete físico, enquanto `User.deleteUser` no model implementa soft delete; há duas semânticas de exclusão.
- LACUNA: login não verifica `ativo`; usuário inativo ainda pode autenticar se email/senha conferirem.
- LACUNA: `ensureAdminTables` cria estrutura de funções em runtime, duplicando responsabilidade das migrations.

## Modulo: apps/entregador-native

### Escopo

CONFIRMADO: `apps/entregador-native` e um app Expo/React Native para operacao de campo. Ele autentica entregadores, aplica filtros por QR Code, lista rotas/escolas/itens de entrega, confirma entregas com foto da mercadoria, mantem fila offline com sincronizacao posterior, exibe comprovantes, registra recebimentos de pedidos e opera estoque central.

### Stack e Entry Point

CONFIRMADO:

- `package.json` define app Expo `entregador-native`, React Native 0.74, Expo 51, React Navigation Stack, React Native Paper, AsyncStorage, NetInfo, Camera, FileSystem, Print e Sharing.
- `App.tsx` monta `PaperProvider`, `OfflineProvider`, `NavigationContainer` e um stack navigator.
- Tela inicial e `Login`.
- Telas principais registradas: `Home`, `Configuracoes`, `FiltroManual`, `OpcoesFiltro`, `Rotas`, `RotaDetalhe`, `EscolaDetalhe`, `Historico`, `Comprovantes`, `EstoqueCentral*`, `Recebimentos*` e `Romaneio`.

### Autenticacao e Cliente HTTP

CONFIRMADO:

- `src/api/client.ts` cria `axios` com `API_URL = 'https://gestaoescolar-backend.vercel.app/api'` e timeout de 30 segundos.
- Interceptor de request le `AsyncStorage.getItem('token')`, faz `JSON.parse` e injeta `Authorization: Bearer <token>`.
- Interceptor de response remove `token` do AsyncStorage em erro 401.
- `src/api/auth.ts` envia `POST /auth/login` com `email` e `senha`.
- Login aceita tanto resposta direta quanto envelope `{ success, data }`, retornando `data.data || data`.
- `LoginScreen` exige email/senha, salva o objeto de login inteiro em `AsyncStorage` sob a chave `token` e navega para `Home`.

### QR Code e Filtro de Entregas

CONFIRMADO:

- `QRScanner` solicita permissao de camera via `Camera.requestCameraPermissionsAsync`.
- Ao ler QR, chama `normalizeQrFilter` e grava o filtro em `AsyncStorage` com a chave `filtro_qrcode`.
- O filtro suporta formato completo e aliases curtos: `dataInicio|di|inicio`, `dataFim|df|fim`, `rotaIds|rids|r|rotaId`, `rotaNomes|rns`, `rotaNome|rn`.
- `rotaIds` aceita array, numero, string separada por virgulas, `todas` ou `*`.
- Filtro invalido e rejeitado quando faltam datas ou rotas selecionadas.
- `HomeScreen` le `filtro_qrcode`, mostra filtro ativo e direciona para `OpcoesFiltro`; sem filtro, abre scanner.

### Entregas Offline-First

CONFIRMADO:

- `OfflineProvider` monitora conectividade com `@react-native-community/netinfo`.
- Quando volta a ficar online, agenda sincronizacao apos 3 segundos, respeitando intervalo minimo de 5 segundos desde a ultima sincronizacao.
- Operacoes de entrega sao persistidas em `AsyncStorage` na chave `offline_queue`.
- Status da fila: `pending`, `syncing`, `failed_retryable`, `failed_needs_action`, `comprovante_pending`, `foto_pending`, `synced`.
- Operacoes `syncing` com mais de 2 minutos sao tratadas como stale e voltam a ser sincronizaveis.
- `enqueueDeliveryOperation` gera ou reutiliza `client_operation_id` e evita duplicar operacao aberta.
- `saveDeliveryOutboxOperations` remove operacoes `synced` antes de persistir.
- `mergeItemsWithOutbox` projeta entregas pendentes sobre itens cacheados: reduz saldo, incrementa entregue, insere historico offline com ID negativo estavel e expoe `offline_status`.
- `buildPendingComprovanteDrafts` monta comprovantes locais agrupados por `batch_id` ou por escola/entregador/recebedor/minuto.

### Cache e Projecoes

CONFIRMADO:

- `cacheService` usa prefixo `cache_` e validade padrao de 24 horas.
- Politicas especificas: rotas 10 minutos, escolas da rota 10 minutos, itens da escola 5 minutos, comprovantes 2 minutos.
- `applyDeliveryOfflineBundle` grava `rotas`, `escolas_rota_<rotaId>`, `itens_escola_<escolaId>`, `itens_escola_projection_<escolaId>` e `rota_projection_<rotaId>`.
- `delivery_sync_cursor` guarda o cursor de sincronizacao incremental.
- `syncRemoteDeliveryChanges` busca `/entregas/sync/mudancas`, agrupa itens por escola, mescla com cache local e atualiza projecoes.
- Projecoes por escola guardam `id`, `entrega_confirmada`, `saldo_pendente`, `data_entrega` e `latest_historico_entrega_date`.
- Projecoes por rota guardam escola e lista de projecoes dos itens para contagens rapidas.

### Fluxo de Rotas e Escolas

CONFIRMADO:

- `RotasScreen` tenta carregar `obterOfflineBundle()`; se falhar, usa `listarRotas`.
- Rotas sao filtradas pelo QR ativo: todas as rotas, lista de `rotaIds` ou fallback `rotaId`.
- Cada rota exibe quantidade de escolas com pendencias a partir de `rota_projection`.
- `RotaDetalheScreen` tenta `obterOfflineBundle({ rotaIds: [rotaId] })`; se falhar, usa `listarEscolasDaRota`.
- A tela recalcula contagens quando `syncVersion` muda.
- Escolas exibidas sao filtradas para manter apenas as com itens pendentes no filtro ativo.
- Menu da rota abre comprovantes e dialog de escolas entregues.
- Escola e considerada entregue na data quando todos os itens da projecao estao confirmados, sem saldo pendente, e a ultima entrega bate com a data alvo.

### Confirmacao de Entrega

CONFIRMADO:

- `EscolaDetalheScreen` carrega itens de `cache_itens_escola_<id>` e atualiza via `listarItensEscola` quando o cache esta ausente/stale.
- Itens sao filtrados por periodo do QR quando `data_entrega` existe.
- Abas separam pendentes e entregues.
- O operador seleciona itens, pode alterar quantidade e recebe alerta para entrega parcial/diferente.
- Revisao exige nome de recebedor, nome de entregador e foto da mercadoria.
- Nome do entregador vem do objeto salvo em `AsyncStorage.token`.
- Foto e capturada por `expo-camera`, copiada para `documentDirectory/delivery-photos/entrega-<timestamp>.jpg` e tem tamanho calculado por `expo-file-system`.
- Cada item finalizado recebe `client_operation_id`, dados de entrega e dados de comprovante com `batch_id`, escola, responsaveis, produto, quantidade, lote e foto local.
- Na pratica, o ramo atual sempre chama `addOperation` quando ha `clientOperationId`, portanto mesmo online a entrega entra na fila offline e depois sincroniza.
- Apos finalizar, o cache local da escola e atualizado, as projecoes sao recalculadas e a tela mostra sucesso antes de voltar.

### Sincronizacao de Entrega e Comprovante

CONFIRMADO:

- Primeira etapa sincroniza operacoes sem `historicoId` chamando `POST /entregas/itens/:itemId/confirmar`.
- Se houver dados de comprovante, o retorno precisa conter `historico_id`; sem ele a operacao vira `failed_retryable`.
- Segunda etapa agrupa operacoes com `historicoId` e `comprovanteData`, cria comprovante em `POST /entregas/comprovantes` via `fetch`.
- O comprovante offline envia escola, entregador, recebedor, observacao, assinatura opcional e lista de itens com `historico_entrega_id`.
- Se houver foto local, a operacao vai para `foto_pending`.
- Upload de foto pede URL assinada em `POST /entregas/comprovantes/:id/foto/upload-url`, envia `PUT` para a URL e confirma em `POST /entregas/comprovantes/:id/foto/confirmar`.
- Upload com `upload_token` usa formato Supabase assinado, adicionando `token` na query e headers `x-upsert`, `cache-control` e `content-type`.
- Erros HTTP 408, 429, 5xx ou sem status viram `failed_retryable`; demais erros viram `failed_needs_action`, exceto mensagens de saldo/infrastrutura classificadas como recuperaveis.

### Comprovantes

CONFIRMADO:

- `ComprovantesScreen` carrega comprovantes offline-first.
- Comprovantes pendentes sao montados da `offline_queue` para a data atual.
- Comprovantes do servidor sao buscados em `/entregas/comprovantes?data_inicio=<hoje>&data_fim=<hoje>` com token manual via `fetch`.
- Resultado do servidor e cacheado em `cache_comprovantes_<YYYY-MM-DD>`.
- Ao expandir comprovante, se houver `foto_local_uri`, mostra a imagem local; se o ID e negativo, indica foto aguardando envio; se for servidor, chama `GET /entregas/comprovantes/:id/foto`.

### Recebimentos Mobile

CONFIRMADO:

- `src/api/recebimentos.ts` encapsula listagem de pedidos pendentes/concluidos, fornecedores, itens, registro e historico de recebimentos.
- `RecebimentosScreen` lista pedidos pendentes e navega para fornecedores.
- `RecebimentosConcluidosScreen` lista pedidos concluidos e reutiliza o detalhe por fornecedores.
- `RecebimentoFornecedoresScreen` lista fornecedores do pedido e navega para itens.
- `RecebimentoItensScreen` registra recebimento com quantidade, observacoes, lote, fabricacao, validade e nota fiscal; depois recarrega os itens.
- Este fluxo usa HTTP direto e nao participa da fila offline de entregas.

### Estoque Central Mobile

CONFIRMADO:

- `src/api/estoqueCentral.ts` encapsula produtos, escolas, estoque central, entrada, simulacao de saida, saida, ajuste, transferencia, movimentacoes e alertas de estoque baixo.
- `listarEstoqueCentral` normaliza formatos de resposta (`estoque`, `data` ou array direto) e calcula `quantidade`, `quantidade_disponivel` e `quantidade_reservada`.
- Movimentacoes sao normalizadas para tipos `entrada`, `saida`, `transferencia`, `ajuste` ou tipo original; saidas/transferencias ficam negativas para exibicao.
- `EstoqueCentralScreen` lista estoque e navega para detalhes, relatorios e operacoes.
- `EstoqueCentralDetalhesScreen` recarrega estoque e ultimas movimentacoes, e abre entrada, saida, ajuste ou transferencia pre-selecionando o produto.
- Telas de entrada, saida, ajuste e transferencia chamam diretamente os endpoints correspondentes e voltam apos sucesso.
- `EstoqueCentralRelatoriosScreen` usa `expo-print` e `expo-sharing` para gerar e compartilhar PDFs de estoque e movimentacoes.
- Este fluxo tambem nao usa a fila offline.

### Lacunas

- LACUNA: `API_URL` esta fixo em producao no codigo; o bloco `__DEV__` esta comentado, reduzindo configurabilidade por ambiente.
- LACUNA: o interceptor 401 remove token, mas nao redireciona a navegacao para `Login`.
- LACUNA: em `EscolaDetalheScreen`, o ramo de envio direto online fica inalcancavel no fluxo atual porque `clientOperationId` sempre e criado e a condicao `if (clientOperationId)` sempre executa `addOperation`.
- LACUNA: a fila offline cobre entregas/comprovantes/fotos, mas nao cobre recebimentos nem operacoes de estoque central.
- LACUNA: `cacheService.set` compara dados via `JSON.stringify`, o que pode ser caro para bundles grandes.
- LACUNA: comprovantes sao listados apenas para a data atual em `ComprovantesScreen`, independentemente do periodo do filtro QR.
- LACUNA: o app usa `fetch` manual para alguns endpoints protegidos e `axios` para outros, duplicando tratamento de token e erro.
- LACUNA: textos e logs apresentam caracteres mojibake em varias telas, indicando problema de encoding em arquivos legados.

## Modulo: apps/estoque-escolar-mobile

### Escopo

CONFIRMADO: `apps/estoque-escolar-mobile` e um app Expo/React Native destinado ao gestor da escola para consultar e movimentar estoque escolar, visualizar historico, controlar lotes/validade e autenticar acesso por escola mais codigo de acesso.

### Stack e Entry Point

CONFIRMADO:

- `package.json` define Expo 54, React 19, React Native 0.81, React Navigation 7, Bottom Tabs, AsyncStorage 2.2, React Native Calendars, Vector Icons e Zod.
- `App.tsx` monta `SafeAreaProvider`, `ErrorBoundary`, `AuthProvider`, `AppNavigator` e `StatusBar`.
- `AppNavigator` usa `NavigationContainer`, stack sem header e bottom tabs.
- Fluxo autenticado exibe tabs `Estoque` e `Historico`.
- Fluxo nao autenticado exibe `LoginGestor`.
- `ValidadeScreen.tsx` existe, mas nao esta registrado no navigator analisado.

### Configuracao de API e Storage

CONFIRMADO:

- `src/config/api.ts` fixa `BASE_URL` em `https://gestaoescolar-backend.vercel.app`.
- `API_ENDPOINTS` centraliza endpoints de auth, usuarios, escolas, produtos, estoque, fornecedores, contratos, pedidos, recebimento simples e estoque escolar.
- `src/services/api.ts` usa `fetch` manual, injeta `Authorization` quando ha token em `auth_token` e remove token em erro 401.
- `src/utils/storage.ts` usa `localStorage` no web e `@react-native-async-storage/async-storage` no iOS/Android; se AsyncStorage falhar, cai para fallback web.
- `DEV_CONFIG.ENABLE_LOGS` fica falso e `NETWORK_DELAY` zero.

### Autenticacao de Gestor Escolar

CONFIRMADO:

- `LoginGestorScreen` possui duas etapas: selecionar escola e informar codigo de acesso de 6 digitos.
- Escolas sao carregadas por `GET /api/gestor-escola/escolas`.
- Autenticacao usa `POST /api/gestor-escola/autenticar` com `escola_id` e `codigo_acesso`.
- Sucesso retorna escola e token; o token e salvo em `auth_token`.
- `salvarSessaoGestor` grava `gestor_escola` com escola, token, codigo de acesso e timestamp.
- Sessao de gestor expira localmente em 24 horas.
- `AuthContext` monta um usuario sintetico `Gestor - <escola.nome>`, email gerado e perfil `GESTOR`.
- `logout` limpa token e sessao `gestor_escola`.
- `apiService.login` legado existe, consulta `/api/usuarios`, valida senhas hardcoded `admin123` ou `123456` e gera `mock_token`; o fluxo principal do navigator usa `loginGestor`.

### Estoque Escolar

CONFIRMADO:

- `useEstoque` resolve `escolaId` da sessao do gestor quando nao recebe parametro.
- `carregarItens` chama `apiService.listarEstoqueEscola(escolaId)`.
- `listarEstoqueEscola` chama `/api/estoque-escola/escola/:escolaId`, usa `response.data || []` e, para cada item, busca lotes do produto por `/api/estoque-escola/produtos/:produtoId/lotes`.
- O mapeamento normaliza quantidade, limites, status, produto, escola, datas de validade/entrada e calcula proximo vencimento, dias para vencimento e flags de lotes vencidos/criticos.
- `obterResumoEstoque` chama `/api/estoque-escola/escola/:escolaId/resumo` e retorna fallback zerado em erro.
- `EstoqueScreen` exibe cards de resumo: normal, baixo e sem estoque.
- Lista permite busca por nome, filtro por status e ordenacao por quantidade crescente/decrescente ou ordenacao padrao por status/quantidade/nome.
- Item abre detalhes, historico, entrada simples, saida inteligente ou ajuste por lotes.

### Movimentacoes e Lotes

CONFIRMADO:

- `apiService.atualizarQuantidadeItem` faz POST em `/api/estoque-escola/escola/:escolaId/movimentacao` quando nao ha lotes.
- Com lotes, faz POST em `/api/estoque-escola/escola/:escolaId/movimentacao-lotes`.
- `processarMovimentacaoLotes` encapsula o endpoint de lotes.
- `criarLote` faz POST em `/api/estoque-escola/lotes`.
- `atualizarLoteItens` faz PUT em `/api/estoque-escola/escola/:escolaId/lote`.
- `EstoqueScreen.confirmarEntrada` registra entrada diretamente via `fetch` fixo para producao em `/api/estoque-escola/escola/:escolaId/movimentacao`, sem usar `apiService.request` nem token.
- `apiService.movimentarEstoque`, `adicionarItemEstoque`, `atualizarItemEstoque` e `excluirItemEstoque` possuem implementacoes simuladas/local-only marcadas como backend somente leitura.

### Historico

CONFIRMADO:

- `useEstoque.carregarHistorico` chama `apiService.listarHistoricoMovimentos(escolaId, limit, offset)` com limite 10.
- `listarHistoricoMovimentos` chama `/api/estoque-escola/escola/:escolaId/historico` com `limit` e `offset`.
- `HistoricoScreen` carrega historico ao montar, permite pull-to-refresh e paginacao com `onEndReached`.
- Filtros locais incluem nome do produto, tipo de movimento (`todos`, `entrada`, `saida`, `ajuste`) e periodo com calendario.
- Exibicao normaliza tipo por `tipo_movimentacao || tipo_movimento`, data por `data_movimentacao || data_movimento`, e quantidade por `quantidade_movimentada || quantidade`.

### Validade, Datas e Validacoes

CONFIRMADO:

- `dateUtils.ts` cria datas locais extraindo `YYYY-MM-DD` para evitar deslocamento por UTC.
- `calcularDiasParaVencimento` calcula dias entre hoje e validade.
- `converterParaFormatoAPI` converte `Date` ou string para `YYYY-MM-DD`.
- `validation.ts` define schemas Zod para login, movimentacao, lotes, entrada simples, saida inteligente, filtros, sincronizacao, configuracao local e relatorios.
- `validateQuantidadeMovimentacao` bloqueia quantidade <= 0 e saida maior que estoque atual.
- `validateDataValidade` invalida validade anterior a hoje e alerta quando vence em ate 7 dias.

### Sincronizacao Offline

CONFIRMADO:

- `useSyncManager` declara fila offline em `AsyncStorage` na chave `@sync_pending_items`.
- Cada item de sync tem `id`, `type` (`entrada`, `saida`, `ajuste`), `data`, `timestamp`, `tentativas` e erro opcional.
- Guarda ultimo sync em `@last_sync`.
- Monitora conectividade via `@react-native-netinfo/netinfo`.
- Config padrao: auto sync ligado, intervalo 5 minutos, max 3 tentativas, lote de 10.
- `syncSingleItem` chama `apiService.movimentarEstoque` para entrada/saida/ajuste.
- Itens com maximo de tentativas excedido sao removidos da fila e registrados em `errors`.

INFERIDO:

- `useSyncManager` nao aparece referenciado nas telas ou hooks lidos; portanto a fila offline pode estar disponivel mas nao conectada ao fluxo principal de estoque.

### Lacunas

- LACUNA: `API_CONFIG.BASE_URL` esta fixo em producao; nao ha selecao efetiva por ambiente.
- LACUNA: `LoginGestorScreen.verificarSessaoAtiva` navega para `EstoqueEscola`, mas o navigator analisado nao registra essa rota.
- LACUNA: `ValidadeScreen` existe, mas nao aparece no `AppNavigator`.
- LACUNA: `useSyncManager` importa `@react-native-netinfo/netinfo`, mas essa dependencia nao aparece em `package.json`.
- LACUNA: `useSyncManager` nao e usado pelo fluxo principal lido; estoque opera online direto ou por metodos simulados.
- LACUNA: `confirmarEntrada` em `EstoqueScreen` usa `fetch` direto com URL absoluta e sem header `Authorization`, divergindo do `apiService`.
- LACUNA: parte do CRUD/movimentacao em `apiService` e simulada como backend somente leitura, mas telas podem tratar como operacao real.
- LACUNA: `apiService.verificarSessao` valida apenas `mock_token_`; tokens reais de gestor sao recuperados por `gestor_escola`, nao por endpoint de sessao.
- LACUNA: `useEstoque.excluirItem` nao inclui `escolaId` nas dependencias do callback, embora use a variavel no guard.
- LACUNA: textos apresentam mojibake em varios arquivos, sugerindo problema de encoding herdado.

## Modulo: desktop

### Escopo

CONFIRMADO: `desktop` implementa a camada Electron do NutriLog: cria a janela principal, injeta uma API segura no renderer via preload, coordena URLs do backend, inicia o backend local no app empacotado, trata downloads/arquivos gerados e fornece acoes nativas como logs, reload, devtools e dialogo "Sobre".

### Entry Point e Janela

CONFIRMADO:

- `desktop/main.cjs` importa `app`, `BrowserWindow`, `dialog`, `ipcMain`, `session` e `shell` do Electron.
- `isDev` e verdadeiro quando `!app.isPackaged` e `ELECTRON_FORCE_PACKAGED !== '1'`.
- Define `process.env.ELECTRON_IS_DEV` como `1` ou `0`.
- Nome do app: `NutriLog`.
- Janela inicial: 1480x920, minimo 1200x760, centralizada, menu auto-oculto e `show: false`.
- `webPreferences`: `preload`, `contextIsolation: true`, `nodeIntegration: false`.
- A janela so e revelada depois de `ready-to-show`; `revealMainWindow` chama restauracao imediata e repetida em 100ms e 500ms.
- `restoreVisibleWindow` restaura se minimizada, corrige tamanho muito pequeno, recentraliza coordenadas fora da tela, mostra, move para topo no Windows e foca.

### Renderer

CONFIRMADO:

- `resolveRendererEntry` prioriza `ELECTRON_RENDERER_URL`.
- Em dev, carrega `http://127.0.0.1:5173`.
- Empacotado carrega `frontend/dist/index.html`.
- `setWindowOpenHandler` bloqueia novas janelas e abre URLs externas com `shell.openExternal`.

### Backend Desktop

CONFIRMADO:

- Porta padrao do backend desktop: `3131`.
- `DESKTOP_BACKEND_PORT` sobrescreve a porta quando valido entre 1 e 65535.
- URLs empacotadas: `http://127.0.0.1:<port>/api` e `/health`.
- Em dev, renderer usa `DESKTOP_API_BASE_URL`, `VITE_API_URL` ou fallback `http://localhost:3000/api`; health usa `DESKTOP_HEALTH_URL`, `VITE_HEALTH_URL` ou `http://localhost:3000/health`.
- `configureDesktopUrls` define `DESKTOP_API_BASE_URL` e `DESKTOP_HEALTH_URL` no processo quando ausentes.
- Em dev, `resolveDesktopEnvFiles` le `backend/.env`.
- Empacotado tenta ler `nutrilog.env` ao lado do executavel e em `app.getPath('userData')`.
- `startBackendWarmup` nao inicia backend em dev.
- Empacotado chama `startBackend` com `appRoot`, env files e logs em `userData/logs`.
- Backend empacotado executa `backend/dist/index.js` usando `process.execPath` com `ELECTRON_RUN_AS_NODE=1`.
- Backend dev executaria `backend/src/index.ts` via `backend/node_modules/.bin/tsx(.cmd)`.
- Ambiente do backend inclui env files, env base, `PORT`, `HOST=127.0.0.1`, `NODE_ENV` padrao `desktop`, `DESKTOP_APP=1` e `ELECTRON_RUN_AS_NODE=1`.
- Health check tenta ate 90 segundos no warmup empacotado; helper padrao tem timeout 30s, intervalo 500ms e request timeout 2s.
- Falha de startup renderiza uma pagina HTML local explicando que o backend nao ficou disponivel e exibe a mensagem escapada.
- `shouldBlockRendererForBackend` retorna sempre `false`; portanto o renderer nao bloqueia esperando o backend ficar saudavel.

### Preload e Ponte Segura

CONFIRMADO:

- `preload.cjs` expoe `window.desktopShell` com `contextBridge.exposeInMainWorld`.
- Dados expostos: `isDesktop`, `isDev`, `platform`, `apiBaseURL`, `healthURL`.
- Acoes expostas:
  - `openExternal(url)`;
  - `showItemInFolder(filePath)`;
  - `openLogsFolder()`;
  - `reloadApp()`;
  - `toggleDevTools()`;
  - `showAboutDialog()`;
  - `saveGeneratedFile(payload)`;
  - listeners para download completo, cancelado e falho;
  - `setTitleBarTheme(mode)`.
- Tema de titlebar so aceita `light`; demais valores viram `dark`.

### IPC e Acoes Nativas

CONFIRMADO:

- `desktop-titlebar-theme` aplica tema na janela de origem ou principal.
- `desktop-reload-app` recarrega a janela.
- `desktop-toggle-devtools` so executa em dev.
- `desktop-open-logs-folder` abre `userData/logs`.
- `desktop-show-about` mostra dialog com nome do app, versao, Electron e texto "Sistema de Gestao Escolar".
- `desktop-save-generated-file` usa dialog nativo para gravar payload enviado pelo renderer.

### Downloads e Arquivos Gerados

CONFIRMADO:

- `downloads.cjs` sanitiza nome usando `path.basename`; fallback `arquivo-gerado`.
- Filtros do dialog sao inferidos por MIME ou extensao: PDF, Excel/XLSX, CSV ou todos.
- `registerDownloadSaveDialog` intercepta `session.defaultSession.on('will-download')`.
- O usuario escolhe caminho via `showSaveDialogSync`; se cancelar, o download e cancelado e o renderer recebe `desktop-download-cancelled`.
- Ao completar, envia `desktop-download-complete` com `fileName` e `filePath`.
- Falha nao cancelada envia `desktop-download-failed`.
- `saveGeneratedFile` abre `showSaveDialog`, grava `payload.data` como Buffer com encoding `base64` quando indicado, e emite eventos de sucesso/cancelamento/falha.

### Aparencia da Janela

CONFIRMADO:

- Altura da titlebar overlay: 32.
- Tema escuro: fundo `#090a0c`, simbolos `#f3f4f6`.
- Tema claro: fundo `#ece4d5`, simbolos `#1f2430`.
- `darwin` usa `titleBarStyle: hiddenInset`.
- Windows/Linux usam `titleBarStyle: hidden` e `titleBarOverlay`.
- Outras plataformas usam `titleBarStyle: default`.
- `applyTitleBarTheme` atualiza `backgroundColor` e, quando suportado, `setTitleBarOverlay`.

### Encerramento

CONFIRMADO:

- `app.activate` recria janela se nao houver nenhuma ou revela a janela principal.
- `window-all-closed` encerra o app exceto no macOS.
- `before-quit` mata o processo backend se existir.

### Testes Existentes

CONFIRMADO:

- `backend-service.test.cjs` cobre porta, URLs dev/packaged, bloqueio de renderer, entrypoint e env.
- `downloads.test.cjs` cobre filtros e salvamento de arquivo gerado.
- `window-actions.test.cjs` cobre dialogo sobre, logs, reload e devtools.
- `window-appearance.test.cjs` cobre cores, overlay e estilos por plataforma.

### Lacunas

- LACUNA: `shouldBlockRendererForBackend` retorna sempre `false`; a UI pode carregar antes do backend empacotado estar pronto.
- LACUNA: `renderStartupError` pode ser chamado depois que o renderer ja carregou, substituindo a tela se o health falhar.
- LACUNA: `stopBackend` usa apenas `child.kill()` sem espera/timeout; encerramento gracioso depende do backend tratar o sinal.
- LACUNA: `preload.cjs` expoe `shell.openExternal` diretamente com qualquer string; a validacao de URL fica fora da ponte.
- LACUNA: `saveGeneratedFile` transforma `payload.data` em string antes de Buffer; payloads binarios grandes podem ter custo de memoria.
- LACUNA: env files empacotados (`nutrilog.env`) sao lidos por parser simples sem suporte a escapes, `export` ou multiline.

## Modulo: shared

### Escopo

CONFIRMADO: `shared` e o pacote local `@alimentacao-escolar/shared-types`, contendo definicoes TypeScript compartilhadas para usuarios, escolas, produtos, estoque, demandas, configuracoes, respostas de API, filtros, relatorios, estatisticas, mobile, multi-tenant e eventos. O pacote nao contem servicos de runtime, exceto classes de erro tenant.

### Estrutura e Build

CONFIRMADO:

- `shared/package.json` define nome `@alimentacao-escolar/shared-types`, versao `1.0.0`, `main` e `types` apontando para `types/index.ts`.
- Scripts: `build` executa `tsc`; `watch` executa `tsc --watch`.
- Dev dependency: `typescript ^5.4.4`.
- Peer dependency: `typescript >=4.0.0`.
- `tsconfig.json` usa `target ES2020`, `module ESNext`, `moduleResolution node`, `strict: true`, gera declarations e declaration maps em `dist`.
- `include` cobre `types/**/*`; `exclude` remove `node_modules` e `dist`.
- Codigo ativo encontrado: apenas `shared/types/index.ts`.

### Tipos Basicos

CONFIRMADO:

- `ID = number`.
- `DateString = string`, documentada como string ISO.
- `Status = 'ativo' | 'inativo'`.
- Esses aliases sao reutilizados nos contratos de entidades e filtros.

### Usuarios e Autenticacao

CONFIRMADO:

- `TipoUsuario = 'admin' | 'gestor' | 'escola'`.
- `Usuario` contem `id`, `nome`, `email`, `tipo`, `escola_id`, `ativo`, `created_at`, `updated_at`.
- `UsuarioCreate` exige `nome`, `email`, `senha`, `tipo` e aceita `escola_id`, `ativo`.
- `UsuarioUpdate` torna `nome`, `email`, `tipo`, `escola_id`, `ativo` opcionais.
- `LoginCredentials` contem `email` e `senha`.
- `AuthResponse` contem `success`, `token`, `user` e `message`.

### Escolas e Produtos

CONFIRMADO:

- `Escola` define cadastro escolar com `codigo`/INEP, endereco, municipio, maps, contato, gestor, administracao, ativo e timestamps.
- `EscolaCreate` replica os campos criaveis; `EscolaUpdate` e `Partial<EscolaCreate>`.
- `Produto` define `nome`, `descricao`, `unidade`, `categoria`, `ativo` e timestamps.
- `ProdutoCreate` exige `nome`, `unidade`, `categoria`; `ProdutoUpdate` e parcial.

### Estoque e Ledger

CONFIRMADO:

- `TipoMovimentacao = 'entrada' | 'saida' | 'ajuste'`.
- `StatusEstoque = 'sem_estoque' | 'baixo_estoque' | 'normal' | 'alto_estoque'`.
- `StatusLote = 'ativo' | 'esgotado' | 'vencido' | 'cancelado'`.
- `OrigemEventoEstoque` cobre recebimento, transferencia, portal escola, operador central, sistema e estorno.
- `TipoEventoEstoque` cobre recebimento central, transferencia para escola, entrada manual escola, saida central, saida escola, ajuste e estorno.
- `ModoOperacaoEstoqueEscola = 'escola' | 'central' | 'hibrido'`.
- `EstoqueEvento` representa ledger append-only com escopo central/escola, produto, lote, evento, origem, delta, quantidade absoluta, referencia, usuario snapshot e estorno.
- `EstoqueOperacaoEscola` configura modo operacional por escola e permissao de ajuste/lancamento central.
- `EstoqueEscola` representa saldo por escola/produto com datas, produto/escola relacionados e status calculado.
- `EstoqueLote` representa lote por produto com quantidade inicial/atual, fabricacao, validade, fornecedor e status.
- `MovimentacaoEstoque` representa movimento escolar com saldos anterior/posterior e dados relacionados.
- `MovimentacaoCreate` e payload simplificado para criar movimento.

### Estoque Escolar Agregado

CONFIRMADO:

- `EstoqueEscolarResumo` agrega um produto por todas as escolas com total de quantidade, escolas com estoque e total de escolas.
- `EstoqueEscolarDetalhado` expande o resumo com lista de `EstoqueEscolaProduto`.
- `EstoqueEscolaProduto` guarda escola, produto, quantidade, unidade, status e data de ultima atualizacao.

### Demandas e Configuracoes

CONFIRMADO:

- `StatusDemanda = 'pendente' | 'aprovada' | 'recusada' | 'atendida'`.
- `AcaoDemanda = 'aprovar' | 'recusar' | 'atender'`.
- `Demanda` cobre oficio, data, objeto, descricao dos itens, status, recusa, resposta, usuario responsavel e dados relacionados.
- `DemandaCreate`, `DemandaUpdate` e `DemandaAcao` definem payloads de criacao/atualizacao/acao.
- `TipoConfiguracao = 'string' | 'number' | 'boolean' | 'json'`.
- `Configuracao` define chave/valor/tipo/timestamps; create e update derivam dela.

### Respostas, Filtros e Relatorios

CONFIRMADO:

- `ApiResponse<T>` define envelope com `success`, `data`, `message`, `error`, `errors`.
- `ApiListResponse<T>` estende envelope para listas e adiciona `total`, `page`, `limit`.
- `PaginationParams` inclui `page`, `limit`, `search`, `sort`, `order`.
- `DateRangeParams` inclui `data_inicio` e `data_fim`.
- `FiltroEstoque`, `FiltroValidade` e `FiltroHistorico` padronizam filtros por produto/escola/status/tipo/data.
- `FormatoRelatorio = 'pdf' | 'excel' | 'csv'`.
- `RelatorioEstoque`, `RelatorioValidade` e `RelatorioMovimentacao` definem parametros para exportacoes.
- `EstatisticasEstoque` e `EstatisticasEscola` definem contadores consolidados.

### Mobile, Validacao, Tenants e Eventos

CONFIRMADO:

- `ConfiguracaoLocal` representa configuracao de app mobile: escola, servidor, token, sync automatico, intervalo e modo offline.
- `SincronizacaoStatus` representa ultima sincronizacao, flag de sync, erro e itens pendentes.
- `ValidationError` e `ValidationResult<T>` padronizam retorno de validacao.
- `TenantSettings` define features, branding, notificacoes e integracoes.
- `TenantLimits` define limites de usuarios, escolas, produtos, storage, API, contratos e pedidos.
- `Tenant` contem slug, subdomain, settings, limits, ativo e timestamps.
- `TenantErrorCode` lista erros tenant.
- Classes `TenantError`, `TenantNotFoundError`, `TenantInactiveError`, `CrossTenantAccessError`, `TenantLimitExceededError`, `TenantSlugConflictError` e `TenantSubdomainConflictError` estendem `Error`.
- `TipoEvento` cobre estoque baixo, produto vencido/critico, movimentacao e demanda criada.
- `Evento` representa notificacao/evento com dados livres, lido e usuario.

### Uso no Projeto

CONFIRMADO:

- Busca textual encontrou referencias a `@alimentacao-escolar/shared-types` somente em `_reversa_sdd/dependencies.md` e `shared/package.json`.
- Busca por `shared/types` encontrou referencias em inventario e plano de implementacao em `docs/superpowers`, mas nao importacoes no codigo ativo analisado.
- O pacote parece documentar contratos pretendidos/compartilhados, mas nao esta integrado como dependencia importada nos modulos atuais.

### Lacunas

- LACUNA: nao foram encontradas importacoes ativas de `@alimentacao-escolar/shared-types`; os tipos podem estar desatualizados em relacao ao codigo real.
- LACUNA: `package.json` aponta `main` para `types/index.ts`, nao para build em `dist`; consumidores Node/runtime nao deveriam importar esse pacote em execucao.
- DESCONTINUADO: validacoes sobre estruturas multi-tenant nao bloqueiam a producao atual porque o uso de tenant foi encerrado por decisao do produto.
- LACUNA: `TipoUsuario` nao inclui todos os tipos vistos em modulos de usuarios/RBAC, como funcoes dinamicas ou variantes de secretaria.
- LACUNA: `StatusEstoque` usa `baixo_estoque` e `alto_estoque`, enquanto apps e backend tambem usam valores como `baixo`, `alto`, `vencido`, `critico`, `atencao`.
- LACUNA: `TipoMovimentacao` nao inclui `transferencia`, embora historicos e apps mobile usem esse tipo.
- LACUNA: `AuthResponse` usa campo `user`, enquanto backend e frontend documentados frequentemente usam `data`/`usuario` ou envelopes diferentes.
- LACUNA: classes de erro tenant usam mensagens em ingles, enquanto o restante do projeto esta em portugues.
