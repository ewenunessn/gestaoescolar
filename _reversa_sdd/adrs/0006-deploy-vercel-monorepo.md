# ADR 0006 - Ajustes de deploy Vercel em monorepo

Status: Aceito retroativamente.

## Contexto

O historico contem varios fixes relacionados a Vercel: MIME type de assets, rewrites, workspaces npm, hoisting, `NODE_PATH`, `JWT_SECRET` e debug de ambiente.

## Decisao

Manter deploy Vercel com configuracoes especificas para monorepo, resolucao de dependencias hoistadas, aliases de pacote e checagens de ambiente para JWT.

## Alternativas consideradas

- Separar frontend e backend em repos/deploys independentes.
- Remover workspaces npm.
- Servir assets e API em provedores distintos.

## Consequencias

- Positiva: preserva monorepo e deploy unificado.
- Positiva: corrige falhas recorrentes de assets e auth em producao.
- Negativa: configuracao fica sensivel a detalhes do Vercel.
- Risco: endpoints de debug/env precisam ser removidos ou protegidos em producao.

Confianca: CONFIRMADO para sintomas e fixes; INFERIDO para alternativas.
