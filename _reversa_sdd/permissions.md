# Matriz de Permissoes - gestaoescolar

Gerado pelo Reversa Detective em 2026-04-29.

## Modelo RBAC

Niveis confirmados em `backend/src/middleware/permissionMiddleware.ts`:

| Nivel | Nome | Efeito |
| --- | --- | --- |
| 0 | nenhum | Sem acesso ao modulo |
| 1 | leitura | Pode acessar/listar/consultar |
| 2 | escrita | Pode criar/editar/remover/executar mutacoes |
| 3 | total | Administracao total do modulo |

Regras confirmadas:

- `admin` e `isSystemAdmin` bypassam RBAC no backend e frontend.
- Usuario comum busca permissao direta por modulo.
- Se nao houver permissao direta no backend, usa permissao da funcao ativa.
- No frontend, permissoes de funcao sao carregadas primeiro e permissoes diretas sobrescrevem o mapa.
- Cache backend de permissao dura 5 minutos.
- Falha ao buscar permissao backend resulta em nivel `0`.

## Perfis

| Perfil | Identificacao | Escopo confirmado | Confianca |
| --- | --- | --- | --- |
| System admin | `isSystemAdmin = true` | Acesso total, bypass RBAC. | CONFIRMADO |
| Admin | `tipo = admin` | Acesso total, bypass RBAC. | CONFIRMADO |
| Usuario operacional | Token sem `admin`, sem `escola_id` obrigatorio | Acesso conforme funcao/permissoes por modulo. | CONFIRMADO |
| Usuario escola | `escola_id` presente e nao admin | Redirecionado para portal escola; menus centrais reduzidos. | CONFIRMADO |
| Gestor mobile escolar | Sessao em `gestor_escola` com escola e codigo de acesso | Perfil legado do app `estoque-escolar-mobile`, hoje descontinuado. | DESCONTINUADO |
| Entregador/mobile | Token bearer no app entregador | Acesso aos endpoints de entregas/rotas conforme permissoes do token. | INFERIDO |

## Slugs de modulos usados no frontend

| Slug | Rotas frontend principais | Nivel minimo |
| --- | --- | --- |
| `escolas` | `/escolas`, `/escolas/:id` | leitura |
| `modalidades` | `/modalidades`, relatorios/gerenciamento de alunos | leitura |
| `produtos` | `/produtos`, `/produtos/:id` | leitura |
| `preparacoes` | `/preparacoes`, grupos de ingredientes | leitura |
| `cardapios` | `/cardapios`, calendario/detalhe | leitura |
| `tipos_refeicao` | `/tipos-refeicao` | leitura |
| `nutricionistas` | `/nutricionistas` | leitura |
| `demandas` | `/guias-demanda`, detalhes, ajustes | leitura |
| `romaneio` | `/romaneio`, `/entregas/romaneio` | leitura |
| `entregas` | `/entregas` | leitura |
| `comprovantes` | `/comprovantes-entrega` | leitura |
| `rotas` | `/gestao-rotas` | leitura |
| `fornecedores` | `/fornecedores` | leitura |
| `contratos` | `/contratos` | leitura |
| `saldo_contratos` | `/saldos-contratos-modalidades` | leitura |
| `pedidos` | `/compras`, formularios e programacoes | leitura |
| `planejamento_compras` | `/abastecimento` | leitura |
| `faturamento` | paginas de faturamento no frontend | leitura |
| `estoque` | estoque central, escolar, lotes, alertas | leitura |
| `dashboard` | dashboard consistencia e portal escola | leitura |
| `configuracoes` | instituicao e templates PDF | leitura |
| `pnae` | dashboard/relatorios PNAE | leitura |
| `usuarios` | gerenciamento de usuarios | leitura |
| `periodos` | gerenciamento de periodos | leitura |
| `solicitacoes` | solicitacoes de alimentos | leitura |
| `calendario` | calendario letivo | leitura |
| `notificacoes` | disparos de notificacao | leitura |

Confianca: CONFIRMADO em `frontend/src/routes/AppRouter.tsx`.

## Backend com RBAC granular confirmado

| Modulo backend | Leitura | Escrita | Observacoes |
| --- | --- | --- | --- |
| `cardapios` | Listar, buscar, refeicoes do cardapio, custo | Criar/editar/remover cardapio, adicionar/remover refeicao dia | Slug coincide com frontend. |
| `refeicoes` | Listar/buscar/preparacoes/produtos | CRUD, duplicar, toggle, produtos da refeicao | Frontend usa `preparacoes` em algumas rotas; verificar cadastro do modulo. |
| `compras` | Estatisticas, produtos, jobs, listar/buscar compras, programacoes | Criar, gerar da guia, atualizar, status, excluir, salvar programacoes, mesclar itens | Frontend usa slug `pedidos`. LACUNA de alinhamento. |
| `fornecedores` | Rotas protegidas por token; escrita granular em create/update/delete | Criar/editar/remover | Leitura parece `authenticateToken` no router. |
| `contratos` | Contratos e contrato-produtos com leitura protegida | Criar/editar/remover contratos e contrato-produtos | Contrato-produtos alinhado a RBAC em 2026-04-30. |
| `saldo_contratos` | Saldos, historico, modalidades, produtos e resumos | Cadastrar saldo, consumir saldo, excluir consumo | Rotas alinhadas a RBAC em 2026-04-30. |
| `escolas` | Leitura autenticada | Criar/editar/remover | Confirmado para mutacoes. |
| `produtos` | Leitura autenticada | Criar/editar/composicao/standardize/remover | Confirmado para mutacoes. |
| `faturamentos` | Listar/buscar/resumos/relatorios | Criar/atualizar/status/consumo/reverter/remover/deletar | Frontend alinhado ao slug canonico em 2026-04-30. |
| `entregas` | Escolas, estatisticas, offline bundle, mudancas, itens, historico, comprovantes, foto | Confirmar/cancelar entrega, criar/cancelar/excluir comprovante, upload de foto | Slug backend cobre comprovantes/fotos. |
| `nutricionistas` | Listar/buscar | Criar/editar/remover/desativar | Confirmado. |
| `pnae` | Dashboard/relatorios/per capita | Salvar relatorio e per capita | Confirmado. |
| `estoque` | Central, posicao, produto, lotes, alertas, movimentacoes | Simular saida, entrada, saida, ajuste, transferencias | Confirmado. |
| `guias` | Competencias, status, romaneio, jobs, guias, itens | Criar, gerar demanda, atualizar, deletar, adicionar/remover produto, atualizar entrega, ajustes | Frontend alinhado ao slug canonico em 2026-04-30. |
| `recebimentos` | Pedidos/fornecedores/itens/historico | Registrar recebimento | Confirmado. |

## Rotas publicas ou especiais

| Recurso | Regra | Confianca |
| --- | --- | --- |
| `/login`, `/home`, `/interesse` | Publicas no frontend. | CONFIRMADO |
| `/validar-comprovante` | Publica no frontend para validar numero/codigo de comprovante. | CONFIRMADO |
| `/cardapio-publico` | Publica para acesso via QR/ficha tecnica. | CONFIRMADO |
| Ficha tecnica de refeicao | Rota publica antes de autenticar em `refeicaoRoutes`. | CONFIRMADO |
| Modalidades leitura | Algumas leituras sem autenticacao, segundo Archaeologist. | CONFIRMADO |
| Desktop IPC | Disponivel ao renderer via `window.desktopShell`, nao pelo RBAC HTTP. | CONFIRMADO |

## Lacunas de permissao

- RESOLVIDO em 2026-04-30: rotas e menu frontend usam os slugs canonicos `compras`, `guias`, `faturamentos`, `refeicoes` e `portal_escola`.
- RESOLVIDO em 2026-04-30: `rotaRoutes.ts` aplica RBAC `rotas` em leituras e escritas, incluindo endpoints auxiliares antes sem middleware explicito.
- RESOLVIDO em 2026-04-30: `/api/dashboard/stats` aplica RBAC de leitura `dashboard`.
- RESOLVIDO em 2026-04-30: leituras de produtos aplicam RBAC `produtos` leitura e escritas aplicam `produtos` escrita.
- RESOLVIDO em 2026-04-30: `GET /api/usuarios/` aplica `authenticateToken` e `requireAdmin`.
- LACUNA: algumas rotas sensiveis usam apenas `authenticateToken`, sem nivel granular documentado.
- DESCONTINUADO: app `estoque-escolar-mobile` autenticava por codigo escolar e token proprio, mas nao e mais usado operacionalmente.
- LACUNA: cache de 5 minutos pode manter permissao antiga apos alteracao se `limparCachePermissoes` nao for chamado nos fluxos administrativos.
