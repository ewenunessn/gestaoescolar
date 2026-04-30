# Escolas e Portal

## Visao Geral

🟢 O componente Escolas e Portal administra o cadastro de escolas, seus alunos por modalidade e o acesso operacional da propria escola ao portal.
🟢 O cadastro de escolas fornece dados estruturais usados por guias, cardapios, entregas, estoque escolar, solicitacoes e relatorios.
🟢 O Portal Escola restringe consultas e acoes ao `escola_id` do usuario autenticado, expondo dashboard, guias, cardapios, comprovantes, solicitacoes e alunos da escola vinculada.

## Responsabilidades

- 🟢 Listar escolas autenticadas com total de alunos e modalidades agregadas.
- 🟢 Buscar detalhe de uma escola por id com dados cadastrais e modalidades.
- 🟢 Criar, editar e remover escolas mediante permissao de escrita no modulo `escolas`.
- 🟢 Manter cache de listagem e detalhe de escolas para reduzir consultas repetidas.
- 🟢 Invalidar cache de escolas apos criacao, edicao, remocao ou mudancas de modalidade.
- 🟢 Vincular escola a modalidade com quantidade de alunos.
- 🟢 Atualizar ou remover vinculo escola-modalidade quando a quantidade muda ou zera.
- 🟢 Registrar historico de criacao, atualizacao e exclusao de quantidade de alunos por modalidade.
- 🟢 Fornecer dashboard do Portal Escola com escola, modalidades, total de alunos e estatisticas de guias.
- 🟢 Listar guias e itens de guia restritos a escola autenticada.
- 🟢 Listar cardapios semanais das modalidades vinculadas a escola autenticada.
- 🟢 Listar comprovantes de entrega e detalhes de comprovante restritos a escola autenticada.
- 🟢 Permitir que a escola consulte/crie/cancele suas proprias solicitacoes de alimentos.

## Interface

### Cadastro de escolas

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/escolas` | HTTP | Sim | Lista escolas com total de alunos e modalidades agregadas. | 🟢 |
| `GET /api/escolas/:id` | HTTP | Sim | Retorna detalhe de escola e dados associados. | 🟢 |
| `POST /api/escolas` | HTTP | Sim | Cria escola quando usuario possui escrita em `escolas`. | 🟢 |
| `PUT /api/escolas/:id` | HTTP | Sim | Edita escola quando usuario possui escrita em `escolas`. | 🟢 |
| `DELETE /api/escolas/:id` | HTTP | Sim | Remove ou desativa escola quando usuario possui escrita em `escolas`. | 🟢 |

### Alunos por modalidade

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `POST /api/escola-modalidades` | HTTP | Sim | Cria, atualiza ou remove quantidade de alunos por escola/modalidade. | 🟢 |
| `escola_id` | number | Sim | Identificador da escola que recebe a modalidade. | 🟢 |
| `modalidade_id` | number | Sim | Identificador da modalidade vinculada. | 🟢 |
| `quantidade` | number | Sim | Quantidade normalizada de alunos; zero remove vinculo existente. | 🟢 |

### Portal Escola

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/escola-portal/dashboard` | HTTP | Sim | Retorna escola, modalidades, total de alunos e estatisticas de guias da escola autenticada. | 🟢 |
| `GET /api/escola-portal/guias` | HTTP | Sim | Lista guias agrupadas por produtos/entregas da escola autenticada. | 🟢 |
| `GET /api/escola-portal/guias/:guiaId/itens` | HTTP | Sim | Lista itens de uma guia apenas se pertencem a escola autenticada. | 🟢 |
| `GET /api/escola-portal/cardapios-semana` | HTTP | Sim | Retorna cardapios da semana para modalidades vinculadas a escola. | 🟢 |
| `GET /api/escola-portal/comprovantes` | HTTP | Sim | Lista comprovantes de entrega da escola com paginacao por `limit` e `offset`. | 🟢 |
| `GET /api/escola-portal/comprovantes/:id` | HTTP | Sim | Retorna detalhe do comprovante apenas se pertence a escola autenticada. | 🟢 |
| `GET /api/solicitacoes-alimentos/minhas` | HTTP | Sim | Lista solicitacoes criadas pela escola autenticada. | 🟢 |
| `POST /api/solicitacoes-alimentos` | HTTP | Sim | Cria solicitacao para a escola autenticada. | 🟢 |
| `DELETE /api/solicitacoes-alimentos/:id` | HTTP | Sim | Cancela solicitacao pendente da escola autenticada. | 🟢 |

### Estruturas principais

```ts
type EscolaModalidadeInput = {
  escola_id: number;
  modalidade_id: number;
  quantidade: number;
};

type PortalEscolaContexto = {
  escola_id: number;
  escola: object;
  modalidades: Array<{ modalidade_id: number; modalidade_nome: string; quantidade_alunos: number }>;
  totalAlunos: number;
};
```

🟢 O Portal Escola usa o `escola_id` presente no usuario autenticado como fonte de escopo para consultas.
🟢 A tela principal do portal exibe cards de cardapio, solicitacoes, comprovantes, estoque e alunos.
🟡 Os formatos finais das respostas agregadas devem ser confirmados no OpenAPI correspondente, pois alguns campos sao montados por SQL bruto.

## Regras de Negocio

- 🟢 Todas as rotas de cadastro de escolas exigem `authenticateToken`.
- 🟢 Criacao, edicao e exclusao de escola exigem `requireEscrita('escolas')`.
- 🟢 Listagem de escolas calcula `total_alunos` por soma das quantidades em `escola_modalidades`.
- 🟢 Listagem de escolas agrega modalidades vinculadas por escola.
- 🟢 Listagem e detalhe de escolas usam cache (`escolas:list:all` e `escolas:{id}`).
- 🟢 Criacao de escola invalida cache da entidade `escolas`.
- 🟢 Edicao e remocao de escola invalidam cache da entidade `escolas` por id.
- 🟢 Salvamento de alunos por modalidade normaliza `escola_id`, `modalidade_id` e `quantidade`.
- 🟢 Salvamento de alunos por modalidade rejeita ids invalidos e quantidade negativa.
- 🟢 Quantidade zero remove vinculo escola-modalidade existente.
- 🟢 Quantidade zero sem vinculo existente retorna sem criar historico de alteracao.
- 🟢 Quantidade igual a existente retorna o vinculo sem registrar novo historico.
- 🟢 Quantidade diferente em vinculo existente atualiza `quantidade_alunos` e registra historico de update.
- 🟢 Quantidade positiva sem vinculo existente cria registro e registra historico de create.
- 🟢 Criacao, atualizacao e exclusao de escola-modalidade invalidam caches relacionados.
- 🟢 Portal Escola exige usuario autenticado com `req.user.escola_id`.
- 🟢 Usuario sem `escola_id` recebe erro de validacao ao acessar endpoints do Portal Escola.
- 🟢 Dashboard do portal busca a escola por `req.user.escola_id` e rejeita quando a escola nao existe.
- 🟢 Guias do portal sao filtradas por `gpe.escola_id = req.user.escola_id`.
- 🟢 Itens de guia do portal sao filtrados por `guiaId` e por `req.user.escola_id`.
- 🟢 Cardapios semanais do portal sao derivados das modalidades vinculadas a escola autenticada.
- 🟢 Comprovantes do portal sao filtrados por `ce.escola_id = req.user.escola_id`.
- 🟢 Detalhe de comprovante exige `id` do comprovante e `escola_id` do usuario.
- 🟢 Solicitacoes do portal exigem usuario com escola associada.
- 🟢 Criacao de solicitacao exige ao menos um item.
- 🟢 Cada item de solicitacao exige produto cadastrado, quantidade positiva e nome de produto.
- 🟢 Cancelamento de solicitacao e permitido apenas para solicitacao pendente da propria escola.
- 🟢 [Revisao Reviewer] O redirecionamento automatico para `/portal-escola` ocorre para usuarios com `escola_id` e nao admin, conforme regra explicita no roteador. Evidencia: `frontend/src/routes/AppRouter.tsx:43-51`.

## Fluxo Principal

### Cadastro de escolas

1. 🟢 Usuario autenticado acessa a tela de escolas.
2. 🟢 Frontend solicita `GET /api/escolas`.
3. 🟢 Backend tenta retornar cache `escolas:list:all`.
4. 🟢 Se nao houver cache, backend consulta escolas, soma alunos e agrega modalidades.
5. 🟢 Backend armazena resposta em cache com TTL de lista.
6. 🟢 Usuario abre detalhe de escola por id.
7. 🟢 Backend tenta retornar cache `escolas:{id}`.
8. 🟢 Se nao houver cache, backend consulta escola e associacoes.

### Escrita de escola

1. 🟢 Usuario com permissao de escrita em `escolas` envia criacao, edicao ou remocao.
2. 🟢 Middleware de permissao valida nivel de escrita.
3. 🟢 Backend persiste a alteracao na tabela de escolas.
4. 🟢 Backend invalida cache de escolas.
5. 🟢 Frontend recarrega lista ou detalhe atualizado.

### Alunos por modalidade

1. 🟢 Usuario informa escola, modalidade e quantidade de alunos.
2. 🟢 Backend normaliza ids e quantidade.
3. 🟢 Backend rejeita ids invalidos ou quantidade negativa.
4. 🟢 Backend abre transacao.
5. 🟢 Backend busca vinculo escola-modalidade existente.
6. 🟢 Se quantidade for zero e existir vinculo, backend remove vinculo e registra historico.
7. 🟢 Se quantidade for positiva e vinculo existir com valor diferente, backend atualiza quantidade e registra historico.
8. 🟢 Se quantidade for positiva e vinculo nao existir, backend cria vinculo e registra historico.
9. 🟢 Backend invalida caches e responde sucesso.

### Portal Escola

1. 🟢 Usuario de escola autentica com JWT.
2. 🟡 Frontend redireciona usuario com `escola_id` e nao admin para `/portal-escola`.
3. 🟢 Portal carrega dashboard em `/api/escola-portal/dashboard`.
4. 🟢 Backend valida existencia de `req.user.escola_id`.
5. 🟢 Backend retorna escola, modalidades, total de alunos e estatisticas de guias.
6. 🟢 Portal exibe cards para cardapio, solicitacoes, comprovantes, estoque e alunos.
7. 🟢 Cada area do portal consulta endpoints filtrados pelo mesmo `escola_id`.

## Fluxos Alternativos

- 🟢 **Cache existente de escolas:** listagem ou detalhe retorna resposta cacheada sem consultar novamente o banco.
- 🟢 **Usuario sem permissao de escrita:** criacao, edicao e exclusao de escola sao bloqueadas pelo middleware de permissao.
- 🟢 **Quantidade negativa por modalidade:** salvamento rejeita a operacao com erro 400.
- 🟢 **Quantidade zero com vinculo existente:** vinculo escola-modalidade e removido e historico de exclusao e registrado.
- 🟢 **Quantidade zero sem vinculo existente:** backend retorna sem inserir registro.
- 🟢 **Quantidade igual a atual:** backend retorna vinculo existente sem registrar historico redundante.
- 🟢 **Usuario sem escola no portal:** endpoint do Portal Escola retorna erro de validacao.
- 🟢 **Comprovante de outra escola:** detalhe nao e retornado porque a consulta exige `id` e `escola_id`.
- 🟢 **Solicitacao nao pendente:** cancelamento e rejeitado quando status nao e `pendente`.

## Cenarios de Borda

- 🟢 **Mudanca de alunos impactando guias/cardapios:** alteracoes em escola-modalidade devem registrar historico e invalidar caches porque quantidades alimentam calculos posteriores.
- 🟢 **Escola removida com usuario ainda vinculado:** Portal Escola deve falhar com `Escola nao encontrada` quando `req.user.escola_id` aponta para escola inexistente.
- 🟢 **Guia existente com itens de multiplas escolas:** itens do portal devem ser filtrados por `guiaId` e `escola_id`, evitando vazamento entre escolas.
- 🟢 **Comprovantes paginados:** listagem de comprovantes deve respeitar `limit` e `offset`, mantendo total separado para paginacao.
- 🟡 **Modalidade sem cardapio semanal:** Portal pode exibir estado vazio de cardapio; o comportamento visual final deve ser validado contra o frontend.
- 🟡 **Usuario escola com permissao administrativa adicional:** redirecionamento e escopo devem priorizar a regra de `escola_id` apenas quando o usuario nao e admin.

## Dependencias

- 🟢 `middleware/authMiddleware` - autentica rotas de escolas, portal escola e solicitacoes.
- 🟢 `middleware/permissionMiddleware` - exige escrita no modulo `escolas` para alteracoes de cadastro.
- 🟢 `utils/cacheService` - armazena e invalida cache de listagem/detalhe de escolas.
- 🟢 `backend/src/modules/escolas/controllers/escolaController.ts` - implementa listagem, detalhe e escrita de escolas.
- 🟢 `backend/src/modules/guias/controllers/escolaModalidadeController.ts` - implementa salvamento de alunos por modalidade.
- 🟢 `backend/src/modules/guias/services/escolaModalidadeHistoricoService.ts` - registra historico de mudancas de escola-modalidade.
- 🟢 `backend/src/modules/escolas/controllers/escolaPortalController.ts` - implementa dashboard, guias, cardapios e comprovantes do portal.
- 🟢 `backend/src/modules/solicitacoes/controllers/solicitacoesAlimentosController.ts` - implementa solicitacoes de alimentos da escola.
- 🟢 `frontend/src/modules/escolas/pages/Escolas.tsx` - tela de listagem de escolas.
- 🟢 `frontend/src/modules/escolas/pages/EscolaDetalhes.tsx` - tela de detalhe da escola e modalidades.
- 🟢 `frontend/src/modules/portal-escola/pages/PortalEscolaHome.tsx` - home do portal separado.
- 🟢 `frontend/src/modules/portal-escola/pages/CardapioPage.tsx` - cardapio semanal do portal.
- 🟢 `frontend/src/modules/portal-escola/pages/SolicitacoesPage.tsx` - solicitacoes do portal.
- 🟢 `frontend/src/modules/portal-escola/pages/ComprovantesPage.tsx` - comprovantes do portal.
- 🟢 `frontend/src/modules/portal-escola/pages/AlunosPage.tsx` - alunos e modalidades no portal.

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Rotas de escolas exigem autenticacao antes de qualquer rota interna. | `backend/src/modules/escolas/routes/escolaRoutes.ts:8` | 🟢 |
| Seguranca | Criar, editar e remover escola exige escrita no modulo `escolas`. | `backend/src/modules/escolas/routes/escolaRoutes.ts:27` | 🟢 |
| Seguranca | Rotas do Portal Escola exigem autenticacao. | `backend/src/modules/escolas/routes/escolaPortalRoutes.ts:8` | 🟢 |
| Seguranca | Portal Escola rejeita usuario sem `escola_id`. | `backend/src/modules/escolas/controllers/escolaPortalController.ts:8` | 🟢 |
| Seguranca | Detalhe de comprovante do portal filtra por `id` e `escola_id`. | `backend/src/modules/escolas/controllers/escolaPortalController.ts:242` | 🟢 |
| Performance | Listagem de escolas usa cache `escolas:list:all`. | `backend/src/modules/escolas/controllers/escolaController.ts:16` | 🟢 |
| Performance | Detalhe de escola usa cache por id `escolas:{id}`. | `backend/src/modules/escolas/controllers/escolaController.ts:65` | 🟢 |
| Integridade | Alteracoes de escola invalidam cache da entidade escolas. | `backend/src/modules/escolas/controllers/escolaController.ts:139` | 🟢 |
| Integridade | Solicitacao de alimentos exige quantidade positiva. | `backend/src/modules/solicitacoes/controllers/solicitacoesAlimentosController.ts:85` | 🟢 |
| Integridade | Cancelamento de solicitacao exige status `pendente`. | `backend/src/modules/solicitacoes/controllers/solicitacoesAlimentosController.ts:248` | 🟢 |

> 🟢 Inferido a partir do codigo e dos fluxos Reversa de escolas e portal escola.

## Criterios de Aceitacao

```gherkin
Cenario: Listar escolas com alunos agregados
Dado um usuario autenticado
Quando ele consulta a lista de escolas
Entao o backend deve retornar escolas com total de alunos e modalidades agregadas

Cenario: Criar escola com permissao de escrita
Dado um usuario autenticado com escrita no modulo escolas
Quando ele envia dados validos para criar escola
Entao a escola deve ser persistida e o cache de escolas deve ser invalidado

Cenario: Bloquear escrita de escola sem permissao
Dado um usuario autenticado sem escrita no modulo escolas
Quando ele tenta criar, editar ou remover escola
Entao a operacao deve ser bloqueada pelo middleware de permissao

Cenario: Atualizar quantidade de alunos por modalidade
Dado uma escola e uma modalidade validas com vinculo existente
Quando o usuario envia uma quantidade positiva diferente da atual
Entao o vinculo deve ser atualizado, o historico deve registrar update e os caches devem ser invalidados

Cenario: Remover modalidade ao zerar quantidade
Dado uma escola com modalidade vinculada
Quando o usuario salva quantidade zero
Entao o vinculo deve ser removido e o historico deve registrar delete

Cenario: Acessar portal com escola vinculada
Dado um usuario autenticado com escola_id
Quando ele consulta o dashboard do Portal Escola
Entao o backend deve retornar apenas dados da escola vinculada ao usuario

Cenario: Bloquear portal sem escola vinculada
Dado um usuario autenticado sem escola_id
Quando ele consulta qualquer endpoint do Portal Escola
Entao o backend deve retornar erro de validacao informando que o usuario nao esta associado a uma escola

Cenario: Consultar comprovante de entrega da escola
Dado um usuario escola autenticado
Quando ele consulta um comprovante pelo id
Entao o backend deve retornar o comprovante somente se ele pertence ao mesmo escola_id do usuario

Cenario: Criar solicitacao de alimentos
Dado um usuario escola autenticado
Quando ele envia uma solicitacao com ao menos um item valido
Entao a solicitacao deve ser criada para a escola vinculada ao usuario

Cenario: Cancelar solicitacao pendente
Dado uma solicitacao pendente da escola autenticada
Quando o usuario solicita cancelamento
Entao a solicitacao deve ser cancelada apenas se ainda estiver pendente
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Cadastro de escolas | Must | Escolas sao entidade central para guias, entregas, solicitacoes, cardapios e estoque escolar. | 🟢 |
| Alunos por modalidade | Must | Quantidades por modalidade alimentam calculos de abastecimento e cardapios. | 🟢 |
| Restricao do portal por `escola_id` | Must | Garante isolamento de dados entre escolas. | 🟢 |
| Historico de escola-modalidade | Should | Necessario para auditoria e reconstrucao de mudancas de alunos. | 🟢 |
| Cache de escolas | Should | Melhora desempenho de leituras frequentes, mas possui fallback para banco. | 🟢 |
| Cardapio semanal do portal | Should | Funcionalidade esperada para usuario escola. | 🟢 |
| Comprovantes do portal | Should | Funcionalidade operacional importante para conferencias de entrega. | 🟢 |
| Solicitacoes do portal | Should | Fluxo de reposicao/emergencia usado pela escola. | 🟢 |
| Debug token do portal | Could | Endpoint auxiliar de diagnostico, nao e fluxo de negocio. | 🟢 |

> 🟢 Prioridade inferida por dependencia entre modulos e criticidade de isolamento por escola.

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/escolas/routes/escolaRoutes.ts` | Rotas autenticadas de escolas | 🟢 |
| `backend/src/modules/escolas/controllers/escolaController.ts` | Listagem, detalhe, criacao, edicao e remocao de escolas | 🟢 |
| `backend/src/modules/escolas/models/Escola.ts` | Modelo legado/auxiliar de escolas e modalidades | 🟢 |
| `backend/src/modules/guias/routes/escolaModalidadeRoutes.ts` | Rotas de escola-modalidade | 🟢 |
| `backend/src/modules/guias/controllers/escolaModalidadeController.ts` | Salvamento de alunos por modalidade | 🟢 |
| `backend/src/modules/guias/services/escolaModalidadeHistoricoService.ts` | Historico de mudancas em escola-modalidade | 🟢 |
| `backend/src/modules/escolas/routes/escolaPortalRoutes.ts` | Rotas do Portal Escola | 🟢 |
| `backend/src/modules/escolas/controllers/escolaPortalController.ts` | Dashboard, guias, cardapios e comprovantes do portal | 🟢 |
| `backend/src/modules/solicitacoes/routes/solicitacoesAlimentosRoutes.ts` | Rotas de solicitacoes da escola e gestao | 🟢 |
| `backend/src/modules/solicitacoes/controllers/solicitacoesAlimentosController.ts` | Minhas solicitacoes, criar e cancelar solicitacao | 🟢 |
| `frontend/src/modules/escolas/pages/Escolas.tsx` | Lista administrativa de escolas | 🟢 |
| `frontend/src/modules/escolas/pages/EscolaDetalhes.tsx` | Detalhe administrativo de escola | 🟢 |
| `frontend/src/modules/escolas/pages/GerenciarAlunosModalidades.tsx` | Gestao de alunos por modalidade | 🟢 |
| `frontend/src/modules/portal-escola/pages/PortalEscolaHome.tsx` | Home do portal escola | 🟢 |
| `frontend/src/modules/portal-escola/pages/CardapioPage.tsx` | Cardapio semanal do portal | 🟢 |
| `frontend/src/modules/portal-escola/pages/SolicitacoesPage.tsx` | Solicitacoes do portal | 🟢 |
| `frontend/src/modules/portal-escola/pages/ComprovantesPage.tsx` | Comprovantes do portal | 🟢 |
| `frontend/src/modules/portal-escola/pages/AlunosPage.tsx` | Alunos e modalidades do portal | 🟢 |
| `_reversa_sdd/flowcharts/escolas.md` | Fluxo macro de escolas e portal | 🟢 |
| `_reversa_sdd/flowcharts/escolas-escolaModalidade.md` | Fluxo de salvar alunos por modalidade | 🟢 |
| `_reversa_sdd/flowcharts/escolas-portal.md` | Fluxo backend do Portal Escola | 🟢 |
| `_reversa_sdd/flowcharts/portal-escola.md` | Fluxo frontend do Portal Escola | 🟢 |

## Notas de Revisao

- [Implementacao 2026-04-30] `solicitacoesAlimentosRoutes.ts` mantem `/minhas`, criacao e cancelamento do Portal Escola apenas autenticados e filtrados por `escola_id`; a gestao administrativa usa RBAC do modulo `solicitacoes`.

- [Implementacao 2026-04-30] As rotas `/portal-escola/*` usam `portal_escola` via `frontend/src/routes/permissionSlugs.ts`, removendo a dependencia de `dashboard` no guard frontend.

- 🟢 [Validacao Humana] O contrato alvo do Portal Escola deve usar um slug dedicado de permissao; o uso atual de `dashboard` no frontend nao e o desenho desejado.
