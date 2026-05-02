# Tela: Escolas - Lista

## Identificacao

- Rota: `/escolas`
- Estado: preenchido com `54 resultados`.
- Proposito: listar, buscar, ordenar e administrar escolas.

## Layout

- Sidebar com grupo `Cadastros` expandido e item `Escolas` ativo.
- Header em card com breadcrumb `Dashboard > Cadastros > Escolas`, titulo `Escolas`, subtitulo `Exibindo 54 resultados` e botao primario `+ Nova Escola`.
- EntityListTable com toolbar no canto superior direito:
  - icone de busca.
  - icone de filtro.
  - menu de mais opcoes.
- Colunas visiveis:
  - `ID`
  - `Nome`
  - `Total Alunos`
  - `Modalidades`
  - `Municipio`
  - `Administracao`
  - `Status`
  - `Acoes`
- Paginacao inferior:
  - Linhas: `50`
  - range `1-50 de 54`
  - botoes anterior/proximo.

## Acoes por linha

- Editar: botao com icone de lapis azul.
- Excluir: botao com icone de lixeira vermelha.
- A linha/nome provavelmente permite abrir detalhe; o screenshot seguinte confirma navegacao para `/escolas/115`.

## Estados observados

- Escolas ativas indicadas por ponto verde.
- Escolas inativas indicadas por ponto vermelho.
- Modalidades ausentes aparecem como `-`.

## Lacunas

- Nao foi visto modal de nova escola, filtro aberto, busca ativa ou confirmacao de exclusao.
