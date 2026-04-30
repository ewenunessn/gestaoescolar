# Usuarios e Sistema

## Visao Geral

🟢 O componente Usuarios e Sistema administra usuarios, funcoes, permissoes administrativas, periodos operacionais, calendario letivo, instituicao e notificacoes do sistema.
🟢 Ele atua como camada de configuracao central para os demais modulos, pois define quem acessa o sistema, em qual contexto escolar/secretaria e em qual periodo letivo/operacional.
🟡 O componente agrupa funcionalidades tecnicamente separadas no codigo, mas foi consolidado como contrato por corresponder ao componente arquitetural `usuarios/sistema`.

## Responsabilidades

- 🟢 Listar usuarios administrativos com funcao, escola, tipo de secretaria, status e datas de criacao/atualizacao.
- 🟢 Criar usuarios administrativos com nome, email, senha, tipo, funcao, status, escola vinculada e tipo de secretaria.
- 🟢 Atualizar usuarios administrativos, incluindo senha opcional, funcao, status, escola e tipo de secretaria.
- 🟢 Excluir usuarios administrativos, bloqueando a exclusao da propria conta autenticada.
- 🟢 Gerenciar funcoes administrativas e seus niveis de permissao por modulo.
- 🟢 Gerenciar permissoes diretas por usuario e invalidar cache de permissao apos mudancas.
- 🟢 Verificar conflitos de permissao efetiva considerando permissao direta e permissao herdada por funcao.
- 🟢 Gerenciar periodos do sistema, incluindo criacao, ativacao, fechamento, reabertura, selecao por usuario e exclusao.
- 🟢 Gerenciar calendario letivo, eventos, periodos avaliativos, excecoes de dias letivos e calculo de dias letivos.
- 🟢 Gerenciar dados da instituicao ativa, logo e templates usados em documentos.
- 🟢 Gerenciar notificacoes de usuario, leitura individual, leitura em lote e exclusao.
- 🟢 Gerenciar disparos de notificacao para todos os usuarios, por modalidade ou por selecao de escolas.

## Interface

### Usuarios administrativos

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/admin/usuarios` | HTTP | Sim | Retorna usuarios com dados de funcao e escola associados. | 🟢 |
| `POST /api/admin/usuarios` | HTTP | Sim | Cria usuario administrativo com senha criptografada. | 🟢 |
| `PUT /api/admin/usuarios/:id` | HTTP | Sim | Atualiza campos enviados e altera senha apenas quando `senha` for informada. | 🟢 |
| `DELETE /api/admin/usuarios/:id` | HTTP | Sim | Remove fisicamente o usuario, exceto quando o alvo e a propria conta autenticada. | 🟢 |
| `GET /api/admin/usuarios/:id/permissoes` | HTTP | Sim | Retorna permissoes diretas do usuario. | 🟢 |
| `PUT /api/admin/usuarios/:id/permissoes` | HTTP | Sim | Substitui ou define permissoes diretas do usuario. | 🟢 |
| `GET /api/admin/usuarios/:id/conflitos` | HTTP | Sim | Retorna conflitos, erros e avisos de permissoes efetivas. | 🟢 |

### Funcoes e permissoes

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/admin/funcoes` | HTTP | Sim | Lista funcoes administrativas. | 🟢 |
| `POST /api/admin/funcoes` | HTTP | Sim | Cria funcao e suas permissoes em operacao transacional. | 🟢 |
| `PUT /api/admin/funcoes/:id` | HTTP | Sim | Atualiza funcao e invalida cache de usuarios vinculados. | 🟢 |
| `DELETE /api/admin/funcoes/:id` | HTTP | Sim | Exclui funcao administrativa. | 🟢 |
| `GET /api/admin/modulos` | HTTP | Sim | Lista modulos disponiveis para permissao. | 🟢 |
| `GET /api/admin/niveis-permissao` | HTTP | Sim | Lista niveis de permissao disponiveis. | 🟢 |

### Periodos e calendario

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/periodos` | HTTP | Sim | Lista periodos com totais relacionados de pedidos, guias e cardapios. | 🟢 |
| `GET /api/periodos/ativo` | HTTP | Sim | Retorna o periodo ativo. | 🟢 |
| `POST /api/periodos` | HTTP | Sim | Cria periodo por ano, descricao e intervalo de datas. | 🟢 |
| `PATCH /api/periodos/:id/ativar` | HTTP | Sim | Ativa periodo quando ele nao esta fechado. | 🟢 |
| `PATCH /api/periodos/:id/fechar` | HTTP | Sim | Fecha periodo quando ele nao esta ativo. | 🟢 |
| `PATCH /api/periodos/:id/reabrir` | HTTP | Sim | Reabre periodo fechado. | 🟢 |
| `DELETE /api/periodos/:id` | HTTP | Sim | Exclui periodo apenas se nao estiver ativo e nao possuir vinculos bloqueantes. | 🟢 |
| `GET /api/calendario-letivo` | HTTP | Sim | Lista calendarios letivos com contadores de eventos, periodos e excecoes. | 🟢 |
| `GET /api/calendario-letivo/:id/dias-letivos` | HTTP | Sim | Calcula dias letivos considerando regras padrao, eventos e excecoes. | 🟢 |
| `POST/PUT/DELETE /api/calendario-letivo` | HTTP | Sim | Escrita de calendario letivo protegida por autenticacao. | 🟢 |

### Instituicao e notificacoes

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/instituicao` | HTTP | Sim | Retorna instituicao ativa ou cria instituicao padrao se nenhuma existir. | 🟢 |
| `PUT /api/instituicao` | HTTP multipart | Sim | Atualiza dados da instituicao e pode receber arquivo de logo. | 🟢 |
| `POST /api/instituicao/logo-base64` | HTTP JSON | Sim | Atualiza logo por payload base64. | 🟢 |
| `PUT /api/instituicao/templates/:nome` | HTTP JSON | Sim | Salva template nomeado da instituicao. | 🟢 |
| `GET /api/notificacoes` | HTTP | Sim | Lista ate 50 notificacoes recentes do usuario e total de nao lidas. | 🟢 |
| `PATCH /api/notificacoes/:id/lida` | HTTP | Sim | Marca uma notificacao do proprio usuario como lida. | 🟢 |
| `PATCH /api/notificacoes/todas-lidas` | HTTP | Sim | Marca todas as notificacoes nao lidas do usuario como lidas. | 🟢 |
| `DELETE /api/notificacoes/:id` | HTTP | Sim | Exclui notificacao somente quando pertence ao usuario autenticado. | 🟢 |
| `POST /api/disparos-notificacao` | HTTP | Sim | Cria disparo e gera notificacoes conforme alvo. | 🟢 |

### Estruturas principais

```ts
type TipoSecretaria = "educacao" | "escola";

type UsuarioAdminForm = {
  nome: string;
  email: string;
  senha?: string;
  tipo: string;
  funcao_id?: number;
  ativo: boolean;
  tipo_secretaria: TipoSecretaria;
  escola_id?: number;
};
```

🟢 O formulario frontend de gerenciamento de usuarios trabalha com `nome`, `email`, `senha`, `tipo`, `funcao_id`, `ativo`, `tipo_secretaria` e `escola_id`.
🟢 O modelo de usuario backend inclui `tipo_secretaria` e seleciona esse campo no carregamento por email.
🟡 A lista completa de propriedades de instituicao, calendario e periodo deve ser consolidada pelo Data Master a partir do DDL final.

## Regras de Negocio

- 🟢 Rotas administrativas de usuarios usam `authenticateToken` e `requireAdmin` antes de expor operacoes de usuarios, funcoes, modulos e niveis.
- 🟢 Criacao de usuario exige `nome`, `email` e `senha`.
- 🟢 `tipo_secretaria` aceita apenas `educacao` ou `escola`.
- 🟢 Quando `tipo_secretaria` e `escola`, `escola_id` e obrigatorio.
- 🟢 Senha de usuario novo e armazenada como hash `bcrypt`.
- 🟢 Atualizacao de usuario altera senha somente quando `senha` e enviada.
- 🟢 Atualizacao de usuario valida `tipo_secretaria` com os mesmos valores aceitos na criacao.
- 🟢 Atualizacao de usuario invalida cache de permissoes do usuario alterado.
- 🟢 Usuario autenticado nao pode excluir a propria conta via rota administrativa.
- 🟢 Permissoes diretas de usuario possuem prioridade sobre permissoes herdadas da funcao no calculo efetivo de conflitos.
- 🟢 Usuario de secretaria escolar precisa de permissao de leitura em `escolas`.
- 🟢 Usuario nutricionista precisa de permissoes relacionadas a `preparacoes`, `cardapios` e `produtos`.
- 🟢 Usuario almoxarife precisa de permissoes relacionadas a `estoque` e `produtos`.
- 🟢 Escrita em pedidos/compras depende de leitura em fornecedores e contratos.
- 🟢 Escrita em faturamento depende de leitura em pedidos.
- 🟢 Demandas dependem de escolas e cardapios dependem de produtos.
- 🟢 Ano de periodo deve ser unico na criacao.
- 🟢 Periodo fechado nao pode ser ativado.
- 🟢 Periodo ativo nao pode ser fechado.
- 🟢 Periodo ativo ou com vinculos bloqueantes nao pode ser deletado.
- 🟢 Escrita de calendario letivo, eventos, periodos avaliativos e excecoes exige token autenticado.
- 🟢 Calculo de dias letivos considera calendario letivo, eventos e excecoes de dias especificos.
- 🟢 Busca de instituicao cria uma instituicao ativa padrao quando nao existe registro ativo.
- 🟢 Tela de configuracao de instituicao exige nome antes de salvar.
- 🟢 Notificacoes sao sempre consultadas por `usuario_id` do usuario autenticado.
- 🟢 Usuario so pode marcar como lida ou deletar notificacoes vinculadas ao seu proprio `usuario_id`.
- 🟢 Disparo de notificacao pode ter alvo `todas`, `modalidade` ou `selecao`.
- 🟡 O codigo sugere uso de transacao para criacao/atualizacao de funcoes com permissoes, mas a politica de rollback de erro deve ser validada em execucao.

## Fluxo Principal

### Administracao de usuarios

1. 🟢 Usuario admin acessa a tela `GerenciamentoUsuarios`.
2. 🟢 Frontend carrega usuarios, funcoes, modulos e escolas para montar tabela e formulario.
3. 🟢 Admin abre formulario de criacao ou edicao.
4. 🟢 Frontend envia campos de usuario para `/api/admin/usuarios`.
5. 🟢 Backend valida `tipo_secretaria` e obrigatoriedade de `escola_id` para secretaria escolar.
6. 🟢 Backend cria hash de senha quando aplicavel.
7. 🟢 Backend persiste usuario e retorna dados sem expor senha.
8. 🟢 Em edicao, backend invalida cache de permissoes do usuario alterado.

### Funcoes e permissoes

1. 🟢 Admin lista funcoes e modulos por rotas administrativas.
2. 🟢 Admin cria ou edita uma funcao com mapa de permissoes por modulo.
3. 🟢 Backend persiste funcao e relacoes em `funcao_permissoes`.
4. 🟢 Quando funcao e alterada, backend limpa cache de permissao dos usuarios vinculados.
5. 🟢 Permissoes diretas de usuario podem ser alteradas separadamente em `/api/admin/usuarios/:id/permissoes`.
6. 🟢 Alteracao de permissao direta tambem limpa cache do usuario.

### Conflitos de permissao

1. 🟢 Admin solicita conflitos de um usuario em `/api/admin/usuarios/:id/conflitos`.
2. 🟢 Backend busca usuario, escola, funcao, permissoes diretas e permissoes por funcao.
3. 🟢 Backend monta mapa efetivo com permissao direta prevalecendo sobre herdada.
4. 🟢 Backend aplica regras de dependencia por perfil e por modulo.
5. 🟢 Backend retorna conflitos, erros, avisos e totalizadores.

### Periodos e calendario

1. 🟢 Usuario autenticado lista periodos operacionais em `/api/periodos`.
2. 🟢 Backend retorna periodos com contadores relacionados de pedidos, guias e cardapios.
3. 🟢 Usuario cria periodo com ano e intervalo de datas.
4. 🟢 Backend bloqueia ano duplicado.
5. 🟢 Usuario ativa, fecha, reabre ou exclui periodo conforme regras de estado.
6. 🟢 Usuario consulta calendario letivo e seus eventos, periodos avaliativos e excecoes.
7. 🟢 Backend calcula dias letivos combinando regras padrao e excecoes.

### Instituicao e notificacoes

1. 🟢 Usuario autenticado consulta `/api/instituicao`.
2. 🟢 Backend retorna instituicao ativa ou cria registro padrao.
3. 🟢 Usuario salva dados, logo ou templates da instituicao.
4. 🟢 Usuario consulta notificacoes recentes.
5. 🟢 Backend retorna ate 50 notificacoes e total de nao lidas.
6. 🟢 Usuario marca notificacoes como lidas ou remove notificacao propria.
7. 🟢 Usuario autorizado cria disparo de notificacao e backend insere notificacoes para usuarios alvo.

## Fluxos Alternativos

- 🟢 **Tipo de secretaria invalido:** backend rejeita criacao ou atualizacao de usuario com erro de validacao.
- 🟢 **Usuario escolar sem escola:** backend rejeita criacao ou atualizacao quando `tipo_secretaria = escola` e `escola_id` esta ausente.
- 🟢 **Senha ausente em edicao:** backend preserva senha atual e atualiza apenas os demais campos enviados.
- 🟢 **Exclusao da propria conta:** backend bloqueia a operacao e nao remove o usuario autenticado.
- 🟢 **Permissao direta divergente da funcao:** verificacao de conflitos usa permissao direta como fonte efetiva.
- 🟢 **Periodo fechado em ativacao:** backend rejeita a ativacao.
- 🟢 **Periodo ativo em fechamento:** backend rejeita o fechamento.
- 🟢 **Periodo com vinculos em exclusao:** backend bloqueia a delecao.
- 🟢 **Instituicao inexistente:** backend cria a instituicao padrao `Secretaria Municipal de Educacao`.
- 🟢 **Notificacao de outro usuario:** update/delete por id nao afeta registros de outro `usuario_id`.

## Cenarios de Borda

- 🟢 **Cache de permissao apos mudanca de funcao:** ao trocar funcao, tipo ou permissao direta, o cache deve ser limpo para impedir autorizacao com permissao antiga.
- 🟢 **Conflito por dependencia indireta:** usuario pode ter escrita em um modulo, mas continuar inconsistente se faltar leitura em modulo dependente.
- 🟢 **Periodo fechado e ativo:** se uma operacao tentar fechar periodo ativo ou ativar periodo fechado, a transicao deve ser bloqueada antes do `UPDATE`.
- 🟢 **Calendario sem instituicao configurada:** configuracao institucional nao deve impedir calendario, pois instituicao possui criacao padrao no primeiro acesso autenticado.
- 🟡 **Calendario com excecao conflitante com evento:** o calculo deve priorizar a regra documentada em codigo, mas a precedencia exata entre tipos de evento e excecao deve ser validada com dados reais.
- 🟡 **Disparo sem usuarios alvo:** o disparo pode terminar com `total_enviado = 0`; a classificacao como sucesso ou alerta operacional deve ser validada com a regra de produto.

## Dependencias

- 🟢 `middleware/authMiddleware` - autentica rotas administrativas, periodos, calendario, instituicao, notificacoes e disparos.
- 🟢 `middleware/permissionMiddleware` - fornece `limparCachePermissoes` usado apos mudancas de usuario, funcao e permissoes diretas.
- 🟢 `backend/src/modules/usuarios/controllers/adminUsuariosController.ts` - implementa usuarios, funcoes, permissoes diretas e conflitos.
- 🟢 `backend/src/modules/sistema/controllers/periodosController.ts` - implementa periodo operacional e transicoes de estado.
- 🟢 `backend/src/modules/sistema/controllers/calendarioLetivoController.ts` - implementa calendario letivo e calculo de dias letivos.
- 🟢 `backend/src/modules/sistema/controllers/periodosAvaliativosController.ts` - implementa periodos avaliativos e excecoes do calendario.
- 🟢 `backend/src/modules/sistema/controllers/notificacoesController.ts` - implementa notificacoes por usuario.
- 🟢 `backend/src/modules/sistema/controllers/disparosNotificacaoController.ts` - implementa disparos e insercao de notificacoes.
- 🟢 `backend/src/modules/sistema/controllers/instituicaoController.ts` - implementa instituicao ativa, logo e templates.
- 🟢 `frontend/src/modules/sistema/pages/GerenciamentoUsuarios.tsx` - implementa interface administrativa de usuarios, funcoes, permissoes e conflitos.
- 🟢 `frontend/src/modules/sistema/pages/ConfiguracaoInstituicao.tsx` - implementa interface de edicao dos dados institucionais.

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Rotas administrativas de usuarios exigem autenticacao e perfil admin antes das rotas internas. | `backend/src/modules/usuarios/routes/adminUsuariosRoutes.ts:15` | 🟢 |
| Seguranca | Rotas de periodos exigem autenticacao e permissao `periodos`; selecao do proprio usuario exige apenas token. | `backend/src/modules/sistema/routes/periodosRoutes.ts` | 🟢 |
| Seguranca | Calendario, eventos, periodos avaliativos e excecoes exigem autenticacao e permissao `calendario`. | `backend/src/modules/sistema/routes/calendarioLetivoRoutes.ts` | 🟢 |
| Seguranca | Rotas de instituicao exigem `authenticateToken`. | `backend/src/modules/sistema/routes/instituicao.ts:13` | 🟢 |
| Seguranca | Notificacoes so sao alteradas quando `id` e `usuario_id` correspondem ao usuario autenticado. | `backend/src/modules/sistema/controllers/notificacoesController.ts:25` | 🟢 |
| Performance | Consulta de notificacoes limita o retorno a 50 registros recentes. | `backend/src/modules/sistema/controllers/notificacoesController.ts:11` | 🟢 |
| Performance | Cache de permissao e invalidado seletivamente por usuario apos alteracoes relevantes. | `backend/src/modules/usuarios/controllers/adminUsuariosController.ts:135` | 🟢 |
| Integridade | Periodos bloqueiam ano duplicado antes de inserir novo registro. | `backend/src/modules/sistema/controllers/periodosController.ts:107` | 🟢 |
| Disponibilidade | Busca de instituicao cria registro padrao quando nao ha instituicao ativa. | `backend/src/modules/sistema/controllers/instituicaoController.ts:55` | 🟢 |

> 🟢 Inferido a partir do codigo e dos artefatos Reversa gerados na escavacao.

## Criterios de Aceitacao

```gherkin
Cenario: Criar usuario administrativo de secretaria educacao
Dado um admin autenticado na tela de gerenciamento de usuarios
Quando ele envia nome, email, senha e tipo_secretaria "educacao"
Entao o backend deve criar o usuario com senha bcrypt e retornar os dados sem senha

Cenario: Bloquear usuario escolar sem escola
Dado um admin autenticado criando ou editando usuario
Quando ele informa tipo_secretaria "escola" sem escola_id
Entao o backend deve rejeitar a operacao com erro de validacao

Cenario: Atualizar usuario e invalidar permissoes
Dado um usuario existente com permissoes em cache
Quando o admin altera funcao, tipo, secretaria ou permissoes diretas desse usuario
Entao o cache de permissoes do usuario deve ser invalidado

Cenario: Impedir autoexclusao
Dado um admin autenticado
Quando ele tenta excluir o usuario com o mesmo id da propria sessao
Entao o backend deve bloquear a exclusao e manter a conta ativa

Cenario: Detectar conflito de permissao
Dado um usuario com permissao efetiva de escrita em pedidos
Quando ele nao possui leitura em fornecedores ou contratos
Entao a verificacao de conflitos deve retornar conflito relacionado a dependencia

Cenario: Criar periodo com ano unico
Dado um usuario autenticado
Quando ele cria um periodo com ano ainda nao existente
Entao o sistema deve persistir o periodo com datas informadas

Cenario: Bloquear ativacao de periodo fechado
Dado um periodo marcado como fechado
Quando o usuario solicita ativacao desse periodo
Entao o backend deve rejeitar a transicao

Cenario: Calcular dias letivos
Dado um calendario letivo com eventos e excecoes cadastrados
Quando o usuario consulta dias letivos por id do calendario
Entao o backend deve retornar calculo considerando regras padrao, eventos e excecoes

Cenario: Criar instituicao padrao
Dado que nao existe instituicao ativa
Quando um usuario autenticado consulta a configuracao institucional
Entao o backend deve criar e retornar a instituicao padrao ativa

Cenario: Restringir notificacao ao dono
Dado uma notificacao pertencente a outro usuario
Quando o usuario autenticado tenta marca-la como lida ou exclui-la pelo id
Entao a operacao nao deve alterar notificacoes de outro usuario
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Administrar usuarios | Must | Define identidade, acesso e vinculo escolar dos usuarios do sistema. | 🟢 |
| Administrar funcoes e permissoes | Must | Alimenta o RBAC usado por multiplos modulos. | 🟢 |
| Invalidar cache de permissoes | Must | Evita autorizacao com permissao obsoleta apos mudancas administrativas. | 🟢 |
| Verificar conflitos de permissoes | Should | Reduz configuracoes inconsistentes, mas nao parece bloquear todas as alteracoes. | 🟢 |
| Gerenciar periodos | Must | Periodos sao referencia operacional para pedidos, guias, cardapios e relatorios. | 🟢 |
| Gerenciar calendario letivo | Should | Necessario para organizacao letiva e protegido por permissao `calendario`. | 🟢 |
| Gerenciar instituicao e templates | Should | Necessario para documentos e identidade institucional. | 🟢 |
| Gerenciar notificacoes | Should | Importante para comunicacao operacional, mas fluxos centrais permanecem disponiveis sem notificacao. | 🟡 |
| Importar feriados nacionais | Could | Funcionalidade auxiliar do calendario. | 🟢 |

> 🟢 Prioridade inferida por frequencia de uso arquitetural, impacto em seguranca e dependencia por outros modulos.

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/usuarios/routes/adminUsuariosRoutes.ts` | Rotas administrativas de usuarios/funcoes/permissoes | 🟢 |
| `backend/src/modules/usuarios/controllers/adminUsuariosController.ts` | `listarUsuarios`, `criarUsuario`, `atualizarUsuario`, `excluirUsuario`, `verificarConflitos` | 🟢 |
| `backend/src/modules/usuarios/models/User.ts` | Modelo `User` com `tipo_secretaria` | 🟢 |
| `backend/src/modules/usuarios/controllers/userController.ts` | Perfil e permissoes do usuario autenticado | 🟢 |
| `backend/src/modules/sistema/routes/periodosRoutes.ts` | Rotas autenticadas e permissionadas de periodos | 🟢 |
| `backend/src/modules/sistema/controllers/periodosController.ts` | CRUD e transicoes de periodos | 🟢 |
| `backend/src/modules/sistema/routes/calendarioLetivoRoutes.ts` | Rotas de calendario, eventos, periodos avaliativos e excecoes | 🟢 |
| `backend/src/modules/sistema/controllers/calendarioLetivoController.ts` | Calendario letivo e calculo de dias letivos | 🟢 |
| `backend/src/modules/sistema/controllers/periodosAvaliativosController.ts` | Periodos avaliativos e excecoes | 🟢 |
| `backend/src/modules/sistema/routes/instituicao.ts` | Rotas autenticadas de instituicao | 🟢 |
| `backend/src/modules/sistema/controllers/instituicaoController.ts` | Instituicao ativa, logo e templates | 🟢 |
| `backend/src/modules/sistema/routes/notificacoesRoutes.ts` | Rotas autenticadas de notificacoes | 🟢 |
| `backend/src/modules/sistema/controllers/notificacoesController.ts` | Listagem, leitura e exclusao de notificacoes | 🟢 |
| `backend/src/modules/sistema/routes/disparosNotificacaoRoutes.ts` | Rotas autenticadas de disparos | 🟢 |
| `backend/src/modules/sistema/controllers/disparosNotificacaoController.ts` | Criacao de disparos e notificacoes por alvo | 🟢 |
| `backend/src/modules/sistema/routes/realtimeRoutes.ts` | Payload realtime com `tipo_secretaria` | 🟢 |
| `frontend/src/modules/sistema/pages/GerenciamentoUsuarios.tsx` | Tela administrativa de usuarios, funcoes, permissoes e conflitos | 🟢 |
| `frontend/src/modules/sistema/pages/ConfiguracaoInstituicao.tsx` | Tela de dados institucionais, logo e templates | 🟢 |
| `_reversa_sdd/flowcharts/usuarios-admin.md` | Fluxo administrativo de usuarios | 🟢 |
| `_reversa_sdd/flowcharts/usuarios-conflitos.md` | Fluxo de conflitos de permissao | 🟢 |
| `_reversa_sdd/flowcharts/sistema-periodos.md` | Fluxo de periodos | 🟢 |
| `_reversa_sdd/flowcharts/sistema-calendario.md` | Fluxo de calendario letivo | 🟢 |
| `_reversa_sdd/flowcharts/sistema-notificacoes.md` | Fluxo de notificacoes e disparos | 🟢 |
| `_reversa_sdd/flowcharts/sistema-instituicao.md` | Fluxo de instituicao | 🟢 |

## Notas de Revisao

- 🟢 [Validacao Humana] O contrato alvo de `/api/disparos-notificacao` e restricao no backend para administrador ou permissao `notificacoes`; autenticacao simples nao e o comportamento desejado.

## Notas de Hardening

- [Implementacao 2026-04-30] `periodosRoutes.ts` passou a exigir `authenticateToken` e permissao `periodos` para leitura/escrita; `POST /periodos/selecionar` permanece apenas autenticado por ser preferencia do usuario.
- [Implementacao 2026-04-30] `calendarioLetivoRoutes.ts` passou a exigir `authenticateToken` e permissao `calendario` para calendario letivo, eventos, periodos avaliativos e excecoes.
- [Implementacao 2026-04-30] `instituicao.ts` mantem `GET /api/instituicao` autenticado para uso em relatorios/PDFs e exige permissao de escrita `configuracoes` para atualizar dados, logo base64 e templates.
