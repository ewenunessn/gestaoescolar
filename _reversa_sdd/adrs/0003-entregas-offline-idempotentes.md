# ADR 0003 - Entregas offline idempotentes

Status: Aceito retroativamente.

## Contexto

O historico registra `d753934 feat: improve offline delivery sync`, migracao `20260426_entregas_idempotencia.sql` e testes de `deliveryOutboxCore`/`entregaIdempotency`.

## Decisao

O app entregador registra operacoes locais em outbox (`offline_queue`) com `client_operation_id`, status de sincronizacao e dados de comprovante. O backend aceita confirmacoes idempotentes para evitar duplicidade quando o app reenviar apos falha ou reconexao.

## Alternativas consideradas

- Bloquear entrega quando offline.
- Sincronizar sem chave de idempotencia.
- Criar comprovante apenas manualmente no web apos a entrega.

## Consequencias

- Positiva: entregador pode operar em campo sem conectividade estavel.
- Positiva: reenvio e tolerante a falhas temporarias.
- Negativa: UI precisa representar estados intermediarios (`comprovante_pending`, `foto_pending`, falhas retryable).
- Risco: conflitos 4xx exigem acao humana e podem deixar entregas pendentes.

Confianca: CONFIRMADO para implementacao; INFERIDO para alternativas.
