# ADR 0001 - RBAC granular por modulo

Status: Aceito retroativamente.

## Contexto

O historico Git registra `ba7f22f feat: RBAC granular + correcoes dashboard`. O codigo atual contem `permissionMiddleware.ts`, `PermissionGuard`, `useUserPermissions` e rotas com `moduloSlug`.

## Decisao

Adotar niveis numericos por modulo:

- 0 nenhum
- 1 leitura
- 2 escrita
- 3 total

Permissoes podem vir diretamente do usuario ou da funcao ativa. Admin e system admin bypassam as checagens.

## Alternativas consideradas

- Controle apenas por `tipo` de usuario (`admin`, `gestor`, `escola`).
- Controle apenas no frontend.
- Permissoes hardcoded por rota.

## Consequencias

- Positiva: permite delegar acesso granular sem criar novos tipos fixos de usuario.
- Positiva: backend passa a ser autoridade para leitura/escrita de varios modulos.
- Negativa: slugs precisam estar perfeitamente alinhados entre banco, frontend e backend.
- Risco: cache de 5 minutos pode atrasar revogacoes se nao for invalidado.

Confianca: CONFIRMADO para implementacao; INFERIDO para motivacao.
