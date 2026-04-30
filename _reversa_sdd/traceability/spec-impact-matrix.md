# Spec Impact Matrix - gestaoescolar

Gerado pelo Reversa Architect em 2026-04-29.

## Matriz por componente

| Spec / Componente | Frontend | Backend | Mobile Entregador | Mobile Estoque | Desktop | Banco | Documentos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Autenticacao JWT | Login, interceptors, redirects | `authMiddleware`, usuarios | Token AsyncStorage | `auth_token`, gestor escola | URLs e session web | `usuarios` | permissions.md |
| RBAC granular | `PermissionGuard`, menus, rotas | `permissionMiddleware`, permissoes | INFERIDO por token | Parcial/independente | Herdado web | `funcoes`, `modulos`, permissoes | ADR 0001 |
| Cardapios/preparacoes | Calendario, detalhe, publico | cardapios/refeicoes/nutricao | Nao central atual | Nao | Web embutido | cardapios, refeicoes, produtos | domain.md |
| Guias de demanda | Guias, ajustes, lista | guias/demandas/jobs | QR/romaneio consome filtros | Nao | Web embutido | guias, guia_itens | flowcharts/guias |
| Compras/programacao | Compras, programacao, abastecimento | compras/planejamento | Nao | Nao | Web embutido | pedidos, pedido_itens, programacoes | domain.md |
| Recebimentos | Web e app entregador parcial | recebimentos | Telas recebimentos | Nao | Web embutido | recebimentos, estoque | flowcharts/recebimentos |
| Estoque central | Estoque central/lotes/alertas | estoque central, ledger | Estoque central mobile parcial | Nao | Web embutido | estoque_central, lotes, eventos | ADR 0002 |
| Estoque escolar | Estoque escolar web/portal | estoque escolar | Baixas por entrega | App principal | Web embutido | estoque_escola, movimentacoes | state-machines.md |
| Entregas offline | Entregas/comprovantes web | entregas, idempotencia, fotos | App principal/outbox | Nao | Web embutido | historico_entregas, comprovantes | ADR 0003/0004 |
| Romaneio/QR | Romaneio PDF/QR | guia romaneio APIs | QR filter e romaneio | Nao | Downloads desktop | guias/rotas | flowcharts/guias-entrega-romaneio |
| Faturamento | Faturamento compra/modalidade | faturamentos | Nao | Nao | Web embutido | faturamentos, consumo | domain.md |
| Portal escola | Portal web | escola-portal, solicitacoes | Nao | Relacionado por escola | Web embutido | escolas, solicitacoes | permissions.md |
| Notificacoes/realtime | Context providers, refresh hooks | `realtimeRoutes` em `/api/events`, notificacoes e disparos | Nao | Nao | Web embutido | notificacoes/eventos | architecture.md, OpenAPI sistema |
| Desktop shell | Desktop titlebar/download UI | backend empacotado | Nao | Nao | Main/preload/downloads | env/db local/remoto | ADR 0005 |
| Deploy Vercel | Vite/Vercel config | Vercel node/env | Consome prod | Consome prod | Build separado | Neon/Postgres | ADR 0006 |

## Impactos de mudanca comuns

| Mudanca | Componentes impactados | Risco |
| --- | --- | --- |
| Alterar slug de permissao | Frontend rotas/menus, backend middlewares, seed/modulos no banco | Alto |
| Alterar envelope de API | Frontend services, apps mobile, testes, shared types | Alto |
| Alterar schema de estoque | Backend estoque/entregas/recebimentos, apps, ERD, ledger | Alto |
| Alterar comprovante/fotos | Backend entregas/storage, app entregador, web comprovantes, migrations | Alto |
| Alterar URL/base API | Frontend config, desktop backend-service, apps mobile hardcoded | Medio/Alto |
| Alterar cardapio/per capita | Backend nutricao/cardapios, frontend calendario/ficha, geracao de guias | Alto |
| Alterar status de pedido/guia/item | UI chips/filtros, maquinas de estado, backend rules, relatorios | Medio |
| Remover endpoint legado | Apps mobile, frontend services e docs de flowchart | Medio |
| Mudar deploy Vercel/workspaces | CI/CD, package scripts, frontend/backend config | Medio |

## Lacunas de rastreabilidade

- LACUNA: `shared` deveria virar fonte dos contratos, mas hoje nao impacta consumidores ativos.
- CONFIRMADO: bootstrap HTTP ativo concentra `/health` em `backend/src/index.ts`; `monitoringRoutes.ts` existe no codigo, mas nao e registrado por `registerApiRoutes.ts`.
- LACUNA: alguns modulos backend nao possuem permissao granular completa.
- LACUNA: schema ativo precisa ser confirmado pelo Data Master antes de gerar specs executaveis finais.
