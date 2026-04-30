# Guias e Demandas

## Visao Geral

🟢 O componente Guias e Demandas gerencia demandas formais das escolas e a geração, ajuste, entrega e acompanhamento de guias de demanda.
🟢 Demandas registram solicitações institucionais com prazo de resposta calculado, enquanto guias consolidam produtos por competência, escola, período e data de entrega.
🟢 O componente também suporta geração assíncrona de guias, publicação de eventos realtime e operações de romaneio/entrega.

## Responsabilidades

- 🟢 Listar, criar, editar, excluir e atualizar status de demandas escolares.
- 🟢 Calcular `dias_solicitacao` a partir de `data_semead` e `data_resposta_semead`.
- 🟢 Listar solicitantes e cardápios disponíveis para demandas.
- 🟢 Listar competências de guias e resumir guias por competência/status.
- 🟢 Listar guias, detalhes, itens e produtos por guia ou por escola.
- 🟢 Gerar guias por demanda de forma síncrona e assíncrona.
- 🟢 Reaproveitar guia existente por competência, reabrindo-a e substituindo itens quando necessário.
- 🟢 Classificar produtos perecíveis e não perecíveis na geração da guia.
- 🟢 Converter quantidade de quilos para embalagem quando houver peso de referência.
- 🟢 Inserir itens de guia em lote (`chunks`) para reduzir custo operacional da geração.
- 🟢 Permitir adição, remoção e edição de itens de guia por escola/produto.
- 🟢 Expor tela de ajuste agrupada por produto e `data_entrega`.
- 🟢 Aplicar ajuste em lote de quantidade e data de entrega.
- 🟢 Expor romaneio filtrável por data, escola, rota e status.
- 🟢 Confirmar entrega e marcar itens como `para_entrega`.
- 🟢 Publicar eventos realtime após geração e atualização de entregas.

## Interface

### Demandas

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/demandas` | HTTP | Sim | Lista demandas com filtros opcionais. | 🟢 |
| `GET /api/demandas/:id` | HTTP | Sim | Busca demanda detalhada por id. | 🟢 |
| `POST /api/demandas` | HTTP | Sim | Cria demanda. | 🟢 |
| `PUT /api/demandas/:id` | HTTP | Sim | Atualiza demanda existente. | 🟢 |
| `DELETE /api/demandas/:id` | HTTP | Sim | Exclui demanda. | 🟢 |
| `PATCH /api/demandas/:id/status` | HTTP | Sim | Atualiza status da demanda. | 🟢 |
| `GET /api/demandas/solicitantes` | HTTP | Sim | Lista escolas solicitantes agregadas. | 🟢 |
| `GET /api/demandas/cardapios-disponiveis` | HTTP | Sim | Lista cardápios disponíveis para apoiar o fluxo de demanda/guia. | 🟢 |

### Guias

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/guias/competencias` | HTTP | Sim | Lista competências com agrupamento/resumo de guias. | 🟢 |
| `GET /api/guias/status-escolas` | HTTP | Sim | Lista status agregados por escola. | 🟢 |
| `GET /api/guias/romaneio` | HTTP | Sim | Lista itens para romaneio com filtros operacionais. | 🟢 |
| `GET /api/guias` | HTTP | Sim | Lista guias. | 🟢 |
| `GET /api/guias/:id` | HTTP | Sim | Busca cabeçalho da guia. | 🟢 |
| `GET /api/guias/:guiaId/produtos` | HTTP | Sim | Lista produtos agregados da guia. | 🟢 |
| `GET /api/guias/:guiaId/itens` | HTTP | Sim | Lista itens detalhados da guia. | 🟢 |
| `GET /api/guias/escola/:escolaId/produtos` | HTTP | Sim | Lista produtos por escola. | 🟢 |
| `GET /api/guias/:guiaId/ajuste` | HTTP | Sim | Lista itens para tela de ajuste. | 🟢 |
| `POST /api/guias` | HTTP | Sim | Cria guia manualmente. | 🟢 |
| `PUT /api/guias/:id` | HTTP | Sim | Atualiza guia. | 🟢 |
| `DELETE /api/guias/:id` | HTTP | Sim | Exclui guia. | 🟢 |

### Geração e ajuste

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `POST /api/guias/geracao-demanda` | HTTP | Sim | Gera guia por competência no fluxo síncrono. | 🟢 |
| `POST /api/guias/geracao-demanda/async` | HTTP | Sim | Inicia job de geração assíncrona. | 🟢 |
| `GET /api/guias/geracao-demanda/jobs/:id` | HTTP | Sim | Consulta status/progresso do job. | 🟢 |
| `PUT /api/guias/:guiaId/ajuste` | HTTP | Sim | Salva ajustes de itens da guia. | 🟢 |
| `POST /api/guias/:guiaId/produtos` | HTTP | Sim | Adiciona produto à guia. | 🟢 |
| `DELETE /api/guias/:guiaId/produtos/:produtoId/escolas/:escolaId` | HTTP | Sim | Remove produto de guia para escola. | 🟢 |
| `POST /api/guias/escola/:escolaId/produtos` | HTTP | Sim | Adiciona produto diretamente para a escola. | 🟢 |
| `PUT /api/guias/escola/produtos/:itemId` | HTTP | Sim | Atualiza item de produto da escola. | 🟢 |
| `DELETE /api/guias/itens/:itemId` | HTTP | Sim | Remove item individual da guia. | 🟢 |

### Entrega e romaneio

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `PUT /api/guias/:guiaId/produtos/:produtoId/escolas/:escolaId/entrega` | HTTP | Sim | Confirma entrega do item. | 🟢 |
| `PUT /api/guias/itens/:itemId/para-entrega` | HTTP | Sim | Marca item como apto/nao apto para entrega. | 🟢 |

### Estruturas principais

```ts
type StatusDemanda = "pendente" | "enviado_semead" | "atendido" | "nao_atendido";

type AjusteLote = {
  itemId: number;
  payload: {
    quantidade?: number;
    data_entrega?: string | null;
  };
};
```

🟢 Demandas usam a tabela `demandas_escolas` como fonte principal.
🟢 Guias persistem itens em `guia_produto_escola`, incluindo snapshots de escola, quantidade, unidade, `para_entrega`, status e `data_entrega`.
🟡 A granularidade exata dos payloads de ajuste deve ser consolidada no OpenAPI posterior, mas o frontend evidencia ajuste por `itemId`, quantidade e data.

## Regras de Negocio

- 🟢 Todas as rotas de demandas exigem autenticação.
- 🟢 Todas as rotas de guias exigem autenticação.
- 🟢 Leituras de guias exigem `requireLeitura('guias')`.
- 🟢 Escritas de guias exigem `requireEscrita('guias')`.
- 🟢 `dias_solicitacao` é `NULL` quando `data_semead` é `NULL`.
- 🟢 Quando `data_resposta_semead` existe, `dias_solicitacao` é a diferença entre resposta e envio.
- 🟢 Quando há `data_semead` sem resposta, `dias_solicitacao` é `CURRENT_DATE - data_semead`.
- 🟢 Status padrão da demanda na criação é `pendente`.
- 🟢 Geração de guia por demanda valida competência no formato `YYYY-MM`.
- 🟢 Geração de guia por demanda valida períodos antes de calcular a demanda.
- 🟢 Quando a demanda calculada é vazia, a geração retorna `total_criadas = 0` com erros.
- 🟢 A geração busca guia existente por `competencia_mes_ano`.
- 🟢 Se a guia já existe, seus itens são removidos e a guia é reaberta antes de regenerar.
- 🟢 Produtos são separados em perecíveis e não perecíveis durante a geração.
- 🟢 Perecíveis podem gerar linhas por produto/escola/período.
- 🟢 Não perecíveis são somados por produto/escola.
- 🟢 Quando houver peso da embalagem, a geração pode converter quantidades em kg para embalagem.
- 🟢 Inserção dos itens da guia ocorre em lote por `chunks`.
- 🟢 Geração concluída publica evento realtime `generated`.
- 🟢 A geração assíncrona cria job do tipo `gerar_guias`.
- 🟢 O job assíncrono retorna HTTP `202` com `job_id`.
- 🟢 O job atualiza progresso em faixas durante cálculo, criação/reuso da guia e inserção dos itens.
- 🟢 Adição manual de produto à guia valida que a guia está aberta.
- 🟢 Adição manual insere `guia_produto_escola` com snapshot da escola.
- 🟢 Tela de ajuste agrupa itens por produto e `data_entrega`.
- 🟢 Ajuste em lote aceita modos `set`, `add` e `percent`.
- 🟢 Ajuste em lote arredonda a quantidade por múltiplo e nunca permite valor negativo.
- 🟢 Romaneio exclui itens cancelados por padrão.
- 🟢 Confirmação de entrega atualiza quantidade entregue, nomes relacionados e status.
- 🟢 Confirmação de entrega publica evento realtime `delivery_updated`.
- 🟢 Marcação `para_entrega` valida booleano antes de persistir.

## Fluxo Principal

### Demandas formais

1. 🟢 Usuário acessa a lista de demandas.
2. 🟢 Frontend consulta demandas, escolas e solicitantes.
3. 🟢 Backend lista demandas a partir de `demandas_escolas`.
4. 🟢 Usuário cria ou edita uma demanda com escola, objeto, datas e observações.
5. 🟢 Backend persiste a demanda e recalcula `dias_solicitacao` no retorno.
6. 🟢 Usuário altera o status conforme avanço do atendimento.

### Guias por competência

1. 🟢 Usuário acessa `/guias-demanda`.
2. 🟢 Frontend carrega competências por `GET /api/guias/competencias`.
3. 🟢 Backend agrupa guias e itens por competência.
4. 🟢 Frontend exibe resumo por status.
5. 🟢 Usuário abre uma guia e consulta cabeçalho, produtos e itens.

### Geração de guia por demanda

1. 🟢 Usuário solicita geração para uma competência.
2. 🟢 Backend valida competência `YYYY-MM` e períodos.
3. 🟢 Backend calcula a demanda por período.
4. 🟢 Se não houver demanda, retorna sem criar itens.
5. 🟢 Backend busca ou cria guia por `competencia_mes_ano`.
6. 🟢 Se a guia existe, remove itens antigos e a reabre.
7. 🟢 Backend classifica produtos em perecíveis e não perecíveis.
8. 🟢 Backend converte quantidades para embalagem quando há peso.
9. 🟢 Backend insere itens em lotes (`chunks`).
10. 🟢 Backend publica evento realtime de geração.

### Geração assíncrona

1. 🟢 Usuário chama `POST /api/guias/geracao-demanda/async`.
2. 🟢 Backend cria um job `gerar_guias`.
3. 🟢 Backend responde `202` com `job_id`.
4. 🟢 Processo em background atualiza progresso do job.
5. 🟢 Frontend consulta `GET /api/guias/geracao-demanda/jobs/:id` para status.
6. 🟢 Ao final, o job é marcado como concluído.

### Ajustes e entrega

1. 🟢 Usuário abre a tela de ajuste da guia.
2. 🟢 Backend retorna itens agrupáveis por produto e `data_entrega`.
3. 🟢 Frontend aplica ajustes individuais ou em lote de quantidade/data.
4. 🟢 Backend salva alterações nos itens da guia.
5. 🟢 No romaneio, usuário filtra por data, escola, rota e status.
6. 🟢 Usuário marca item como `para_entrega` ou confirma a entrega.
7. 🟢 Backend atualiza o item e publica evento realtime de entrega.

## Fluxos Alternativos

- 🟢 **Demanda sem `data_semead`:** `dias_solicitacao` retorna `NULL`.
- 🟢 **Demanda enviada sem resposta:** `dias_solicitacao` cresce com base em `CURRENT_DATE`.
- 🟢 **Geração sem demanda calculada:** backend retorna `total_criadas = 0` com erros.
- 🟢 **Guia já existente para a competência:** itens antigos são removidos e a guia é reaberta.
- 🟢 **Guia fechada em adição manual:** backend bloqueia a inclusão de produto.
- 🟢 **Ajuste percentual ou aditivo negativo:** resultado final é limitado a zero após arredondamento.
- 🟢 **Romaneio com cancelados:** itens cancelados ficam fora do retorno por padrão.
- 🟢 **Consumo assíncrono em andamento:** frontend deve consultar o job por `job_id` até a conclusão.

## Cenarios de Borda

- 🟢 **Agrupamento por `data_entrega`:** itens do mesmo produto, mas com datas diferentes, precisam permanecer separados na tela de ajuste.
- 🟢 **Data de entrega com/sem timezone:** frontend normaliza a data para chave consistente antes de comparar e salvar.
- 🟢 **Produtos sem peso de embalagem:** geração não deve converter kg para embalagem sem contexto do peso.
- 🟢 **Regeração de competência existente:** remover itens e reabrir a guia evita duplicidade na mesma competência.
- 🟢 **Job com muitos itens:** uso de `chunks` reduz risco de falha por lote único muito grande.
- 🟢 **Permissões em demandas:** o router exige `authenticateToken` com `requireLeitura('guias')` ou `requireEscrita('guias')`.

## Dependencias

- 🟢 `middleware/authMiddleware` - autentica rotas de demandas e guias.
- 🟢 `middleware/permissionMiddleware` - controla leitura/escrita do módulo `guias`.
- 🟢 `backend/src/modules/demandas/models/demandaModel.ts` - CRUD e cálculo de `dias_solicitacao`.
- 🟢 `backend/src/modules/demandas/controllers/demandaController.ts` - expõe endpoints de demandas e cardápios disponíveis.
- 🟢 `backend/src/modules/guias/controllers/guiaController.ts` - CRUD de guias, itens, romaneio e entregas.
- 🟢 `backend/src/modules/guias/controllers/guiaDemandaGenerationController.ts` - geração síncrona/assíncrona e status do job.
- 🟢 `backend/src/modules/guias/services/GuiaDemandaGenerationService.ts` - serviço de cálculo e geração em lote.
- 🟢 `backend/src/modules/guias/models/Guia.ts` - persistência de `guia_produto_escola`, entregas e agregações.
- 🟢 `services/realtimeEvents` - publicação de eventos `generated` e `delivery_updated`.
- 🟢 `frontend/src/modules/demandas/pages/DemandasLista.tsx` - lista e edição de demandas.
- 🟢 `frontend/src/modules/demandas/pages/GuiasDemandaLista.tsx` - lista por competência e disparo de geração.
- 🟢 `frontend/src/modules/demandas/pages/GuiaDemandaDetalhe.tsx` - detalhe da guia.
- 🟢 `frontend/src/modules/demandas/pages/GuiaDemandaProdutoItens.tsx` - ajuste por produto/data.
- 🟢 `frontend/src/modules/demandas/pages/GuiaDemandaEscolaItens.tsx` - ajuste por escola.
- 🟢 `frontend/src/modules/demandas/pages/GuiaDemandaAdicionarProduto.tsx` - adição manual de produto.
- 🟢 `frontend/src/modules/demandas/utils/guiaProdutoAjuste.ts` - ajuste em lote de quantidade/data.

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Todas as rotas de guias exigem autenticação. | `backend/src/modules/guias/routes/guiaRoutes.ts:12` | 🟢 |
| Seguranca | Leituras e escritas de guias usam `requireLeitura('guias')` e `requireEscrita('guias')`. | `backend/src/modules/guias/routes/guiaRoutes.ts:20` | 🟢 |
| Seguranca | Todas as rotas de demandas exigem autenticação e permissao `guias`. | `backend/src/modules/demandas/routes/demandaRoutes.ts` | 🟢 |
| Disponibilidade | Geração assíncrona desacopla a operação pesada da resposta HTTP imediata. | `backend/src/modules/guias/routes/guiaRoutes.ts:36` | 🟢 |
| Performance | Inserção de itens da guia ocorre em lote por `chunks`. | `_reversa_sdd/flowcharts/guias-geracao-demanda.md` | 🟢 |
| Integridade | Regeração remove itens antigos da mesma competência antes de inserir novos. | `_reversa_sdd/flowcharts/guias-geracao-demanda.md` | 🟢 |
| Integridade | Ajuste em lote nunca permite quantidade negativa após arredondamento. | `_reversa_sdd/flowcharts/demandas-applyBulkQuantityAdjustment.md` | 🟢 |
| Integridade | `dias_solicitacao` é recalculado no SQL a partir das datas da demanda. | `backend/src/modules/demandas/models/demandaModel.ts:39` | 🟢 |
| Observabilidade | Eventos realtime são publicados após geração e atualização de entrega. | `backend/src/modules/guias/controllers/guiaController.ts:4` | 🟡 |

> 🟢 Inferido a partir do código e dos fluxos Reversa de guias e demandas.

## Criterios de Aceitacao

```gherkin
Cenario: Criar demanda formal
Dado um usuario autenticado
Quando ele envia os dados validos de uma demanda
Entao a demanda deve ser criada com status inicial pendente

Cenario: Calcular dias de solicitacao sem resposta
Dado uma demanda com data_semead preenchida e sem data_resposta_semead
Quando a demanda e listada ou buscada
Entao dias_solicitacao deve ser calculado como CURRENT_DATE menos data_semead

Cenario: Gerar guia por competencia
Dado uma competencia valida no formato YYYY-MM com demanda calculada
Quando o usuario executa a geracao de guias
Entao o sistema deve criar ou reutilizar a guia da competencia e inserir os itens calculados

Cenario: Regerar guia existente
Dado uma guia ja existente para a competencia informada
Quando a geracao e executada novamente
Entao os itens antigos devem ser removidos e a guia deve ser reaberta antes da nova insercao

Cenario: Retornar sem criacao quando nao ha demanda
Dado uma competencia valida sem demanda calculada
Quando a geracao e executada
Entao o retorno deve indicar total_criadas igual a zero com erros informativos

Cenario: Iniciar geracao assincrona
Dado um usuario com escrita em guias
Quando ele chama a rota de geracao assincrona
Entao o backend deve retornar HTTP 202 com um job_id para acompanhamento

Cenario: Ajustar quantidade em lote
Dado uma lista de itens selecionados na tela de ajuste
Quando o usuario aplica um ajuste em modo set, add ou percent
Entao cada linha selecionada deve ser recalculada, arredondada e limitada a zero no minimo

Cenario: Confirmar entrega
Dado um item de guia apto para entrega
Quando o usuario confirma a entrega informando os dados necessarios
Entao o backend deve atualizar quantidade entregue, status e publicar evento realtime

Cenario: Marcar para entrega
Dado um item de guia existente
Quando o usuario altera o flag para_entrega
Entao o backend deve validar o booleano e persistir a alteracao
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Demandas formais | Should | Importante para registrar solicitações e SLA, mas não executa o abastecimento por si só. | 🟢 |
| Guias por competência | Must | Núcleo operacional da distribuição de produtos para escolas. | 🟢 |
| Geração por demanda | Must | Transforma cálculo de demanda em itens executáveis de guia. | 🟢 |
| Ajuste de itens da guia | Must | Necessário para corrigir quantidades e datas antes da entrega. | 🟢 |
| Romaneio e entrega | Must | Etapa operacional para expedição e confirmação logística. | 🟢 |
| Job assíncrono de geração | Should | Importante para volume alto e melhor UX, mas há fluxo síncrono de fallback. | 🟢 |
| Eventos realtime | Could | Melhora atualização de tela, mas não substitui a persistência principal. | 🟡 |

> 🟢 Prioridade inferida pelo papel central das guias no abastecimento e pela dependência de entregas/compras.

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/demandas/routes/demandaRoutes.ts` | Rotas autenticadas e permissionadas de demandas | 🟢 |
| `backend/src/modules/demandas/controllers/demandaController.ts` | CRUD, status, solicitantes e cardápios disponíveis | 🟢 |
| `backend/src/modules/demandas/models/demandaModel.ts` | Persistência de demandas e cálculo de `dias_solicitacao` | 🟢 |
| `backend/src/modules/guias/routes/guiaRoutes.ts` | Rotas autenticadas e permissionadas de guias | 🟢 |
| `backend/src/modules/guias/controllers/guiaController.ts` | Guias, itens, romaneio, ajustes e entregas | 🟢 |
| `backend/src/modules/guias/controllers/guiaDemandaGenerationController.ts` | Geração síncrona, assíncrona e status do job | 🟢 |
| `backend/src/modules/guias/services/GuiaDemandaGenerationService.ts` | Cálculo e geração em lote de guias | 🟢 |
| `backend/src/modules/guias/models/Guia.ts` | Modelo de guia e `guia_produto_escola` | 🟢 |
| `frontend/src/modules/demandas/pages/DemandasLista.tsx` | Lista de demandas | 🟢 |
| `frontend/src/modules/demandas/pages/GuiasDemandaLista.tsx` | Lista de competências e geração de guias | 🟢 |
| `frontend/src/modules/demandas/pages/GuiaDemandaDetalhe.tsx` | Detalhe da guia | 🟢 |
| `frontend/src/modules/demandas/pages/GuiaDemandaProdutoItens.tsx` | Ajuste por produto e data | 🟢 |
| `frontend/src/modules/demandas/pages/GuiaDemandaEscolaItens.tsx` | Ajuste por escola | 🟢 |
| `frontend/src/modules/demandas/pages/GuiaDemandaAdicionarProduto.tsx` | Adição manual de produto à guia | 🟢 |
| `frontend/src/modules/demandas/utils/guiaProdutoAjuste.ts` | Regras de ajuste em lote | 🟢 |
| `_reversa_sdd/flowcharts/guias.md` | Fluxo macro de guias | 🟢 |
| `_reversa_sdd/flowcharts/guias-geracao-demanda.md` | Fluxo de geração por demanda | 🟢 |
| `_reversa_sdd/flowcharts/guias-entrega-romaneio.md` | Fluxo de entrega e romaneio | 🟢 |
| `_reversa_sdd/flowcharts/guias-job-async.md` | Fluxo de job assíncrono | 🟢 |
| `_reversa_sdd/flowcharts/demandas.md` | Fluxo macro de demandas | 🟢 |
| `_reversa_sdd/flowcharts/demandas-diasSolicitacao.md` | Cálculo de prazo da demanda | 🟢 |
| `_reversa_sdd/flowcharts/demandas-applyBulkQuantityAdjustment.md` | Ajuste em lote de quantidade | 🟢 |

## Notas de Hardening

- [Implementacao 2026-04-30] `demandaRoutes.ts` passou a exigir `authenticateToken` e permissao `guias`; leituras usam `requireLeitura('guias')` e escritas/status usam `requireEscrita('guias')`.
