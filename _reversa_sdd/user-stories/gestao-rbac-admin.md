# User Story - Gestao RBAC Admin

## Contexto

- 🟢 O sistema possui RBAC por modulo com niveis `0..3`.
- 🟢 Admin e system admin possuem bypass, mas o fluxo de administracao gerencia usuarios, funcoes e permissoes granulares.
- 🟡 Existem slugs divergentes entre frontend e backend em alguns modulos, o que torna a governanca de permissao um ponto sensivel.

## Persona

- Administrador do sistema.

## Historia

Como administrador,
quero gerenciar usuarios, funcoes e permissoes por modulo,
para controlar quem pode ler, escrever ou administrar cada parte do sistema.

## Jornada Principal

1. 🟢 O admin acessa a area administrativa de usuarios.
2. 🟢 Lista usuarios existentes.
3. 🟢 Cria ou edita usuario quando necessario.
4. 🟢 Consulta as permissoes diretas do usuario.
5. 🟢 Ajusta niveis por modulo.
6. 🟢 Consulta funcoes, modulos e niveis auxiliares.
7. 🟢 Usa a verificacao de conflitos para identificar incoerencias.

## Regras de Negocio

- 🟢 Todas as rotas administrativas exigem autenticacao e `requireAdmin`.
- 🟢 Os niveis sao `nenhum=0`, `leitura=1`, `escrita=2`, `total=3`.
- 🟢 Permissao direta do usuario pode sobrescrever a herdada da funcao.
- 🟢 O backend falha fechado para nivel `0` em erro de consulta.
- 🟡 Slugs divergentes podem gerar configuracao aparentemente correta, mas comportamento incorreto em runtime.

## Critérios de Aceitação

```gherkin
Cenario: Criar usuario administrativo
Dado um administrador autenticado
Quando ele envia os dados de um novo usuario
Entao o sistema deve criar o usuario

Cenario: Ajustar permissoes diretas por modulo
Dado um usuario existente
Quando o admin define niveis para modulos especificos
Entao essas permissoes devem ser persistidas e retornadas na consulta posterior

Cenario: Consultar niveis e modulos disponiveis
Dado um administrador autenticado
Quando ele acessa os auxiliares de RBAC
Entao o sistema deve listar modulos e niveis suportados

Cenario: Verificar conflitos de configuracao
Dado um usuario com combinacoes de permissao potencialmente inconsistentes
Quando o admin consulta os conflitos
Entao o backend deve retornar a analise correspondente
```

## Rastreabilidade

- 🟢 `backend/src/modules/usuarios/routes/adminUsuariosRoutes.ts`
- 🟢 `backend/src/modules/usuarios/controllers/adminUsuariosController.ts`
- 🟢 `backend/src/middleware/permissionMiddleware.ts`
- 🟢 `frontend/src/services/adminUsuarios.ts`
- 🟢 `frontend/src/hooks/useUserPermissions.ts`
- 🟢 `_reversa_sdd/permissions.md`
- 🟡 `_reversa_sdd/sdd/auth-rbac.md`
