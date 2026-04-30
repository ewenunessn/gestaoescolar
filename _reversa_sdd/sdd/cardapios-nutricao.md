# Cardapios e Nutricao

## Visao Geral

🟢 O componente Cardapios e Nutricao gerencia cardapios por modalidade/competencia, preparacoes/refeicoes, fichas tecnicas, nutricionistas, tipos de refeicao, grupos de ingredientes, TACO e calculos de custo/nutricao.
🟢 Ele conecta modalidades, alunos vigentes, produtos, contratos ativos, per capita, fator de correcao e rendimento para gerar custo por aluno, custo total e indicadores nutricionais.
🟢 O componente tambem fornece cardapios e fichas tecnicas para o Portal Escola e para visualizacoes publicas/autenticadas.

## Responsabilidades

- 🟢 Listar, buscar, criar, editar e remover cardapios por modalidade.
- 🟢 Associar refeicoes a dias de um cardapio e remover associacoes do calendario.
- 🟢 Calcular custo de cardapio por modalidade, refeicao, aluno e tipo de fornecedor.
- 🟢 Listar, buscar, criar, editar, remover, ativar/desativar e duplicar preparacoes/refeicoes.
- 🟢 Manter produtos/ingredientes vinculados a uma refeicao com per capita e tipo de medida.
- 🟢 Expor ficha tecnica de refeicao por rota publica sem autenticacao.
- 🟢 Calcular valores nutricionais de refeicao a partir da composicao dos ingredientes.
- 🟢 Calcular custo de refeicao com base no contrato ativo mais recente por produto.
- 🟢 Aplicar calculos automaticos de nutricao e custo na propria refeicao.
- 🟢 Ajustar per capita por modalidade para produto de refeicao.
- 🟢 Gerenciar nutricionistas com permissoes de leitura/escrita.
- 🟢 Gerenciar grupos de ingredientes e substituir itens de um grupo em lote.
- 🟢 Buscar alimentos TACO por termo para apoiar composicao nutricional.
- 🟢 Gerenciar modalidades e categorias financeiras associadas.

## Interface

### Cardapios

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/cardapios` | HTTP | Sim | Lista cardapios por modalidade com permissao de leitura em `cardapios`. | 🟢 |
| `GET /api/cardapios/:id` | HTTP | Sim | Busca um cardapio por id. | 🟢 |
| `POST /api/cardapios` | HTTP | Sim | Cria cardapio por competencia/modalidades com permissao de escrita. | 🟢 |
| `PUT /api/cardapios/:id` | HTTP | Sim | Edita cardapio existente. | 🟢 |
| `DELETE /api/cardapios/:id` | HTTP | Sim | Remove cardapio existente. | 🟢 |
| `GET /api/cardapios/:cardapioId/refeicoes` | HTTP | Sim | Lista refeicoes associadas ao cardapio. | 🟢 |
| `POST /api/cardapios/:cardapioId/refeicoes` | HTTP | Sim | Adiciona refeicao em dia do cardapio. | 🟢 |
| `DELETE /api/cardapios/refeicoes/:id` | HTTP | Sim | Remove refeicao de um dia do cardapio. | 🟢 |
| `GET /api/cardapios/:cardapioId/custo` | HTTP | Sim | Calcula custo total e detalhado do cardapio. | 🟢 |

### Refeicoes e ficha tecnica

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/refeicoes/:id/ficha-tecnica` | HTTP publico | Sim | Retorna ficha tecnica de uma refeicao sem autenticacao. | 🟢 |
| `GET /api/refeicoes` | HTTP | Sim | Lista refeicoes com permissao de leitura em `refeicoes`. | 🟢 |
| `GET /api/refeicoes/:id` | HTTP | Sim | Busca refeicao por id. | 🟢 |
| `POST /api/refeicoes` | HTTP | Sim | Cria refeicao/preparacao. | 🟢 |
| `POST /api/refeicoes/:id/duplicar` | HTTP | Sim | Duplica refeicao e seus produtos/ajustes. | 🟢 |
| `PUT /api/refeicoes/:id` | HTTP | Sim | Edita dados da refeicao. | 🟢 |
| `DELETE /api/refeicoes/:id` | HTTP | Sim | Remove refeicao. | 🟢 |
| `PATCH /api/refeicoes/:id/toggle` | HTTP | Sim | Alterna status ativo da refeicao. | 🟢 |
| `GET /api/refeicoes/:refeicaoId/produtos` | HTTP | Sim | Lista produtos da refeicao. | 🟢 |
| `POST /api/refeicoes/:refeicaoId/produtos` | HTTP | Sim | Adiciona produto com per capita e tipo de medida. | 🟢 |
| `PUT /api/refeicoes/produtos/:id` | HTTP | Sim | Edita per capita/tipo de medida de produto da refeicao. | 🟢 |
| `DELETE /api/refeicoes/produtos/:id` | HTTP | Sim | Remove produto da refeicao. | 🟢 |

### Nutricao e ajustes

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `POST /api/refeicoes/:id/calcular-nutricional` | HTTP | Sim | Calcula nutrientes da refeicao por rendimento e modalidade opcional. | 🟢 |
| `POST /api/refeicoes/:id/calcular-custo` | HTTP | Sim | Calcula custo da refeicao usando contratos ativos. | 🟢 |
| `POST /api/refeicoes/:id/aplicar-calculos` | HTTP | Sim | Executa calculos e persiste resultados na refeicao. | 🟢 |
| `GET /api/refeicoes/:id/ingredientes-detalhados` | HTTP publico | Sim | Retorna ingredientes detalhados com per capita liquido/bruto. | 🟢 |
| `GET /api/refeicao-produto/:refeicaoProdutoId/ajustes` | HTTP | Sim | Lista ajustes por modalidade de um produto da refeicao. | 🟢 |
| `POST /api/refeicao-produto/:refeicaoProdutoId/ajustes` | HTTP | Sim | Substitui ajustes de per capita por modalidade em lote. | 🟢 |
| `GET /api/refeicao-produto/:refeicaoProdutoId/modalidade/:modalidadeId` | HTTP | Sim | Retorna per capita efetivo para modalidade. | 🟢 |
| `GET /api/refeicao/:refeicaoId/produtos-modalidades` | HTTP | Sim | Lista produtos da refeicao com ajustes de modalidades. | 🟢 |
| `DELETE /api/ajuste/:id` | HTTP | Sim | Remove ajuste especifico de per capita. | 🟢 |

### Cadastros nutricionais auxiliares

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET/POST/PUT/DELETE /api/nutricionistas` | HTTP | Sim | CRUD de nutricionistas com permissao por modulo. | 🟢 |
| `GET/POST/PUT/DELETE /api/grupos-ingredientes` | HTTP | Sim | CRUD de grupos de ingredientes autenticado. | 🟢 |
| `PUT /api/grupos-ingredientes/:id/itens` | HTTP | Sim | Substitui itens do grupo em transacao. | 🟢 |
| `GET /api/taco/buscar?q=termo` | HTTP | Sim | Busca alimentos TACO por nome. | 🟢 |
| `GET /api/modalidades` | HTTP publico | Sim | Lista modalidades sem autenticar no router. | 🟢 |
| `POST/PUT/DELETE/PATCH /api/modalidades` | HTTP | Sim | Escrita e ativacao/desativacao de modalidade exigem autenticacao. | 🟢 |

### Estruturas principais

```ts
type CalculoCustoCardapio = {
  cardapioId: number;
  custo_total: number;
  por_modalidade: Array<{
    modalidade_id: number;
    total_alunos_modalidade: number;
    custo_total_modalidade: number;
  }>;
};

type AjustePerCapitaModalidade = {
  modalidade_id: number;
  per_capita_ajustado: number;
  observacao?: string;
};
```

🟢 `per_capita` representa alimento pronto/liquido usado no calculo nutricional.
🟢 `per_capita_bruto` e calculado multiplicando `per_capita` pelo `fator_correcao`.
🟢 Quando existe ajuste por modalidade, o sistema usa `COALESCE(per_capita_ajustado, per_capita_padrao)`.
🟡 A nomenclatura frontend alterna entre `preparacoes` e `refeicoes`; no backend o nucleo de API usa `refeicoes`.

## Regras de Negocio

- 🟢 Todas as rotas de cardapios exigem autenticacao.
- 🟢 Leitura de cardapios exige `requireLeitura('cardapios')`.
- 🟢 Escrita de cardapios exige `requireEscrita('cardapios')`.
- 🟢 Calculo de custo de cardapio exige leitura em `cardapios`.
- 🟢 Ficha tecnica de refeicao e publica e nao passa pelo middleware de autenticacao.
- 🟢 Demais rotas de refeicoes exigem autenticacao.
- 🟢 Leitura de refeicoes exige `requireLeitura('refeicoes')`.
- 🟢 Escrita de refeicoes e produtos da refeicao exige `requireEscrita('refeicoes')`.
- 🟢 Adicao de produto em refeicao exige `produto_id` e `per_capita` ou `per_capita_por_modalidade`.
- 🟢 `per_capita` negativo ou acima do limite por tipo de medida e rejeitado.
- 🟢 Duplicacao de refeicao exige novo nome.
- 🟢 Duplicacao de refeicao executa transacao com `BEGIN`, `COMMIT` e `ROLLBACK` em erro.
- 🟢 Duplicacao copia dados da refeicao original, produtos da refeicao e ajustes por modalidade.
- 🟢 Calculo de custo de cardapio retorna custo zero quando nao ha modalidades associadas.
- 🟢 Calculo de custo de cardapio usa data de referencia no primeiro dia do mes/ano do cardapio.
- 🟢 Calculo de custo de cardapio busca alunos vigentes por modalidade.
- 🟢 Calculo de custo de cardapio agrupa por `refeicao_dia_id` e `modalidade_id`.
- 🟢 Para gramas e mililitros, custo por ingrediente considera proporcao entre per capita bruto e peso da embalagem.
- 🟢 Para outras medidas, custo por ingrediente usa per capita bruto multiplicado pelo preco unitario.
- 🟢 Calculo de custo agrega custo total, custo por modalidade e custo por tipo de fornecedor.
- 🟢 Calculo nutricional usa per capita ajustado por modalidade quando `modalidade_id` e informado e ha ajuste.
- 🟢 Calculo nutricional converte miligramas para gramas antes de somar nutrientes.
- 🟢 Calculo nutricional soma nutrientes por proporcao de 100g e divide por `rendimento_porcoes`.
- 🟢 Calculo de custo de refeicao busca contrato ativo mais recente por produto.
- 🟢 Ingredientes sem contrato ativo entram em alertas de custo.
- 🟢 Ajustes de per capita por modalidade sao salvos em lote por transacao.
- 🟢 Salvamento de ajustes em lote remove ajustes antigos antes de inserir novos.
- 🟢 Grupos de ingredientes carregam itens com `produto_nome` e `fator_correcao`.
- 🟢 Atualizacao de itens de grupo substitui todos os itens enviados em transacao.
- 🟢 Busca TACO com termo menor que 2 caracteres retorna lista vazia.
- 🟢 Busca TACO usa `LOWER(nome) LIKE termo` com limite de 20 resultados.
- 🟢 Rotas de nutricionistas exigem autenticacao e permissoes por modulo `nutricionistas`.
- 🟢 Listagem e busca de modalidades sao expostas sem `authenticateToken` no router.
- 🟢 Escrita, desativacao e reativacao de modalidade exigem autenticacao.
- 🟡 A leitura publica de modalidades e ficha tecnica deve ser validada como decisao intencional de produto/seguranca.

## Fluxo Principal

### Cardapio por modalidade

1. 🟢 Usuario autenticado acessa a tela de cardapios.
2. 🟢 Frontend carrega cardapios, modalidades e nutricionistas.
3. 🟢 Usuario cria ou edita cardapio informando modalidades, nome, mes, ano e dados opcionais de nutricionista.
4. 🟢 Backend valida autenticacao e permissao de escrita em `cardapios`.
5. 🟢 Backend persiste o cardapio e suas associacoes.
6. 🟢 Usuario abre o calendario do cardapio.
7. 🟢 Frontend lista refeicoes do cardapio e permite adicionar/remover refeicao por dia.

### Calculo de custo do cardapio

1. 🟢 Usuario solicita custo do cardapio em `/api/cardapios/:cardapioId/custo`.
2. 🟢 Backend busca cardapio e modalidades associadas.
3. 🟢 Se o cardapio nao existir, backend retorna HTTP 404.
4. 🟢 Se nao houver modalidades, backend retorna custo total zero.
5. 🟢 Backend define data de referencia como primeiro dia do mes/ano do cardapio.
6. 🟢 Backend busca alunos vigentes por modalidade.
7. 🟢 Backend busca refeicoes, produtos, precos, per capita e fator de correcao.
8. 🟢 Backend calcula per capita bruto e custo por ingrediente.
9. 🟢 Backend multiplica custo por aluno pela quantidade de alunos da modalidade.
10. 🟢 Backend retorna totais e detalhamentos.

### Preparacao/refeicao e ficha tecnica

1. 🟢 Usuario com permissao lista preparacoes/refeicoes.
2. 🟢 Usuario cria ou edita dados da refeicao, incluindo rendimento e campos tecnicos.
3. 🟢 Usuario adiciona produtos com per capita e tipo de medida.
4. 🟢 Usuario pode ajustar per capita por modalidade.
5. 🟢 Usuario calcula nutrientes ou custo.
6. 🟢 Sistema usa composicao, fator de correcao, contratos e rendimento para retornar resultados.
7. 🟢 Usuario ou visualizacao publica consulta ficha tecnica.

### Duplicacao de refeicao

1. 🟢 Usuario informa nome da nova refeicao.
2. 🟢 Backend abre transacao.
3. 🟢 Backend busca refeicao original.
4. 🟢 Se a original nao existe, backend executa rollback e retorna HTTP 404.
5. 🟢 Backend insere nova refeicao ativa com dados copiados.
6. 🟢 Backend copia produtos da refeicao.
7. 🟢 Backend localiza produtos copiados correspondentes.
8. 🟢 Backend copia ajustes por modalidade.
9. 🟢 Backend confirma transacao e retorna nova refeicao.

### Grupos e TACO

1. 🟢 Usuario autenticado lista grupos de ingredientes.
2. 🟢 Backend retorna grupos e itens com produto e fator de correcao.
3. 🟢 Usuario substitui itens de um grupo.
4. 🟢 Backend remove itens antigos e insere itens enviados.
5. 🟢 Usuario busca alimento TACO por termo.
6. 🟢 Backend retorna ate 20 alimentos quando o termo possui pelo menos 2 caracteres.

## Fluxos Alternativos

- 🟢 **Cardapio inexistente no custo:** backend retorna HTTP 404.
- 🟢 **Cardapio sem modalidades:** backend retorna custo total zero sem percorrer refeicoes.
- 🟢 **Ficha tecnica publica:** requisicao de ficha tecnica nao exige token.
- 🟢 **Per capita por modalidade ausente:** calculo usa per capita padrao da associacao.
- 🟢 **Produto sem contrato ativo:** calculo de custo gera alerta de ingrediente sem contrato.
- 🟢 **Rendimento ausente ou invalido:** calculo usa no minimo 1 porcao.
- 🟢 **Nome ausente na duplicacao:** backend retorna erro HTTP 400.
- 🟢 **Refeicao original inexistente na duplicacao:** transacao sofre rollback e retorna HTTP 404.
- 🟢 **Busca TACO curta:** termo com menos de 2 caracteres retorna lista vazia.
- 🟢 **Escrita de modalidade sem token:** operacao e bloqueada por `authenticateToken`.

## Cenarios de Borda

- 🟢 **Unidades diferentes de gramas/mililitros:** custo usa regra distinta para medidas por unidade, evitando dividir por peso da embalagem indevidamente.
- 🟢 **Ajuste por modalidade parcial:** modalidades sem ajuste continuam usando per capita padrao via `COALESCE`.
- 🟢 **Duplicacao com muitos ingredientes:** produtos e ajustes devem permanecer consistentes porque a copia ocorre dentro de transacao.
- 🟢 **Contrato ausente para ingrediente:** calculo nao deve falhar completamente; deve retornar alerta de custo.
- 🟢 **Modalidade sem alunos vigentes:** custo total da refeicao/modalidade deve refletir zero ou ausencia de alunos na agregacao.
- 🟡 **Leituras publicas de modalidade/ficha tecnica:** exposicao publica deve ser revisada se fichas tecnicas ou modalidades forem consideradas sensiveis.

## Dependencias

- 🟢 `middleware/authMiddleware` - autentica rotas protegidas de cardapios, refeicoes, nutricao, grupos, TACO e modalidades.
- 🟢 `middleware/permissionMiddleware` - aplica leitura/escrita em `cardapios`, `refeicoes` e `nutricionistas`.
- 🟢 `backend/src/modules/cardapios/controllers/cardapioController.ts` - implementa cardapios, calendario e custo de cardapio.
- 🟢 `backend/src/modules/cardapios/controllers/refeicaoController.ts` - implementa refeicoes, ficha tecnica e duplicacao.
- 🟢 `backend/src/modules/cardapios/controllers/refeicaoProdutoController.ts` - implementa ingredientes/produtos da refeicao.
- 🟢 `backend/src/modules/cardapios/controllers/modalidadeController.ts` - implementa modalidades e categorias financeiras.
- 🟢 `backend/src/modules/nutricao/controllers/refeicaoCalculosController.ts` - implementa calculos nutricionais e de custo.
- 🟢 `backend/src/modules/nutricao/controllers/refeicaoProdutoModalidadeController.ts` - implementa ajustes por modalidade.
- 🟢 `backend/src/modules/nutricao/controllers/refeicaoIngredientesController.ts` - implementa ingredientes detalhados.
- 🟢 `backend/src/modules/nutricao/controllers/gruposIngredientesController.ts` - implementa grupos de ingredientes.
- 🟢 `backend/src/modules/nutricao/controllers/tacoController.ts` - implementa busca TACO.
- 🟢 `backend/src/modules/nutricao/controllers/nutricionistaController.ts` - implementa nutricionistas.
- 🟢 `frontend/src/modules/cardapios/pages/CardapiosModalidade.tsx` - tela de cardapios.
- 🟢 `frontend/src/modules/cardapios/pages/CardapioCalendario.tsx` - calendario de cardapio.
- 🟢 `frontend/src/modules/nutricao/pages/Refeicoes.tsx` - lista de preparacoes/refeicoes.
- 🟢 `frontend/src/modules/nutricao/pages/PreparacaoDetalhe.tsx` - ficha tecnica, ingredientes, calculos e ajustes.
- 🟢 `frontend/src/modules/nutricao/pages/GruposIngredientes.tsx` - grupos de ingredientes.
- 🟢 `frontend/src/modules/nutricao/pages/Nutricionistas.tsx` - nutricionistas.

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Todas as rotas de cardapio exigem `authenticateToken`. | `backend/src/modules/cardapios/routes/cardapioRoutes.ts:17` | 🟢 |
| Seguranca | Leitura/escrita de cardapio usam permissoes `cardapios`. | `backend/src/modules/cardapios/routes/cardapioRoutes.ts:20` | 🟢 |
| Seguranca | Ficha tecnica de refeicao e publica antes do middleware de autenticacao. | `backend/src/modules/cardapios/routes/refeicaoRoutes.ts:22` | 🟢 |
| Seguranca | Rotas de calculos de refeicao exigem autenticacao. | `backend/src/modules/nutricao/routes/refeicaoCalculosRoutes.ts:13` | 🟢 |
| Seguranca | Rotas de ajustes por modalidade exigem autenticacao no router inteiro. | `backend/src/modules/nutricao/routes/refeicaoProdutoModalidadeRoutes.ts:7` | 🟢 |
| Seguranca | Rotas de nutricionistas exigem autenticacao e permissoes de modulo. | `backend/src/modules/nutricao/routes/nutricionistaRoutes.ts:13` | 🟢 |
| Performance | Busca TACO limita resultados a 20 registros. | `backend/src/modules/nutricao/controllers/tacoController.ts:24` | 🟢 |
| Integridade | Duplicacao de refeicao usa transacao com rollback em erro. | `backend/src/modules/cardapios/controllers/refeicaoController.ts:334` | 🟢 |
| Integridade | Ajustes por modalidade sao salvos em transacao. | `backend/src/modules/nutricao/controllers/refeicaoProdutoModalidadeController.ts:41` | 🟢 |
| Integridade | Per capita fora do limite e rejeitado ao adicionar/editar produto da refeicao. | `backend/src/modules/cardapios/controllers/refeicaoProdutoController.ts:36` | 🟢 |

> 🟢 Inferido a partir do codigo e dos fluxos Reversa de cardapios e nutricao.

## Criterios de Aceitacao

```gherkin
Cenario: Criar cardapio por modalidade
Dado um usuario autenticado com escrita em cardapios
Quando ele envia nome, mes, ano e ao menos uma modalidade
Entao o cardapio deve ser criado e ficar disponivel para montagem do calendario

Cenario: Bloquear escrita de cardapio sem permissao
Dado um usuario autenticado sem escrita em cardapios
Quando ele tenta criar, editar ou remover cardapio
Entao a operacao deve ser bloqueada pelo middleware de permissao

Cenario: Calcular custo de cardapio com modalidades
Dado um cardapio existente com modalidades, refeicoes e produtos com contratos ativos
Quando o usuario consulta o custo do cardapio
Entao o sistema deve retornar custo total, por modalidade, por refeicao e por tipo de fornecedor

Cenario: Retornar custo zero para cardapio sem modalidades
Dado um cardapio existente sem modalidades associadas
Quando o usuario consulta o custo
Entao o sistema deve retornar custo_total igual a 0

Cenario: Duplicar refeicao com ingredientes
Dado uma refeicao existente com produtos e ajustes por modalidade
Quando o usuario informa um novo nome e solicita duplicacao
Entao o sistema deve criar uma nova refeicao ativa copiando produtos e ajustes em transacao

Cenario: Rejeitar duplicacao sem nome
Dado uma refeicao existente
Quando o usuario solicita duplicacao sem nome novo
Entao o backend deve retornar erro de validacao HTTP 400

Cenario: Calcular nutricao por modalidade
Dado uma refeicao com ingredientes e ajuste de per capita para uma modalidade
Quando o usuario calcula valores nutricionais informando modalidade_id e rendimento
Entao o sistema deve usar per_capita_ajustado quando existir e dividir os nutrientes por rendimento_porcoes

Cenario: Alertar ingrediente sem contrato
Dado uma refeicao com ingrediente sem contrato ativo
Quando o usuario calcula custo da refeicao
Entao o resultado deve incluir alerta de ingrediente sem contrato ativo

Cenario: Salvar ajustes por modalidade
Dado um produto de refeicao com ajustes existentes
Quando o usuario envia uma nova lista de ajustes
Entao o backend deve apagar ajustes antigos, inserir os novos e confirmar a transacao

Cenario: Buscar TACO com termo curto
Dado um usuario autenticado
Quando ele busca TACO com termo menor que dois caracteres
Entao o backend deve retornar lista vazia
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Cardapios por modalidade/competencia | Must | Base para planejamento alimentar e Portal Escola. | 🟢 |
| Refeicoes/preparacoes e ingredientes | Must | Fonte de per capita, ficha tecnica, custo e nutricao. | 🟢 |
| Calculo de custo de cardapio | Must | Necessario para conformidade de custos, contratos e PNAE. | 🟢 |
| Ajuste por modalidade | Must | Necessario para per capita diferente por publico atendido. | 🟢 |
| Calculo nutricional | Should | Importante para analise nutricional, mas cardapio pode existir antes do calculo. | 🟢 |
| Nutricionistas | Should | Apoia aprovacao e responsabilidade tecnica dos cardapios. | 🟢 |
| Grupos de ingredientes | Should | Acelera montagem de preparacoes, mas nao e obrigatorio para cadastrar ingrediente individual. | 🟢 |
| Busca TACO | Should | Apoia composicao nutricional, mas depende de dados cadastrados. | 🟢 |
| Ficha tecnica publica | Could | Facilita consulta/geracao de PDF, mas possui implicacao de exposicao publica. | 🟡 |

> 🟢 Prioridade inferida por dependencia de abastecimento, guias, portal escola e calculos operacionais.

## Notas de Hardening

- [Implementacao 2026-04-30] `gruposIngredientesRoutes.ts` exige `refeicoes` leitura para listar grupos e `refeicoes` escrita para criar, editar, excluir e salvar itens.
- [Implementacao 2026-04-30] `refeicaoCalculosRoutes.ts` exige `refeicoes` leitura para pre-calculos/ingredientes detalhados e `refeicoes` escrita para aplicar calculos automaticos.
- [Implementacao 2026-04-30] `GET /api/refeicoes/:id/ingredientes-detalhados` deixou de ser leitura publica e agora exige JWT + RBAC de `refeicoes`.

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/cardapios/routes/cardapioRoutes.ts` | Rotas de cardapios e custo | 🟢 |
| `backend/src/modules/cardapios/controllers/cardapioController.ts` | CRUD cardapio, refeicoes do cardapio e `calcularCustoCardapio` | 🟢 |
| `backend/src/modules/cardapios/routes/refeicaoRoutes.ts` | Rotas de refeicoes e ficha tecnica publica | 🟢 |
| `backend/src/modules/cardapios/controllers/refeicaoController.ts` | CRUD refeicoes, `duplicarRefeicao`, `buscarFichaTecnica` | 🟢 |
| `backend/src/modules/cardapios/controllers/refeicaoProdutoController.ts` | Produtos/ingredientes da refeicao | 🟢 |
| `backend/src/modules/cardapios/routes/modalidadeRoutes.ts` | Rotas de modalidades | 🟢 |
| `backend/src/modules/cardapios/controllers/modalidadeController.ts` | Modalidades e categorias financeiras | 🟢 |
| `backend/src/modules/nutricao/routes/refeicaoCalculosRoutes.ts` | Rotas de calculos nutricionais/custo | 🟢 |
| `backend/src/modules/nutricao/controllers/refeicaoCalculosController.ts` | `calcularValoresNutricionais`, `calcularCusto`, `aplicarCalculosAutomaticos` | 🟢 |
| `backend/src/modules/nutricao/routes/refeicaoProdutoModalidadeRoutes.ts` | Rotas de ajustes por modalidade | 🟢 |
| `backend/src/modules/nutricao/controllers/refeicaoProdutoModalidadeController.ts` | Ajustes e per capita efetivo | 🟢 |
| `backend/src/modules/nutricao/controllers/refeicaoIngredientesController.ts` | Ingredientes detalhados e per capita bruto | 🟢 |
| `backend/src/modules/nutricao/routes/gruposIngredientesRoutes.ts` | Rotas de grupos de ingredientes | 🟢 |
| `backend/src/modules/nutricao/controllers/gruposIngredientesController.ts` | CRUD de grupos e itens | 🟢 |
| `backend/src/modules/nutricao/routes/tacoRoutes.ts` | Rota de busca TACO | 🟢 |
| `backend/src/modules/nutricao/controllers/tacoController.ts` | Busca TACO por termo | 🟢 |
| `backend/src/modules/nutricao/routes/nutricionistaRoutes.ts` | Rotas de nutricionistas | 🟢 |
| `backend/src/modules/nutricao/controllers/nutricionistaController.ts` | CRUD de nutricionistas | 🟢 |
| `frontend/src/modules/cardapios/pages/CardapiosModalidade.tsx` | Lista/formulario de cardapios | 🟢 |
| `frontend/src/modules/cardapios/pages/CardapioCalendario.tsx` | Calendario de cardapio | 🟢 |
| `frontend/src/modules/cardapios/pages/CardapioPublico.tsx` | Visualizacao publica e ficha tecnica | 🟢 |
| `frontend/src/modules/nutricao/pages/Refeicoes.tsx` | Lista e duplicacao de refeicoes | 🟢 |
| `frontend/src/modules/nutricao/pages/PreparacaoDetalhe.tsx` | Ficha tecnica, ingredientes, custo e nutricao | 🟢 |
| `frontend/src/modules/nutricao/pages/GruposIngredientes.tsx` | Grupos de ingredientes | 🟢 |
| `_reversa_sdd/flowcharts/cardapios.md` | Fluxo macro de cardapios | 🟢 |
| `_reversa_sdd/flowcharts/cardapios-calcularCustoCardapio.md` | Fluxo de custo de cardapio | 🟢 |
| `_reversa_sdd/flowcharts/cardapios-duplicarRefeicao.md` | Fluxo de duplicacao de refeicao | 🟢 |
| `_reversa_sdd/flowcharts/nutricao.md` | Fluxo macro de nutricao | 🟢 |
| `_reversa_sdd/flowcharts/nutricao-calculos-refeicao.md` | Fluxos de calculos nutricional/custo | 🟢 |
| `_reversa_sdd/flowcharts/nutricao-ajustes-modalidade.md` | Fluxo de ajustes por modalidade | 🟢 |
| `_reversa_sdd/flowcharts/nutricao-grupos-taco.md` | Fluxo de grupos e TACO | 🟢 |
