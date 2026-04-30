# Entregas, Comprovantes e Fotos

## Visao Geral

- 🟢 O componente Entregas operacionaliza a distribuicao por escola a partir de itens de guia, confirmando ou cancelando entregas e mantendo historico de execucao.
- 🟢 A confirmacao de entrega impacta estoque escolar, historico de entregas e projeções de pendencia/status do item.
- 🟢 O modulo de comprovantes separa o recibo de entrega da confirmacao do item, permitindo comprovante com foto assinada em storage externo.
- 🟡 O app mobile opera em modo offline com `client_operation_id` para idempotencia e sincronizacao posterior.

## Responsabilidades

- 🟢 Listar escolas com itens de entrega filtrados por guia, rota e datas.
- 🟢 Expor estatisticas agregadas e bundle offline para o app/operacao.
- 🟢 Buscar item de entrega e historico por item ou escola.
- 🟢 Confirmar entrega com validacoes de quantidade, nomes, assinatura e coordenadas opcionais.
- 🟢 Cancelar entrega e refletir o estorno operacional do item.
- 🟢 Registrar historico de entregas e oferecer exclusao de historico quando autorizado.
- 🟢 Criar, listar, cancelar e excluir comprovantes de entrega.
- 🟢 Gerar URL assinada de upload e URL assinada de leitura para foto de comprovante.
- 🟢 Restringir upload de foto a JPEG com tamanho maximo configuravel.
- 🟢 Publicar eventos realtime de `entregas` e `estoque_escolar`.

## Interface

### Entregas

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/entregas/escolas` | HTTP | Sim | Lista escolas com entregas. | 🟢 |
| `GET /api/entregas/estatisticas` | HTTP | Sim | Retorna totais de itens, escolas, entregues e pendentes. | 🟢 |
| `GET /api/entregas/offline-bundle` | HTTP | Sim | Retorna bundle para operacao offline. | 🟢 |
| `GET /api/entregas/sync/mudancas` | HTTP | Sim | Lista mudancas desde um timestamp. | 🟢 |
| `GET /api/entregas/escolas/:escolaId/itens` | HTTP | Sim | Lista itens de entrega da escola. | 🟢 |
| `GET /api/entregas/itens/:itemId` | HTTP | Sim | Busca item de entrega. | 🟢 |
| `POST /api/entregas/itens/:itemId/confirmar` | HTTP | Sim | Confirma entrega do item. | 🟢 |
| `POST /api/entregas/itens/:itemId/cancelar` | HTTP | Sim | Cancela entrega confirmada. | 🟢 |

### Historico

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/entregas/itens/:itemId/historico` | HTTP | Sim | Lista historico do item. | 🟢 |
| `GET /api/entregas/escolas/:escolaId/historico` | HTTP | Sim | Lista historico da escola. | 🟢 |
| `GET /api/entregas/itens/:itemId/completo` | HTTP | Sim | Busca item com historico consolidado. | 🟢 |
| `GET /api/entregas/escolas/:escolaId/itens-completo` | HTTP | Sim | Lista itens completos da escola. | 🟢 |
| `GET /api/entregas/itens/:itemId/saldo` | HTTP | Sim | Calcula saldo do item. | 🟢 |
| `DELETE /api/entregas/historico/:id` | HTTP | Sim | Exclui registro historico. | 🟢 |

### Comprovantes e fotos

| Entrada/Saida | Tipo | Obrigatorio | Descricao | Confianca |
| --- | --- | --- | --- | --- |
| `GET /api/entregas/comprovantes` | HTTP | Sim | Lista comprovantes. | 🟢 |
| `GET /api/entregas/comprovantes/:id` | HTTP | Sim | Busca comprovante por id. | 🟢 |
| `GET /api/entregas/comprovantes/numero/:numero` | HTTP | Sim | Busca comprovante por numero. | 🟢 |
| `GET /api/entregas/comprovantes/escola/:escolaId` | HTTP | Sim | Lista comprovantes da escola. | 🟢 |
| `GET /api/entregas/comprovantes/:id/foto` | HTTP | Sim | Gera URL assinada de leitura da foto. | 🟢 |
| `GET /api/entregas/comprovantes/:id/cancelamentos` | HTTP | Sim | Lista cancelamentos relacionados. | 🟢 |
| `POST /api/entregas/comprovantes` | HTTP | Sim | Cria comprovante e itens relacionados. | 🟢 |
| `POST /api/entregas/comprovantes/cancelar-item` | HTTP | Sim | Cancela item em comprovante. | 🟢 |
| `POST /api/entregas/comprovantes/:id/foto/upload-url` | HTTP | Sim | Solicita URL assinada de upload. | 🟢 |
| `POST /api/entregas/comprovantes/:id/foto/confirmar` | HTTP | Sim | Confirma upload da foto. | 🟢 |
| `DELETE /api/entregas/comprovantes/:id` | HTTP | Sim | Cancela comprovante. | 🟢 |
| `DELETE /api/entregas/comprovantes/:id/excluir` | HTTP | Sim | Exclui comprovante. | 🟢 |

### Estruturas principais

```ts
type ConfirmacaoEntregaInput = {
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string | null;
  assinatura_base64?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  precisao_gps?: number | null;
  client_operation_id?: string | null;
};

type DeliveryPhotoUploadInput = {
  contentType: unknown;
  sizeBytes: unknown;
};
```

- 🟢 `client_operation_id` e opcional, mas quando informado precisa ser unico por operacao.
- 🟢 A foto de comprovante usa chave `entregas/comprovantes/{comprovanteId}/{uuid}.jpg`.
- 🟢 A politica padrao define retencao de 180 dias e limite maximo de 5 MB.

## Regras de Negocio

- 🟢 Todas as rotas do modulo exigem autenticacao.
- 🟢 Leituras exigem `requireLeitura('entregas')`.
- 🟢 Escritas exigem `requireEscrita('entregas')`.
- 🟢 Confirmacao de entrega exige `quantidade_entregue > 0`.
- 🟢 Confirmacao exige `nome_quem_entregou` e `nome_quem_recebeu` nao vazios.
- 🟢 Se `assinatura_base64` for enviada, ela deve comecar com `data:image/` ou `file://`.
- 🟢 Latitude deve estar entre `-90` e `90`; longitude entre `-180` e `180`.
- 🟢 `client_operation_id` maior que 100 caracteres e rejeitado.
- 🟢 O mesmo `client_operation_id` nao pode ser reutilizado em outro item de entrega.
- 🟢 Confirmar entrega publica realtime em `entregas.confirmed` e `estoque_escolar.updated`.
- 🟢 Cancelar entrega publica realtime em `entregas.cancelled` e `estoque_escolar.updated`.
- 🟢 Upload de foto aceita apenas `image/jpeg`.
- 🟢 Upload de foto exige `sizeBytes` inteiro positivo e abaixo do limite configurado.
- 🟢 URLs assinadas de upload e leitura expiram em 5 minutos.
- 🟡 O fluxo offline depende de bundle inicial, mudancas incrementais e outbox do app entregador.

## Fluxo Principal

### Confirmar entrega

1. 🟢 Operador abre item da escola.
2. 🟢 Frontend ou app envia confirmacao com quantidade e identificacao de entrega/recebimento.
3. 🟢 Controller valida item, payload e limites basicos.
4. 🟢 `EntregaModel.confirmarEntrega` persiste confirmacao em transacao.
5. 🟢 O sistema registra historico da entrega.
6. 🟢 O estoque escolar e refletido para o produto entregue.
7. 🟢 O status do item e recalculado.
8. 🟢 Eventos realtime sao publicados.

### Criar comprovante com foto

1. 🟢 Usuario cria comprovante e seus itens.
2. 🟢 Se houver foto, cliente solicita upload URL.
3. 🟢 Backend valida tipo/tamanho e gera chave no bucket.
4. 🟢 Cliente envia JPEG diretamente ao storage.
5. 🟢 Cliente chama confirmacao do upload.
6. 🟢 O comprovante passa a ter foto disponivel por URL assinada de leitura.

### Sincronizacao offline

1. 🟡 App salva confirmacao no outbox local quando offline.
2. 🟡 Ao reconectar, envia operacoes pendentes com `client_operation_id`.
3. 🟡 Backend usa idempotencia para evitar duplicidade.
4. 🟡 Mudancas posteriores sao consumidas por `sync/mudancas`.

## Fluxos Alternativos

- 🟢 **Item invalido:** retorna 400 ou 404 conforme a ausencia.
- 🟢 **Quantidade entregue maior que o saldo pendente:** retorna 400.
- 🟢 **Entrega ja confirmada:** retorna 400.
- 🟢 **Cancelamento de item nao entregue:** retorna 400.
- 🟢 **Foto nao JPEG ou maior que 5 MB:** retorna erro de validacao.
- 🟡 **Storage sem variaveis obrigatorias:** geracao de URL assinada falha.
- 🟡 **Upload confirmado para chave de outro comprovante:** deve ser rejeitado por `storageKeyBelongsToComprovante`.

## Cenarios de Borda

- 🟢 **Reenvio do mesmo payload offline:** `client_operation_id` deve tornar a confirmacao idempotente.
- 🟢 **Mesmo `client_operation_id` em item diferente:** operacao deve falhar explicitamente.
- 🟡 **Assinatura ausente:** o controller trata assinatura como opcional, embora operacionalmente seja recomendada.
- 🟡 **Comprovante sem foto:** o fluxo continua valido e apenas a leitura da foto fica indisponivel.

## Dependencias

- 🟢 `backend/src/modules/entregas/routes/entregaRoutes.ts`
- 🟢 `backend/src/modules/entregas/controllers/EntregaController.ts`
- 🟢 `backend/src/modules/entregas/controllers/HistoricoEntregaController.ts`
- 🟢 `backend/src/modules/entregas/controllers/ComprovanteEntregaController.ts`
- 🟢 `backend/src/modules/entregas/controllers/ComprovanteFotoController.ts`
- 🟢 `backend/src/modules/entregas/models/Entrega.ts`
- 🟢 `backend/src/modules/entregas/models/HistoricoEntrega.ts`
- 🟢 `backend/src/modules/entregas/models/entregaIdempotency.ts`
- 🟢 `backend/src/modules/entregas/services/deliveryPhotoPolicy.ts`
- 🟢 `backend/src/modules/entregas/services/deliveryPhotoStorage.ts`
- 🟢 `backend/src/modules/entregas/controllers/EntregaController.test.ts`
- 🟢 `backend/src/modules/entregas/controllers/ComprovanteFotoController.test.ts`
- 🟢 `backend/src/modules/entregas/services/deliveryPhotoPolicy.test.ts`
- 🟢 `backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts`
- 🟡 `_reversa_sdd/flowcharts/entregas.md`
- 🟡 `_reversa_sdd/flowcharts/entregas-confirmarEntrega.md`
- 🟡 `_reversa_sdd/flowcharts/entregas-syncOffline.md`
- 🟡 `_reversa_sdd/flowcharts/entregas-comprovanteFoto.md`

## Requisitos Nao Funcionais

| Tipo | Requisito inferido | Evidencia no codigo | Confianca |
| --- | --- | --- | --- |
| Seguranca | Rotas de entrega/comprovantes exigem autenticacao e RBAC de `entregas`; rotas de gestao de rotas/planejamentos exigem RBAC de `rotas`. | `backend/src/modules/entregas/routes/entregaRoutes.ts`, `backend/src/modules/entregas/routes/rotaRoutes.ts` | 🟢 |
| Integridade | Confirmacao de entrega usa validacoes de input e historico associado. | `backend/src/modules/entregas/controllers/EntregaController.ts` | 🟢 |
| Integridade | Idempotencia usa indice unico parcial por `client_operation_id`. | `backend/src/modules/entregas/models/entregaIdempotency.ts` | 🟢 |
| Seguranca | Foto de comprovante aceita apenas JPEG. | `backend/src/modules/entregas/services/deliveryPhotoPolicy.ts` | 🟢 |
| Performance | URLs assinadas de upload/leitura tem TTL curto de 5 minutos. | `backend/src/modules/entregas/services/deliveryPhotoPolicy.ts` | 🟢 |
| Disponibilidade | App suporta operacao offline com sincronizacao posterior. | `_reversa_sdd/flowcharts/entregas-syncOffline.md` | 🟡 |
| Observabilidade | Confirmacoes e cancelamentos publicam eventos realtime. | `backend/src/modules/entregas/controllers/EntregaController.ts` | 🟢 |

## Criterios de Aceitacao

```gherkin
Cenario: Confirmar entrega com dados validos
Dado um item de entrega pendente
Quando o operador envia quantidade, entregador e recebedor validos
Entao o sistema deve confirmar a entrega, registrar historico e publicar realtime

Cenario: Bloquear confirmacao com quantidade invalida
Dado um item de entrega existente
Quando o operador informa quantidade_entregue menor ou igual a zero
Entao o backend deve retornar erro 400

Cenario: Cancelar entrega confirmada
Dado um item ja entregue
Quando o operador solicita cancelamento
Entao o sistema deve desfazer o estado operacional do item e publicar realtime

Cenario: Rejeitar foto fora da politica
Dado um comprovante existente
Quando o cliente solicita upload-url com contentType diferente de image/jpeg ou acima de 5 MB
Entao o backend deve retornar erro de validacao

Cenario: Reprocessar confirmacao offline idempotente
Dado uma confirmacao enviada com client_operation_id
Quando o app reenviar a mesma operacao apos reconexao
Entao o sistema nao deve duplicar o historico da entrega
```

## Prioridade

| Requisito | MoSCoW | Justificativa | Confianca |
| --- | --- | --- | --- |
| Confirmacao e cancelamento de entrega | Must | Nucleo do processo logistico. | 🟢 |
| Historico e saldo do item | Must | Suporte a auditoria e reconstrucao de estado. | 🟢 |
| Comprovante de entrega | Must | Evidencia operacional do recebimento. | 🟢 |
| Foto assinada de comprovante | Should | Importante para prova visual, mas nao bloqueia toda a operacao. | 🟢 |
| Offline bundle e sync | Should | Critico para campo com conectividade ruim. | 🟡 |
| Exclusao de historico | Could | Funcao administrativa e de saneamento. | 🟢 |

## Rastreabilidade de Codigo

| Arquivo | Funcao / Classe | Cobertura |
| --- | --- | --- |
| `backend/src/modules/entregas/routes/entregaRoutes.ts` | Rotas de entregas, historico, comprovantes e foto | 🟢 |
| `backend/src/modules/entregas/controllers/EntregaController.ts` | Confirmacao, cancelamento, bundle offline e estatisticas | 🟢 |
| `backend/src/modules/entregas/models/entregaIdempotency.ts` | Idempotencia offline | 🟢 |
| `backend/src/modules/entregas/services/deliveryPhotoPolicy.ts` | Politica de foto | 🟢 |
| `backend/src/modules/entregas/services/deliveryPhotoStorage.ts` | URLs assinadas e bucket | 🟢 |
| `backend/src/modules/entregas/controllers/ComprovanteFotoController.ts` | Upload URL, confirmacao e leitura | 🟢 |
| `_reversa_sdd/flowcharts/entregas.md` | Fluxo macro | 🟡 |
| `_reversa_sdd/flowcharts/entregas-confirmarEntrega.md` | Fluxo de confirmacao | 🟡 |
| `_reversa_sdd/flowcharts/entregas-syncOffline.md` | Fluxo offline | 🟡 |
| `_reversa_sdd/flowcharts/entregas-comprovanteFoto.md` | Fluxo de foto | 🟡 |
