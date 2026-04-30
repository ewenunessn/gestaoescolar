# Relatorio de Confianca - gestaoescolar

> Gerado pelo Revisor em 2026-04-30.

---

## Resumo Geral

| Nivel | Quantidade | Percentual |
| --- | ---: | ---: |
| 🟢 CONFIRMADO | 1811 | 94.3% |
| 🟡 INFERIDO | 109 | 5.7% |
| 🔴 LACUNA | 0 | 0.0% |
| **Total** | **1920** | **100%** |

**Confianca geral:** `97.2%`

---

## Por Spec

| Spec | 🟢 | 🟡 | 🔴 | Confianca |
| --- | ---: | ---: | ---: | ---: |
| `sdd/auth-rbac.md` | 88 | 2 | 0 | 98.9% |
| `sdd/usuarios-sistema.md` | 177 | 6 | 0 | 98.4% |
| `sdd/escolas-portal.md` | 164 | 4 | 0 | 98.8% |
| `sdd/cardapios-nutricao.md` | 213 | 4 | 0 | 99.1% |
| `sdd/produtos-unidades.md` | 192 | 3 | 0 | 99.2% |
| `sdd/contratos-fornecedores.md` | 189 | 6 | 0 | 98.5% |
| `sdd/guias-demandas.md` | 184 | 4 | 0 | 98.9% |
| `sdd/compras-programacao.md` | 170 | 4 | 0 | 98.9% |
| `sdd/estoque-ledger.md` | 119 | 33 | 0 | 89.1% |
| `sdd/entregas-comprovantes-fotos.md` | 108 | 20 | 0 | 92.2% |
| `sdd/recebimentos.md` | 66 | 7 | 0 | 95.2% |
| `sdd/faturamentos.md` | 67 | 8 | 0 | 94.7% |
| `sdd/desktop-shell.md` | 75 | 9 | 0 | 94.6% |

---

## Lacunas Pendentes 🔴

Nenhuma lacuna critica permaneceu sem resposta humana nesta rodada. Os itens restantes migraram para debitos de implementacao documentados em `gaps.md`.

---

## Recomendações

- [x] Corrigir os slugs do frontend para os canones validados: `compras`, `guias`, `faturamentos` e `refeicoes`.
- [x] Criar slug dedicado para o Portal Escola e remover a dependencia atual de `dashboard`.
- [x] Migrar o estoque escolar de `devAuthMiddleware` para JWT + RBAC.
- [x] Aplicar protecao backend a `/api/disparos-notificacao` por admin ou permissao `notificacoes`.
- [x] Migrar `/api/usuarios/me` e `/api/usuarios/me/permissoes` para `authenticateToken`.
- [x] Proteger `/api/permissoes/*` com `authenticateToken` e `requireAdmin`.
- [x] Proteger `/api/contrato-produtos/*` com `authenticateToken` e permissao `contratos`.
- [x] Proteger `/api/saldo-contratos-modalidades/*` com `authenticateToken` e permissao `saldo_contratos`.
- [x] Proteger `/api/demandas/*` com `authenticateToken` e permissao `guias`.
- [x] Proteger `/api/planejamento-compras/*` com `authenticateToken` e permissoes `guias`/`compras`.
- [x] Proteger `/api/periodos/*` com `authenticateToken` e permissao `periodos`.
- [x] Proteger calendario letivo, eventos, periodos avaliativos e excecoes com `authenticateToken` e permissao `calendario`.
- [x] Proteger escritas de `/api/instituicao` com `authenticateToken` e permissao `configuracoes`.
- [x] Proteger `/api/unidades-medida/*` com `authenticateToken` e permissao de leitura `produtos`.
- [x] Proteger `/api/taco/buscar` com `authenticateToken` e permissao de leitura `produtos`.
- [x] Proteger `/api/grupos-ingredientes/*` com `authenticateToken` e permissoes `refeicoes`.
- [x] Proteger rotas auxiliares de calculos/ingredientes de refeicoes com `authenticateToken` e permissoes `refeicoes`.
- [x] Proteger rotas administrativas de `/api/solicitacoes-alimentos` com `authenticateToken` e permissoes `solicitacoes`, mantendo o Portal Escola apenas autenticado e filtrado por `escola_id`.
- [x] Expandir o OpenAPI do modulo sistema para incluir SSE, calendario/notificacoes restantes e pontos de bootstrap relevantes.
- [x] Proteger `/api/entregas/rotas`, planejamentos e auxiliares com `authenticateToken` e permissoes `rotas`.
- [x] Proteger `/api/dashboard/stats` com `authenticateToken` e permissao de leitura `dashboard`.

---

## Historico de Reclassificacoes

| De | Para | Afirmação | Evidencia |
| --- | --- | --- | --- |
| 🟡 | 🟢 | Redirecionamento de usuario de escola para `/portal-escola` no fluxo inicial | `frontend/src/routes/AppRouter.tsx:43-51` |
| 🟡 | 🟢 | Regra correspondente do Portal Escola sobre redirecionamento automatico | `frontend/src/routes/AppRouter.tsx:43-51` |
| 🟡 | 🟢 | `shouldBlockRendererForBackend()` retorna `false` e nao bloqueia o renderer | `desktop/backend-service.cjs:31-33` |
| 🟡 | 🟢 | Em dev/backend nao pronto, o renderer pode abrir antes do health passar | `desktop/backend-service.cjs:31-33`, `desktop/main.cjs:173-182`, `desktop/main.cjs:227` |
| 🔴 | 🟢 | Slugs canonicos de permissao sao `compras`, `guias`, `faturamentos` e `refeicoes` | Validacao humana do usuario em 2026-04-30 |
| 🔴 | 🟢 | Divergencia atual de slugs entre frontend e backend representa debito real de autorizacao | Validacao humana do usuario em 2026-04-30 |
| 🟡 | 🟢 | O Portal Escola deve ter slug dedicado, e nao reutilizar `dashboard` | Validacao humana do usuario em 2026-04-30 |
| 🟡 | 🟢 | `devAuthMiddleware` no estoque escolar e transitorio; o alvo correto e JWT + RBAC | Validacao humana do usuario em 2026-04-30 |
| 🟡 | 🟢 | `/api/disparos-notificacao` deve ser protegido no backend por admin ou permissao `notificacoes` | Validacao humana do usuario em 2026-04-30 |
