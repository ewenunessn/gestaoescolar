# Maquinas de Estado - gestaoescolar

Gerado pelo Reversa Detective em 2026-04-29.

## Guia de demanda

Valores confirmados: `aberta`, `fechada`, `cancelada`.

```mermaid
stateDiagram-v2
  [*] --> aberta
  aberta --> fechada: revisao/geracao concluida
  aberta --> cancelada: cancelamento
  fechada --> cancelada: cancelamento administrativo
```

Confianca: INFERIDO para transicoes; valores confirmados em `frontend/src/modules/abastecimento/status.ts`.

## Item de guia

Valores confirmados: `pendente`, `programada`, `parcial`, `entregue`, `cancelado`.

```mermaid
stateDiagram-v2
  [*] --> pendente
  pendente --> programada: programacao de entrega
  programada --> parcial: entrega parcial
  programada --> entregue: entrega total
  parcial --> entregue: saldo pendente entregue
  pendente --> cancelado: cancelamento
  programada --> cancelado: cancelamento
  parcial --> cancelado: cancelamento/restante cancelado
```

Confianca: CONFIRMADO para valores; INFERIDO para algumas transicoes.

## Pedido/Compra

Valores confirmados: `pendente`, `recebido_parcial`, `concluido`, `suspenso`, `cancelado`.

```mermaid
stateDiagram-v2
  [*] --> pendente
  pendente --> recebido_parcial: primeiro recebimento parcial
  recebido_parcial --> concluido: todos os itens recebidos
  pendente --> concluido: recebimento total
  pendente --> suspenso: suspensao administrativa
  recebido_parcial --> suspenso: suspensao administrativa
  suspenso --> pendente: reativacao
  pendente --> cancelado: cancelamento
  suspenso --> cancelado: cancelamento
```

Confianca: CONFIRMADO para valores; INFERIDO para transicoes.

## Job assincrono

Valores confirmados: `pendente`, `processando`, `concluido`, `erro`.

```mermaid
stateDiagram-v2
  [*] --> pendente
  pendente --> processando: worker inicia
  processando --> concluido: processamento finalizado
  processando --> erro: falha
  pendente --> erro: falha antes de iniciar
```

Confianca: CONFIRMADO em tipos de job documentados pelo Archaeologist.

## Entrega offline/outbox

Valores confirmados em `apps/entregador-native/src/services/deliveryOutboxCore.ts`: `pending`, `syncing`, `failed_retryable`, `failed_needs_action`, `comprovante_pending`, `foto_pending`, `synced`.

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> syncing: sync iniciado
  failed_retryable --> syncing: retry
  syncing --> comprovante_pending: entrega aceita com historico
  syncing --> synced: entrega aceita sem comprovante pendente
  syncing --> failed_retryable: erro recuperavel
  syncing --> failed_needs_action: erro nao recuperavel
  syncing --> syncing: stale maior que 2 min vira syncable
  comprovante_pending --> syncing: criar comprovante
  comprovante_pending --> failed_retryable: comprovante sem ID/erro recuperavel
  comprovante_pending --> failed_needs_action: erro nao recuperavel
  syncing --> foto_pending: comprovante criado com foto local
  foto_pending --> syncing: upload de foto
  foto_pending --> synced: foto confirmada
```

Regras:

- CONFIRMADO: `failed` legado normaliza para `failed_retryable`.
- CONFIRMADO: `failed_needs_action` pode voltar para `failed_retryable` se erro for saldo recuperavel ou infraestrutura.
- CONFIRMADO: `syncing` com mais de 2 minutos e considerado stale e pode sincronizar de novo.

## Comprovante de entrega

Valores vistos: `finalizado` na UI; cancelamento/exclusao por endpoints.

```mermaid
stateDiagram-v2
  [*] --> aguardando_entrega
  aguardando_entrega --> finalizado: comprovante criado
  finalizado --> finalizado_com_cancelamento: item cancelado
  finalizado --> excluido: exclusao permanente
```

Confianca: INFERIDO. `finalizado` e confirmado em UI; estados intermediarios sao modelados pelo comportamento de endpoints.

## Estoque escolar/mobile

Valores confirmados: `sem_estoque`, `baixo`, `normal`, `alto`, `vencido`, `critico`, `atencao`.

```mermaid
stateDiagram-v2
  [*] --> normal
  normal --> baixo: quantidade abaixo do minimo
  baixo --> sem_estoque: quantidade zerada
  sem_estoque --> normal: entrada
  baixo --> normal: entrada/ajuste
  normal --> alto: quantidade acima do maximo
  alto --> normal: saida/ajuste
  normal --> atencao: validade proxima
  atencao --> critico: validade ate 7 dias
  critico --> vencido: validade anterior a hoje
```

Confianca: CONFIRMADO para valores e validacoes de quantidade/validade; INFERIDO para combinacao entre estados de saldo e validade.

## Lote de estoque

Valores confirmados em tipos: `ativo`, `esgotado`, `vencido`, `cancelado`; app mobile tambem usa `bloqueado`.

```mermaid
stateDiagram-v2
  [*] --> ativo
  ativo --> esgotado: quantidade_atual chega a zero
  ativo --> vencido: data_validade anterior a hoje
  ativo --> cancelado: cancelamento administrativo
  ativo --> bloqueado: bloqueio operacional no mobile
```

Confianca: CONFIRMADO para valores principais; LACUNA para `bloqueado` versus backend.

## Contrato

Valores confirmados: `ativo`, `inativo`, `suspenso`, `finalizado`.

```mermaid
stateDiagram-v2
  [*] --> ativo
  ativo --> suspenso: suspensao
  suspenso --> ativo: reativacao
  ativo --> finalizado: fim de vigencia/encerramento
  ativo --> inativo: desativacao
  suspenso --> inativo: desativacao
```

Confianca: CONFIRMADO para valores; INFERIDO para transicoes.

## Usuario/acesso

```mermaid
stateDiagram-v2
  [*] --> nao_autenticado
  nao_autenticado --> autenticado_admin: login tipo admin ou system admin
  nao_autenticado --> autenticado_escola: login com escola_id nao admin
  nao_autenticado --> autenticado_funcao: login usuario operacional
  autenticado_admin --> acesso_total: bypass RBAC
  autenticado_funcao --> acesso_modulo: permissao direta/funcao suficiente
  autenticado_funcao --> acesso_negado: permissao insuficiente
  autenticado_escola --> portal_escola: redirect inicial
```

Confianca: CONFIRMADO em `authMiddleware`, `useUserRole`, `useUserPermissions`, `PermissionGuard` e `AppRouter`.
