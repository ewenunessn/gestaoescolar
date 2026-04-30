# Dominio e Regras de Negocio - gestaoescolar

Gerado pelo Reversa Detective em 2026-04-29.

Escala de confianca:

- CONFIRMADO: extraido diretamente de codigo, historico Git ou artefatos da escavacao.
- INFERIDO: deduzido por combinacao de evidencias, requer validacao.
- LACUNA: precisa de confirmacao humana.

## Glossario

| Termo | Significado | Confianca |
| --- | --- | --- |
| Instituicao | Contexto administrativo do sistema, usado em estatisticas e em parte do desenho multi-tenant. | CONFIRMADO |
| Escola | Unidade atendida, com modalidades, alunos, estoque escolar, portal proprio e recebedores de entrega. | CONFIRMADO |
| Modalidade | Categoria de atendimento/alunos usada para cardapio, custo, repasse, saldo contratual e demanda. | CONFIRMADO |
| Cardapio | Planejamento mensal de refeicoes/preparacoes por modalidade. | CONFIRMADO |
| Preparacao/Refeicao | Receita com ingredientes, per capita, ficha tecnica, nutrientes e custo. | CONFIRMADO |
| Guia de demanda | Documento operacional que consolida produtos, escolas, quantidades e status para abastecimento. | CONFIRMADO |
| Pedido/Compra | Pedido gerado manualmente ou a partir de guia, com itens, valores, status e programacoes de entrega. | CONFIRMADO |
| Programacao de entrega | Distribuicao de um item de pedido por escola e data prevista. | CONFIRMADO |
| Romaneio | Documento/filtro operacional para listar itens de entrega, gerar PDF e QR para uso do entregador. | CONFIRMADO |
| Entrega | Confirmacao de quantidade entregue para item/escola, gerando historico e baixas de estoque. | CONFIRMADO |
| Comprovante | Documento de recebimento da entrega por escola, com itens, recebedor, entregador e foto obrigatoria no fluxo recente. | CONFIRMADO |
| Estoque central | Saldo central por produto/lote, origem de recebimentos, saidas e transferencias para escolas. | CONFIRMADO |
| Estoque escolar | Saldo por escola/produto/lote, visivel no portal/web e no app mobile de estoque escolar. | CONFIRMADO |
| Ledger de estoque | Modelo append-only de eventos de estoque usado para registrar movimentos e recompor saldos/projecoes. | CONFIRMADO |
| Faturamento | Registro de consumo/valor por pedido, modalidade e tipo de fornecedor. | CONFIRMADO |
| Portal escola | Experiencia web restrita a usuario vinculado a escola para cardapio, solicitacoes, comprovantes e alunos. | CONFIRMADO |
| Gestor escolar mobile | Usuario do app `estoque-escolar-mobile`, autenticado por escola e codigo de acesso. | CONFIRMADO |
| Funcao | Papel dinamico associado a permissoes por modulo. | CONFIRMADO |
| Permissao direta | Permissao atribuida diretamente ao usuario, prevalecendo sobre permissao herdada da funcao no frontend. | CONFIRMADO |

## Fluxo macro de abastecimento

CONFIRMADO em `frontend/src/modules/abastecimento/status.ts` e artefatos Archaeologist:

1. Guias de demanda: revisar escolas, produtos, quantidades e status.
2. Compras/Pedidos: gerar e acompanhar pedidos vinculados as guias.
3. Entregas: executar entrega por guia, escola e rota.
4. Romaneio e comprovantes: emitir documentos e consultar comprovantes.

INFERIDO: a tela de abastecimento e um cockpit operacional; a mutacao real ocorre nos modulos `guias`, `compras`, `entregas`, `programacao` e `estoque`.

## Regras por dominio

### Cardapios e Nutricao

- CONFIRMADO: cardapio mensal exige nome, mes, ano e modalidades vinculadas.
- CONFIRMADO: refeicao no dia exige `refeicao_id`, `dia` e `tipo_refeicao`.
- CONFIRMADO: duplicidade de preparacao no mesmo dia/tipo vira erro de negocio.
- CONFIRMADO: calculo de custo usa alunos vigentes por modalidade em `escola_modalidades_historico` na data de referencia do cardapio.
- CONFIRMADO: per capita bruto = per capita liquido * fator de correcao.
- CONFIRMADO: para gramas/mililitros, custo usa proporcao da embalagem; para demais unidades, usa quantidade * preco unitario.
- CONFIRMADO: `per_capita` nao pode ser negativo; limites documentados: `mg` ate 100000 e `gramas` ate 10000.
- INFERIDO: ficha tecnica publica por QR deve ser acessivel sem login para consulta externa de preparacoes.

### Escolas e modalidades

- CONFIRMADO: escola ativa participa de totalizadores e calculos operacionais.
- CONFIRMADO: modalidade precisa de categoria financeira valida em criacao/edicao.
- CONFIRMADO: historico de modalidade por escola preserva vigencia de alunos para calculos retroativos.
- INFERIDO: quantidade atual de alunos nao deve sobrescrever analises passadas; a regra historica foi reforcada por commits de fluxos operacionais.

### Guias, demandas e compras

- CONFIRMADO: guia possui status `aberta`, `fechada` e `cancelada`.
- CONFIRMADO: item de guia possui estados `pendente`, `programada`, `parcial`, `entregue` e `cancelado`.
- CONFIRMADO: pedido possui estados `pendente`, `recebido_parcial`, `concluido`, `suspenso` e `cancelado`.
- CONFIRMADO: geracao de guias e compras pode executar via jobs assincronos com status `pendente`, `processando`, `concluido` e `erro`.
- CONFIRMADO: ao gerar demanda em periodo que cruza meses, o filtro de dias deve aceitar `dia >= inicio OR dia <= fim`; isso foi corrigido no commit `5ce2772`.
- CONFIRMADO: se nenhum produto for calculado no range de dias, ha fallback para todos os dias do cardapio do mes.
- CONFIRMADO: programacoes de entrega inserem apenas quantidades positivas por escola.
- INFERIDO: compras geradas por guia devem manter rastreabilidade por `guia_id` para evitar duplicidade operacional.

### Recebimentos

- CONFIRMADO: recebimentos listam pedidos pendentes/concluidos, fornecedores do pedido, itens por fornecedor e historico.
- CONFIRMADO: recebimento e uma operacao autenticada com permissao de escrita em `recebimentos`.
- INFERIDO: recebimento alimenta estoque central e o status do pedido, mas a fronteira exata entre parcial/concluido deve ser validada com dados reais.

### Entregas, romaneio e comprovantes

- CONFIRMADO: confirmacao de entrega exige quantidade entregue positiva.
- CONFIRMADO: sync offline usa `client_operation_id` para idempotencia.
- CONFIRMADO: entrega aceita com dados de comprovante permanece aberta ate criar comprovante.
- CONFIRMADO: comprovante criado com foto local permanece aberto ate upload/confirmacao da foto.
- CONFIRMADO: erros HTTP 408, 429, 5xx, erro de infraestrutura e alguns erros de saldo insuficiente sao retryable.
- CONFIRMADO: erros 4xx nao recuperaveis viram `failed_needs_action`.
- CONFIRMADO: operacao `syncing` com mais de 2 minutos fica elegivel para retry.
- CONFIRMADO: rascunhos de comprovante pendente sao agrupados por `batch_id` ou por escola/entregador/recebedor/minuto.
- CONFIRMADO: comprovantes de entrega recentes passaram a exigir foto de mercadoria antes da geracao/sync, conforme commits `af3fc51`, `8fdac33` e `da5fb29`.
- CONFIRMADO: app entregador usa QR de romaneio/filtros com aliases para datas e rotas.
- INFERIDO: entrega offline prioriza continuidade operacional em campo, tolerando divergencia temporaria ate reconciliacao.

### Estoque

- CONFIRMADO: tipos de movimento incluem entrada, saida, ajuste e transferencia em partes do sistema.
- CONFIRMADO: ledger registra eventos com origem, escopo central/escola, delta, referencia e usuario snapshot.
- CONFIRMADO: status escolar/mobile inclui `sem_estoque`, `baixo`, `normal`, `alto`, `vencido`, `critico` e `atencao`.
- CONFIRMADO: validade vencida e critica e calculada por datas de lote; ate 7 dias vira critico/alerta em apps.
- CONFIRMADO: app mobile bloqueia saida maior que estoque atual em validacao local.
- CONFIRMADO: sync de entrega pode continuar mesmo com estoque central negativo, conforme commit `dcff21f`.
- INFERIDO: saldo central negativo e aceito em alguns cenarios de entrega para nao bloquear comprovacao fisica ja ocorrida; saldo escolar/estorno ainda tem regras mais restritivas.
- LACUNA: `shared` define `TipoMovimentacao` sem `transferencia`, divergindo de backend/apps.

### Faturamento e contratos

- CONFIRMADO: contrato possui status `ativo`, `inativo`, `suspenso` e `finalizado`.
- CONFIRMADO: faturamento permite registrar, reverter consumo, remover modalidade e atualizar status.
- CONFIRMADO: saldos contratuais por modalidade mantem consumo e exclusao de consumo autenticados.
- INFERIDO: faturamento foi separado de compras para isolar regra financeira, conforme refatoracao do commit `4b7ddc0`.

### Usuarios, permissoes e acesso

- CONFIRMADO: JWT contem `id`, `email`, `nome`, `tipo`, `isSystemAdmin`, `escola_id`, `tipo_secretaria` e `institution_id`.
- CONFIRMADO: `admin` e `isSystemAdmin` bypassam permissoes granulares no backend e no frontend.
- CONFIRMADO: usuarios nao admin dependem de permissao direta por modulo ou permissao herdada da funcao ativa.
- CONFIRMADO: niveis de permissao sao `0 nenhum`, `1 leitura`, `2 escrita`, `3 total`.
- CONFIRMADO: frontend mescla permissoes de funcao e depois permissoes diretas, portanto diretas sobrescrevem herdadas.
- CONFIRMADO: usuario com `escola_id` e nao admin e tratado como usuario de escola e redirecionado para `/portal-escola`.
- LACUNA: varias rotas backend usam apenas `authenticateToken` sem `requireLeitura/Escrita`, portanto a matriz RBAC nao e uniforme.

### Desktop e deploy

- CONFIRMADO: desktop empacotado executa backend local em `127.0.0.1:3131` por padrao.
- CONFIRMADO: renderer desktop pode carregar mesmo se health do backend ainda nao estiver pronto, porque `shouldBlockRendererForBackend` retorna falso.
- CONFIRMADO: Vercel/monorepo exigiu ajustes recorrentes de rewrites, MIME type, hoisting e `JWT_SECRET`, conforme historico Git.
- INFERIDO: o produto evoluiu de web cloud-first para distribuicao desktop com backend local por necessidade operacional/offline.

## Lacunas transversais

- LACUNA: confirmar quais modulos devem usar slugs `compras` versus `pedidos`, e `faturamento` versus `faturamentos`; ha divergencia entre rotas frontend e middlewares backend.
- LACUNA: validar se leitura publica de modalidades e ficha tecnica e intencional.
- LACUNA: validar se `dashboard` como slug para portal escola e permissao desejada ou apenas reaproveitamento tecnico.
- LACUNA: validar contratos reais de API para `apps/estoque-escolar-mobile`, pois parte do app simula operacoes e usa URL absoluta de producao.
