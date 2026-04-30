# Inventario de Interface - gestaoescolar

Gerado pelo Reversa Visor em 2026-04-29 a partir dos screenshots enviados.

## Padrao visual global

- Tema: dark mode predominante, fundo preto/cinza muito escuro, cards em cinza escuro, bordas sutis e acento verde/azul/amarelo/vermelho.
- Produto/brand: `NutriLog` no topo da sidebar.
- Layout base: sidebar fixa a esquerda, topbar horizontal, area principal com conteudo em cards e tabelas.
- Topbar: busca global "Buscar paginas..." com atalho `Ctrl K`, botoes de tema/atalho, seletor de periodo `2026 - Ano Letivo 2026`, sino de notificacoes.
- Sidebar: grupos expansivos `Cadastros`, `Cardapios`, `Compras`, `Abastecimento`, `Estoque`, `Configuracoes`; rodape com `Recolher menu` e `Sair`.
- Elementos recorrentes: breadcrumbs, botao verde de acao primaria, icones em botoes quadrados, tabelas densas com paginacao, cards com metricas.

## Telas documentadas

| Tela | Rota visivel | Estado | Proposito | Contexto de uso |
| --- | --- | --- | --- | --- |
| Dashboard | `/dashboard` | Preenchido | Visao rapida de operacao escolar, compras e conformidade PNAE | Entrada apos login |
| Escolas - lista | `/escolas` | Preenchido com 54 resultados | Cadastro/listagem de escolas | Menu Cadastros > Escolas |
| Escola - detalhe | `/escolas/115` | Preenchido | Ver dados da escola e modalidades vinculadas | Clique/acao visualizar na lista de escolas |
| Cardapios - lista | `/cardapios` | Preenchido com 2 resultados | Lista cardapios por competencia/modalidades | Menu Cardapios > Cardapios |
| Cardapio - calendario mensal | `/cardapios/15/calendario` | Preenchido com 1 refeicao | Gerenciar preparacoes no calendario mensal | Acao visualizar da lista de cardapios |
| Cardapio - semana | `/cardapios/15/calendario` | Preenchido com 1 refeicao | Ver/gerenciar preparacoes em grade semanal | Toggle de visualizacao no calendario |
| Entregas | `/entregas` | Preenchido com 51 escolas | Acompanhar entregas por escola e gerar romaneio/PDF | Menu Abastecimento > Entregas |
| Estoque Central | `/estoque-central` | Preenchido com saldos e alertas | Recebimento, saida, ajuste e transferencia de estoque central | Menu Estoque > Estoque Central |

## Elementos comuns de navegacao

- Sidebar ativa destaca o item com fundo cinza e borda arredondada.
- Submenus expandidos mostram setas/chevrons no grupo.
- Breadcrumbs usam formato `Dashboard > Secao > Tela`.
- Botao de voltar aparece em telas de detalhe/calendario como icone de seta dentro de quadrado escuro.
- Paginas de lista usam header grande em card com titulo, subtitulo/contador e acao primaria a direita.

## Componentes recorrentes

| Componente | Ocorrencias | Comportamento visivel |
| --- | --- | --- |
| DataTable | Escolas, Cardapios, Entregas, Estoque Central | Colunas com ordenacao, acoes por linha, paginacao |
| Cards metricos | Dashboard, Entregas, Estoque Central | Numeros grandes, legenda curta, cores de status |
| Quick actions | Dashboard | Lista de atalhos com icone e seta |
| Calendario | Cardapio calendario | Alterna mensal/semanal; itens coloridos por tipo |
| Painel lateral de resumo | Cardapio calendario | Resumo, custo, agricultura familiar |
| Acoes por linha | Escolas, Cardapios, Entregas | Visualizar/editar/excluir/PDF em botoes iconicos |

## Lacunas visuais

- LACUNA: screenshots nao mostram modais de criar/editar/excluir, estados de erro ou confirmacoes.
- LACUNA: screenshots nao mostram telas mobile/responsivas.
- LACUNA: screenshots nao mostram permissao negada, loading ou lista vazia.
- LACUNA: detalhe de escola aparece duplicado em dois screenshots, sem menu de tres pontos aberto.
