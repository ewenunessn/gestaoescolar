# Fluxo de Abastecimento: Demanda, Compra, Guia e Entrega

## Objetivo

Organizar o fluxo operacional de abastecimento escolar para que o usuario consiga seguir uma sequencia clara:

1. gerar demanda;
2. revisar guia;
3. gerar compra;
4. programar entrega;
5. executar entrega;
6. consultar comprovantes e romaneio.

O primeiro passo deve priorizar consistencia de navegacao, nomenclatura, status e acoes no frontend, reaproveitando as telas e APIs existentes. Refatoracoes profundas de banco e backend ficam fora do escopo inicial, exceto ajustes pontuais necessarios para ligar as etapas.

## Contexto Atual

O fluxo ja existe, mas esta distribuido em modulos e telas com nomes diferentes:

- `Planejamento de Compras` calcula demanda, gera guias e tambem gera pedidos.
- `Guias de Demanda` lista e detalha guias, tambem permitindo gerar pedido.
- `Compras/Pedidos` acompanha o pedido e permite programar entrega por item.
- `Programacao` fica dentro do detalhe da compra.
- `Entregas`, `Romaneio`, `Comprovantes` e `Gestao de Rotas` ficam em outro grupo de menu.
- Existem status similares em entidades diferentes: guia, item da guia, pedido, entrega e comprovante.

Essa distribuicao cria duas dificuldades: o usuario nao sabe qual tela usar em cada etapa e as acoes ficam duplicadas em pontos diferentes.

## Fluxo Proposto

Criar uma area operacional chamada **Abastecimento**, mantendo as rotas principais existentes para reduzir risco.

### 1. Gerar Demanda

Entrada do processo. O usuario seleciona competencia, periodo, cardapios e escolas. A saida principal e uma guia de demanda.

Acoes principais:

- calcular previa da demanda;
- gerar guia de demanda;
- abrir guia gerada.

### 2. Guias de Demanda

Tela de conferencia e ajuste. A guia e a entidade que liga demanda, compra e entrega.

Acoes principais:

- revisar totais por produto;
- revisar totais por escola;
- ajustar quantidades/unidades/status;
- liberar para compra;
- gerar pedido de compra a partir da guia.

### 3. Compras / Pedidos

Tela financeira/contratual. O pedido nasce da guia e usa contratos/fornecedores.

Acoes principais:

- listar pedidos por competencia, fornecedor e status;
- abrir detalhe do pedido;
- programar entrega dos itens;
- acompanhar situacao do pedido.

### 4. Programacao de Entrega

Etapa intermediaria entre compra e entrega. Define quando, quanto e para quais escolas cada item sera enviado.

Acoes principais:

- definir data de entrega;
- distribuir quantidade por escola;
- ajustar programacoes em lote;
- enviar itens para a fila de entrega.

### 5. Entregas

Execucao operacional por escola, guia e rota.

Acoes principais:

- filtrar por guia, rota, data e pendencias;
- selecionar escola;
- confirmar entrega parcial ou total;
- registrar entregador, recebedor, quantidade e observacao;
- gerar comprovante.

### 6. Romaneio e Comprovantes

Consulta e documentacao do processo.

Acoes principais:

- gerar romaneio por guia, rota e data;
- consultar comprovantes;
- validar comprovante;
- cancelar item entregue de forma controlada.

## Organizacao de Navegacao

Substituir a separacao atual entre `Compras` e `Entregas` por uma sequencia operacional mais clara.

Menu recomendado:

- Abastecimento
- Gerar Demanda
- Guias de Demanda
- Compras / Pedidos
- Programacao de Entrega
- Entregas
- Romaneio
- Comprovantes
- Rotas

`Saldo Contratos` e `Dashboard PNAE` podem continuar em `Compras` ou virar itens secundarios de consulta, pois nao fazem parte direta da operacao diaria.

## Tela de Ciclo Operacional

Adicionar uma tela resumida de acompanhamento do ciclo, sem substituir as telas existentes.

Nome sugerido: `Abastecimento`.

Conteudo:

- cards de status por etapa;
- filtros por competencia, guia e escola;
- lista de guias/pedidos/entregas recentes;
- atalhos para continuar o processo: `Gerar guia`, `Revisar guia`, `Gerar pedido`, `Programar entrega`, `Executar entrega`.

Essa tela deve funcionar como ponto de entrada para o usuario que nao sabe qual modulo abrir.

## Padrao de Status

Criar um mapeamento visual unico para evitar labels contraditorios.

Status da guia:

- `aberta`: guia em revisao;
- `fechada`: guia concluida;
- `cancelada`: guia cancelada.

Status do item da guia:

- `pendente`: aguardando programacao ou compra;
- `programada`: entrega programada / aguardando estoque;
- `parcial`: entrega parcial;
- `entregue`: entrega finalizada;
- `cancelado`: item cancelado.

Status do pedido:

- `pendente`: pedido criado e aguardando andamento;
- `recebido_parcial`: compra parcialmente atendida;
- `concluido`: compra finalizada;
- `suspenso`: compra pausada;
- `cancelado`: compra cancelada.

Os labels exibidos devem ser centralizados em utilitario compartilhado, em vez de cada tela criar seus proprios textos.

## Principios de Interface

As telas do fluxo devem seguir o mesmo padrao visual aplicado ao estoque:

- header simples;
- barra de metricas compacta;
- card fixo de busca/filtros/acoes;
- listagem limpa com selecao por linha;
- acoes contextuais habilitadas somente quando fizer sentido;
- dialogs curtos para confirmacoes e parametros.

## Ordem de Implementacao

1. Reorganizar menu e rotas visiveis para o grupo `Abastecimento`.
2. Criar utilitario compartilhado para status e cores do fluxo.
3. Criar tela `Abastecimento` como painel de entrada do ciclo.
4. Padronizar CTAs entre telas existentes:
   - guia gerada abre detalhe da guia;
   - guia revisada gera pedido;
   - pedido aberto leva para programacao;
   - programacao leva para entregas filtradas;
   - entrega leva para comprovantes.
5. Ajustar nomes e breadcrumbs para refletir a sequencia operacional.
6. Fazer verificacao manual do fluxo completo.

## Fora do Escopo Inicial

- Alterar estrutura de banco.
- Unificar todas as entidades em uma unica tabela de workflow.
- Reescrever telas grandes como `GuiaDemandaDetalhe`, `PlanejamentoCompras` ou `Entregas` de uma vez.
- Remover rotas antigas imediatamente.

## Riscos

- Algumas telas tem responsabilidades duplicadas, principalmente `PlanejamentoCompras` e `GuiasDemandaLista`.
- Ha inconsistencias antigas de encoding em textos da UI.
- O typecheck do frontend ja possui erros preexistentes, entao a validacao inicial deve focar em testes pontuais e fluxo manual.

## Criterios de Aceite

- O usuario consegue iniciar em `Abastecimento` e seguir ate entrega sem procurar modulos soltos.
- Os nomes do menu seguem a ordem real do processo.
- Status iguais aparecem com os mesmos labels e cores em telas diferentes.
- As acoes principais sempre apontam para a proxima etapa do fluxo.
- As telas atuais continuam acessiveis pelas rotas existentes.
