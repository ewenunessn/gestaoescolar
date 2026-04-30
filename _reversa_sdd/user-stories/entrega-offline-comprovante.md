# User Story - Entrega Offline com Comprovante

## Contexto

- 🟢 O app entregador suporta confirmacao offline por outbox.
- 🟢 O backend aceita `client_operation_id` para idempotencia da confirmacao.
- 🟢 A foto do comprovante usa URL assinada de upload e confirmacao posterior.

## Persona

- Entregador em campo com conectividade intermitente.

## Historia

Como entregador,
quero confirmar entregas mesmo sem internet e sincronizar comprovante/foto depois,
para nao perder a execucao da rota quando estiver offline.

## Jornada Principal

1. 🟢 O entregador confirma um item offline.
2. 🟢 O app cria uma `DeliveryOutboxOperation` com status `pending`.
3. 🟢 Quando houver conectividade, o app envia a confirmacao com `client_operation_id`.
4. 🟢 Se a confirmacao for aceita, o app cria/agrupa comprovante.
5. 🟢 Se existir foto local, o app solicita upload URL, envia JPEG e confirma `storage_key`.
6. 🟢 O item termina sincronizado e o app aplica mudancas remotas por cursor.

## Regras de Negocio

- 🟢 `client_operation_id` deve evitar duplicidade de confirmacao.
- 🟢 Falhas retryable permanecem em fila.
- 🟢 Falhas que exigem acao humana mudam para `failed_needs_action`.
- 🟢 Foto de comprovante deve ser JPEG e respeitar o limite de tamanho.
- 🟢 O storage key precisa pertencer ao comprovante antes da confirmacao final.

## Critérios de Aceitação

```gherkin
Cenario: Sincronizar entrega offline com sucesso
Dado uma confirmacao pendente no outbox
Quando o dispositivo voltar a ficar online
Entao o app deve enviar a confirmacao com client_operation_id
E marcar a operacao como sincronizada em caso de sucesso

Cenario: Evitar duplicidade ao reenviar operacao
Dado uma entrega offline ja aceita anteriormente pelo backend
Quando o app reenviar a mesma operacao com o mesmo client_operation_id
Entao o backend nao deve criar um novo historico de entrega

Cenario: Subir foto de comprovante apos sincronizar entrega
Dado uma operacao confirmada com foto local associada
Quando o app solicitar upload-url, enviar o JPEG e confirmar o storage_key
Entao o comprovante deve ficar com foto disponivel para leitura assinada

Cenario: Tratar falha humana no fluxo de comprovante
Dado uma falha nao retryable na criacao do comprovante ou da foto
Quando o app avaliar a resposta
Entao a operacao deve ficar em estado `failed_needs_action`
```

## Rastreabilidade

- 🟢 `apps/entregador-native/src/services/deliveryOutbox.ts`
- 🟢 `apps/entregador-native/src/services/deliveryOutboxCore.ts`
- 🟢 `apps/entregador-native/src/services/deliveryPhotoUpload.ts`
- 🟢 `apps/entregador-native/src/services/deliveryIncrementalSyncCore.ts`
- 🟢 `backend/src/modules/entregas/models/entregaIdempotency.ts`
- 🟢 `backend/src/modules/entregas/services/deliveryPhotoPolicy.ts`
- 🟡 `_reversa_sdd/flowcharts/entregas-syncOffline.md`
- 🟡 `_reversa_sdd/flowcharts/entregas-comprovanteFoto.md`
