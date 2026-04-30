# User Story - Abastecimento Operacional

## Contexto

- 🟢 O fluxo operacional macro do sistema segue `guia -> compra/pedido -> entrega -> documentos`.
- 🟢 A tela de abastecimento agrega dados de guias, pedidos e entregas sem persistir diretamente.
- 🟡 O objetivo da tela e servir como hub de navegacao e acompanhamento com tolerancia a falhas parciais.

## Persona

- Gestor operacional de alimentacao escolar.

## Historia

Como gestor operacional,
quero visualizar em uma unica tela o andamento do abastecimento,
para navegar rapidamente entre guia, compra, entrega e documentos sem perder o contexto da operacao.

## Jornada Principal

1. 🟢 O gestor acessa `/abastecimento`.
2. 🟢 O frontend carrega em paralelo resumos de guias, compras e entregas.
3. 🟢 A pagina consolida metricas, erros parciais e listas operacionais.
4. 🟢 O gestor escolhe o ponto da cadeia que precisa tratar.
5. 🟢 A navegacao leva diretamente para guias, compras, entregas, romaneio, comprovantes ou rotas.

## Regras de Negocio

- 🟢 A pagina nao persiste dados diretamente.
- 🟢 O carregamento usa `Promise.allSettled`, aceitando falha parcial.
- 🟢 O estado nao deve ser atualizado se o componente desmontar durante a carga.
- 🟢 A ordem exibida de processo e `guia -> compra -> entrega -> documentos`.

## Critérios de Aceitação

```gherkin
Cenario: Abrir painel de abastecimento
Dado um gestor autenticado
Quando ele acessa a tela de abastecimento
Entao o frontend deve carregar guias, pedidos e entregas em paralelo
E deve renderizar metricas e atalhos operacionais

Cenario: Tolerar falha parcial de uma fonte
Dado que uma das APIs do resumo falhou
Quando a tela concluir o carregamento
Entao os demais blocos devem continuar visiveis
E o erro deve aparecer apenas na area afetada

Cenario: Navegar para modulo de entregas
Dado a tela de abastecimento carregada
Quando o gestor clica na area de entregas
Entao o frontend deve navegar para `/entregas`
```

## Rastreabilidade

- 🟢 `frontend/src/modules/abastecimento/pages/Abastecimento.tsx`
- 🟡 `_reversa_sdd/flowcharts/abastecimento.md`
- 🟡 `_reversa_sdd/sdd/guias-demandas.md`
- 🟡 `_reversa_sdd/sdd/compras-programacao.md`
- 🟡 `_reversa_sdd/sdd/entregas-comprovantes-fotos.md`
