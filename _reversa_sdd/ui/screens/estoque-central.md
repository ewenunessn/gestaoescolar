# Tela: Estoque Central

## Identificacao

- Rota: `/estoque-central`
- Estado: preenchido.
- Proposito: consultar estoque central e acionar recebimento, saida, ajuste e transferencia.

## Layout

- Sidebar com grupo `Estoque` expandido e item `Estoque Central` ativo.
- Titulo `Estoque Central`.
- Subtitulo `Recebimento, saida, ajuste e transferencia`.
- Botao secundario `Atualizar` no topo direito.
- Cards metricos em linha:
  - Total de itens: `84`.
  - Disponiveis: `3`.
  - Reservados: `4`.
  - Alertas: `82`.
- Toolbar com campo de busca `Buscar produto ou unidade...`.
- Acoes de estoque:
  - `+ Entrada`
  - `- Saida`
  - `Ajuste`
  - `Transferir`
- Tabela de produtos.

## Tabela

Colunas visiveis:

- `Item`: nome do produto e unidade.
- `Disponivel`.
- `Reservado`.
- `Total`.
- `Status`.

Estados por linha:

- `Sem saldo`: ponto vermelho.
- `Reservado`: ponto amarelo/laranja.
- `Normal`: ponto verde.

Linha selecionada/realcada:

- `Arroz Parboilizado Tipo 1`: disponivel `85 KG`, reservado `15 KG`, total `100 KG`, status `Reservado`.

## Acoes e comportamento inferido

- Botoes de entrada/saida/ajuste/transferir aparecem desabilitados ou de baixo contraste enquanto nenhuma acao/condicao adequada nao esta ativa.
- Selecionar linha deve habilitar operacoes relacionadas ao produto.
- Atualizar recarrega saldos.

## Lacunas

- Nao foi visto modal de entrada/saida/ajuste/transferencia.
- Nao foi visto filtro aplicado.
- Nao foi visto detalhe de lote/movimentacoes.
