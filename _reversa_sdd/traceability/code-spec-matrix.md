| Arquivo | Spec correspondente | Cobertura |
| --- | --- | --- |
| `backend/src/middleware/authMiddleware.ts` | `sdd/auth-rbac.md` | 🟢 |
| `backend/src/middleware/permissionMiddleware.ts` | `sdd/auth-rbac.md` | 🟢 |
| `backend/src/modules/usuarios/routes/userRoutes.ts` | `sdd/auth-rbac.md`, `openapi/auth-usuarios.yaml` | 🟢 |
| `backend/src/modules/usuarios/routes/adminUsuariosRoutes.ts` | `sdd/auth-rbac.md`, `openapi/auth-usuarios.yaml`, `user-stories/gestao-rbac-admin.md` | 🟢 |
| `backend/src/modules/usuarios/controllers/userController.ts` | `sdd/auth-rbac.md`, `openapi/auth-usuarios.yaml` | 🟢 |
| `backend/src/modules/usuarios/controllers/adminUsuariosController.ts` | `sdd/auth-rbac.md`, `openapi/auth-usuarios.yaml`, `user-stories/gestao-rbac-admin.md` | 🟢 |
| `frontend/src/hooks/useUserPermissions.ts` | `sdd/auth-rbac.md`, `user-stories/gestao-rbac-admin.md` | 🟢 |
| `frontend/src/hooks/useUserRole.ts` | `sdd/auth-rbac.md` | 🟢 |
| `frontend/src/components/PermissionGuard.tsx` | `sdd/auth-rbac.md` | 🟢 |
| `backend/src/modules/escolas/routes/escolaRoutes.ts` | `sdd/escolas-portal.md`, `openapi/escolas-portal.yaml` | 🟢 |
| `backend/src/modules/escolas/routes/escolaPortalRoutes.ts` | `sdd/escolas-portal.md`, `openapi/escolas-portal.yaml` | 🟢 |
| `backend/src/modules/guias/routes/escolaModalidadeRoutes.ts` | `sdd/escolas-portal.md`, `openapi/escolas-portal.yaml` | 🟢 |
| `backend/src/modules/escolas/controllers/escolaController.ts` | `sdd/escolas-portal.md`, `openapi/escolas-portal.yaml` | 🟢 |
| `backend/src/modules/escolas/controllers/escolaPortalController.ts` | `sdd/escolas-portal.md`, `openapi/escolas-portal.yaml` | 🟢 |
| `backend/src/modules/guias/controllers/escolaModalidadeController.ts` | `sdd/escolas-portal.md`, `openapi/escolas-portal.yaml` | 🟢 |
| `backend/src/modules/solicitacoes/routes/solicitacoesAlimentosRoutes.ts` | `sdd/escolas-portal.md`, `openapi/escolas-portal.yaml`, `user-stories/portal-escola-solicitacoes.md` | 🟢 |
| `backend/src/modules/solicitacoes/controllers/solicitacoesAlimentosController.ts` | `sdd/escolas-portal.md`, `openapi/escolas-portal.yaml`, `user-stories/portal-escola-solicitacoes.md` | 🟢 |
| `frontend/src/modules/escolas/pages/Escolas.tsx` | `sdd/escolas-portal.md` | 🟢 |
| `frontend/src/modules/escolas/pages/EscolaDetalhes.tsx` | `sdd/escolas-portal.md` | 🟢 |
| `frontend/src/modules/portal-escola/pages/SolicitacoesPage.tsx` | `sdd/escolas-portal.md`, `user-stories/portal-escola-solicitacoes.md` | 🟢 |
| `frontend/src/modules/portal-escola/pages/PortalEscolaHome.tsx` | `sdd/escolas-portal.md` | 🟢 |
| `backend/src/modules/cardapios/routes/cardapioRoutes.ts` | `sdd/cardapios-nutricao.md`, `openapi/cardapios-nutricao.yaml` | 🟢 |
| `backend/src/modules/cardapios/routes/refeicaoRoutes.ts` | `sdd/cardapios-nutricao.md`, `openapi/cardapios-nutricao.yaml` | 🟢 |
| `backend/src/modules/cardapios/routes/modalidadeRoutes.ts` | `sdd/cardapios-nutricao.md`, `openapi/cardapios-nutricao.yaml` | 🟢 |
| `backend/src/modules/cardapios/controllers/cardapioController.ts` | `sdd/cardapios-nutricao.md`, `openapi/cardapios-nutricao.yaml` | 🟢 |
| `backend/src/modules/cardapios/controllers/refeicaoController.ts` | `sdd/cardapios-nutricao.md`, `openapi/cardapios-nutricao.yaml` | 🟢 |
| `backend/src/modules/cardapios/controllers/refeicaoProdutoController.ts` | `sdd/cardapios-nutricao.md`, `openapi/cardapios-nutricao.yaml` | 🟢 |
| `backend/src/modules/cardapios/controllers/modalidadeController.ts` | `sdd/cardapios-nutricao.md`, `openapi/cardapios-nutricao.yaml` | 🟢 |
| `frontend/src/modules/cardapios/pages/CardapiosModalidade.tsx` | `sdd/cardapios-nutricao.md` | 🟢 |
| `frontend/src/modules/cardapios/pages/CardapioCalendario.tsx` | `sdd/cardapios-nutricao.md` | 🟢 |
| `frontend/src/modules/nutricao/pages/Refeicoes.tsx` | `sdd/cardapios-nutricao.md` | 🟢 |
| `frontend/src/modules/nutricao/pages/PreparacaoDetalhe.tsx` | `sdd/cardapios-nutricao.md` | 🟢 |
| `backend/src/modules/produtos/routes/produtoRoutes.ts` | `sdd/produtos-unidades.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `backend/src/modules/unidades/routes/unidadeMedidaRoutes.ts` | `sdd/produtos-unidades.md` | 🟢 |
| `backend/src/modules/produtos/controllers/produtoController.ts` | `sdd/produtos-unidades.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `backend/src/modules/unidades/controllers/unidadeMedidaController.ts` | `sdd/produtos-unidades.md` | 🟢 |
| `backend/src/services/unidadesMedidaService.ts` | `sdd/produtos-unidades.md` | 🟢 |
| `frontend/src/modules/produtos/pages/Produtos.tsx` | `sdd/produtos-unidades.md` | 🟢 |
| `frontend/src/components/ImportacaoProdutos.tsx` | `sdd/produtos-unidades.md` | 🟢 |
| `backend/src/modules/contratos/routes/contratoRoutes.ts` | `sdd/contratos-fornecedores.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `backend/src/modules/contratos/routes/fornecedorRoutes.ts` | `sdd/contratos-fornecedores.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `backend/src/modules/contratos/routes/contratoProdutoRoutes.ts` | `sdd/contratos-fornecedores.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `backend/src/modules/contratos/routes/saldoContratosModalidadesRoutes.ts` | `sdd/contratos-fornecedores.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `backend/src/modules/contratos/controllers/contratoController.ts` | `sdd/contratos-fornecedores.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `backend/src/modules/contratos/controllers/fornecedorController.ts` | `sdd/contratos-fornecedores.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `backend/src/modules/contratos/controllers/contratoProdutoController.ts` | `sdd/contratos-fornecedores.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts` | `sdd/contratos-fornecedores.md`, `openapi/produtos-contratos.yaml` | 🟢 |
| `frontend/src/modules/contratos/pages/Contratos.tsx` | `sdd/contratos-fornecedores.md` | 🟢 |
| `frontend/src/modules/contratos/pages/SaldoContratosModalidades.tsx` | `sdd/contratos-fornecedores.md` | 🟢 |
| `backend/src/modules/guias/routes/guiaRoutes.ts` | `sdd/guias-demandas.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/guias/controllers/guiaController.ts` | `sdd/guias-demandas.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/guias/controllers/guiaDemandaGenerationController.ts` | `sdd/guias-demandas.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/guias/services/GuiaDemandaGenerationService.ts` | `sdd/guias-demandas.md`, `openapi/guias-compras.yaml` | 🟢 |
| `frontend/src/services/demandas.ts` | `sdd/guias-demandas.md` | 🟢 |
| `frontend/src/modules/abastecimento/pages/Abastecimento.tsx` | `sdd/guias-demandas.md`, `user-stories/abastecimento-operacional.md` | 🟢 |
| `frontend/src/modules/compras/pages/Compras.tsx` | `sdd/compras-programacao.md` | 🟢 |
| `frontend/src/modules/compras/pages/CompraDetalhe.tsx` | `sdd/compras-programacao.md` | 🟢 |
| `frontend/src/modules/compras/pages/CompraForm.tsx` | `sdd/compras-programacao.md` | 🟢 |
| `backend/src/modules/compras/routes/compraRoutes.ts` | `sdd/compras-programacao.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/compras/routes/planejamentoComprasRoutes.ts` | `sdd/compras-programacao.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/compras/controllers/compraController.ts` | `sdd/compras-programacao.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/compras/controllers/programacaoEntregaController.ts` | `sdd/compras-programacao.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/compras/controllers/planejamentoComprasController.ts` | `sdd/compras-programacao.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/compras/controllers/compraGenerationController.ts` | `sdd/compras-programacao.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/compras/services/PlanejamentoComprasService.ts` | `sdd/compras-programacao.md`, `openapi/guias-compras.yaml` | 🟢 |
| `backend/src/modules/estoque/routes/estoqueCentralRoutes.ts` | `sdd/estoque-ledger.md`, `openapi/estoque-entregas.yaml` | 🟢 |
| `backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts` | `sdd/estoque-ledger.md`, `openapi/estoque-entregas.yaml` | 🟢 |
| `backend/src/modules/estoque/services/estoqueLedgerService.ts` | `sdd/estoque-ledger.md`, `openapi/estoque-entregas.yaml` | 🟢 |
| `backend/src/modules/estoque/services/estoqueProjectionService.ts` | `sdd/estoque-ledger.md`, `openapi/estoque-entregas.yaml` | 🟢 |
| `backend/src/modules/estoque/services/estoqueSchemaService.ts` | `sdd/estoque-ledger.md` | 🟢 |
| `frontend/src/modules/estoque/pages/EstoqueCentral.tsx` | `sdd/estoque-ledger.md` | 🟢 |
| `frontend/src/modules/estoque/pages/EstoqueEscolar.tsx` | `sdd/estoque-ledger.md` | 🟢 |
| `frontend/src/modules/estoque/pages/EstoqueMovimentacoes.tsx` | `sdd/estoque-ledger.md` | 🟢 |
| `apps/estoque-escolar-mobile/src/hooks/useEstoque.ts` | `sdd/estoque-ledger.md`, `user-stories/estoque-escolar-mobile.md` | DESCONTINUADO |
| `apps/estoque-escolar-mobile/src/hooks/useSyncManager.ts` | `sdd/estoque-ledger.md`, `user-stories/estoque-escolar-mobile.md` | DESCONTINUADO |
| `apps/estoque-escolar-mobile/src/screens/EstoqueScreen.tsx` | `user-stories/estoque-escolar-mobile.md` | DESCONTINUADO |
| `apps/estoque-escolar-mobile/src/screens/HistoricoScreen.tsx` | `user-stories/estoque-escolar-mobile.md` | DESCONTINUADO |
| `backend/src/modules/entregas/routes/entregaRoutes.ts` | `sdd/entregas-comprovantes-fotos.md`, `openapi/estoque-entregas.yaml` | 🟢 |
| `backend/src/modules/entregas/controllers/EntregaController.ts` | `sdd/entregas-comprovantes-fotos.md`, `openapi/estoque-entregas.yaml`, `user-stories/entrega-offline-comprovante.md` | 🟢 |
| `backend/src/modules/entregas/controllers/HistoricoEntregaController.ts` | `sdd/entregas-comprovantes-fotos.md`, `openapi/estoque-entregas.yaml` | 🟢 |
| `backend/src/modules/entregas/controllers/ComprovanteEntregaController.ts` | `sdd/entregas-comprovantes-fotos.md`, `openapi/estoque-entregas.yaml` | 🟢 |
| `backend/src/modules/entregas/controllers/ComprovanteFotoController.ts` | `sdd/entregas-comprovantes-fotos.md`, `openapi/estoque-entregas.yaml`, `user-stories/entrega-offline-comprovante.md` | 🟢 |
| `backend/src/modules/entregas/models/entregaIdempotency.ts` | `sdd/entregas-comprovantes-fotos.md`, `user-stories/entrega-offline-comprovante.md` | 🟢 |
| `backend/src/modules/entregas/services/deliveryPhotoPolicy.ts` | `sdd/entregas-comprovantes-fotos.md`, `user-stories/entrega-offline-comprovante.md` | 🟢 |
| `backend/src/modules/entregas/services/deliveryPhotoStorage.ts` | `sdd/entregas-comprovantes-fotos.md`, `user-stories/entrega-offline-comprovante.md` | 🟢 |
| `apps/entregador-native/src/services/deliveryOutbox.ts` | `user-stories/entrega-offline-comprovante.md` | 🟢 |
| `apps/entregador-native/src/services/deliveryPhotoUpload.ts` | `user-stories/entrega-offline-comprovante.md` | 🟢 |
| `frontend/src/modules/entregas/pages/Entregas.tsx` | `sdd/entregas-comprovantes-fotos.md` | 🟢 |
| `frontend/src/modules/entregas/pages/ComprovantesEntrega.tsx` | `sdd/entregas-comprovantes-fotos.md` | 🟢 |
| `backend/src/modules/recebimentos/routes/recebimentoRoutes.ts` | `sdd/recebimentos.md`, `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `backend/src/modules/recebimentos/controllers/recebimentoController.ts` | `sdd/recebimentos.md`, `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `apps/entregador-native/src/api/recebimentos.ts` | `sdd/recebimentos.md` | 🟢 |
| `apps/entregador-native/src/screens/RecebimentosScreen.tsx` | `sdd/recebimentos.md` | 🟢 |
| `backend/src/modules/faturamentos/routes/faturamentoRoutes.ts` | `sdd/faturamentos.md`, `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `backend/src/modules/faturamentos/controllers/faturamentoController.ts` | `sdd/faturamentos.md`, `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `frontend/src/services/faturamentos.ts` | `sdd/faturamentos.md` | 🟢 |
| `frontend/src/services/faturamento.ts` | `sdd/faturamentos.md` | 🟢 |
| `desktop/main.cjs` | `sdd/desktop-shell.md` | 🟢 |
| `desktop/backend-service.cjs` | `sdd/desktop-shell.md` | 🟢 |
| `desktop/preload.cjs` | `sdd/desktop-shell.md` | 🟢 |
| `desktop/downloads.cjs` | `sdd/desktop-shell.md` | 🟢 |
| `desktop/window-actions.cjs` | `sdd/desktop-shell.md` | 🟢 |
| `desktop/window-appearance.cjs` | `sdd/desktop-shell.md` | 🟢 |
| `backend/src/modules/sistema/routes/dashboardRoutes.ts` | `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `backend/src/modules/sistema/routes/pnaeRoutes.ts` | `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `backend/src/modules/sistema/routes/periodosRoutes.ts` | `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `backend/src/modules/sistema/routes/calendarioLetivoRoutes.ts` | `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `backend/src/modules/sistema/routes/notificacoesRoutes.ts` | `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `backend/src/modules/sistema/routes/instituicao.ts` | `openapi/sistema-faturamento-recebimentos.yaml` | 🟢 |
| `backend/src/index.ts` | `openapi/sistema-faturamento-recebimentos.yaml`, `deployment.md`, `inventory.md` | CONFIRMADO |
| `backend/src/routes/registerApiRoutes.ts` | `openapi/sistema-faturamento-recebimentos.yaml`, `architecture.md`, `inventory.md` | CONFIRMADO |
| `backend/src/modules/sistema/routes/realtimeRoutes.ts` | `openapi/sistema-faturamento-recebimentos.yaml` | CONFIRMADO |
| `backend/src/modules/sistema/routes/healthRoutes.ts` | Nao montado no bootstrap atual; `/health` ativo esta em `backend/src/index.ts` | CONFIRMADO |
| `backend/src/modules/sistema/routes/monitoringRoutes.ts` | Nao montado em `registerApiRoutes.ts` no bootstrap atual | CONFIRMADO |
| `frontend/src/services/realtime.ts` | `sdd/entregas-comprovantes-fotos.md`, `sdd/estoque-ledger.md` | 🟡 |
| `shared/types/index.ts` | `sdd/auth-rbac.md`, `sdd/estoque-ledger.md`, `sdd/entregas-comprovantes-fotos.md` | 🟡 |
| `frontend/src/routes/AppRouter.tsx` | `sdd/auth-rbac.md`, `sdd/escolas-portal.md`, `user-stories/abastecimento-operacional.md` | 🟢 |
