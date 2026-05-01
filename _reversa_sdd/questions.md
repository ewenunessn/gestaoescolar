# Perguntas para Validacao - gestaoescolar

> Gerado pelo Revisor em 2026-04-30.
> Respostas processadas nesta rodada.

---

## Pergunta 1

✅ Respondida

**Contexto:** Divergencia confirmada entre slugs usados no frontend (`pedidos`, `demandas`, `faturamento`, `preparacoes`) e no backend (`compras`, `guias`, `faturamentos`, `refeicoes`) em `frontend/src/routes/AppRouter.tsx` e `backend/src/modules/**/routes/*.ts`.
**Spec afetada:** [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/auth-rbac.md`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/auth-rbac.md)
**Pergunta:** Quais slugs devem ser tratados como canonicos para permissao nesses quatro pares: `compras/pedidos`, `guias/demandas`, `faturamento/faturamentos` e `preparacoes/refeicoes`?
**Impacto:** Define se a spec deve documentar aliases suportados ou apontar esses pares como bug de autorizacao.

**Resposta:** compras=compras; guias=guias; faturamento=faturamentos; preparacoes=refeicoes

---

## Pergunta 2

✅ Respondida

**Contexto:** As rotas web do Portal Escola usam `PermissionGuard moduloSlug="dashboard"` em `frontend/src/routes/AppRouter.tsx:500-517`, enquanto o backend do portal exige autenticacao e `escola_id`, mas nao um modulo especifico de portal.
**Spec afetada:** [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/escolas-portal.md`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/escolas-portal.md), [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/auth-rbac.md`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/auth-rbac.md)
**Pergunta:** Usuario de escola deve sempre herdar acesso ao portal via slug `dashboard`, ou deveria existir um slug dedicado ao Portal Escola?
**Impacto:** Define o contrato correto de autorizacao do portal e evita documentar um bypass acidental como regra oficial.

**Resposta:** criar um slug dedicado para o Portal Escola.

---

## Pergunta 3

✅ Respondida

**Contexto:** O estoque escolar web/mobile usava `devAuthMiddleware` em `backend/src/modules/estoque/routes/estoqueEscolarRoutes.ts`, enquanto o restante do sistema usa JWT + RBAC. O app `apps/estoque-escolar-mobile` foi descontinuado; a validacao deve priorizar apenas os fluxos web ativos e o app `apps/entregador-native`.
**Spec afetada:** [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/estoque-ledger.md`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/estoque-ledger.md), [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/auth-rbac.md`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/auth-rbac.md), [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/user-stories/estoque-escolar-mobile.md`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/user-stories/estoque-escolar-mobile.md)
**Pergunta:** Esse desvio de autenticacao do estoque escolar e intencional como contrato de produto, ou e apenas uma etapa temporaria de migracao?
**Impacto:** Muda a classificacao do modulo escolar entre regra suportada e debito tecnico/transicao.

**Resposta:** Deve ser tratado como temporario/migracao. O correto e migrar para JWT + RBAC.

---

## Pergunta 4

✅ Respondida

**Contexto:** `POST /api/disparos-notificacao` e `GET /api/disparos-notificacao` exigem apenas `authenticateToken` em `backend/src/modules/sistema/routes/disparosNotificacaoRoutes.ts`, embora a UI marque a tela como `adminOnly`.
**Spec afetada:** [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/usuarios-sistema.md`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/usuarios-sistema.md), [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/openapi/sistema-faturamento-recebimentos.yaml`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/openapi/sistema-faturamento-recebimentos.yaml)
**Pergunta:** O endpoint de disparos deve ser considerado restrito a administradores/permissao `notificacoes`, ou autenticacao simples ja e o comportamento desejado?
**Impacto:** Define se a spec documenta um contrato administrativo formal ou um endpoint amplo protegido apenas pela interface.

**Resposta:** Deve ser protegida no backend. Use administrador ou permissao notificacoes.

---

## Pergunta 5

✅ Respondida

**Contexto:** `backend/src/index.ts` expoe `/api/test-db` e, fora de producao, `/debug-env`; esses endpoints nao aparecem no OpenAPI atual e podem ser operacionais, nao contratuais.
**Spec afetada:** [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/openapi/sistema-faturamento-recebimentos.yaml`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/openapi/sistema-faturamento-recebimentos.yaml), [`C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/desktop-shell.md`](C:/Users/Ewerton/Desktop/Ewerton/gestaoescolar/_reversa_sdd/sdd/desktop-shell.md)
**Pergunta:** Esses endpoints devem entrar como parte documentada do contrato operacional, ou devem permanecer fora das specs por serem apenas suporte/diagnostico?
**Impacto:** Define a fronteira entre API publica do sistema e endpoints internos de suporte.

**Resposta:** Sao ferramentas internas de diagnostico. Nao devem entrar no OpenAPI principal.
