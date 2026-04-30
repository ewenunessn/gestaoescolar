# Tela: Entregas

## Identificacao

- Rota: `/entregas`
- Estado: preenchido com `51 registros`.
- Proposito: acompanhar execucao de entregas por escola, progresso e documentos.

## Layout

- Sidebar com grupo `Abastecimento` expandido e item `Entregas` ativo.
- Header com breadcrumb `Dashboard > Entregas`, titulo `Entregas` e botao `Romaneio`.
- Card/listagem `Escolas para Entrega`.
- Toolbar superior:
  - Checkbox `Selecionar Multiplas`.
  - Contadores: `Escolas 51`, `Total Itens 93`, `Entregues 22`, `Pendentes 71`.
  - Busca e filtro na lateral direita.
- Tabela com colunas:
  - `Escola`
  - `Total Itens`
  - `Entregues`
  - `Pendentes`
  - `Progresso`
  - `Data Entrega`
  - `Acoes`

## Dados e indicadores

- Escola mostra nome, endereco e rota em link azul.
- `Entregues` e `Pendentes` aparecem em circulos coloridos.
- `Progresso` mostra percentual e barra:
  - Verde para `100.00%`.
  - Vermelho para `0.00%`.
- Data visivel: `01/04/2026`.

## Acoes por linha

- Visualizar: icone de olho.
- PDF: botao com icone `PDF`.

## Paginacao

- Linhas: `10`.
- Range: `1-10 de 51`.
- Botoes anterior/proximo.

## Lacunas

- Nao foi visto modo selecionar multiplas ativo.
- Nao foi visto detalhe da escola de entrega.
- Nao foi visto romaneio aberto.
- Nao foi visto erro de carregamento ou nenhuma entrega.
