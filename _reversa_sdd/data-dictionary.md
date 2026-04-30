# Dicionario de Dados - gestaoescolar

Gerado pelo Reversa Archaeologist em 2026-04-29.

Escala de confianca:

- CONFIRMADO: extraido diretamente do codigo.
- INFERIDO: baseado em padroes do projeto.
- LACUNA: requer validacao humana.

## Modulo: abastecimento

### `FlowStepId`

Arquivo: `frontend/src/modules/abastecimento/status.ts`

| Campo/Valor | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `guia` | literal string | sim | Etapa de guias de demanda | CONFIRMADO |
| `compra` | literal string | sim | Etapa de compras/pedidos | CONFIRMADO |
| `entrega` | literal string | sim | Etapa de entregas | CONFIRMADO |
| `documentos` | literal string | sim | Etapa de romaneio e comprovantes | CONFIRMADO |

### `ABASTECIMENTO_FLOW_STEPS`

Arquivo: `frontend/src/modules/abastecimento/status.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `FlowStepId` | sim | Identificador da etapa | CONFIRMADO |
| `title` | `string` | sim | Titulo exibido na UI | CONFIRMADO |
| `path` | `string` | sim | Rota aberta pelo atalho | CONFIRMADO |
| `description` | `string` | sim | Texto explicativo da etapa | CONFIRMADO |

Valores confirmados:

| id | title | path | description |
| --- | --- | --- | --- |
| `guia` | `Guias de Demanda` | `/guias-demanda` | Revisar escolas, produtos, quantidades e status. |
| `compra` | `Compras / Pedidos` | `/compras` | Gerar e acompanhar pedidos vinculados as guias. |
| `entrega` | `Entregas` | `/entregas` | Executar entrega por guia, escola e rota. |
| `documentos` | `Romaneio e Comprovantes` | `/romaneio` | Emitir documentos e consultar comprovantes. |

### `ABASTECIMENTO_STATUS`

Arquivo: `frontend/src/modules/abastecimento/status.ts`

| Grupo | Status | Label | Cor MUI | Confianca |
| --- | --- | --- | --- | --- |
| `guia` | `aberta` | `Em revisao` | `warning` | CONFIRMADO |
| `guia` | `fechada` | `Concluida` | `success` | CONFIRMADO |
| `guia` | `cancelada` | `Cancelada` | `error` | CONFIRMADO |
| `itemGuia` | `pendente` | `Pendente` | `warning` | CONFIRMADO |
| `itemGuia` | `programada` | `Programada` | `info` | CONFIRMADO |
| `itemGuia` | `parcial` | `Parcial` | `warning` | CONFIRMADO |
| `itemGuia` | `entregue` | `Entregue` | `success` | CONFIRMADO |
| `itemGuia` | `cancelado` | `Cancelado` | `error` | CONFIRMADO |
| `pedido` | `pendente` | `Pendente` | `warning` | CONFIRMADO |
| `pedido` | `recebido_parcial` | `Recebido parcial` | `info` | CONFIRMADO |
| `pedido` | `concluido` | `Concluido` | `success` | CONFIRMADO |
| `pedido` | `suspenso` | `Suspenso` | `secondary` | CONFIRMADO |
| `pedido` | `cancelado` | `Cancelado` | `error` | CONFIRMADO |

### `GuiaResumo`

Arquivo: `frontend/src/modules/abastecimento/pages/Abastecimento.tsx`

| Campo | Tipo | Obrigatorio | Default/Fallback | Descricao | Confianca |
| --- | --- | --- | --- | --- | --- |
| `guia_id` | `number` | sim | nenhum | Identificador da guia usada na navegacao de detalhe | CONFIRMADO |
| `mes` | `number` | sim | nenhum | Mes da guia | CONFIRMADO |
| `ano` | `number` | sim | nenhum | Ano da guia | CONFIRMADO |
| `guia_nome` | `string` | nao | `Guia MM/AAAA` | Nome exibido para a guia | CONFIRMADO |
| `guia_status` | `string` | nao | `Sem status` via status helper | Status bruto da guia | CONFIRMADO |
| `total_itens` | `number` | nao | `0` | Quantidade de itens usada em metricas e subtitulo | CONFIRMADO |
| `total_escolas` | `number` | nao | `0` | Quantidade de escolas usada no subtitulo | CONFIRMADO |
| `qtd_pendente` | `number` | nao | nao usado diretamente | Quantidade pendente | CONFIRMADO |
| `qtd_entregue` | `number` | nao | nao usado diretamente | Quantidade entregue | CONFIRMADO |

### `PedidoResumo`

Arquivo: `frontend/src/modules/abastecimento/pages/Abastecimento.tsx`

| Campo | Tipo | Obrigatorio | Default/Fallback | Descricao | Confianca |
| --- | --- | --- | --- | --- | --- |
| `id` | `number` | sim | nenhum | Identificador do pedido para navegacao | CONFIRMADO |
| `numero` | `string` | sim | nenhum | Numero exibido na lista | CONFIRMADO |
| `status` | `string` | nao | `Sem status` via status helper | Status bruto do pedido | CONFIRMADO |
| `valor_total` | `number` | nao | `0` | Valor somado nas metricas e exibido em BRL | CONFIRMADO |
| `total_itens` | `number` | nao | nao usado diretamente | Quantidade de itens do pedido | CONFIRMADO |
| `data_pedido` | `string` | nao | `Sem data` | Data formatada em `pt-BR` | CONFIRMADO |

### `EntregaResumo`

Arquivo: `frontend/src/modules/abastecimento/pages/Abastecimento.tsx`

| Campo | Tipo | Obrigatorio | Default/Fallback | Descricao | Confianca |
| --- | --- | --- | --- | --- | --- |
| `total_escolas` | `number` | sim | `0` | Total de escolas consideradas nas estatisticas | CONFIRMADO |
| `total_itens` | `number` | sim | `0` | Total de itens de entrega | CONFIRMADO |
| `itens_entregues` | `number` | sim | `0` | Itens ja entregues | CONFIRMADO |
| `itens_pendentes` | `number` | sim | `0` | Itens pendentes | CONFIRMADO |
| `percentual_entregue` | `number` | sim | `0` | Percentual arredondado para exibicao | CONFIRMADO |

### `Metric`

Entidade local inferida a partir do array `metrics` em `Abastecimento.tsx`.

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `label` | `string` | sim | Nome da metrica | CONFIRMADO |
| `value` | `number|string` | sim | Valor principal exibido | CONFIRMADO |
| `detail` | `string` | sim | Detalhe auxiliar exibido abaixo do valor | CONFIRMADO |

### Props de Componentes Locais

#### `ListHeader`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `title` | `string` | sim | Titulo do bloco | CONFIRMADO |
| `actionLabel` | `string` | sim | Texto do botao | CONFIRMADO |
| `onAction` | `() => void` | sim | Acao de clique | CONFIRMADO |

#### `ListRow`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `title` | `string` | sim | Texto principal | CONFIRMADO |
| `subtitle` | `string` | sim | Texto secundario | CONFIRMADO |
| `chip` | `ReactNode` | sim | Indicador visual de status | CONFIRMADO |
| `onClick` | `() => void` | sim | Navegacao de detalhe | CONFIRMADO |

#### `EmptyRow`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `text` | `string` | sim | Mensagem de estado vazio | CONFIRMADO |

#### `ShortcutButton`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `icon` | `ReactNode` | sim | Icone Material UI | CONFIRMADO |
| `label` | `string` | sim | Texto do botao | CONFIRMADO |
| `onClick` | `() => void` | sim | Navegacao do atalho | CONFIRMADO |

## Modulo: cardapios

### `Modalidade`

Arquivos: `backend/src/modules/cardapios/models/Modalidade.ts`, `backend/src/modules/cardapios/controllers/modalidadeController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da modalidade | CONFIRMADO |
| `nome` | `string` | sim | Nome da modalidade | CONFIRMADO |
| `descricao` | `string` | nao | Descricao | CONFIRMADO |
| `categoria_financeira_id` | `number` | sim em controller atual | Categoria financeira vinculada | CONFIRMADO |
| `categoria_financeira_nome` | `string` | nao | Nome agregado da categoria | CONFIRMADO |
| `codigo_financeiro` | `string` | nao | Codigo financeiro proprio ou da categoria | CONFIRMADO |
| `valor_repasse` | `number` | sim | Valor de repasse, default 0 | CONFIRMADO |
| `parcelas` | `number` | sim | Numero de parcelas, default 1 | CONFIRMADO |
| `ativo` | `boolean` | sim | Status ativo/inativo | CONFIRMADO |
| `total_alunos` | `number` | agregado | Soma de alunos vinculados | CONFIRMADO |
| `total_escolas` | `number` | agregado | Total de escolas vinculadas | CONFIRMADO |

### `CategoriaFinanceiraModalidade`

Arquivo: `backend/src/modules/cardapios/controllers/modalidadeController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da categoria | CONFIRMADO |
| `nome` | `string` | sim | Nome normalizado; duplicidade checada case-insensitive | CONFIRMADO |
| `codigo_financeiro` | `string` | nao | Codigo financeiro | CONFIRMADO |
| `valor_repasse` | `number` | sim | Valor, default 0 | CONFIRMADO |
| `parcelas` | `number` | sim | Parcelas, default 1 | CONFIRMADO |
| `ativo` | `boolean` | sim | Apenas categorias ativas sao listadas | CONFIRMADO |

### `CardapioModalidade`

Arquivo: `backend/src/modules/cardapios/controllers/cardapioController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do cardapio | CONFIRMADO |
| `nome` | `string` | sim | Nome do cardapio | CONFIRMADO |
| `mes` | `number` | sim | Mes de competencia | CONFIRMADO |
| `ano` | `number` | sim | Ano de competencia | CONFIRMADO |
| `ativo` | `boolean` | sim | Status do cardapio | CONFIRMADO |
| `observacao` | `string` | nao | Observacao geral | CONFIRMADO |
| `nutricionista_id` | `number` | nao | Nutricionista responsavel | CONFIRMADO |
| `data_aprovacao_nutricionista` | `string/date` | nao | Data de aprovacao | CONFIRMADO |
| `observacoes_nutricionista` | `string` | nao | Observacoes tecnicas | CONFIRMADO |
| `periodo_id` | `number` | nao | Periodo do sistema/usuario | CONFIRMADO |
| `modalidades_ids` | `number[]` | sim para criar | Modalidades vinculadas | CONFIRMADO |
| `modalidades_nomes` | `string` | agregado | Nomes das modalidades concatenados | CONFIRMADO |
| `total_refeicoes` | `number` | agregado | Total de dia/tipo distintos | CONFIRMADO |
| `total_dias` | `number` | agregado | Dias distintos no cardapio | CONFIRMADO |

### `CardapioRefeicaoDia`

Arquivo: `backend/src/modules/cardapios/controllers/cardapioController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da associacao | CONFIRMADO |
| `cardapio_modalidade_id` | `number` | sim | Cardapio vinculado | CONFIRMADO |
| `refeicao_id` | `number` | sim | Refeicao/preparacao vinculada | CONFIRMADO |
| `dia` | `number` | sim | Dia do mes | CONFIRMADO |
| `tipo_refeicao` | `string` | sim | Tipo/chave da refeicao no dia | CONFIRMADO |
| `observacao` | `string` | nao | Observacao do item | CONFIRMADO |
| `ativo` | `boolean` | sim | Usado no calculo de custo | CONFIRMADO |
| `refeicao_nome` | `string` | agregado | Nome da refeicao | CONFIRMADO |
| `refeicao_descricao` | `string` | agregado | Descricao da refeicao | CONFIRMADO |

### `Refeicao`

Arquivos: `backend/src/modules/cardapios/controllers/refeicaoController.ts`, `backend/src/modules/cardapios/models/Refeicao.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador | CONFIRMADO |
| `nome` | `string` | sim | Nome da preparacao/refeicao | CONFIRMADO |
| `descricao` | `string` | nao | Descricao | CONFIRMADO |
| `categoria` | `string` | nao | Categoria usada pelo controller atual | CONFIRMADO |
| `modo_preparo` | `string` | nao | Modo de preparo | CONFIRMADO |
| `tempo_preparo_minutos` | `number` | nao | Tempo de preparo | CONFIRMADO |
| `rendimento_porcoes` | `number` | nao | Rendimento | CONFIRMADO |
| `utensilios` | `string` | nao | Utensilios | CONFIRMADO |
| `calorias_por_porcao` | `number` | nao | Calorias manuais por porcao | CONFIRMADO |
| `proteinas_g` | `number` | nao | Proteinas | CONFIRMADO |
| `carboidratos_g` | `number` | nao | Carboidratos | CONFIRMADO |
| `lipidios_g` | `number` | nao | Lipidios | CONFIRMADO |
| `fibras_g` | `number` | nao | Fibras | CONFIRMADO |
| `sodio_mg` | `number` | nao | Sodio | CONFIRMADO |
| `custo_por_porcao` | `number` | nao | Custo manual por porcao | CONFIRMADO |
| `observacoes_tecnicas` | `string` | nao | Observacoes tecnicas | CONFIRMADO |
| `ativo` | `boolean` | sim | Status ativo | CONFIRMADO |
| `valor_calorico_total` | `number` | agregado | Calculo a partir de produtos/composicao | CONFIRMADO |
| `total_produtos` | `number` | agregado | Quantidade de produtos vinculados | CONFIRMADO |

### `RefeicaoProduto`

Arquivo: `backend/src/modules/cardapios/models/RefeicaoProduto.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da associacao | CONFIRMADO |
| `refeicao_id` | `number` | sim | Refeicao vinculada | CONFIRMADO |
| `produto_id` | `number` | sim | Produto vinculado | CONFIRMADO |
| `per_capita` | `number` | sim | Quantidade base por pessoa | CONFIRMADO |
| `tipo_medida` | `'gramas' | 'mg'` | sim | Unidade de medida aceita pelo controller | CONFIRMADO |
| `per_capita_por_modalidade` | `Array` | nao | Ajustes por modalidade | CONFIRMADO |
| `produto` | `object` | agregado | Dados basicos do produto e unidade | CONFIRMADO |

### `CustoCardapio`

Entidade de resposta de `calcularCustoCardapio`.

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `custo_total` | `number` | sim | Custo total do cardapio | CONFIRMADO |
| `total_alunos` | `number` | sim | Soma de alunos considerados | CONFIRMADO |
| `total_refeicoes` | `number` | sim | Quantidade de combinacoes unicas dia/tipo | CONFIRMADO |
| `detalhes_por_refeicao` | `array` | sim | Custos por refeicao e modalidade | CONFIRMADO |
| `detalhes_por_modalidade` | `array` | sim | Custos agregados por modalidade | CONFIRMADO |
| `detalhes_por_tipo_fornecedor` | `array` | sim | Distribuicao por tipo de fornecedor | CONFIRMADO |

## Modulo: compras

### `Pedido`

Arquivos: `backend/src/modules/compras/models/Compra.ts`, `backend/src/modules/compras/controllers/compraController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | nao na criacao | Identificador do pedido | CONFIRMADO |
| `numero` | `string` | sim | Numero gerado ou informado | CONFIRMADO |
| `data_pedido` | `Date/string` | sim | Data do pedido | CONFIRMADO |
| `status` | `string` | sim | Status operacional | CONFIRMADO |
| `valor_total` | `number` | sim | Soma dos itens | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes/motivo de status | CONFIRMADO |
| `usuario_criacao_id` | `number` | sim | Usuario autenticado que criou | CONFIRMADO |
| `competencia_mes_ano` | `string` | nao | Competencia associada | CONFIRMADO |
| `guia_id` | `number` | nao | Guia origem quando gerado por guia | CONFIRMADO |

### `PedidoItem`

Arquivo: `backend/src/modules/compras/models/CompraItem.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | nao na criacao | Identificador do item | CONFIRMADO |
| `pedido_id` | `number` | sim | Pedido pai | CONFIRMADO |
| `contrato_produto_id` | `number` | sim | Produto contratado usado para preco | CONFIRMADO |
| `produto_id` | `number` | sim | Produto comprado | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade de compra/programacao | CONFIRMADO |
| `preco_unitario` | `number` | sim | Preco do contrato no momento do item | CONFIRMADO |
| `valor_total` | `number` | sim | `quantidade * preco_unitario` | CONFIRMADO |
| `unidade` | `string` | nao | Unidade de compra | CONFIRMADO |
| `quantidade_kg` | `number` | nao | Quantidade convertida em kg | CONFIRMADO |
| `quantidade_distribuicao` | `number` | nao | Quantidade para distribuir | CONFIRMADO |
| `data_entrega_prevista` | `string/date` | nao | Data prevista | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes do item | CONFIRMADO |

### `ConversaoCompra`

Arquivo: `backend/src/modules/compras/services/PlanejamentoComprasService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `quantidade_compra` | `number` | sim | Quantidade arredondada para compra | CONFIRMADO |
| `unidade_compra` | `string` | sim | Unidade de compra/distribuicao | CONFIRMADO |
| `quantidade_kg` | `number` | sim | Equivalente em kg | CONFIRMADO |
| `quantidade_distribuicao` | `number` | nao | Quantidade base para escolas | CONFIRMADO |
| `unidade_distribuicao` | `string` | nao | Unidade de distribuicao do produto | CONFIRMADO |

### `ProgramacaoEntrega`

Arquivos: `backend/src/modules/compras/controllers/programacaoEntregaController.ts`, `frontend/src/services/programacaoEntrega.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | nao | Identificador da programacao | CONFIRMADO |
| `pedido_item_id` | `number` | sim no backend | Item programado | CONFIRMADO |
| `data_entrega` | `string` | sim | Data da entrega | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes | CONFIRMADO |
| `quantidade_total` | `number` | agregado | Soma das escolas | CONFIRMADO |
| `escolas` | `ProgramacaoEscola[]` | sim | Distribuicao por escola | CONFIRMADO |

### `ProgramacaoEscola`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `escola_id` | `number` | sim | Escola destino | CONFIRMADO |
| `escola_nome` | `string` | nao | Nome agregado | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade para a escola; somente valores positivos sao inseridos | CONFIRMADO |

### `Job`

Arquivo: `frontend/src/services/planejamentoCompras.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do job | CONFIRMADO |
| `tipo` | `string` | sim | Tipo de operacao | CONFIRMADO |
| `status` | `'pendente' | 'processando' | 'concluido' | 'erro'` | sim | Estado do job | CONFIRMADO |
| `progresso` | `number` | sim | Percentual/progresso | CONFIRMADO |
| `total_itens` | `number` | sim | Total previsto | CONFIRMADO |
| `itens_processados` | `number` | sim | Processados | CONFIRMADO |
| `resultado` | `any` | nao | Resultado final | CONFIRMADO |
| `erro` | `string` | nao | Mensagem de erro | CONFIRMADO |

## Modulo: contratos

### `Contrato`

Arquivos: `backend/src/modules/contratos/models/Contrato.ts`, `backend/src/modules/contratos/controllers/contratoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | nao na criacao | Identificador | CONFIRMADO |
| `numero` | `string` | sim | Numero do contrato | CONFIRMADO |
| `fornecedor_id` | `number` | sim | Fornecedor vinculado | CONFIRMADO |
| `data_inicio` | `Date/string` | sim | Inicio da vigencia | CONFIRMADO |
| `data_fim` | `Date/string` | sim | Fim da vigencia | CONFIRMADO |
| `valor_total` | `number` | sim | Valor informado no contrato | CONFIRMADO |
| `valor_total_contrato` | `number` | agregado | Soma de quantidade contratada * preco unitario dos itens ativos | CONFIRMADO |
| `status` | `'ativo' | 'inativo' | 'suspenso' | 'finalizado'` | sim | Status contratual | CONFIRMADO |
| `ativo` | `boolean` | sim no controller atual | Flag operacional | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes | CONFIRMADO |
| `tipo_contrato` | `'fornecimento' | 'servico' | 'misto'` | sim no model | Tipo do contrato | CONFIRMADO |
| `saldo_disponivel` | `number` | sim no model | Saldo financeiro legado/model | CONFIRMADO |

### `ContratoProduto`

Arquivo: `backend/src/modules/contratos/controllers/contratoProdutoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | nao na criacao | Identificador do item contratado | CONFIRMADO |
| `contrato_id` | `number` | sim | Contrato pai | CONFIRMADO |
| `produto_id` | `number` | sim | Produto contratado | CONFIRMADO |
| `preco_unitario` | `number` | sim | Preco unitario contratado | CONFIRMADO |
| `quantidade_contratada` | `number` | sim | Quantidade total contratada | CONFIRMADO |
| `marca` | `string` | nao | Marca contratada | CONFIRMADO |
| `unidade_medida_compra_id` | `number` | nao | Unidade de compra opcional | CONFIRMADO |
| `ativo` | `boolean` | sim | Item ativo/inativo | CONFIRMADO |
| `saldo` | `number` | agregado | Quantidade contratada menos pedidos | CONFIRMADO |
| `valor_total` | `number` | agregado | Quantidade contratada * preco | CONFIRMADO |

### `Fornecedor`

Arquivo: `backend/src/modules/contratos/controllers/fornecedorController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | nao na criacao | Identificador | CONFIRMADO |
| `nome` | `string` | sim | Nome do fornecedor | CONFIRMADO |
| `cnpj` | `string` | sim | Documento | CONFIRMADO |
| `email` | `string` | nao | Email | CONFIRMADO |
| `endereco` | `string` | nao | Endereco | CONFIRMADO |
| `ativo` | `boolean` | sim | Status | CONFIRMADO |
| `tipo_fornecedor` | `string` | sim | Default `CONVENCIONAL`; usado para relatórios de AF/convencional | CONFIRMADO |
| `dap_caf` | `string` | nao | Identificacao DAP/CAF | CONFIRMADO |
| `data_validade_dap` | `date/string` | nao | Validade DAP/CAF | CONFIRMADO |

### `SaldoContratoModalidade`

Arquivo: `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim quando existente | Identificador do saldo | CONFIRMADO |
| `contrato_produto_id` | `number` | sim | Item de contrato | CONFIRMADO |
| `modalidade_id` | `number` | sim | Modalidade | CONFIRMADO |
| `quantidade_inicial` | `number` | sim | Quantidade inicial alocada | CONFIRMADO |
| `quantidade_consumida` | `number` | sim | Total consumido | CONFIRMADO |
| `quantidade_disponivel` | `number` | gerado/calculado | Saldo disponivel | CONFIRMADO |
| `valor_disponivel` | `number` | agregado | Disponivel * preco unitario | CONFIRMADO |
| `modalidade_ativa` | `boolean` | agregado | Flag do saldo/modalidade | CONFIRMADO |

### `HistoricoConsumoModalidade`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador | CONFIRMADO |
| `contrato_produto_modalidade_id` | `number` | sim | Saldo consumido | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade consumida | CONFIRMADO |
| `data_consumo` | `date/string` | sim | Data do consumo | CONFIRMADO |
| `observacao` | `string` | nao | Observacao | CONFIRMADO |
| `usuario_id` | `number` | nao | Usuario informado | CONFIRMADO |

## Modulo: demandas

### `Demanda`

Arquivo: `backend/src/modules/demandas/models/demandaModel.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim apos criacao | Identificador | CONFIRMADO |
| `escola_id` | `number` | nao | Escola vinculada quando conhecida | CONFIRMADO |
| `escola_nome` | `string` | sim | Nome da escola/solicitante | CONFIRMADO |
| `numero_oficio` | `string` | sim | Numero do oficio | CONFIRMADO |
| `data_solicitacao` | `string` | sim | Data da solicitacao | CONFIRMADO |
| `data_semead` | `string` | nao | Data de envio/entrada SEMEAD | CONFIRMADO |
| `objeto` | `string` | sim | Objeto da demanda | CONFIRMADO |
| `descricao_itens` | `string` | sim | Descricao dos itens solicitados | CONFIRMADO |
| `data_resposta_semead` | `string` | nao | Data de resposta SEMEAD | CONFIRMADO |
| `dias_solicitacao` | `number` | calculado | Diferenca entre datas SEMEAD/resposta ou data atual | CONFIRMADO |
| `status` | `'pendente' | 'enviado_semead' | 'atendido' | 'nao_atendido'` | sim | Status da demanda | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes | CONFIRMADO |
| `usuario_criacao_id` | `number` | sim | Usuario criador | CONFIRMADO |

### `CardapioDisponivel`

Arquivo: `frontend/src/services/demandas.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Cardapio disponivel | CONFIRMADO |
| `nome` | `string` | sim | Nome do cardapio | CONFIRMADO |
| `mes` | `number` | sim no backend | Mes da competencia | CONFIRMADO |
| `ano` | `number` | sim no backend | Ano da competencia | CONFIRMADO |
| `modalidade_nome` | `string` | nao | Modalidades concatenadas | CONFIRMADO |
| `total_refeicoes` | `number` | sim | Total de refeicoes do cardapio | CONFIRMADO |

### `GuiaProdutoAjusteRow`

Arquivo: `frontend/src/modules/demandas/utils/guiaProdutoAjuste.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Item da guia | CONFIRMADO |
| `escola_nome` | `string` | sim | Escola do item | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade atual ajustavel | CONFIRMADO |
| `quantidade_demanda` | `number` | nao | Quantidade original/demanda | CONFIRMADO |
| `unidade` | `string` | sim | Unidade atual | CONFIRMADO |
| `data_entrega` | `string|null` | nao | Data programada | CONFIRMADO |
| `status` | `string` | nao | Status do item | CONFIRMADO |
| `produto_id` | `number` | nao | Produto | CONFIRMADO |
| `produto_nome` | `string` | nao | Nome do produto | CONFIRMADO |
| `escola_id` | `number` | nao | Escola | CONFIRMADO |

### `BulkQuantityAdjustment`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `mode` | `'set' | 'add' | 'percent'` | sim | Modo do ajuste em massa | CONFIRMADO |
| `value` | `number` | sim | Valor aplicado | CONFIRMADO |
| `roundMultiple` | `number|null` | nao | Multiplo de arredondamento | CONFIRMADO |

### `ChangedItemUpdate`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `itemId` | `number` | sim | Item alterado | CONFIRMADO |
| `payload.quantidade` | `number` | nao | Enviado apenas se mudou | CONFIRMADO |
| `payload.unidade` | `string` | nao | Enviado apenas se mudou | CONFIRMADO |
| `payload.data_entrega` | `string|null` | nao | Enviado apenas se mudou | CONFIRMADO |

## Modulo: entregas

### `ItemEntrega`

Arquivo: `backend/src/modules/entregas/models/Entrega.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Item de `guia_produto_escola` | CONFIRMADO |
| `guia_id` | `number` | sim | Guia de origem | CONFIRMADO |
| `produto_id` | `number` | sim | Produto entregue | CONFIRMADO |
| `escola_id` | `number` | sim | Escola destino | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade programada | CONFIRMADO |
| `quantidade_total_entregue` | `number` | calculado | Soma do historico entregue | CONFIRMADO |
| `saldo_pendente` | `number` | calculado | Quantidade programada menos entregue | CONFIRMADO |
| `unidade` | `string` | sim | Unidade operacional | CONFIRMADO |
| `lote` | `string` | nao | Lote do item | CONFIRMADO |
| `para_entrega` | `boolean` | sim | Flag que habilita entrega | CONFIRMADO |
| `entrega_confirmada` | `boolean` | sim | Verdadeiro quando entrega total foi atingida | CONFIRMADO |
| `status` | `string` | sim | `pendente`, `parcial`, `entregue` ou outros estados legados | CONFIRMADO |
| `data_entrega` | `string` | nao | Data programada/registrada | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome do produto | CONFIRMADO |
| `produto_unidade` | `string` | sim | Unidade do produto | CONFIRMADO |
| `historico_entregas` | `array` | nao | Historico agregado do item | CONFIRMADO |

### `ConfirmarEntregaData`

Arquivo: `backend/src/modules/entregas/models/Entrega.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `quantidade_entregue` | `number` | sim | Quantidade entregue na operacao | CONFIRMADO |
| `nome_quem_entregou` | `string` | sim | Entregador informado | CONFIRMADO |
| `nome_quem_recebeu` | `string` | sim | Recebedor informado | CONFIRMADO |
| `observacao` | `string|null` | nao | Observacao da entrega | CONFIRMADO |
| `assinatura_base64` | `string|null` | nao | Assinatura ou URI de arquivo | CONFIRMADO |
| `latitude` | `number|null` | nao | Latitude GPS | CONFIRMADO |
| `longitude` | `number|null` | nao | Longitude GPS | CONFIRMADO |
| `precisao_gps` | `number|null` | nao | Precisao do GPS | CONFIRMADO |
| `client_operation_id` | `string|null` | nao | Chave idempotente offline, maximo 100 caracteres | CONFIRMADO |

### `HistoricoEntrega`

Arquivo: `backend/src/modules/entregas/models/HistoricoEntrega.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Registro de entrega | CONFIRMADO |
| `guia_produto_escola_id` | `number` | sim | Item entregue | CONFIRMADO |
| `quantidade_entregue` | `number` | sim | Quantidade entregue neste registro | CONFIRMADO |
| `data_entrega` | `string` | sim | Data/hora da entrega | CONFIRMADO |
| `nome_quem_entregou` | `string` | sim | Entregador | CONFIRMADO |
| `nome_quem_recebeu` | `string` | sim | Recebedor | CONFIRMADO |
| `observacao` | `string` | nao | Observacao | CONFIRMADO |
| `assinatura_base64` | `string` | nao | Assinatura | CONFIRMADO |
| `latitude` | `number` | nao | Latitude | CONFIRMADO |
| `longitude` | `number` | nao | Longitude | CONFIRMADO |
| `precisao_gps` | `number` | nao | Precisao | CONFIRMADO |
| `client_operation_id` | `string|null` | nao | Idempotencia da operacao | CONFIRMADO |

### `ComprovanteEntrega`

Arquivo: `backend/src/modules/entregas/models/ComprovanteEntrega.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do comprovante | CONFIRMADO |
| `numero_comprovante` | `string` | gerado | Numero gerado por funcao SQL | CONFIRMADO |
| `escola_id` | `number` | sim | Escola do comprovante | CONFIRMADO |
| `data_entrega` | `string` | gerado | Data da entrega/comprovante | CONFIRMADO |
| `nome_quem_entregou` | `string` | sim | Entregador | CONFIRMADO |
| `nome_quem_recebeu` | `string` | sim | Recebedor | CONFIRMADO |
| `cargo_recebedor` | `string` | nao | Cargo do recebedor | CONFIRMADO |
| `observacao` | `string` | nao | Observacao | CONFIRMADO |
| `assinatura_base64` | `string` | nao | Assinatura | CONFIRMADO |
| `latitude` | `number` | nao | Latitude | CONFIRMADO |
| `longitude` | `number` | nao | Longitude | CONFIRMADO |
| `precisao_gps` | `number` | nao | Precisao GPS | CONFIRMADO |
| `total_itens` | `number` | sim | Quantidade de itens vinculados | CONFIRMADO |
| `status` | `string` | sim | Status do comprovante | CONFIRMADO |
| `itens_cancelados` | `number` | nao | Itens cancelados na view | CONFIRMADO |

### `ComprovanteItem`

Arquivo: `backend/src/modules/entregas/models/ComprovanteEntrega.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do item do comprovante | CONFIRMADO |
| `comprovante_id` | `number` | sim | Comprovante pai | CONFIRMADO |
| `historico_entrega_id` | `number|null` | sim na criacao | Historico de entrega relacionado | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome do produto no comprovante | CONFIRMADO |
| `quantidade_entregue` | `number` | sim | Quantidade comprovada | CONFIRMADO |
| `unidade` | `string` | sim | Unidade | CONFIRMADO |
| `lote` | `string` | nao | Lote | CONFIRMADO |

### `ComprovanteFoto`

Arquivo: `backend/src/modules/entregas/models/ComprovanteFoto.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da foto | CONFIRMADO |
| `comprovante_id` | `number` | sim | Comprovante vinculado | CONFIRMADO |
| `storage_key` | `string` | sim | Caminho no storage | CONFIRMADO |
| `content_type` | `string` | sim | Deve ser `image/jpeg` | CONFIRMADO |
| `size_bytes` | `number` | sim | Tamanho em bytes | CONFIRMADO |
| `status` | `'pending' | 'uploaded' | 'expired'` | sim | Estado do upload | CONFIRMADO |
| `uploaded_at` | `string|null` | nao | Data de confirmacao do upload | CONFIRMADO |
| `expires_at` | `string` | sim | Expiracao por retencao | CONFIRMADO |

### `RotaEntrega`

Arquivo: `backend/src/modules/entregas/models/Rota.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da rota | CONFIRMADO |
| `nome` | `string` | sim | Nome da rota | CONFIRMADO |
| `descricao` | `string` | nao | Descricao | CONFIRMADO |
| `cor` | `string` | sim | Cor da rota, default `#1976d2` | CONFIRMADO |
| `ativo` | `boolean` | sim | Flag ativa | CONFIRMADO |
| `total_escolas` | `number` | agregado | Total de escolas vinculadas | CONFIRMADO |

### `PlanejamentoEntrega`

Arquivo: `backend/src/modules/entregas/models/Rota.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do planejamento | CONFIRMADO |
| `guia_id` | `number` | sim | Guia planejada | CONFIRMADO |
| `rota_id` | `number` | sim | Rota planejada | CONFIRMADO |
| `data_planejada` | `string` | nao | Data planejada | CONFIRMADO |
| `status` | `'planejado' | 'em_andamento' | 'concluido' | 'cancelado'` | sim | Estado do planejamento | CONFIRMADO |
| `responsavel` | `string` | nao | Responsavel | CONFIRMADO |
| `observacao` | `string` | nao | Observacao | CONFIRMADO |
| `rota_nome` | `string` | agregado | Nome da rota | CONFIRMADO |
| `guia_mes` | `number` | agregado | Mes da guia | CONFIRMADO |
| `guia_ano` | `number` | agregado | Ano da guia | CONFIRMADO |

### `DeliveryOutboxOperation`

Arquivo: `apps/entregador-native/src/services/deliveryOutboxCore.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `string` | sim | Identificador local e fallback para idempotencia | CONFIRMADO |
| `type` | `'confirmar_entrega'` | sim | Tipo da operacao | CONFIRMADO |
| `itemId` | `number` | sim | Item a confirmar | CONFIRMADO |
| `data` | `ConfirmarEntregaData` | sim | Payload de confirmacao | CONFIRMADO |
| `timestamp` | `number` | sim | Momento local da criacao | CONFIRMADO |
| `status` | `DeliveryOutboxStatus` | sim | Estado de sincronizacao | CONFIRMADO |
| `attemptCount` | `number` | sim | Tentativas de sync | CONFIRMADO |
| `historicoId` | `number` | nao | Historico retornado pelo backend | CONFIRMADO |
| `comprovanteId` | `number` | nao | Comprovante criado no backend | CONFIRMADO |
| `comprovanteData` | `DeliveryComprovanteData` | nao | Dados para comprovante/foto | CONFIRMADO |

## Modulo: escolas

### `Escola`

Arquivos: `backend/src/modules/escolas/controllers/escolaController.ts`, `frontend/src/services/escolas.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim apos criacao | Identificador da escola | CONFIRMADO |
| `nome` | `string` | sim | Nome da escola | CONFIRMADO |
| `codigo` | `string` | nao | Codigo interno atual | CONFIRMADO |
| `endereco` | `string` | nao | Endereco | CONFIRMADO |
| `municipio` | `string` | nao | Municipio | CONFIRMADO |
| `endereco_maps` | `string` | nao | Link/endereco para mapas | CONFIRMADO |
| `telefone` | `string` | nao | Telefone | CONFIRMADO |
| `email` | `string` | nao | Email | CONFIRMADO |
| `nome_gestor` | `string` | nao | Gestor/diretor no cadastro atual | CONFIRMADO |
| `administracao` | `string` | nao | Tipo/administracao da escola | CONFIRMADO |
| `ativo` | `boolean` | sim | Status ativo no controller atual | CONFIRMADO |
| `total_alunos` | `number` | agregado | Soma de alunos por modalidade | CONFIRMADO |
| `modalidades` | `string` | agregado | Nomes das modalidades concatenados | CONFIRMADO |

### `EscolaModelLegado`

Arquivo: `backend/src/modules/escolas/models/Escola.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | nao na criacao | Identificador | CONFIRMADO |
| `nome` | `string` | sim | Nome | CONFIRMADO |
| `endereco` | `string` | sim | Endereco | CONFIRMADO |
| `telefone` | `string` | nao | Telefone | CONFIRMADO |
| `email` | `string` | nao | Email | CONFIRMADO |
| `diretor` | `string` | nao | Diretor no model legado | CONFIRMADO |
| `codigo_inep` | `string` | nao | Codigo INEP legado | CONFIRMADO |
| `ativa` | `boolean` | sim | Status no model legado | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes | CONFIRMADO |

### `EscolaModalidade`

Arquivos: `backend/src/modules/guias/controllers/escolaModalidadeController.ts`, `frontend/src/services/escolas.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim apos criacao | Identificador do vinculo | CONFIRMADO |
| `escola_id` | `number` | sim | Escola vinculada | CONFIRMADO |
| `modalidade_id` | `number` | sim | Modalidade vinculada | CONFIRMADO |
| `quantidade_alunos` | `number` | sim | Total de alunos da escola nessa modalidade | CONFIRMADO |
| `escola_nome` | `string` | agregado | Nome da escola | CONFIRMADO |
| `modalidade_nome` | `string` | agregado | Nome da modalidade | CONFIRMADO |
| `created_at` | `string` | nao | Criacao | CONFIRMADO |
| `updated_at` | `string` | nao | Atualizacao | CONFIRMADO |

### `HistoricoAlunosModalidades`

Arquivo: `backend/src/modules/guias/services/escolaModalidadeHistoricoService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Registro de historico | CONFIRMADO |
| `escola_id` | `number` | sim | Escola | CONFIRMADO |
| `modalidade_id` | `number` | sim | Modalidade | CONFIRMADO |
| `quantidade_alunos` | `number` | sim | Quantidade vigente apos operacao | CONFIRMADO |
| `quantidade_anterior` | `number|null` | nao | Quantidade anterior | CONFIRMADO |
| `operacao` | `'create' | 'update' | 'delete' | 'bootstrap'` | sim | Tipo da mudanca | CONFIRMADO |
| `vigente_de` | `string` | sim | Data de vigencia | CONFIRMADO |
| `observacao` | `string` | nao | Observacao | CONFIRMADO |
| `usuario_id` | `number` | nao | Usuario responsavel | CONFIRMADO |
| `origem` | `string` | nao | Origem, default `manual` ou `migration` | CONFIRMADO |

### `RelatorioAlunosHistorico`

Arquivo: `backend/src/modules/guias/services/escolaModalidadeHistoricoService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `data_referencia` | `string` | sim | Data usada para obter ultima versao historica | CONFIRMADO |
| `linhas` | `array` | sim | Linhas escola/modalidade vigentes | CONFIRMADO |
| `por_escola` | `array` | sim | Agregado por escola | CONFIRMADO |
| `por_modalidade` | `array` | sim | Agregado por modalidade | CONFIRMADO |
| `total_geral` | `number` | sim | Soma geral de alunos | CONFIRMADO |

## Modulo: estoque

### `StockEventInput` / `estoque_eventos`

Arquivo: `backend/src/modules/estoque/services/estoqueLedgerService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim apos insercao | Identificador do evento | CONFIRMADO |
| `tenant_id` | `string|null` | nao | Tenant opcional | CONFIRMADO |
| `escopo` | `'central' | 'escola'` | sim | Escopo do saldo afetado | CONFIRMADO |
| `escola_id` | `number` | obrigatorio para escola | Escola afetada ou destino | CONFIRMADO |
| `produto_id` | `number` | sim | Produto movimentado | CONFIRMADO |
| `lote_id` | `number` | nao | Lote relacionado | CONFIRMADO |
| `tipo_evento` | `StockEventType` | sim | Tipo de evento de estoque | CONFIRMADO |
| `origem` | `StockEventOrigin` | sim | Origem operacional | CONFIRMADO |
| `quantidade_delta` | `number` | sim | Delta que compoe o saldo | CONFIRMADO |
| `quantidade_absoluta` | `number` | nao | Quantidade final desejada em ajuste | CONFIRMADO |
| `motivo` | `string` | nao | Motivo | CONFIRMADO |
| `observacao` | `string` | nao | Observacao | CONFIRMADO |
| `referencia_tipo` | `string` | nao | Tipo da entidade de referencia | CONFIRMADO |
| `referencia_id` | `number` | nao | Id da entidade de referencia | CONFIRMADO |
| `usuario_id` | `number` | nao | Usuario responsavel | CONFIRMADO |
| `usuario_nome_snapshot` | `string` | nao | Nome do usuario no momento | CONFIRMADO |
| `data_evento` | `string` | sim | Data/hora operacional | CONFIRMADO |
| `evento_estornado_id` | `number` | nao | Evento estornado | CONFIRMADO |

### `CentralStockProjectionRow`

Arquivo: `backend/src/modules/estoque/services/estoqueProjectionService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `produto_id` | `number` | sim | Produto | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome do produto | CONFIRMADO |
| `produto_unidade` | `string` | sim | Unidade exibida | CONFIRMADO |
| `quantidade_total` | `number` | sim | Soma dos eventos centrais | CONFIRMADO |
| `quantidade_disponivel` | `number` | sim | Total menos reservado | CONFIRMADO |
| `quantidade_reservada` | `number` | sim | Quantidade pendente em guias abertas | CONFIRMADO |
| `quantidade_vencida` | `number` | sim | Atualmente 0 na projecao por ledger | CONFIRMADO |
| `lotes_ativos` | `number` | sim | Atualmente 0 na projecao por ledger | CONFIRMADO |
| `proximo_vencimento` | `string|null` | nao | Atualmente null na projecao por ledger | CONFIRMADO |

### `SchoolStockProjectionRow`

Arquivo: `backend/src/modules/estoque/services/estoqueProjectionService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `produto_id` | `number` | sim | Produto | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome | CONFIRMADO |
| `categoria` | `string|null` | nao | Categoria do produto | CONFIRMADO |
| `unidade` | `string` | sim | Unidade | CONFIRMADO |
| `quantidade_atual` | `number` | sim | Soma dos eventos escolares da escola | CONFIRMADO |
| `quantidade_minima` | `number` | sim | Valor projetado atual 0 | CONFIRMADO |
| `quantidade_maxima` | `number` | sim | Valor projetado atual 0 | CONFIRMADO |
| `data_ultima_atualizacao` | `string|null` | nao | Maior data de evento | CONFIRMADO |
| `observacoes` | `string|null` | nao | Observacao projetada atual null | CONFIRMADO |

### `StockTimelineRow`

Arquivo: `backend/src/modules/estoque/services/estoqueProjectionService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Evento | CONFIRMADO |
| `escopo` | `'central' | 'escola'` | sim | Escopo | CONFIRMADO |
| `escola_id` | `number` | nao | Escola direta ou inferida | CONFIRMADO |
| `escola_nome` | `string|null` | nao | Nome da escola | CONFIRMADO |
| `produto_id` | `number` | sim | Produto | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome do produto | CONFIRMADO |
| `tipo_evento` | `string` | sim | Tipo do evento | CONFIRMADO |
| `origem` | `string` | sim | Origem | CONFIRMADO |
| `quantidade_movimentada` | `number` | sim | Delta do evento | CONFIRMADO |
| `data_movimentacao` | `string` | sim | Data | CONFIRMADO |
| `usuario_nome` | `string|null` | nao | Usuario | CONFIRMADO |
| `motivo` | `string|null` | nao | Motivo | CONFIRMADO |
| `observacoes` | `string|null` | nao | Observacoes | CONFIRMADO |

### `ConfiguracaoOperacaoEscola`

Arquivo: `backend/src/modules/estoque/controllers/estoqueEscolarController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `escola_id` | `number` | sim | Escola | CONFIRMADO |
| `modo_operacao` | `'escola' | 'central' | 'hibrido'` | sim | Modo de operacao | CONFIRMADO |
| `permite_ajuste_escola` | `boolean` | sim | Permite ajuste local | CONFIRMADO |
| `permite_lancamento_central` | `boolean` | sim | Permite lancamento pelo central | CONFIRMADO |
| `updated_at` | `string` | nao | Ultima atualizacao | CONFIRMADO |
| `updated_by` | `number` | nao | Usuario atualizador | CONFIRMADO |

### `MobileSyncItem`

Arquivo: `apps/estoque-escolar-mobile/src/hooks/useSyncManager.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `string` | sim | Id local da fila | CONFIRMADO |
| `type` | `'entrada' | 'saida' | 'ajuste'` | sim | Tipo de sincronizacao | CONFIRMADO |
| `data` | `any` | sim | Payload original | CONFIRMADO |
| `timestamp` | `number` | sim | Criacao local | CONFIRMADO |
| `tentativas` | `number` | sim | Tentativas feitas | CONFIRMADO |
| `erro` | `string` | nao | Ultimo erro | CONFIRMADO |

## Modulo: faturamento

### `Faturamento`

Arquivos: `backend/src/modules/faturamentos/controllers/faturamentoController.ts`, `frontend/src/types/faturamento.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador de `faturamentos_pedidos` | CONFIRMADO |
| `pedido_id` | `number` | sim | Pedido de compra faturado | CONFIRMADO |
| `pedido_numero` | `string` | agregado | Numero do pedido | CONFIRMADO |
| `numero` | `string` | frontend | Numero exibido, fallback `FAT-{id}` | CONFIRMADO |
| `data_faturamento` | `string` | sim | Data do faturamento | CONFIRMADO |
| `status` | `'gerado' | 'consumido' | 'cancelado'` | sim | Status backend permitido | CONFIRMADO |
| `valor_total` | `number` | agregado | Soma dos itens | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes | CONFIRMADO |
| `usuario_id` | `number` | sim | Usuario criador no backend | CONFIRMADO |
| `usuario_nome` | `string` | agregado | Nome do usuario | CONFIRMADO |

### `FaturamentoItem`

Arquivo: `backend/src/modules/faturamentos/controllers/faturamentoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do item de faturamento | CONFIRMADO |
| `faturamento_pedido_id` | `number` | sim | Faturamento pai | CONFIRMADO |
| `pedido_item_id` | `number` | sim | Item do pedido | CONFIRMADO |
| `modalidade_id` | `number` | sim | Modalidade alocada | CONFIRMADO |
| `quantidade_alocada` | `number` | sim | Quantidade faturada para modalidade | CONFIRMADO |
| `preco_unitario` | `number` | sim | Preco unitario usado | CONFIRMADO |
| `valor_total` | `number` | calculado/armazenado | Valor do item | CONFIRMADO |
| `consumo_registrado` | `boolean` | sim | Se consumo foi registrado | CONFIRMADO |
| `data_consumo` | `string` | nao | Data do consumo | CONFIRMADO |

### `FaturamentoDetalhado`

Arquivo: `frontend/src/services/faturamentos.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `faturamento_id` | `number` | sim | Id do faturamento | CONFIRMADO |
| `pedido_id` | `number` | sim | Pedido | CONFIRMADO |
| `pedido_numero` | `string` | sim | Numero do pedido | CONFIRMADO |
| `competencia_mes_ano` | `string` | nao | Competencia do pedido | CONFIRMADO |
| `modalidade_id` | `number` | nao quando sem itens | Modalidade | CONFIRMADO |
| `modalidade_nome` | `string` | nao | Nome da modalidade | CONFIRMADO |
| `modalidade_repasse` | `number` | nao | Valor de repasse/categoria | CONFIRMADO |
| `produto_id` | `number` | nao | Produto | CONFIRMADO |
| `produto_nome` | `string` | nao | Nome do produto | CONFIRMADO |
| `contrato_id` | `number` | nao | Contrato | CONFIRMADO |
| `contrato_numero` | `string` | nao | Numero do contrato | CONFIRMADO |
| `fornecedor_id` | `number` | nao | Fornecedor | CONFIRMADO |
| `fornecedor_nome` | `string` | nao | Nome fornecedor | CONFIRMADO |

### `FaturamentoResumo`

Arquivo: `frontend/src/types/faturamento.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `contrato_id` | `number` | sim | Contrato agrupador | CONFIRMADO |
| `contrato_numero` | `string` | sim | Numero do contrato | CONFIRMADO |
| `fornecedor_id` | `number` | sim | Fornecedor | CONFIRMADO |
| `fornecedor_nome` | `string` | sim | Nome do fornecedor | CONFIRMADO |
| `modalidades` | `array` | sim | Modalidades e itens do contrato | CONFIRMADO |
| `quantidade_total` | `number` | sim | Quantidade agregada | CONFIRMADO |
| `valor_total` | `number` | sim | Valor agregado | CONFIRMADO |

### `ItemFaturamentoInput`

Arquivo: `backend/src/modules/faturamentos/controllers/faturamentoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `pedido_item_id` | `number` | sim | Item do pedido | CONFIRMADO |
| `modalidade_id` | `number` | sim | Modalidade de alocacao | CONFIRMADO |
| `quantidade_alocada` | `number` | sim | Quantidade a faturar | CONFIRMADO |
| `preco_unitario` | `number` | sim | Preco unitario | CONFIRMADO |

## Modulo: faturamentos

### Observacao de Alias

`faturamentos` nao introduz entidades novas em relacao ao modulo `faturamento`. O nome plural identifica a pasta backend, a permissao (`faturamentos`) e a rota HTTP (`/api/faturamentos`). As entidades confirmadas permanecem `Faturamento`, `FaturamentoItem`, `FaturamentoDetalhado`, `FaturamentoResumo` e `ItemFaturamentoInput`.

## Modulo: fornecedores

### `Fornecedor`

Arquivos: `backend/src/modules/contratos/controllers/fornecedorController.ts`, `frontend/src/services/fornecedores.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do fornecedor | CONFIRMADO |
| `nome` | `string` | sim | Nome/razao social | CONFIRMADO |
| `cnpj` | `string` | sim na UI | Documento exibido como CNPJ/CPF | CONFIRMADO |
| `email` | `string|null` | nao | Email de contato | CONFIRMADO |
| `endereco` | `string|null` | nao | Endereco retornado na busca por id | CONFIRMADO |
| `ativo` | `boolean` | sim | Status operacional | CONFIRMADO |
| `tipo_fornecedor` | `string` | nao | Classificacao PNAE/fornecedor | CONFIRMADO |
| `dap_caf` | `string|null` | condicional UI | Documento DAP/CAF | CONFIRMADO |
| `data_validade_dap` | `string|null` | condicional UI | Validade DAP/CAF | CONFIRMADO |
| `created_at` | `string` | nao | Criacao | CONFIRMADO |
| `updated_at` | `string` | nao | Ultima atualizacao | CONFIRMADO |

### `RelacionamentosFornecedor`

Arquivo: `backend/src/modules/contratos/controllers/fornecedorController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `fornecedor` | `string` | sim | Nome do fornecedor | CONFIRMADO |
| `podeExcluir` | `boolean` | sim | Verdadeiro quando nao ha contratos ativos | CONFIRMADO |
| `totalContratos` | `number` | sim | Total de contratos vinculados | CONFIRMADO |
| `contratosAtivos` | `number` | sim | Total de contratos ativos | CONFIRMADO |
| `contratos` | `array` | sim | Ate 10 contratos vinculados | CONFIRMADO |

### `ContratoRelacionadoFornecedor`

Arquivo: `backend/src/modules/contratos/controllers/fornecedorController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Id do contrato | CONFIRMADO |
| `numero` | `string` | sim | Numero do contrato | CONFIRMADO |
| `status` | `string` | nao | Status textual | CONFIRMADO |
| `ativo` | `boolean` | sim | Flag de contrato ativo | CONFIRMADO |
| `dataInicio` | `string` | nao | Inicio de vigencia | CONFIRMADO |
| `dataFim` | `string` | nao | Fim de vigencia | CONFIRMADO |
| `valorTotal` | `number` | nao | Valor total do contrato | CONFIRMADO |
| `totalProdutos` | `number` | sim | Quantidade de produtos vinculados | CONFIRMADO |

### `FornecedorImportacao`

Arquivo: `frontend/src/components/ImportacaoFornecedores.tsx`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `nome` | `string` | sim | Nome importado | CONFIRMADO |
| `cnpj` | `string` | sim | Documento importado e formatado | CONFIRMADO |
| `email` | `string` | nao | Email importado | CONFIRMADO |
| `telefone` | `string` | nao | Telefone importado | CONFIRMADO |
| `endereco` | `string` | nao | Endereco importado | CONFIRMADO |
| `cidade` | `string` | nao | Cidade importada | CONFIRMADO |
| `estado` | `string` | nao | Estado importado | CONFIRMADO |
| `cep` | `string` | nao | CEP importado | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes importadas | CONFIRMADO |
| `ativo` | `boolean` | sim | Status importado | CONFIRMADO |
| `status` | `'valido' | 'erro' | 'aviso'` | sim | Resultado da validacao local | CONFIRMADO |
| `mensagem` | `string` | nao | Mensagem de erro/aviso/sucesso | CONFIRMADO |

## Modulo: guias

### `Guia`

Arquivos: `backend/src/modules/guias/models/Guia.ts`, `frontend/src/services/guiaService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da guia | CONFIRMADO |
| `mes` | `number` | sim | Mes da competencia | CONFIRMADO |
| `ano` | `number` | sim | Ano da competencia | CONFIRMADO |
| `nome` | `string` | nao | Nome exibido da guia | CONFIRMADO |
| `observacao` | `string` | nao | Observacao administrativa | CONFIRMADO |
| `status` | `'aberta' | 'fechada' | 'cancelada'` | sim | Status do cabecalho | CONFIRMADO |
| `competencia_mes_ano` | `string` | geracao | Competencia usada pela geracao (`YYYY-MM` no codigo atual) | CONFIRMADO |
| `periodo_inicio` | `string` | nao | Inicio de periodo planejado | CONFIRMADO |
| `periodo_fim` | `string` | nao | Fim de periodo planejado | CONFIRMADO |
| `codigo_guia` | `string` | schema atual | Codigo unico `GUIA-YYYY-MM-NNNNN` | CONFIRMADO |
| `job_id` | `number` | async | Job de geracao associado | CONFIRMADO |
| `created_at` | `string` | sim | Criacao | CONFIRMADO |
| `updated_at` | `string` | sim | Atualizacao | CONFIRMADO |
| `total_produtos` | `number` | agregado | Total de itens/produtos agregados | CONFIRMADO |
| `total_escolas` | `number` | agregado | Total de escolas agregadas | CONFIRMADO |

### `GuiaProdutoEscola`

Arquivos: `backend/src/modules/guias/models/Guia.ts`, `frontend/src/services/guiaService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do item da guia | CONFIRMADO |
| `guia_id` | `number` | sim | Guia pai | CONFIRMADO |
| `produto_id` | `number` | sim | Produto | CONFIRMADO |
| `escola_id` | `number` | sim | Escola destino | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade atual/programada | CONFIRMADO |
| `quantidade_demanda` | `number` | nao | Quantidade originalmente calculada | CONFIRMADO |
| `unidade` | `string` | sim | Unidade de distribuicao/embalagem | CONFIRMADO |
| `lote` | `string` | nao | Lote | CONFIRMADO |
| `observacao` | `string` | nao | Observacao do item | CONFIRMADO |
| `para_entrega` | `boolean` | sim | Se entra no fluxo de entrega | CONFIRMADO |
| `entrega_confirmada` | `boolean` | nao | Confirmacao de entrega | CONFIRMADO |
| `quantidade_entregue` | `number` | nao | Quantidade entregue | CONFIRMADO |
| `quantidade_total_entregue` | `number` | agregado | Total entregue historico | CONFIRMADO |
| `saldo_pendente` | `number` | agregado | Quantidade menos entregue | CONFIRMADO |
| `data_entrega` | `string` | nao | Data programada/confirmada | CONFIRMADO |
| `nome_quem_recebeu` | `string` | nao | Recebedor | CONFIRMADO |
| `nome_quem_entregou` | `string` | nao | Entregador | CONFIRMADO |
| `status` | `'pendente' | 'entregue' | 'cancelado' | 'programada' | 'parcial'` | nao | Status operacional | CONFIRMADO |
| `produto_nome` | `string` | agregado | Nome do produto | CONFIRMADO |
| `produto_unidade` | `string` | agregado | Unidade do produto | CONFIRMADO |
| `escola_nome` | `string` | snapshot/agregado | Nome da escola | CONFIRMADO |
| `escola_endereco` | `string` | snapshot | Endereco da escola | CONFIRMADO |
| `escola_municipio` | `string` | snapshot | Municipio da escola | CONFIRMADO |
| `escola_total_alunos` | `number` | snapshot | Total de alunos no snapshot | CONFIRMADO |
| `escola_modalidades` | `json` | snapshot | Modalidades/alunos no snapshot | CONFIRMADO |
| `escola_snapshot_data` | `string` | snapshot | Data de referencia do snapshot | CONFIRMADO |

### `GerarGuiaDemandaParams`

Arquivo: `frontend/src/services/guiaDemandaGenerationService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `competencia` | `string` | sim | Competencia `YYYY-MM` | CONFIRMADO |
| `periodos` | `PeriodoGerarPedido[]` | sim | Periodos de calculo | CONFIRMADO |
| `escola_ids` | `number[]` | nao | Filtro de escolas | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes da guia | CONFIRMADO |
| `considerar_indice_coccao` | `boolean` | nao | Aplica indice de coccao | CONFIRMADO |
| `considerar_fator_correcao` | `boolean` | nao | Aplica fator de correcao | CONFIRMADO |
| `cardapio_ids` | `number[]` | nao | Filtro de cardapios | CONFIRMADO |

### `CompetenciaGuiaResumo`

Arquivo: `backend/src/modules/guias/models/Guia.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `mes` | `number` | sim | Mes | CONFIRMADO |
| `ano` | `number` | sim | Ano | CONFIRMADO |
| `guia_id` | `number` | sim | Id da guia | CONFIRMADO |
| `guia_nome` | `string` | nao | Nome da guia | CONFIRMADO |
| `guia_status` | `string` | sim | Status da guia | CONFIRMADO |
| `total_itens` | `number` | sim | Total de itens | CONFIRMADO |
| `total_escolas` | `number` | sim | Total de escolas | CONFIRMADO |
| `qtd_pendente` | `number` | sim | Itens pendentes | CONFIRMADO |
| `qtd_programada` | `number` | sim | Itens programados | CONFIRMADO |
| `qtd_parcial` | `number` | sim | Itens parciais | CONFIRMADO |
| `qtd_entregue` | `number` | sim | Itens entregues | CONFIRMADO |
| `qtd_cancelado` | `number` | sim | Itens cancelados | CONFIRMADO |

## Modulo: nutricao

### `Nutricionista`

Arquivo: `backend/src/modules/nutricao/controllers/nutricionistaController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador | CONFIRMADO |
| `nome` | `string` | sim | Nome do nutricionista | CONFIRMADO |
| `crn` | `string` | sim | Registro CRN unico | CONFIRMADO |
| `crn_regiao` | `string` | sim | Regiao do CRN | CONFIRMADO |
| `cpf` | `string` | nao | CPF unico quando informado | CONFIRMADO |
| `email` | `string` | nao | Email | CONFIRMADO |
| `telefone` | `string` | nao | Telefone | CONFIRMADO |
| `especialidade` | `string` | nao | Especialidade | CONFIRMADO |
| `ativo` | `boolean` | sim | Status | CONFIRMADO |
| `created_at` | `string` | nao | Criacao | CONFIRMADO |
| `updated_at` | `string` | nao | Atualizacao | CONFIRMADO |

### `GrupoIngrediente`

Arquivo: `backend/src/modules/nutricao/controllers/gruposIngredientesController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador | CONFIRMADO |
| `nome` | `string` | sim | Nome do grupo | CONFIRMADO |
| `descricao` | `string` | nao | Descricao | CONFIRMADO |
| `itens` | `GrupoIngredienteItem[]` | agregado | Itens do grupo | CONFIRMADO |

### `GrupoIngredienteItem`

Arquivo: `backend/src/modules/nutricao/controllers/gruposIngredientesController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador | CONFIRMADO |
| `grupo_id` | `number` | sim | Grupo pai | CONFIRMADO |
| `produto_id` | `number` | sim | Produto/ingrediente | CONFIRMADO |
| `produto_nome` | `string` | agregado | Nome do produto | CONFIRMADO |
| `per_capita` | `number` | sim | Quantidade per capita | CONFIRMADO |
| `tipo_medida` | `string` | sim | Unidade da quantidade | CONFIRMADO |
| `fator_correcao` | `number` | agregado | Fator do produto | CONFIRMADO |

### `TacoAlimento`

Arquivo: `backend/src/modules/nutricao/controllers/tacoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador TACO | CONFIRMADO |
| `nome` | `string` | sim | Nome do alimento | CONFIRMADO |
| `categoria` | `string` | nao | Categoria TACO | CONFIRMADO |
| `energia_kcal` | `number|null` | nao | Energia por 100g | CONFIRMADO |
| `proteina_g` | `number|null` | nao | Proteina por 100g | CONFIRMADO |
| `lipideos_g` | `number|null` | nao | Lipideos por 100g | CONFIRMADO |
| `carboidratos_g` | `number|null` | nao | Carboidratos por 100g | CONFIRMADO |
| `fibra_alimentar_g` | `number|null` | nao | Fibra por 100g | CONFIRMADO |
| `calcio_mg` | `number|null` | nao | Calcio por 100g | CONFIRMADO |
| `ferro_mg` | `number|null` | nao | Ferro por 100g | CONFIRMADO |
| `sodio_mg` | `number|null` | nao | Sodio por 100g | CONFIRMADO |
| `vitamina_c_mg` | `number|null` | nao | Vitamina C | CONFIRMADO |
| `vitamina_a_mcg` | `number|null` | nao | Vitamina A | CONFIRMADO |

### `ValoresNutricionaisRefeicao`

Arquivo: `backend/src/modules/nutricao/controllers/refeicaoCalculosController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `total` | `object` | sim | Soma total de nutrientes | CONFIRMADO |
| `por_porcao` | `object` | sim | Nutrientes por porcao | CONFIRMADO |
| `rendimento_porcoes` | `number` | sim | Porcoes usadas no calculo | CONFIRMADO |
| `alertas` | `array` | sim | Alertas nutricionais | CONFIRMADO |
| `ingredientes_sem_info` | `string[]` | sim | Ingredientes sem composicao | CONFIRMADO |
| `aviso` | `string|null` | nao | Aviso consolidado | CONFIRMADO |

### `CustoRefeicao`

Arquivo: `backend/src/modules/nutricao/controllers/refeicaoCalculosController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `custo_total` | `number` | sim | Custo total da refeicao | CONFIRMADO |
| `custo_por_porcao` | `number` | sim | Custo dividido por porcoes | CONFIRMADO |
| `rendimento_porcoes` | `number` | sim | Porcoes usadas | CONFIRMADO |
| `detalhamento` | `array` | sim | Custo por ingrediente | CONFIRMADO |
| `ingredientes_sem_preco` | `string[]` | sim | Ingredientes sem contrato ativo | CONFIRMADO |
| `ingredientes_com_erro` | `string[]` | sim | Ingredientes com peso invalido | CONFIRMADO |
| `alertas` | `array` | sim | Alertas de custo | CONFIRMADO |
| `aviso` | `string|null` | nao | Aviso consolidado | CONFIRMADO |

### `RefeicaoProdutoModalidade`

Arquivo: `backend/src/modules/nutricao/controllers/refeicaoProdutoModalidadeController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do ajuste | CONFIRMADO |
| `refeicao_produto_id` | `number` | sim | Ingrediente da refeicao | CONFIRMADO |
| `modalidade_id` | `number` | sim | Modalidade | CONFIRMADO |
| `modalidade_nome` | `string` | agregado | Nome da modalidade | CONFIRMADO |
| `per_capita_ajustado` | `number` | sim | Per capita especifico | CONFIRMADO |
| `observacao` | `string` | nao | Observacao do ajuste | CONFIRMADO |

## Modulo: portal-escola

### `PortalDashboardEscola`

Arquivo: `backend/src/modules/escolas/controllers/escolaPortalController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `escola` | `Escola` | sim | Escola vinculada ao usuario | CONFIRMADO |
| `modalidades` | `array` | sim | Modalidades da escola com alunos | CONFIRMADO |
| `totalAlunos` | `number` | sim | Soma de alunos por modalidade | CONFIRMADO |
| `estatisticas.total_guias` | `number` | sim | Guias com itens da escola | CONFIRMADO |
| `estatisticas.total_produtos` | `number` | sim | Produtos distintos em guias | CONFIRMADO |
| `estatisticas.pendentes` | `number` | sim | Itens pendentes | CONFIRMADO |
| `estatisticas.entregues` | `number` | sim | Itens entregues | CONFIRMADO |

### `PortalGuiaResumo`

Arquivo: `backend/src/modules/escolas/controllers/escolaPortalController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `guia_id` | `number` | sim | Id da guia | CONFIRMADO |
| `guia_nome` | `string|null` | nao | Nome da guia | CONFIRMADO |
| `mes` | `number` | sim | Mes | CONFIRMADO |
| `ano` | `number` | sim | Ano | CONFIRMADO |
| `guia_status` | `string` | sim | Status da guia | CONFIRMADO |
| `total_itens` | `number` | sim | Total de itens da escola | CONFIRMADO |
| `pendentes` | `number` | sim | Itens pendentes | CONFIRMADO |
| `entregues` | `number` | sim | Itens entregues | CONFIRMADO |

### `PortalCardapioSemana`

Arquivo: `backend/src/modules/escolas/controllers/escolaPortalController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Id do cardapio | CONFIRMADO |
| `mes` | `number` | sim | Mes do cardapio | CONFIRMADO |
| `ano` | `number` | sim | Ano do cardapio | CONFIRMADO |
| `dia` | `number` | sim | Dia do mes | CONFIRMADO |
| `modalidades_nomes` | `string` | sim | Modalidades agregadas | CONFIRMADO |
| `refeicoes` | `array` | sim | Refeicoes/preparacoes do dia | CONFIRMADO |

### `PortalComprovante`

Arquivo: `backend/src/modules/escolas/controllers/escolaPortalController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Id do comprovante | CONFIRMADO |
| `numero_comprovante` | `string` | sim | Numero/codigo do comprovante | CONFIRMADO |
| `data_entrega` | `string` | sim | Data de entrega | CONFIRMADO |
| `nome_quem_entregou` | `string` | nao | Entregador | CONFIRMADO |
| `nome_quem_recebeu` | `string` | nao | Recebedor | CONFIRMADO |
| `observacao` | `string` | nao | Observacao | CONFIRMADO |
| `status` | `string` | sim | Status | CONFIRMADO |
| `total_itens` | `number` | agregado | Total de itens | CONFIRMADO |
| `total_quantidade` | `number` | agregado | Soma entregue | CONFIRMADO |
| `itens` | `array` | detalhe | Itens no detalhe | CONFIRMADO |

### `PortalSolicitacao`

Arquivo: `frontend/src/services/solicitacoesAlimentos.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Id da solicitacao | CONFIRMADO |
| `escola_id` | `number` | sim | Escola solicitante | CONFIRMADO |
| `observacao` | `string` | nao | Observacao da escola | CONFIRMADO |
| `status` | `'pendente' | 'parcial' | 'concluida' | 'cancelada'` | sim | Status da solicitacao | CONFIRMADO |
| `itens` | `SolicitacaoItem[]` | sim | Itens solicitados | CONFIRMADO |
| `respondido_por_nome` | `string` | nao | Usuario respondente | CONFIRMADO |
| `respondido_em` | `string` | nao | Data de resposta | CONFIRMADO |
## Modulo: produtos

### `Produto`

Arquivo: `backend/src/modules/produtos/controllers/produtoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do produto | CONFIRMADO |
| `nome` | `string` | sim | Nome unico/identificador humano do produto | CONFIRMADO |
| `descricao` | `string` | nao | Descricao detalhada | CONFIRMADO |
| `tipo_processamento` | `string` | nao | Classificacao NOVA/processamento | CONFIRMADO |
| `categoria` | `string` | nao | Categoria livre/derivada de TACO | CONFIRMADO |
| `validade_minima` | `number` | nao | Dias minimos de validade | CONFIRMADO |
| `imagem_url` | `string` | nao | URL de imagem | CONFIRMADO |
| `perecivel` | `boolean` | sim | Indica produto perecivel | CONFIRMADO |
| `ativo` | `boolean` | sim | Disponibilidade no sistema | CONFIRMADO |
| `estoque_minimo` | `number` | nao | Quantidade minima para alerta | CONFIRMADO |
| `fator_correcao` | `number|string` | sim | Fator de perda/pre-preparo, minimo backend 1.0 | CONFIRMADO |
| `tipo_fator_correcao` | `string` | sim | Tipo do fator, usualmente `perda` ou `rendimento` | CONFIRMADO |
| `indice_coccao` | `number|string` | sim | Fator de alteracao por coccao, maior que 0 | CONFIRMADO |
| `unidade_medida_id` | `number` | nao | FK para unidade de medida | CONFIRMADO |
| `unidade` | `string` | agregado | Codigo da unidade, default `UN` | CONFIRMADO |
| `unidade_nome` | `string` | agregado | Nome da unidade, default `Unidade` | CONFIRMADO |
| `peso` | `number|string` | nao | Peso da embalagem/produto em gramas | CONFIRMADO |
| `tem_composicao_nutricional` | `boolean` | agregado | Existe linha em `produto_composicao_nutricional` | CONFIRMADO |
| `tem_contrato` | `boolean` | agregado | Existe contrato/produto ativo | CONFIRMADO |

### `ComposicaoNutricional`

Arquivo: `backend/src/modules/produtos/controllers/produtoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `produto_id` | `number` | sim | Produto associado, unico | CONFIRMADO |
| `calorias` | `number` | nao | Energia por 100g, alias de `energia_kcal` no schema novo | CONFIRMADO |
| `proteinas` | `number` | nao | Proteinas por 100g, alias de `proteina_g` | CONFIRMADO |
| `carboidratos` | `number` | nao | Carboidratos por 100g | CONFIRMADO |
| `gorduras` | `number` | nao | Lipideos/gorduras por 100g | CONFIRMADO |
| `fibras` | `number` | nao | Fibra alimentar por 100g | CONFIRMADO |
| `sodio` | `number` | nao | Sodio em mg por 100g | CONFIRMADO |
| `acucares` | `number` | nao | Acucares por 100g | CONFIRMADO |
| `gorduras_saturadas_g` | `number` | nao | Gorduras saturadas por 100g | CONFIRMADO |
| `gorduras_trans_g` | `number` | nao | Gorduras trans por 100g | CONFIRMADO |
| `colesterol` | `number` | nao | Colesterol em mg por 100g | CONFIRMADO |
| `calcio` | `number` | nao | Calcio em mg por 100g | CONFIRMADO |
| `ferro` | `number` | nao | Ferro em mg por 100g | CONFIRMADO |
| `vitamina_a` | `number` | nao | Vitamina A/retinol | CONFIRMADO |
| `vitamina_c` | `number` | nao | Vitamina C | CONFIRMADO |

### `UnidadeMedida`

Arquivo: `backend/src/services/unidadesMedidaService.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da unidade | CONFIRMADO |
| `codigo` | `string` | sim | Codigo curto, ex. `KG`, `G`, `L`, `UN` | CONFIRMADO |
| `nome` | `string` | sim | Nome da unidade | CONFIRMADO |
| `tipo` | `'massa' | 'volume' | 'unidade'` | sim | Familia de conversao | CONFIRMADO |
| `unidade_base_id` | `number|null` | nao | Unidade base do tipo | CONFIRMADO |
| `fator_conversao_base` | `number` | sim | Fator para converter para base | CONFIRMADO |
| `ativo` | `boolean` | sim | Unidade disponivel para uso | CONFIRMADO |

### `ProdutoImportacao`

Arquivo: `frontend/src/utils/produtoImportUtils.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `nome` | `string` | sim | Identificador usado para inserir/atualizar | CONFIRMADO |
| `descricao` | `string` | nao | Descricao importada | CONFIRMADO |
| `tipo_processamento` | `string` | nao | Valor de lista controlada | CONFIRMADO |
| `categoria` | `string` | nao | Categoria importada | CONFIRMADO |
| `validade_minima` | `number` | nao | Dias de validade minima | CONFIRMADO |
| `perecivel` | `boolean|string` | nao | Flag importada | CONFIRMADO |
| `ativo` | `boolean|string` | nao | Flag importada | CONFIRMADO |
| `estoque_minimo` | `number` | nao | Estoque minimo | CONFIRMADO |
| `fator_correcao` | `number` | nao | Fator de correcao | CONFIRMADO |
| `tipo_fator_correcao` | `string` | nao | `perda` ou `rendimento` | CONFIRMADO |
| `indice_coccao` | `number` | nao | Indice de coccao | CONFIRMADO |
| `unidade_medida_id` | `number|string` | nao | Coluna declarada como id, exemplos usam codigo | INFERIDO |
| `peso` | `number` | nao | Peso em gramas | CONFIRMADO |
## Modulo: programacao

### `PedidoItemProgramacao`

Arquivo: `backend/src/modules/compras/controllers/programacaoEntregaController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da programacao | CONFIRMADO |
| `pedido_item_id` | `number` | sim | Item do pedido programado | CONFIRMADO |
| `data_entrega` | `string/date` | sim | Data prevista da entrega | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes da programacao | CONFIRMADO |
| `quantidade_total` | `number` | agregado | Soma das quantidades por escola | CONFIRMADO |
| `escolas` | `ProgramacaoEscola[]` | sim | Escolas atendidas nessa data | CONFIRMADO |

### `ProgramacaoEscola`

Arquivo: `backend/src/modules/compras/controllers/programacaoEntregaController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | nao | Identificador da linha escola/programacao | CONFIRMADO |
| `programacao_id` | `number` | sim | FK para `pedido_item_programacoes` | CONFIRMADO |
| `escola_id` | `number` | sim | Escola atendida | CONFIRMADO |
| `escola_nome` | `string` | agregado | Nome da escola | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade entregue/programada para a escola | CONFIRMADO |

### `AjusteProgramacaoColuna`

Arquivo: `frontend/src/modules/programacao/pages/AjusteProgramacoesScreen.tsx`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `itemId` | `number|null` | nao | Item de pedido selecionado na coluna | CONFIRMADO |
| `progIdx` | `number|null` | nao | Indice da programacao do item | CONFIRMADO |
| `qtds[coluna][escolaId]` | `number` | sim | Quantidade editada por escola | CONFIRMADO |
| `qtdsOrig[coluna][escolaId]` | `number` | sim | Quantidade original para calculo de delta | CONFIRMADO |

### `AjusteGuiaDemandaGrupo`

Arquivo: `frontend/src/modules/programacao/pages/AjusteGuiaDemandaScreen.tsx`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `produto_id` | `number` | sim | Produto agrupado | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome do produto | CONFIRMADO |
| `unidade` | `string` | sim | Unidade da quantidade | CONFIRMADO |
| `data_entrega` | `string|null` | nao | Data de entrega do grupo | CONFIRMADO |
| `escolas` | `EscolaQtd[]` | sim | Linhas por escola/item de guia | CONFIRMADO |

### `EscolaQtd`

Arquivo: `frontend/src/modules/programacao/pages/AjusteGuiaDemandaScreen.tsx`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Escola | CONFIRMADO |
| `nome` | `string` | sim | Nome da escola | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade ajustada atual | CONFIRMADO |
| `quantidade_demanda` | `number` | sim | Quantidade calculada original | CONFIRMADO |
| `item_id` | `number` | sim | Id do item em `guia_produto_escola` | CONFIRMADO |
## Modulo: recebimentos

### `Recebimento`

Arquivo: `backend/src/modules/recebimentos/controllers/recebimentoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do recebimento | CONFIRMADO |
| `pedido_id` | `number` | sim | Pedido recebido | CONFIRMADO |
| `pedido_item_id` | `number` | sim | Item de pedido recebido | CONFIRMADO |
| `quantidade_recebida` | `number` | sim | Quantidade deste recebimento, maior que zero | CONFIRMADO |
| `data_recebimento` | `string/date` | sim | Timestamp do recebimento | CONFIRMADO |
| `observacoes` | `string` | nao | Observacao livre e metadados concatenados | CONFIRMADO |
| `usuario_id` | `number` | sim | Usuario que registrou | CONFIRMADO |
| `usuario_nome` | `string` | agregado | Nome do usuario no historico | CONFIRMADO |

### `PedidoRecebimentoResumo`

Arquivo: `backend/src/modules/recebimentos/controllers/recebimentoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Pedido | CONFIRMADO |
| `numero` | `string` | sim | Numero do pedido | CONFIRMADO |
| `data_pedido` | `string/date` | sim | Data do pedido | CONFIRMADO |
| `status` | `string` | sim | `pendente`, `recebido_parcial` ou `concluido` | CONFIRMADO |
| `valor_total` | `number` | sim | Valor do pedido | CONFIRMADO |
| `competencia_mes_ano` | `string` | nao | Competencia | CONFIRMADO |
| `total_itens` | `number` | agregado | Total de itens | CONFIRMADO |
| `total_fornecedores` | `number` | agregado | Total de fornecedores | CONFIRMADO |
| `valor_recebido` | `number` | agregado | Soma recebida valorizada pelo preco unitario | CONFIRMADO |
| `itens_completos` | `number` | agregado | Itens com recebimento >= quantidade pedida | CONFIRMADO |

### `FornecedorPedidoRecebimento`

Arquivo: `backend/src/modules/recebimentos/controllers/recebimentoController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Fornecedor | CONFIRMADO |
| `nome` | `string` | sim | Nome do fornecedor | CONFIRMADO |
| `cnpj` | `string` | nao | CNPJ | CONFIRMADO |
| `total_itens` | `number` | agregado | Itens do fornecedor no pedido | CONFIRMADO |
| `valor_total` | `number` | agregado | Valor total dos itens | CONFIRMADO |
| `valor_recebido` | `number` | agregado | Valor ja recebido | CONFIRMADO |
| `total_recebimentos` | `number` | agregado | Numero de registros de recebimento | CONFIRMADO |
| `itens_completos` | `number` | agregado | Itens completos | CONFIRMADO |
| `itens_atrasados` | `number` | agregado | Itens vencidos com saldo pendente | CONFIRMADO |

### `ItemPedidoRecebimento`

Arquivo: `apps/entregador-native/src/api/recebimentos.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Item do pedido | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade pedida/programada | CONFIRMADO |
| `preco_unitario` | `number` | sim | Preco unitario | CONFIRMADO |
| `valor_total` | `number` | sim | Valor do item | CONFIRMADO |
| `data_entrega_prevista` | `string` | nao | Data prevista | CONFIRMADO |
| `produto_id` | `number` | sim | Produto | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome do produto | CONFIRMADO |
| `unidade` | `string` | sim | Unidade exibida | CONFIRMADO |
| `contrato_numero` | `string` | sim | Contrato de origem | CONFIRMADO |
| `quantidade_recebida` | `number` | sim | Total ja recebido | CONFIRMADO |
| `saldo_pendente` | `number` | sim | Quantidade restante | CONFIRMADO |
| `total_recebimentos` | `number` | sim | Quantidade de registros | CONFIRMADO |

### `RecebimentoPayload`

Arquivo: `apps/entregador-native/src/api/recebimentos.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `pedidoId` | `number` | sim | Pedido | CONFIRMADO |
| `pedidoItemId` | `number` | sim | Item recebido | CONFIRMADO |
| `quantidadeRecebida` | `number` | sim | Quantidade a registrar | CONFIRMADO |
| `observacoes` | `string` | nao | Observacao livre | CONFIRMADO |
| `lote` | `string` | nao | Lote informado/gerado no mobile | CONFIRMADO |
| `dataFabricacao` | `string` | nao | Data de fabricacao | CONFIRMADO |
| `dataValidade` | `string` | nao | Data de validade | CONFIRMADO |
| `notaFiscal` | `string` | nao | Nota fiscal | CONFIRMADO |

## Modulo: rotas

### `RotaEntrega`

Arquivo: `frontend/src/modules/entregas/types/rota.ts`; tabela: `rotas_entrega`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da rota | CONFIRMADO |
| `nome` | `string` | sim | Nome da rota; obrigatorio na criacao | CONFIRMADO |
| `descricao` | `string` | nao | Descricao livre | CONFIRMADO |
| `cor` | `string` | sim | Cor visual da rota; padrao `#1976d2` | CONFIRMADO |
| `ativo` | `boolean` | sim | Status ativo/inativo | CONFIRMADO |
| `created_at` | `string/date` | sim | Data de criacao | CONFIRMADO |

## Modulo: solicitacoes

### `Solicitacao`

Arquivo: `frontend/src/services/solicitacoesAlimentos.ts`; tabela: `solicitacoes`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da solicitacao | CONFIRMADO |
| `escola_id` | `number` | sim | Escola solicitante | CONFIRMADO |
| `escola_nome` | `string` | agregado | Nome da escola | CONFIRMADO |
| `observacao` | `string` | nao | Observacao da escola | CONFIRMADO |
| `status` | `string` | sim | `pendente`, `parcial`, `concluida` ou `cancelada` | CONFIRMADO |
| `respondido_por` | `number` | nao | Usuario que respondeu por ultimo | CONFIRMADO |
| `respondido_por_nome` | `string` | agregado | Nome do respondente | CONFIRMADO |
| `respondido_em` | `string/date` | nao | Data da ultima resposta | CONFIRMADO |
| `created_at` | `string/date` | sim | Data de criacao | CONFIRMADO |
| `updated_at` | `string/date` | sim | Data de atualizacao | CONFIRMADO |
| `itens` | `SolicitacaoItem[]` | sim | Itens solicitados | CONFIRMADO |
| `total_itens` | `number` | agregado | Total de itens em minhas solicitacoes | CONFIRMADO |

### `SolicitacaoItem`

Arquivo: `frontend/src/services/solicitacoesAlimentos.ts`; tabela: `solicitacoes_itens`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do item | CONFIRMADO |
| `solicitacao_id` | `number` | sim | Solicitacao pai | CONFIRMADO |
| `produto_id` | `number` | nao | Produto cadastrado vinculado | CONFIRMADO |
| `nome_produto` | `string` | sim | Nome do produto no momento da solicitacao | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade solicitada | CONFIRMADO |
| `unidade` | `string` | sim | Unidade normalizada, fallback `UN` | CONFIRMADO |
| `status` | `string` | sim | `pendente`, `aceito`, `recusado` ou `contemplado` | CONFIRMADO |
| `justificativa_recusa` | `string` | nao | Justificativa obrigatoria para recusa | CONFIRMADO |
| `quantidade_aprovada` | `number` | nao | Quantidade aprovada emergencialmente | CONFIRMADO |
| `data_entrega_prevista` | `string/date` | nao | Data prevista da guia emergencial | CONFIRMADO |
| `guia_id` | `number` | nao | Guia vinculada ao atendimento | CONFIRMADO |
| `guia_produto_escola_id` | `number` | nao | Item de guia vinculado | CONFIRMADO |
| `atendimento_tipo` | `string` | nao | `emergencial` ou `guia_existente` | CONFIRMADO |
| `observacao_aprovacao` | `string` | nao | Observacao da aprovacao | CONFIRMADO |
| `respondido_por` | `number` | nao | Usuario respondente | CONFIRMADO |
| `respondido_em` | `string/date` | nao | Data da resposta | CONFIRMADO |
| `created_at` | `string/date` | sim | Data de criacao | CONFIRMADO |

### `CriarSolicitacaoData`

Arquivo: `frontend/src/services/solicitacoesAlimentos.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `observacao` | `string` | nao | Observacao enviada pela escola | CONFIRMADO |
| `itens` | `NovoItemData[]` | sim | Itens solicitados, array nao vazio | CONFIRMADO |

### `NovoItemData`

Arquivo: `frontend/src/services/solicitacoesAlimentos.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `produto_id` | `number` | sim no backend atual | Produto cadastrado ativo | CONFIRMADO |
| `nome_produto` | `string` | sim | Nome enviado pelo frontend, mas backend reusa nome do cadastro | CONFIRMADO |
| `quantidade` | `number` | sim | Quantidade positiva | CONFIRMADO |
| `unidade` | `string` | sim | Unidade enviada, mas backend normaliza pelo cadastro | CONFIRMADO |

### `AnaliseSolicitacaoItem`

Arquivo: `frontend/src/services/solicitacoesAlimentos.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `item` | `SolicitacaoItem` | sim | Item analisado com escola | CONFIRMADO |
| `estoque_central.quantidade_total` | `number` | sim | Saldo total central pelo ledger | CONFIRMADO |
| `estoque_central.quantidade_reservada` | `number` | sim | Saldo reservado por guias abertas | CONFIRMADO |
| `estoque_central.quantidade_disponivel` | `number` | sim | Total menos reservado | CONFIRMADO |
| `estoque_escola.quantidade_atual` | `number` | sim | Saldo atual na escola | CONFIRMADO |
| `cobertura_guias.total_pendente` | `number` | sim | Soma de saldo pendente em guias abertas | CONFIRMADO |
| `cobertura_guias.itens` | `array` | sim | Itens de guia que podem cobrir a solicitacao | CONFIRMADO |
| `quantidade_sugerida` | `number` | sim | Quantidade descoberta sugerida | CONFIRMADO |
| `atendimento_sugerido` | `string` | sim | `emergencial` ou `guia_existente` | CONFIRMADO |
| `data_entrega_sugerida` | `string/date` | sim | Amanhã como padrao calculado | CONFIRMADO |

## Modulo: unidades

### `UnidadeMedida`

Arquivo: `backend/src/services/unidadesMedidaService.ts`; tabela: `unidades_medida`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da unidade | CONFIRMADO |
| `codigo` | `string` | sim | Codigo unico, ex. `KG`, `G`, `L`, `ML`, `UN` | CONFIRMADO |
| `nome` | `string` | sim | Nome exibido da unidade | CONFIRMADO |
| `tipo` | `massa \| volume \| unidade` | sim | Grupo de conversao | CONFIRMADO |
| `unidade_base_id` | `number` | nao | Unidade base do mesmo tipo | CONFIRMADO |
| `fator_conversao_base` | `number` | sim | Fator para converter para a unidade base | CONFIRMADO |
| `ativo` | `boolean` | sim | Se aparece nas consultas | CONFIRMADO |
| `created_at` | `string/date` | sim | Data de criacao | CONFIRMADO |
| `updated_at` | `string/date` | sim | Data de atualizacao | CONFIRMADO |

### `ConverterUnidadePayload`

Arquivo: `backend/src/modules/unidades/controllers/unidadeMedidaController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `quantidade` | `number|string` | sim | Quantidade de origem | CONFIRMADO |
| `unidadeOrigemId` | `number|string` | sim | Unidade de origem | CONFIRMADO |
| `unidadeDestinoId` | `number|string` | sim | Unidade de destino | CONFIRMADO |
| `pesoEmbalagem` | `number|string` | condicional | Necessario para conversoes envolvendo embalagens variaveis | CONFIRMADO |

### `ConverterUnidadeResultado`

Arquivo: `frontend/src/services/unidadesMedida.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `quantidadeOrigem` | `number|string` | sim | Valor recebido no payload | CONFIRMADO |
| `quantidadeConvertida` | `number` | sim | Resultado da conversao | CONFIRMADO |
| `unidadeOrigemId` | `number|string` | sim | Unidade de origem | CONFIRMADO |
| `unidadeDestinoId` | `number|string` | sim | Unidade de destino | CONFIRMADO |

### `CalcularFatorPayload`

Arquivo: `backend/src/modules/unidades/controllers/unidadeMedidaController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `unidadeOrigemId` | `number|string` | sim | Unidade de origem/distribuicao | CONFIRMADO |
| `unidadeDestinoId` | `number|string` | sim | Unidade de destino/compra | CONFIRMADO |
| `pesoEmbalagem` | `number|string` | nao | Peso da embalagem em gramas | CONFIRMADO |
| `pesoProduto` | `number|string` | nao | Peso do produto em gramas | CONFIRMADO |

### Campos Textuais Legados e Snapshot

Arquivos: migrations de produtos, contratos, pedido_itens e estoque

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `produtos.unidade` | `string` | sim por padrao | Unidade textual do produto, default `UN` | CONFIRMADO |
| `produtos.unidade_medida_id` | `number` | nao | FK padronizada para `unidades_medida` | CONFIRMADO |
| `contrato_produtos.unidade` | `string` | nao | Unidade especifica do produto no contrato | CONFIRMADO |
| `contrato_produtos.unidade_medida_compra_id` | `number` | nao | FK da unidade de compra | CONFIRMADO |
| `contrato_produtos.peso` | `number` | nao | Peso especifico da embalagem no contrato | CONFIRMADO |
| `pedido_itens.unidade` | `string` | nao | Unidade de compra persistida no pedido | CONFIRMADO |
| `pedido_itens.quantidade_distribuicao` | `number` | nao | Quantidade em unidade de distribuicao | CONFIRMADO |
| `pedido_itens.unidade_distribuicao` | `string` | nao | Unidade de distribuicao persistida | CONFIRMADO |
| `estoque_central_movimentacoes.unidade` | `string` | sim apos migration | Unidade no momento da movimentacao | CONFIRMADO |

## Modulo: usuarios

### `Usuario`

Arquivo: `backend/src/modules/usuarios/models/User.ts`; tabela: `usuarios`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do usuário | CONFIRMADO |
| `nome` | `string` | sim | Nome do usuário | CONFIRMADO |
| `email` | `string` | sim | Email único para login | CONFIRMADO |
| `senha` | `string` | sim | Hash bcrypt da senha | CONFIRMADO |
| `tipo` | `string` | sim | Perfil base, ex. `admin`, `usuario`, `nutricionista` | CONFIRMADO |
| `ativo` | `boolean` | sim | Flag de atividade cadastral | CONFIRMADO |
| `institution_id` | `uuid/string` | nao | Instituição vinculada | CONFIRMADO |
| `escola_id` | `number` | condicional | Escola associada para usuário de escola | CONFIRMADO |
| `tipo_secretaria` | `educacao \| escola` | sim | Tipo de secretaria; default `educacao` | CONFIRMADO |
| `funcao_id` | `number` | nao | Função/role herdada | CONFIRMADO |
| `periodo_selecionado_id` | `number` | nao | Período individual do usuário | CONFIRMADO |
| `created_at` | `string/date` | sim | Data de criação | CONFIRMADO |
| `updated_at` | `string/date` | sim | Data de atualização | CONFIRMADO |

### `LoginPayload`

Arquivo: `backend/src/modules/usuarios/controllers/userController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `email` | `string` | sim | Email do usuário | CONFIRMADO |
| `senha` | `string` | sim | Senha em texto recebida para comparação bcrypt | CONFIRMADO |

### `JwtUsuarioPayload`

Arquivo: `backend/src/modules/usuarios/controllers/userController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Usuário autenticado | CONFIRMADO |
| `tipo` | `string` | sim | Tipo/perfil base | CONFIRMADO |
| `email` | `string` | sim | Email | CONFIRMADO |
| `nome` | `string` | sim | Nome | CONFIRMADO |
| `institution_id` | `uuid/string` | nao | Instituição | CONFIRMADO |
| `escola_id` | `number` | nao | Escola associada | CONFIRMADO |
| `tipo_secretaria` | `string` | sim | `educacao` quando ausente | CONFIRMADO |
| `isSystemAdmin` | `boolean` | sim | Verdadeiro quando `tipo === admin` | CONFIRMADO |

### `Funcao`

Arquivo: `backend/src/modules/usuarios/controllers/adminUsuariosController.ts`; tabela: `funcoes`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da função | CONFIRMADO |
| `nome` | `string` | sim | Nome único da função | CONFIRMADO |
| `descricao` | `string` | nao | Descrição | CONFIRMADO |
| `ativo` | `boolean` | sim | Se função está ativa | CONFIRMADO |
| `permissoes` | `FuncaoPermissao[]` | sim | Permissões por módulo | CONFIRMADO |

### `PermissaoUsuario`

Arquivo: `frontend/src/services/adminUsuarios.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `modulo_id` | `number` | sim | Módulo autorizado | CONFIRMADO |
| `modulo_nome` | `string` | sim | Nome do módulo | CONFIRMADO |
| `modulo_slug` | `string` | sim | Slug usado nos guards | CONFIRMADO |
| `nivel_permissao_id` | `number` | sim | Nível selecionado | CONFIRMADO |
| `nivel_nome` | `string` | sim | Nome do nível | CONFIRMADO |
| `nivel_slug` | `string` | sim | Slug do nível | CONFIRMADO |
| `nivel` | `number` | sim | 0 nenhum, 1 leitura, 2 escrita, 3 admin | CONFIRMADO |

### `ConflitoPermissao`

Arquivo: `backend/src/modules/usuarios/controllers/adminUsuariosController.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `tipo` | `string` | sim | Categoria do conflito | CONFIRMADO |
| `severidade` | `error \| warning \| info` | sim | Severidade | CONFIRMADO |
| `modulo` | `string` | sim | Slug do módulo afetado | CONFIRMADO |
| `modulo_nome` | `string` | sim | Nome do módulo | CONFIRMADO |
| `mensagem` | `string` | sim | Mensagem explicativa | CONFIRMADO |
| `sugestedao` | `string` | sim | Sugestão textual; campo está grafado assim no código | CONFIRMADO |
| `updated_at` | `string/date` | sim | Data de atualizacao | CONFIRMADO |
| `total_escolas` | `number` | agregado | Total de escolas vinculadas | CONFIRMADO |

### `RotaEscola`

Arquivo: `frontend/src/modules/entregas/types/rota.ts`; tabela: `rota_escolas`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do vinculo rota/escola | CONFIRMADO |
| `rota_id` | `number` | sim | Rota vinculada | CONFIRMADO |
| `escola_id` | `number` | sim | Escola vinculada | CONFIRMADO |
| `ordem` | `number` | sim | Ordem de visita dentro da rota | CONFIRMADO |
| `observacao` | `string` | nao | Observacao do vinculo | CONFIRMADO |
| `created_at` | `string/date` | sim | Data de criacao do vinculo | CONFIRMADO |
| `escola_nome` | `string` | agregado | Nome da escola | CONFIRMADO |
| `escola_endereco` | `string` | agregado | Endereco da escola | CONFIRMADO |
| `escola_municipio` | `string` | agregado | Municipio da escola | CONFIRMADO |

### `PlanejamentoEntrega`

Arquivo: `frontend/src/modules/entregas/types/rota.ts`; tabela: `planejamento_entregas`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do planejamento | CONFIRMADO |
| `guia_id` | `number` | sim | Guia planejada | CONFIRMADO |
| `rota_id` | `number` | sim | Rota planejada | CONFIRMADO |
| `data_planejada` | `string/date` | nao | Data prevista de entrega | CONFIRMADO |
| `status` | `string` | sim | `planejado`, `em_andamento`, `concluido` ou `cancelado` | CONFIRMADO |
| `responsavel` | `string` | nao | Responsavel textual | CONFIRMADO |
| `observacao` | `string` | nao | Observacao livre | CONFIRMADO |
| `created_at` | `string/date` | sim | Data de criacao | CONFIRMADO |
| `updated_at` | `string/date` | sim | Data de atualizacao | CONFIRMADO |
| `rota_nome` | `string` | agregado | Nome da rota | CONFIRMADO |
| `rota_cor` | `string` | agregado | Cor da rota | CONFIRMADO |
| `guia_mes` | `number` | agregado | Mes da guia | CONFIRMADO |
| `guia_ano` | `number` | agregado | Ano da guia | CONFIRMADO |

### `EntregaEscolaStatus`

Arquivo: `backend/src/modules/entregas/models/Rota.ts`; tabela: `entrega_escola_status`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do status/evidencia | CONFIRMADO |
| `planejamento_id` | `number` | sim | Planejamento de entrega | CONFIRMADO |
| `escola_id` | `number` | sim | Escola avaliada | CONFIRMADO |
| `status` | `string` | sim | `pendente`, `entregue` ou `nao_entregue` | CONFIRMADO |
| `observacao` | `string` | nao | Observacao da entrega | CONFIRMADO |
| `foto_url` | `string` | nao | URL S3 ou base64 armazenado | CONFIRMADO |
| `assinatura` | `string` | nao | Nome/assinatura de quem recebeu | CONFIRMADO |
| `created_at` | `string/date` | sim | Data de criacao | CONFIRMADO |
| `updated_at` | `string/date` | sim | Data de atualizacao | CONFIRMADO |

### `CreatePlanejamentoAvancadoData`

Arquivo: `frontend/src/modules/entregas/types/rota.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `guiaId` | `number` | sim | Guia usada para criar planejamentos | CONFIRMADO |
| `rotaIds` | `number[]` | sim | Rotas que receberao planejamento | CONFIRMADO |
| `dataPlanejada` | `string` | nao | Data prevista compartilhada | CONFIRMADO |
| `responsavel` | `string` | nao | Responsavel textual | CONFIRMADO |
| `observacao` | `string` | nao | Observacao livre | CONFIRMADO |
| `itensSelecionados` | `number[]` | nao | Usado apenas para compor observacao no backend atual | CONFIRMADO |

## Modulo: sistema

### `Modulo`

Arquivo: `backend/migrations/022_create_user_permissions.sql`; tabela: `modulos`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do modulo | CONFIRMADO |
| `nome` | `string` | sim | Nome exibido | CONFIRMADO |
| `slug` | `string` | sim | Chave usada por guards e middlewares | CONFIRMADO |
| `descricao` | `string` | nao | Descricao do modulo | CONFIRMADO |
| `icone` | `string` | nao | Nome de icone | CONFIRMADO |
| `ordem` | `number` | sim | Ordem de exibicao | CONFIRMADO |
| `ativo` | `boolean` | sim | Se o modulo aparece como disponivel | CONFIRMADO |

### `NivelPermissao`

Arquivo: `backend/migrations/022_create_user_permissions.sql`; tabela: `niveis_permissao`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do nivel | CONFIRMADO |
| `nome` | `string` | sim | Nome do nivel | CONFIRMADO |
| `slug` | `string` | sim | Chave do nivel | CONFIRMADO |
| `descricao` | `string` | nao | Descricao do acesso | CONFIRMADO |
| `nivel` | `number` | sim | 0 nenhum, 1 leitura, 2 escrita, 3 admin/total | CONFIRMADO |

### `UsuarioPermissao`

Arquivo: `backend/migrations/022_create_user_permissions.sql`; tabela: `usuario_permissoes`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da permissao direta | CONFIRMADO |
| `usuario_id` | `number` | sim | Usuario autorizado | CONFIRMADO |
| `modulo_id` | `number` | sim | Modulo autorizado | CONFIRMADO |
| `nivel_permissao_id` | `number` | sim | Nivel concedido | CONFIRMADO |
| `tenant_id` | `uuid` | sim na migration | Tenant da permissao | CONFIRMADO |

### `Funcao`

Arquivo: `backend/migrations/20260315_create_funcoes_usuarios.sql`; tabelas: `funcoes`, `funcao_permissoes`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da funcao | CONFIRMADO |
| `nome` | `string` | sim | Nome unico da funcao | CONFIRMADO |
| `descricao` | `string` | nao | Descricao da funcao | CONFIRMADO |
| `ativo` | `boolean` | sim | Se a funcao participa da permissao herdada | CONFIRMADO |
| `funcao_id` | `number` | sim | Funcao na permissao herdada | CONFIRMADO |
| `modulo_id` | `number` | sim | Modulo autorizado pela funcao | CONFIRMADO |
| `nivel_permissao_id` | `number` | sim | Nivel herdado | CONFIRMADO |

### `PeriodoSistema`

Arquivo: `backend/migrations/20260315_create_periodos_sistema.sql`; tabela: `periodos`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do periodo | CONFIRMADO |
| `ano` | `number` | sim | Ano letivo, unico | CONFIRMADO |
| `descricao` | `string` | nao | Descricao do periodo | CONFIRMADO |
| `data_inicio` | `date` | sim | Inicio do periodo | CONFIRMADO |
| `data_fim` | `date` | sim | Fim do periodo, maior que inicio | CONFIRMADO |
| `ativo` | `boolean` | sim | Periodo ativo global | CONFIRMADO |
| `fechado` | `boolean` | sim | Periodo bloqueado para encerramento | CONFIRMADO |
| `ocultar_dados` | `boolean` | inferido | Controle usado pelo controller/tela, coluna nao aparece na migration inicial lida | INFERIDO |

### `Instituicao`

Arquivo: `backend/src/modules/sistema/controllers/instituicaoController.ts`; tabela: `instituicoes`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da instituicao | CONFIRMADO |
| `nome` | `string` | sim | Nome institucional | CONFIRMADO |
| `cnpj` | `string` | nao | CNPJ | CONFIRMADO |
| `endereco` | `string` | nao | Endereco | CONFIRMADO |
| `telefone` | `string` | nao | Telefone | CONFIRMADO |
| `email` | `string` | nao | Email | CONFIRMADO |
| `site` | `string` | nao | Site | CONFIRMADO |
| `secretario_nome` | `string` | nao | Nome do responsavel | CONFIRMADO |
| `secretario_cargo` | `string` | nao | Cargo; padrao textual de secretario(a) | CONFIRMADO |
| `departamento` | `string` | nao | Departamento | CONFIRMADO |
| `logo_url` | `string` | nao | URL de arquivo local ou base64 | CONFIRMADO |
| `pdf_templates` | `json` | nao | Templates PDF por chave | CONFIRMADO |
| `ativo` | `boolean` | sim | Registro ativo | CONFIRMADO |

### `CalendarioLetivo`

Arquivo: `backend/migrations/20260317_create_calendario_letivo.sql`; tabela: `calendario_letivo`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do calendario | CONFIRMADO |
| `ano_letivo` | `number` | sim | Ano letivo unico | CONFIRMADO |
| `data_inicio` | `date` | sim | Inicio do calendario | CONFIRMADO |
| `data_fim` | `date` | sim | Fim do calendario | CONFIRMADO |
| `total_dias_letivos_obrigatorio` | `number` | sim | Meta de dias letivos, padrao 200 | CONFIRMADO |
| `divisao_ano` | `string` | sim | `bimestral`, `trimestral` ou `semestral` | CONFIRMADO |
| `dias_semana_letivos` | `json` | sim | Dias da semana considerados letivos | CONFIRMADO |
| `ativo` | `boolean` | sim | Calendario ativo | CONFIRMADO |

### `EventoCalendario`

Arquivo: `backend/migrations/20260317_create_calendario_letivo.sql`; tabela: `eventos_calendario`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do evento | CONFIRMADO |
| `calendario_letivo_id` | `number` | sim | Calendario vinculado | CONFIRMADO |
| `titulo` | `string` | sim | Titulo do evento | CONFIRMADO |
| `tipo_evento` | `string` | sim | Tipo controlado por CHECK | CONFIRMADO |
| `data_inicio` | `date` | sim | Data inicial | CONFIRMADO |
| `data_fim` | `date` | nao | Data final, se houver | CONFIRMADO |
| `recorrente` | `boolean` | sim | Indica recorrencia | CONFIRMADO |
| `recorrencia_config` | `json` | nao | Configuracao de recorrencia | CONFIRMADO |

### `DisparoNotificacao`

Arquivo: `backend/migrations/20260322_create_disparos_notificacao.sql`; tabela: `disparos_notificacao`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador do disparo | CONFIRMADO |
| `titulo` | `string` | sim | Titulo da notificacao | CONFIRMADO |
| `mensagem` | `string` | sim | Mensagem enviada | CONFIRMADO |
| `link` | `string` | nao | Link opcional | CONFIRMADO |
| `tipo` | `string` | sim | `info`, `aviso`, `sucesso` ou `erro` por convencao da UI | CONFIRMADO |
| `alvo` | `string` | sim | `todas`, `modalidade` ou `selecao` | CONFIRMADO |
| `modalidade_id` | `number` | condicional | Obrigatorio quando alvo e modalidade | CONFIRMADO |
| `escola_ids` | `number[]` | condicional | Obrigatorio quando alvo e selecao | CONFIRMADO |
| `status` | `string` | sim | `pendente`, `processando`, `enviado`, `cancelado` ou `erro` | CONFIRMADO |
| `total_enviado` | `number` | sim | Total de notificacoes criadas | CONFIRMADO |
| `criado_por` | `number` | sim | Usuario criador | CONFIRMADO |

### `Notificacao`

Arquivo: `backend/src/modules/sistema/controllers/notificacoesController.ts`; tabela: `notificacoes`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da notificacao | CONFIRMADO |
| `usuario_id` | `number` | sim | Usuario destinatario | CONFIRMADO |
| `tipo` | `string` | sim | Tipo visual/semantico | CONFIRMADO |
| `titulo` | `string` | sim | Titulo | CONFIRMADO |
| `mensagem` | `string` | sim | Texto | CONFIRMADO |
| `link` | `string` | nao | Link de destino | CONFIRMADO |
| `lida` | `boolean` | sim | Flag de leitura | CONFIRMADO |
| `created_at` | `string/date` | sim | Data de criacao | CONFIRMADO |

## Modulo: apps/entregador-native

### `AsyncStorage.token`

Arquivo: `apps/entregador-native/src/screens/LoginScreen.tsx`; storage local

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `token` | `string` | sim | JWT usado em `Authorization: Bearer` | CONFIRMADO |
| `nome` | `string` | sim para exibicao | Nome do usuario/entregador mostrado no app e usado na entrega | CONFIRMADO |
| `email` | `string` | nao | Email retornado pelo login | CONFIRMADO |
| `tipo` | `string` | sim | Tipo do usuario retornado pelo backend | CONFIRMADO |
| `isSystemAdmin` | `boolean` | nao | Flag administrativa retornada pelo backend | CONFIRMADO |

### `EntregaQrFilter`

Arquivo: `apps/entregador-native/src/utils/qrFilter.ts`; storage `filtro_qrcode`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `escopoRotas` | `todas | selecionadas` | sim | Define se o filtro inclui todas as rotas ou lista especifica | CONFIRMADO |
| `rotaIds` | `number[] | todas` | sim | Rotas filtradas; aceita `todas` | CONFIRMADO |
| `rotaId` | `number` | nao | Compatibilidade com formato antigo de uma rota | CONFIRMADO |
| `rotaNome` | `string` | nao | Nome resumido da rota ou texto gerado | CONFIRMADO |
| `rotaNomes` | `string[]` | nao | Nomes das rotas selecionadas | CONFIRMADO |
| `dataInicio` | `string/date` | sim | Inicio do periodo de entrega | CONFIRMADO |
| `dataFim` | `string/date` | sim | Fim do periodo de entrega | CONFIRMADO |
| `status` | `string` | nao | Status do filtro; padrao `todos` | CONFIRMADO |
| `geradoEm` | `string/date` | nao | Data de geracao do QR | CONFIRMADO |
| `geradoPor` | `string` | nao | Autor do QR | CONFIRMADO |

### `CacheEntry<T>`

Arquivo: `apps/entregador-native/src/services/cacheService.ts`; chaves `cache_*`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `data` | `T` | sim | Payload cacheado | CONFIRMADO |
| `timestamp` | `number` | sim | Momento do cache em milissegundos | CONFIRMADO |

Chaves confirmadas:

| Chave | Conteudo | Confianca |
| --- | --- | --- |
| `cache_rotas` | Lista de rotas | CONFIRMADO |
| `cache_escolas_rota_<rotaId>` | Escolas de uma rota | CONFIRMADO |
| `cache_itens_escola_<escolaId>` | Itens crus de entrega de uma escola | CONFIRMADO |
| `cache_itens_escola_projection_<escolaId>` | Projecao resumida dos itens da escola | CONFIRMADO |
| `cache_rota_projection_<rotaId>` | Projecao resumida por escola da rota | CONFIRMADO |
| `cache_comprovantes_<YYYY-MM-DD>` | Comprovantes do servidor para a data | CONFIRMADO |

### `DeliveryOutboxOperation`

Arquivo: `apps/entregador-native/src/services/deliveryOutboxCore.ts`; storage `offline_queue`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `string` | sim | ID local da operacao, normalmente `client_operation_id` | CONFIRMADO |
| `type` | `confirmar_entrega` | sim | Tipo da operacao offline | CONFIRMADO |
| `itemId` | `number` | sim | ID do item de entrega no backend | CONFIRMADO |
| `data` | `ConfirmarEntregaData` | sim | Dados enviados para confirmar entrega | CONFIRMADO |
| `timestamp` | `number` | sim | Data local da criacao da operacao | CONFIRMADO |
| `status` | `DeliveryOutboxStatus` | sim | Estado da fila offline | CONFIRMADO |
| `attemptCount` | `number` | sim | Tentativas de sincronizacao | CONFIRMADO |
| `lastAttemptAt` | `number` | nao | Ultima tentativa de sincronizacao | CONFIRMADO |
| `lastError` | `string` | nao | Erro mais recente | CONFIRMADO |
| `historicoId` | `number` | nao | Historico retornado por `/confirmar` | CONFIRMADO |
| `comprovanteId` | `number` | nao | Comprovante criado no backend | CONFIRMADO |
| `fotoUploadedAt` | `string/date` | nao | Momento local de confirmacao de upload da foto | CONFIRMADO |
| `comprovanteData` | `DeliveryComprovanteData` | nao | Dados necessarios para criar comprovante offline | CONFIRMADO |

Valores de `DeliveryOutboxStatus`: `pending`, `syncing`, `failed_retryable`, `failed_needs_action`, `comprovante_pending`, `foto_pending`, `synced`.

### `DeliveryComprovanteData`

Arquivo: `apps/entregador-native/src/services/deliveryOutboxCore.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `escola_id` | `number` | sim | Escola da entrega | CONFIRMADO |
| `escola_nome` | `string` | nao | Nome da escola para exibicao offline | CONFIRMADO |
| `nome_quem_entregou` | `string` | sim | Responsavel pela entrega | CONFIRMADO |
| `nome_quem_recebeu` | `string` | sim | Responsavel pelo recebimento | CONFIRMADO |
| `observacao` | `string` | nao | Observacao da entrega | CONFIRMADO |
| `assinatura_base64` | `string` | nao | Assinatura opcional | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome do produto entregue | CONFIRMADO |
| `quantidade_entregue` | `number` | sim | Quantidade entregue | CONFIRMADO |
| `unidade` | `string` | nao | Unidade exibida no comprovante | CONFIRMADO |
| `lote` | `string` | nao | Lote do produto | CONFIRMADO |
| `batch_id` | `string` | nao | Agrupador local de varias entregas no mesmo comprovante | CONFIRMADO |
| `foto_local_uri` | `string` | nao | URI local da foto da mercadoria | CONFIRMADO |
| `foto_content_type` | `image/jpeg` | condicional | Content type da foto quando existe foto | CONFIRMADO |
| `foto_size_bytes` | `number` | condicional | Tamanho da foto quando existe foto | CONFIRMADO |

### `SchoolItemProjection`

Arquivo: `apps/entregador-native/src/services/deliveryProjectionCore.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | ID do item de entrega | CONFIRMADO |
| `entrega_confirmada` | `boolean` | nao | Indica entrega concluida | CONFIRMADO |
| `saldo_pendente` | `number` | nao | Saldo restante | CONFIRMADO |
| `data_entrega` | `string/date` | nao | Data programada | CONFIRMADO |
| `latest_historico_entrega_date` | `string/date` | nao | Data do ultimo historico de entrega | CONFIRMADO |

### `RouteSchoolProjection`

Arquivo: `apps/entregador-native/src/services/deliveryRouteProjectionCore.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `escola_id` | `number` | sim | Escola da rota | CONFIRMADO |
| `escola_nome` | `string` | nao | Nome da escola | CONFIRMADO |
| `escola_endereco` | `string` | nao | Endereco da escola | CONFIRMADO |
| `ordem` | `number` | nao | Ordem na rota | CONFIRMADO |
| `projections` | `SchoolItemProjection[]` | sim | Projecoes dos itens da escola | CONFIRMADO |

### `RecebimentoMobile`

Arquivo: `apps/entregador-native/src/api/recebimentos.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `PedidoPendente.id` | `number` | sim | Pedido listado para recebimento | CONFIRMADO |
| `PedidoPendente.numero` | `string` | sim | Numero do pedido | CONFIRMADO |
| `FornecedorPedido.id` | `number` | sim | Fornecedor vinculado ao pedido | CONFIRMADO |
| `ItemPedido.id` | `number` | sim | Item do pedido a receber | CONFIRMADO |
| `ItemPedido.quantidade_recebida` | `number` | sim | Quantidade ja recebida | CONFIRMADO |
| `ItemPedido.saldo_pendente` | `number` | sim | Saldo que ainda pode ser recebido | CONFIRMADO |
| `registrarRecebimento.quantidadeRecebida` | `number` | sim | Quantidade registrada no mobile | CONFIRMADO |
| `registrarRecebimento.lote` | `string` | nao | Lote informado | CONFIRMADO |
| `registrarRecebimento.dataFabricacao` | `string/date` | nao | Fabricacao informada | CONFIRMADO |
| `registrarRecebimento.dataValidade` | `string/date` | nao | Validade informada | CONFIRMADO |
| `registrarRecebimento.notaFiscal` | `string` | nao | Nota fiscal informada | CONFIRMADO |

### `EstoqueCentralMobile`

Arquivo: `apps/entregador-native/src/api/estoqueCentral.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `EstoqueCentral.produto_id` | `number` | sim | Produto em estoque | CONFIRMADO |
| `EstoqueCentral.produto_nome` | `string` | sim | Nome do produto | CONFIRMADO |
| `EstoqueCentral.unidade` | `string` | sim | Unidade exibida | CONFIRMADO |
| `EstoqueCentral.quantidade` | `number` | sim | Quantidade total normalizada | CONFIRMADO |
| `EstoqueCentral.quantidade_reservada` | `number` | sim | Quantidade reservada | CONFIRMADO |
| `EstoqueCentral.quantidade_disponivel` | `number` | sim | Quantidade disponivel | CONFIRMADO |
| `Movimentacao.tipo` | `string` | sim | Entrada, saida, ajuste, transferencia ou evento original | CONFIRMADO |
| `Movimentacao.quantidade` | `number` | sim | Quantidade, negativa para saida/transferencia | CONFIRMADO |
| `EntradaData.produto_id` | `number` | sim | Produto da entrada | CONFIRMADO |
| `SaidaData.quantidade` | `number` | sim | Quantidade da saida | CONFIRMADO |
| `AjusteData.quantidade_nova` | `number` | sim | Saldo ajustado | CONFIRMADO |
| `TransferenciaData.escola_id` | `number` | sim | Escola destino da transferencia | CONFIRMADO |

## Modulo: apps/estoque-escolar-mobile

### `SessaoGestor`

Arquivo: `apps/estoque-escolar-mobile/src/services/gestorEscola.ts`; storage `gestor_escola`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `escola` | `Escola` | sim | Escola autenticada para o gestor | CONFIRMADO |
| `token` | `string` | sim | Token retornado por `/api/gestor-escola/autenticar` | CONFIRMADO |
| `codigo_acesso` | `string` | sim | Codigo usado no login, salvo localmente | CONFIRMADO |
| `timestamp` | `number` | sim | Momento de criacao da sessao; expira em 24h | CONFIRMADO |

### `AuthToken`

Arquivo: `apps/estoque-escolar-mobile/src/services/api.ts`; storage `auth_token`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `auth_token` | `string` | sim | Token usado em `Authorization: Bearer` no `apiService.request` | CONFIRMADO |

### `EscolaGestor`

Arquivo: `apps/estoque-escolar-mobile/src/services/gestorEscola.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | Identificador da escola | CONFIRMADO |
| `nome` | `string` | sim | Nome da escola | CONFIRMADO |
| `endereco` | `string` | nao | Endereco | CONFIRMADO |
| `telefone` | `string` | nao | Telefone | CONFIRMADO |
| `email` | `string` | nao | Email | CONFIRMADO |

### `ItemEstoqueEscolaMobile`

Arquivo: `apps/estoque-escolar-mobile/src/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | ID do item de estoque escolar | CONFIRMADO |
| `produto_id` | `number` | sim | Produto associado | CONFIRMADO |
| `escola_id` | `number` | sim | Escola dona do estoque | CONFIRMADO |
| `quantidade_atual` | `number` | sim | Saldo atual | CONFIRMADO |
| `quantidade_minima` | `number` | nao | Limite minimo | CONFIRMADO |
| `quantidade_maxima` | `number` | nao | Limite maximo | CONFIRMADO |
| `status_estoque` | `sem_estoque | baixo | normal | alto | vencido | critico | atencao` | sim | Estado operacional/validade | CONFIRMADO |
| `data_ultima_atualizacao` | `string/date` | sim | Ultima atualizacao | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome do produto | CONFIRMADO |
| `unidade_medida` | `string` | sim | Unidade exibida | CONFIRMADO |
| `categoria` | `string` | sim | Categoria do produto | CONFIRMADO |
| `escola_nome` | `string` | sim | Nome da escola | CONFIRMADO |
| `data_validade` | `string/date` | nao | Validade simples do item | CONFIRMADO |
| `data_entrada` | `string/date` | nao | Data de entrada | CONFIRMADO |
| `dias_para_vencimento` | `number` | nao | Dias ate vencimento informados pelo backend | CONFIRMADO |
| `lotes` | `LoteEstoque[]` | nao | Lotes ativos carregados para compatibilidade | CONFIRMADO |

### `LoteEstoqueMobile`

Arquivo: `apps/estoque-escolar-mobile/src/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | ID do lote | CONFIRMADO |
| `produto_id` | `number` | sim | Produto do lote | CONFIRMADO |
| `lote` | `string` | sim | Codigo do lote | CONFIRMADO |
| `quantidade_inicial` | `number` | sim | Quantidade inicial | CONFIRMADO |
| `quantidade_atual` | `number` | sim | Saldo atual do lote | CONFIRMADO |
| `data_fabricacao` | `string/date` | nao | Fabricacao | CONFIRMADO |
| `data_validade` | `string/date` | nao | Validade | CONFIRMADO |
| `fornecedor_id` | `number` | nao | Fornecedor associado | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes do lote | CONFIRMADO |
| `status` | `ativo | vencido | bloqueado` | sim | Status do lote | CONFIRMADO |

### `HistoricoEstoqueMobile`

Arquivo: `apps/estoque-escolar-mobile/src/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `number` | sim | ID do movimento | CONFIRMADO |
| `estoque_escola_id` | `number` | sim | Item de estoque escolar | CONFIRMADO |
| `escola_id` | `number` | sim | Escola do movimento | CONFIRMADO |
| `produto_id` | `number` | sim | Produto movimentado | CONFIRMADO |
| `tipo_movimentacao` | `entrada | saida | ajuste | transferencia` | sim | Tipo do movimento | CONFIRMADO |
| `quantidade_anterior` | `number` | sim | Saldo anterior | CONFIRMADO |
| `quantidade_movimentada` | `number` | sim | Quantidade movimentada | CONFIRMADO |
| `quantidade_posterior` | `number` | sim | Saldo posterior | CONFIRMADO |
| `motivo` | `string` | nao | Motivo | CONFIRMADO |
| `documento_referencia` | `string` | nao | Documento de referencia | CONFIRMADO |
| `usuario_id` | `number` | nao | Usuario/gestor que movimentou | CONFIRMADO |
| `data_movimentacao` | `string/date` | sim | Data do movimento | CONFIRMADO |
| `observacoes` | `string` | nao | Observacoes | CONFIRMADO |
| `produto_nome` | `string` | sim | Nome do produto | CONFIRMADO |
| `unidade_medida` | `string` | sim | Unidade do produto | CONFIRMADO |

### `ResumoEstoqueMobile`

Arquivo: `apps/estoque-escolar-mobile/src/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `total_itens` | `number` | sim | Total de itens | CONFIRMADO |
| `itens_normais` | `number` | sim | Itens em status normal | CONFIRMADO |
| `itens_baixos` | `number` | sim | Itens com estoque baixo | CONFIRMADO |
| `itens_sem_estoque` | `number` | sim | Itens zerados | CONFIRMADO |

### `SyncItemEstoqueMobile`

Arquivo: `apps/estoque-escolar-mobile/src/hooks/useSyncManager.ts`; storage `@sync_pending_items`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `string` | sim | ID local da operacao de sync | CONFIRMADO |
| `type` | `entrada | saida | ajuste` | sim | Tipo de movimentacao pendente | CONFIRMADO |
| `data` | `any` | sim | Payload a reenviar para movimentacao | CONFIRMADO |
| `timestamp` | `number` | sim | Criacao local | CONFIRMADO |
| `tentativas` | `number` | sim | Numero de tentativas | CONFIRMADO |
| `erro` | `string` | nao | Ultimo erro | CONFIRMADO |

### `SyncStatusEstoqueMobile`

Arquivo: `apps/estoque-escolar-mobile/src/hooks/useSyncManager.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `isOnline` | `boolean` | sim | Estado de rede | CONFIRMADO |
| `isSyncing` | `boolean` | sim | Se sync esta em execucao | CONFIRMADO |
| `lastSync` | `Date | null` | sim | Ultimo sync salvo em `@last_sync` | CONFIRMADO |
| `pendingItems` | `number` | sim | Quantidade de itens pendentes | CONFIRMADO |
| `errors` | `string[]` | sim | Erros acumulados do sync | CONFIRMADO |

## Modulo: desktop

### `DesktopBackendUrls`

Arquivo: `desktop/backend-service.cjs`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `baseURL` | `string` | sim | URL base da API usada pelo renderer desktop | CONFIRMADO |
| `healthURL` | `string` | sim | URL de health check do backend | CONFIRMADO |

### `DesktopBackendEnv`

Arquivo: `desktop/backend-service.cjs`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `PORT` | `string` | sim | Porta do backend desktop; padrao 3131 | CONFIRMADO |
| `HOST` | `127.0.0.1` | sim | Host local do backend desktop | CONFIRMADO |
| `NODE_ENV` | `string` | sim | Ambiente; padrao `desktop` se ausente | CONFIRMADO |
| `DESKTOP_APP` | `1` | sim | Flag indicando execucao desktop | CONFIRMADO |
| `ELECTRON_RUN_AS_NODE` | `1` | sim | Faz Electron executar backend como Node | CONFIRMADO |

### `DesktopShell`

Arquivo: `desktop/preload.cjs`; exposto como `window.desktopShell`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `isDesktop` | `boolean` | sim | Sempre true no preload | CONFIRMADO |
| `isDev` | `boolean` | sim | Derivado de `ELECTRON_IS_DEV` | CONFIRMADO |
| `platform` | `string` | sim | `process.platform` | CONFIRMADO |
| `apiBaseURL` | `string` | sim | URL da API desktop | CONFIRMADO |
| `healthURL` | `string` | sim | URL de health desktop | CONFIRMADO |
| `openExternal` | `function` | sim | Abre URL externa via shell | CONFIRMADO |
| `showItemInFolder` | `function` | sim | Revela arquivo no sistema | CONFIRMADO |
| `openLogsFolder` | `function` | sim | Abre pasta de logs via IPC | CONFIRMADO |
| `reloadApp` | `function` | sim | Solicita reload da janela | CONFIRMADO |
| `toggleDevTools` | `function` | sim | Solicita devtools em dev | CONFIRMADO |
| `showAboutDialog` | `function` | sim | Abre dialogo Sobre | CONFIRMADO |
| `saveGeneratedFile` | `function` | sim | Salva payload gerado via dialog nativo | CONFIRMADO |
| `setTitleBarTheme` | `function` | sim | Aplica tema light/dark na titlebar | CONFIRMADO |

### `GeneratedFilePayload`

Arquivo: `desktop/downloads.cjs`; payload de `desktop-save-generated-file`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | nao | Nome sugerido; sanitizado por `path.basename` | CONFIRMADO |
| `mimeType` | `string` | nao | Usado para escolher filtro do dialog | CONFIRMADO |
| `data` | `string` | nao | Conteudo a gravar | CONFIRMADO |
| `encoding` | `base64 | undefined` | nao | Quando `base64`, Buffer usa encoding base64 | CONFIRMADO |

### `DownloadEventPayload`

Arquivo: `desktop/downloads.cjs`; eventos para renderer

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `fileName` | `string` | sim | Nome final do arquivo ou nome cancelado | CONFIRMADO |
| `filePath` | `string` | condicional | Caminho salvo quando completo | CONFIRMADO |
| `state` | `string` | condicional | Estado de falha do download | CONFIRMADO |

### `TitleBarTheme`

Arquivo: `desktop/window-appearance.cjs`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `mode` | `light | dark` | sim | Tema normalizado; qualquer outro valor vira `dark` | CONFIRMADO |
| `color` | `string` | sim | Cor de fundo da titlebar | CONFIRMADO |
| `symbolColor` | `string` | sim | Cor dos simbolos da titlebar | CONFIRMADO |
| `height` | `number` | sim | Altura da overlay; 32 | CONFIRMADO |

### `DesktopAboutDialog`

Arquivo: `desktop/window-actions.cjs`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `type` | `info` | sim | Tipo do dialogo | CONFIRMADO |
| `title` | `string` | sim | `Sobre o <appName>` | CONFIRMADO |
| `buttons` | `string[]` | sim | Apenas `Fechar` | CONFIRMADO |
| `message` | `string` | sim | Nome do aplicativo | CONFIRMADO |
| `detail` | `string` | sim | Versao, Electron e descricao do sistema | CONFIRMADO |

## Modulo: shared

### `SharedBaseTypes`

Arquivo: `shared/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `ID` | `number` | sim | Alias para identificadores numericos | CONFIRMADO |
| `DateString` | `string` | sim | Alias para datas ISO | CONFIRMADO |
| `Status` | `ativo | inativo` | sim | Status generico | CONFIRMADO |

### `SharedUsuarioAuth`

Arquivo: `shared/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `TipoUsuario` | `admin | gestor | escola` | sim | Tipos de usuario previstos no pacote | CONFIRMADO |
| `Usuario.id` | `ID` | sim | Identificador do usuario | CONFIRMADO |
| `Usuario.nome` | `string` | sim | Nome | CONFIRMADO |
| `Usuario.email` | `string` | sim | Email | CONFIRMADO |
| `Usuario.tipo` | `TipoUsuario` | sim | Tipo do usuario | CONFIRMADO |
| `Usuario.escola_id` | `ID` | nao | Escola vinculada | CONFIRMADO |
| `Usuario.ativo` | `boolean` | sim | Usuario ativo | CONFIRMADO |
| `LoginCredentials.email` | `string` | sim | Email de login | CONFIRMADO |
| `LoginCredentials.senha` | `string` | sim | Senha de login | CONFIRMADO |
| `AuthResponse.success` | `boolean` | sim | Resultado do login | CONFIRMADO |
| `AuthResponse.token` | `string` | nao | Token emitido | CONFIRMADO |
| `AuthResponse.user` | `Usuario` | nao | Usuario autenticado | CONFIRMADO |

### `SharedEscolaProduto`

Arquivo: `shared/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `Escola.id` | `ID` | sim | Identificador da escola | CONFIRMADO |
| `Escola.nome` | `string` | sim | Nome da escola | CONFIRMADO |
| `Escola.codigo` | `string` | nao | Codigo INEP/acesso | CONFIRMADO |
| `Escola.administracao` | `municipal | estadual | federal | particular` | nao | Tipo administrativo | CONFIRMADO |
| `Produto.id` | `ID` | sim | Identificador do produto | CONFIRMADO |
| `Produto.nome` | `string` | sim | Nome do produto | CONFIRMADO |
| `Produto.unidade` | `string` | sim | Unidade obrigatoria | CONFIRMADO |
| `Produto.categoria` | `string` | sim | Categoria | CONFIRMADO |
| `Produto.ativo` | `boolean` | sim | Produto ativo | CONFIRMADO |

### `SharedEstoqueEvento`

Arquivo: `shared/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `id` | `ID` | sim | ID do evento | CONFIRMADO |
| `tenant_id` | `string` | nao | Tenant do evento | CONFIRMADO |
| `escopo` | `central | escola` | sim | Escopo do estoque | CONFIRMADO |
| `escola_id` | `ID` | condicional | Escola quando escopo escolar | CONFIRMADO |
| `produto_id` | `ID` | sim | Produto movimentado | CONFIRMADO |
| `lote_id` | `ID` | nao | Lote associado | CONFIRMADO |
| `tipo_evento` | `TipoEventoEstoque` | sim | Tipo ledger | CONFIRMADO |
| `origem` | `OrigemEventoEstoque` | sim | Origem do evento | CONFIRMADO |
| `quantidade_delta` | `number` | sim | Delta aplicado | CONFIRMADO |
| `quantidade_absoluta` | `number` | nao | Saldo absoluto opcional | CONFIRMADO |
| `referencia_tipo` | `string` | nao | Tipo da entidade origem | CONFIRMADO |
| `referencia_id` | `ID` | nao | ID da entidade origem | CONFIRMADO |
| `usuario_nome_snapshot` | `string` | nao | Nome congelado do usuario | CONFIRMADO |
| `evento_estornado_id` | `ID` | nao | Evento estornado | CONFIRMADO |

### `SharedEstoque`

Arquivo: `shared/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `TipoMovimentacao` | `entrada | saida | ajuste` | sim | Tipos de movimentacao previstos | CONFIRMADO |
| `StatusEstoque` | `sem_estoque | baixo_estoque | normal | alto_estoque` | sim | Status de estoque previstos | CONFIRMADO |
| `StatusLote` | `ativo | esgotado | vencido | cancelado` | sim | Status de lote previstos | CONFIRMADO |
| `EstoqueEscola.quantidade_atual` | `number` | sim | Saldo escolar atual | CONFIRMADO |
| `EstoqueLote.quantidade_inicial` | `number` | sim | Quantidade inicial do lote | CONFIRMADO |
| `EstoqueLote.quantidade_atual` | `number` | sim | Saldo atual do lote | CONFIRMADO |
| `MovimentacaoEstoque.quantidade_anterior` | `number` | sim | Saldo anterior | CONFIRMADO |
| `MovimentacaoEstoque.quantidade_movimentada` | `number` | sim | Quantidade do movimento | CONFIRMADO |
| `MovimentacaoEstoque.quantidade_posterior` | `number` | sim | Saldo posterior | CONFIRMADO |

### `SharedDemandasConfiguracoes`

Arquivo: `shared/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `StatusDemanda` | `pendente | aprovada | recusada | atendida` | sim | Status de demanda | CONFIRMADO |
| `AcaoDemanda` | `aprovar | recusar | atender` | sim | Acao de demanda | CONFIRMADO |
| `Demanda.numero_oficio` | `string` | sim | Numero do oficio | CONFIRMADO |
| `Demanda.objeto` | `string` | sim | Objeto da demanda | CONFIRMADO |
| `Demanda.descricao_itens` | `string` | sim | Descricao textual dos itens | CONFIRMADO |
| `Configuracao.chave` | `string` | sim | Chave de configuracao | CONFIRMADO |
| `Configuracao.valor` | `string` | sim | Valor serializado | CONFIRMADO |
| `TipoConfiguracao` | `string | number | boolean | json` | sim | Tipo semantico do valor | CONFIRMADO |

### `SharedApiFiltrosRelatorios`

Arquivo: `shared/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `ApiResponse.success` | `boolean` | sim | Resultado da API | CONFIRMADO |
| `ApiResponse.data` | `T` | nao | Dados da resposta | CONFIRMADO |
| `ApiListResponse.total` | `number` | nao | Total de registros | CONFIRMADO |
| `PaginationParams.order` | `asc | desc` | nao | Ordenacao | CONFIRMADO |
| `DateRangeParams.data_inicio` | `DateString` | nao | Inicio de periodo | CONFIRMADO |
| `DateRangeParams.data_fim` | `DateString` | nao | Fim de periodo | CONFIRMADO |
| `FormatoRelatorio` | `pdf | excel | csv` | sim | Formato de exportacao | CONFIRMADO |

### `SharedTenant`

Arquivo: `shared/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `Tenant.id` | `ID` | sim | ID numerico do tenant | CONFIRMADO |
| `Tenant.slug` | `string` | sim | Slug unico | CONFIRMADO |
| `Tenant.subdomain` | `string` | nao | Subdominio opcional | CONFIRMADO |
| `Tenant.settings` | `TenantSettings` | sim | Features, branding, notificacoes e integracoes | CONFIRMADO |
| `Tenant.limits` | `TenantLimits` | sim | Limites contratados | CONFIRMADO |
| `TenantError.code` | `TenantErrorCode` | sim | Codigo do erro tenant nas subclasses | CONFIRMADO |

### `SharedEvento`

Arquivo: `shared/types/index.ts`

| Campo | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `TipoEvento` | `estoque_baixo | produto_vencido | produto_critico | movimentacao | demanda_criada` | sim | Tipo de evento/notificacao | CONFIRMADO |
| `Evento.id` | `ID` | sim | ID do evento | CONFIRMADO |
| `Evento.titulo` | `string` | sim | Titulo | CONFIRMADO |
| `Evento.descricao` | `string` | sim | Descricao | CONFIRMADO |
| `Evento.dados` | `Record<string, any>` | nao | Payload livre | CONFIRMADO |
| `Evento.lido` | `boolean` | sim | Flag de leitura | CONFIRMADO |
| `Evento.usuario_id` | `ID` | sim | Usuario destinatario | CONFIRMADO |
