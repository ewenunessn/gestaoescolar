# Auth RBAC

## Visao Geral

🟢 O componente Auth/RBAC autentica usuarios por JWT e controla acesso por modulo com niveis numericos de permissao.
🟢 Ele protege rotas backend via middlewares Express e protege rotas frontend via `PermissionGuard`.
🟡 A equivalencia entre RBAC web e apps mobile existe parcialmente por token/codigo, mas nao esta uniformemente documentada.

## Responsabilidades

- 🟢 Extrair token Bearer do header `Authorization` e validar assinatura JWT.
- 🟢 Popular `req.user` com identidade, tipo, escola, secretaria e instituicao do usuario autenticado.
- 🟢 Rejeitar token ausente, expirado ou invalido com respostas HTTP 401.
- 🟢 Autorizar leitura, escrita, total ou nivel minimo por `moduloSlug`.
- 🟢 Permitir bypass total para `usuario.isSystemAdmin` ou `usuario.tipo === 'admin'`.
- 🟢 Resolver permissao por permissao direta do usuario ou por funcao ativa.
- 🟢 Cachear permissao backend por usuario/modulo por 5 minutos.
- 🟢 No frontend, ocultar/bloquear rotas com permissao insuficiente e exibir tela `Acesso Restrito`.
- 🟢 [Revisao Reviewer] Redirecionar usuario de escola para portal escola no fluxo inicial do roteador quando o token possui `escola_id` e o usuario nao e `admin` nem `isSystemAdmin`. Evidencia: `frontend/src/routes/AppRouter.tsx:43-51`.

## Interface

### Entrada backend

| Entrada | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `Authorization` | Header `Bearer <token>` | Sim para rotas autenticadas | Token JWT validado por `jwt.verify`. | 🟢 |
| `moduloSlug` | `string` | Sim nos middlewares de permissao | Slug do modulo protegido. | 🟢 |
| `nivelMinimo` | `NivelPermissao` | Apenas em `requireNivel` | Nivel minimo numerico exigido. | 🟢 |

### Saida backend

| Saida | Condicao | Descricao | Confianca |
| --- | --- | --- | --- |
| `next()` | Token valido e permissao suficiente | A rota continua. | 🟢 |
| HTTP 401 `UNAUTHORIZED` | Token ausente | Usuario nao autenticado. | 🟢 |
| HTTP 401 `TOKEN_EXPIRED` | JWT expirado | Usuario deve fazer login novamente. | 🟢 |
| HTTP 401 `INVALID_TOKEN` | JWT invalido | Token recusado. | 🟢 |
| HTTP 403 `FORBIDDEN` | Permissao insuficiente | Resposta inclui modulo, nivel necessario e nivel atual. | 🟢 |

### Estruturas

```ts
enum NivelPermissao {
  NENHUM = 0,
  LEITURA = 1,
  ESCRITA = 2,
  TOTAL = 3
}
```

🟢 Payload JWT esperado inclui `id`, `email`, `nome`, `tipo`, `isSystemAdmin`, `escola_id`, `tipo_secretaria` e `institution_id`.

## Regras de Negocio

- 🟢 Token deve estar em `Authorization` com prefixo `Bearer `.
- 🟢 Token ausente bloqueia a rota com HTTP 401.
- 🟢 Token expirado bloqueia com erro `TOKEN_EXPIRED`.
- 🟢 Token estruturalmente invalido bloqueia com erro `INVALID_TOKEN`.
- 🟢 `admin` e `isSystemAdmin` possuem acesso total sem consulta a permissoes granulares.
- 🟢 Permissao direta do usuario e consultada antes da permissao herdada da funcao no backend.
- 🟢 Se nao houver permissao direta, o backend consulta a funcao ativa do usuario.
- 🟢 Falha na consulta de permissao backend resulta em nivel `NENHUM`.
- 🟢 Cache de permissao backend usa chave `usuarioId:moduloSlug` e TTL de 5 minutos.
- 🟢 `requireLeitura` exige nivel >= 1.
- 🟢 `requireEscrita` exige nivel >= 2.
- 🟢 `requireTotal` exige nivel >= 3.
- 🟢 `requireNivel` exige nivel minimo informado.
- 🟢 No frontend, permissoes de funcao sao carregadas antes das permissoes diretas; permissoes diretas sobrescrevem o mapa final.
- 🟢 Usuario frontend `admin` ou `isSystemAdmin` sempre recebe `hasPermission = true`.
- 🟢 Usuario com `escola_id` e nao admin e classificado como usuario escola e direcionado ao portal escola.
- 🟢 [Validacao Humana] Os slugs canonicos de permissao sao `compras`, `guias`, `faturamentos` e `refeicoes`. Os nomes `pedidos`, `demandas`, `faturamento` e `preparacoes` devem ser tratados como legados ou divergentes do contrato alvo.

## Fluxo Principal

Notas de implementacao de 2026-04-30:

- Frontend centraliza os slugs canonicos em `frontend/src/routes/permissionSlugs.ts`; rotas e menu usam `compras`, `guias`, `faturamentos`, `refeicoes` e `portal_escola` nos guards.
- Estoque escolar usa `authenticateToken` com `requireLeitura('estoque')` e `requireEscrita('estoque')`.
- Disparos de notificacao usam `authenticateToken` e permissao `notificacoes`, preservando bypass de admin/system admin pelo middleware de permissao.

1. 🟢 Cliente envia requisicao HTTP para rota protegida com `Authorization: Bearer <token>`.
2. 🟢 `authenticateToken` extrai o token removendo o prefixo `Bearer `.
3. 🟢 `authenticateToken` chama `jwt.verify(token, config.jwtSecret)`.
4. 🟢 Se o token for valido, `req.user` recebe os dados do payload.
5. 🟢 Rota chama middleware de permissao com `moduloSlug`.
6. 🟢 Se usuario for `admin` ou `isSystemAdmin`, middleware chama `next()`.
7. 🟢 Para usuario comum, backend busca permissao direta por usuario/modulo.
8. 🟢 Se nao houver permissao direta, backend busca permissao da funcao ativa.
9. 🟢 Backend compara o nivel encontrado com o minimo exigido.
10. 🟢 Se o nivel for suficiente, rota continua.

## Fluxos Alternativos

- **Token ausente:** 🟢 backend responde HTTP 401 com `UNAUTHORIZED`.
- **Token expirado:** 🟢 backend responde HTTP 401 com `TOKEN_EXPIRED`.
- **Token invalido:** 🟢 backend responde HTTP 401 com `INVALID_TOKEN`.
- **Permissao insuficiente:** 🟢 backend responde HTTP 403 com `FORBIDDEN` e detalhes de modulo/nivel.
- **Permissao em cache:** 🟢 backend retorna nivel cacheado enquanto `Date.now() - timestamp < CACHE_TTL`.
- **Erro ao consultar permissao:** 🟢 backend registra erro e retorna nivel `NENHUM`.
- **Frontend sem permissao:** 🟢 `PermissionGuard` mostra tela `Acesso Restrito` com botao para voltar ao dashboard.
- **Frontend ainda carregando permissoes:** 🟢 `PermissionGuard` retorna `null` para evitar flash de tela.

## Cenarios de Borda

- 🟢 Token presente sem prefixo `Bearer ` deve ser tratado como ausente, pois a extracao exige esse prefixo.
- 🟢 Token invalido em `optionalAuth` nao bloqueia a rota; o fluxo continua sem `req.user` e loga aviso apenas em desenvolvimento.
- 🟡 Cache de 5 minutos pode manter acesso antigo se a administracao alterar permissoes e nao chamar limpeza de cache.
- 🟢 [Validacao Humana] Enquanto o frontend continuar protegido por `pedidos`, `demandas`, `faturamento` e `preparacoes`, pode ocorrer divergencia real de autorizacao em relacao ao backend, que usa `compras`, `guias`, `faturamentos` e `refeicoes`.

## Dependencias

- 🟢 `jsonwebtoken` para validar e assinar/verificar JWT.
- 🟢 `config.jwtSecret` para segredo de assinatura.
- 🟢 `db.query` para consultar `usuario_permissoes`, `funcao_permissoes`, `modulos`, `funcoes` e `niveis_permissao`.
- 🟢 `useCurrentUser` para carregar usuario atual no frontend.
- 🟢 `api.get('/usuarios/me/permissoes')` para carregar permissoes granulares no frontend.
- 🟢 `react-router-dom` para proteger rotas por `PrivateRoute`, `PublicRoute`, `LazyRoute` e `PermissionGuard`.

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Rotas autenticadas devem validar JWT antes de acessar `req.user`. | `backend/src/middleware/authMiddleware.ts:32` | 🟢 |
| Seguranca | JWT deve ser verificado com segredo centralizado em configuracao. | `backend/src/middleware/authMiddleware.ts:45` | 🟢 |
| Seguranca | Admin e system admin tem bypass controlado e explicito. | `backend/src/middleware/permissionMiddleware.ts:111` | 🟢 |
| Seguranca | Permissao insuficiente deve retornar 403 com detalhes do modulo. | `backend/src/middleware/permissionMiddleware.ts:115` | 🟢 |
| Performance | Permissoes backend devem ser cacheadas por 5 minutos para reduzir consultas repetidas. | `backend/src/middleware/permissionMiddleware.ts:19` | 🟢 |
| Disponibilidade | Falha na consulta de permissao deve falhar fechada com nivel zero. | `backend/src/middleware/permissionMiddleware.ts:24` | 🟢 |
| UX | Frontend deve evitar flash de acesso negado enquanto permissoes carregam. | `frontend/src/components/PermissionGuard.tsx:27` | 🟢 |

## Criterios de Aceitacao

```gherkin
Cenario: login valido acessa rota com permissao de leitura
Dado um usuario autenticado com JWT valido
E uma permissao de leitura para o modulo solicitado
Quando o usuario acessa uma rota protegida por requireLeitura
Entao o backend deve popular req.user
E a rota deve continuar a execucao

Cenario: usuario sem token tenta acessar rota protegida
Dado uma requisicao sem header Authorization Bearer
Quando a requisicao passa por authenticateToken
Entao o backend deve responder 401
E o erro deve ser UNAUTHORIZED

Cenario: usuario comum sem permissao suficiente acessa modulo
Dado um usuario autenticado que nao e admin
E nivel atual menor que o nivel minimo exigido
Quando a requisicao passa pelo middleware de permissao
Entao o backend deve responder 403
E deve informar modulo, nivel necessario e nivel atual

Cenario: admin acessa qualquer modulo protegido
Dado um usuario autenticado com tipo admin
Quando a requisicao passa por requireEscrita ou requireTotal
Entao o middleware deve chamar next sem consultar permissoes granulares

Cenario: frontend bloqueia rota sem permissao
Dado um usuario nao admin sem permissao para o moduloSlug da rota
Quando o PermissionGuard terminar de carregar permissoes
Entao deve exibir Acesso Restrito
E deve oferecer botao para voltar ao Dashboard

Cenario: permissao direta sobrescreve permissao herdada no frontend
Dado permissoes de funcao e permissoes diretas retornadas por /usuarios/me/permissoes
Quando useUserPermissions montar o mapa local
Entao a permissao direta deve substituir o nivel da funcao para o mesmo modulo_slug
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
| --- | --- | --- |
| Validar JWT em rotas protegidas | Must | Caminho critico de toda API autenticada. |
| Popular `req.user` | Must | Middlewares e controllers dependem do usuario autenticado. |
| Bypass admin/system admin | Must | Regra central confirmada no backend e frontend. |
| Permissao por modulo e nivel | Must | Base do RBAC granular. |
| Falhar fechado em erro de permissao | Must | Evita acesso indevido em falha de banco/consulta. |
| Cache de permissao | Should | Otimiza consultas, mas pode ser desativado com custo de performance. |
| Tela frontend de acesso restrito | Should | Melhora UX, mas backend continua sendo autoridade. |
| `optionalAuth` | Could | Usado para rotas que toleram anonimato; nao e caminho principal. |
| Slugs divergentes | Won't | Nao deve ser preservado; e divida a corrigir em reconstrucoes. |

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/middleware/authMiddleware.ts` | `authenticateToken` | 🟢 |
| `backend/src/middleware/authMiddleware.ts` | `optionalAuth` | 🟢 |
| `backend/src/middleware/permissionMiddleware.ts` | `NivelPermissao` | 🟢 |
| `backend/src/middleware/permissionMiddleware.ts` | `buscarPermissaoUsuario` | 🟢 |
| `backend/src/middleware/permissionMiddleware.ts` | `limparCachePermissoes` | 🟢 |
| `backend/src/middleware/permissionMiddleware.ts` | `requireLeitura` | 🟢 |
| `backend/src/middleware/permissionMiddleware.ts` | `requireEscrita` | 🟢 |
| `backend/src/middleware/permissionMiddleware.ts` | `requireTotal` | 🟢 |
| `backend/src/middleware/permissionMiddleware.ts` | `requireNivel` | 🟢 |
| `frontend/src/hooks/useUserPermissions.ts` | `useUserPermissions` | 🟢 |
| `frontend/src/hooks/useUserRole.ts` | `useUserRole` | 🟢 |
| `frontend/src/components/PermissionGuard.tsx` | `PermissionGuard` | 🟢 |
| `frontend/src/routes/AppRouter.tsx` | `LazyRoute` e `moduloSlug` | 🟢 |

## Referencias Reversa

- 🟢 `_reversa_sdd/permissions.md`
- 🟢 `_reversa_sdd/flowcharts/usuarios-login.md`
- 🟢 `_reversa_sdd/flowcharts/usuarios-funcoes-permissoes.md`
- 🟢 `_reversa_sdd/adrs/0001-rbac-granular-por-modulo.md`
