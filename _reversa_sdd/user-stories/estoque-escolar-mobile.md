# User Story - Estoque Escolar Mobile

> Status: DESCONTINUADO. Esta user story permanece apenas como registro historico do legado. O unico app mobile em uso operacional/producao e `apps/entregador-native`.

## Contexto

- DESCONTINUADO: o app `estoque-escolar-mobile` nao deve orientar novas implementacoes ou validacoes de producao.
- 🟢 O app `estoque-escolar-mobile` oferece consulta de estoque, detalhes, lotes, validade e historico.
- 🟢 O app permite entrada simples, saida inteligente e ajuste com sincronizacao posterior.
- 🟡 A experiencia combina consulta local, filtros e fila offline em `@sync_pending_items`.

## Persona

- Gestor de estoque da escola.

## Historia

Como gestor escolar,
quero consultar e movimentar o estoque da minha escola pelo celular, mesmo com internet instavel,
para manter o saldo escolar atualizado durante a rotina diaria.

## Jornada Principal

1. 🟢 O gestor abre a aba de estoque no app.
2. 🟢 O hook `useEstoque` resolve `escolaId` e carrega produtos.
3. 🟢 Para cada produto, o app consulta lotes e calcula validade/status.
4. 🟢 O gestor filtra, abre detalhes e escolhe a acao.
5. 🟢 Para entrada simples, o app envia `movimentacao`.
6. 🟢 Para saida inteligente, o app distribui a baixa por lotes.
7. 🟢 Para historico, o app pagina os eventos e aplica filtros locais.
8. 🟡 Quando offline, a operacao entra na fila e sincroniza depois.

## Regras de Negocio

- 🟢 O estoque e carregado por escola.
- 🟢 A tela de historico usa `limit` e `offset`.
- 🟢 O app salva pendencias em `@sync_pending_items`.
- 🟢 Ao sincronizar com sucesso, remove o item e atualiza `@last_sync`.
- 🟡 A saida inteligente depende da distribuicao por lotes disponiveis.

## Critérios de Aceitação

```gherkin
Cenario: Consultar estoque da escola
Dado um gestor autenticado no app escolar
Quando ele abre a aba de estoque
Entao o app deve listar os produtos da escola
E deve exibir lotes, validade e status por item

Cenario: Registrar saida inteligente
Dado um produto com lotes disponiveis
Quando o gestor informa uma baixa por lotes
Entao o app deve enviar a movimentacao correspondente
E atualizar a lista apos sucesso

Cenario: Paginar historico
Dado historico com mais de 10 eventos
Quando o usuario chegar ao final da lista
Entao o app deve carregar a proxima pagina

Cenario: Salvar pendencia offline
Dado que o dispositivo esta sem internet
Quando o gestor registrar uma movimentacao
Entao o app deve salvar a operacao em `@sync_pending_items`
E sincronizar quando a conectividade voltar
```

## Rastreabilidade

- 🟢 `apps/estoque-escolar-mobile/src/hooks/useEstoque.ts`
- 🟢 `apps/estoque-escolar-mobile/src/hooks/useSyncManager.ts`
- 🟢 `apps/estoque-escolar-mobile/src/screens/EstoqueScreen.tsx`
- 🟢 `apps/estoque-escolar-mobile/src/screens/HistoricoScreen.tsx`
- 🟢 `apps/estoque-escolar-mobile/src/components/ModalEntradaSimples.tsx`
- 🟢 `apps/estoque-escolar-mobile/src/components/ModalSaidaInteligente.tsx`
- 🟢 `apps/estoque-escolar-mobile/src/components/ModalLotesEstoque.tsx`
- 🟡 `_reversa_sdd/flowcharts/apps-estoque-escolar-mobile-estoque.md`
- 🟡 `_reversa_sdd/flowcharts/apps-estoque-escolar-mobile-historico-sync.md`
