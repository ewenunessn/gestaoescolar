# Tela: Cardapio - Calendario

## Identificacao

- Rota: `/cardapios/15/calendario`
- Estados observados:
  - Visao mensal.
  - Visao semanal.
- Proposito: gerenciar preparacoes de um cardapio mensal e visualizar resumo/custo.

## Layout comum

- Breadcrumb: `Dashboard > Cardapios > Cardapio Abril 2026 - Integral e Creche`.
- Header com botao voltar, titulo `Cardapio Abril 2026 - Integral e Creche`, subtitulo `Gerencie as preparacoes do cardapio no calendario mensal`.
- Area principal dividida:
  - calendario/grade a esquerda.
  - painel de resumo a direita.
- Toggle central de visualizacao:
  - icone calendario para mensal.
  - icone de colunas/semana para semanal.
- Botao de impressao/PDF proximo ao painel lateral.

## Visao mensal

- Titulo de mes: `Abril 2026`.
- Badge `1 refeicao`.
- Grade mensal com dias da semana `DOM` a `SAB`.
- Item colorido no dia 16: `Banana`, em vermelho.
- Painel lateral:
  - `Resumo do Cardapio`: total de preparacoes `1`, por tipo `Refeicao` com badge `1`.
  - `Custo do Cardapio`: custo total estimado `R$ 0,00`, total de alunos `3123`, custo por aluno `R$ 0,00`, custo por modalidade `CRECHE (2288 alunos)` e `ENS. INTEGRAL (835 alunos)`, agricultura familiar.

## Visao semanal

- Faixa: `12 - 18 de Abr 2026`.
- Grade com coluna `Preparacao` e dias `DOM 12` a `SAB 18`.
- Linha `Refeicao`; item `Banana` em `QUI 16`.
- Legenda: `Refeicoes`.
- Mesmo painel lateral de resumo/custo.

## Acoes visiveis

- Voltar para lista.
- Alternar mensal/semanal.
- Navegar periodo por setas.
- Imprimir/exportar.
- Abrir detalhes de custo.

## Lacunas

- Nao foi visto modal de adicionar/remover preparacao ao dia.
- Nao foi visto drag-and-drop ou edicao do item no calendario.
- Nao foi visto estado de custo carregando/erro.
