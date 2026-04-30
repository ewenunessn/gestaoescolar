# Tela: Dashboard

## Identificacao

- Rota: `/dashboard`
- Estado: preenchido, dark mode.
- Proposito: apresentar resumo operacional e atalhos para areas principais.

## Layout

- Sidebar recolhivel a esquerda com `Dashboard` ativo.
- Topbar com busca global, controles de tema/atalho, seletor de periodo e notificacoes.
- Hero/card superior com data `QUARTA-FEIRA, 29 DE ABRIL DE 2026`, saudacao `Boa noite` e texto de contexto.
- Linha de quatro cards metricos:
  - Escolas: `51/54` ativas.
  - Alunos: `16.088` total cadastrado.
  - Solicitacoes: `70%`, `7 de 10 atendidas`.
  - PNAE: `0.0%`, minimo requerido `45%`, barra de progresso.
- Segunda area:
  - Card `Acesso rapido` com linhas clicaveis: Escolas, Produtos, Cardapios, Estoque Central, Pedidos.
  - Card `Conformidade PNAE` com percentual, meta, status `Nao conforme`, total de contratos, agricultura familiar e alertas.

## Acoes visiveis

- Busca global por paginas.
- Selecionar periodo letivo.
- Abrir notificacoes.
- Clicar atalhos de acesso rapido.
- Abrir detalhes do PNAE.
- Expandir/recolher grupos na sidebar.
- Recolher menu e sair.

## Regras visuais

- Numeros principais usam fonte grande e alta hierarquia.
- PNAE nao conforme usa amarelo/vermelho.
- Acesso rapido usa linhas com icone a esquerda e seta a direita.

## Lacunas

- Nao ha screenshot de loading, erro ou metricas vazias.
- Nao foi visto efeito do botao de notificacoes.
