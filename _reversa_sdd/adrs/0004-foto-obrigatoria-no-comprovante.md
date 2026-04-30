# ADR 0004 - Foto obrigatoria no comprovante de entrega

Status: Aceito retroativamente.

## Contexto

Commits recentes mostram a sequencia: `0dde14d feat: add comprovante photo metadata`, `a71dace feat: add delivery photo endpoints`, `98350cc feat: add mobile delivery photo upload api`, `8fdac33 feat: sync delivery photos through outbox`, `af3fc51 feat: require delivery photo before comprovante`, `6005681 feat: show delivery photos on comprovantes`.

## Decisao

Exigir foto da mercadoria/entrega antes da conclusao do comprovante no fluxo mobile recente. A foto e armazenada por upload assinado e confirmada no backend, enquanto o outbox mantem operacao aberta ate concluir envio.

## Alternativas consideradas

- Comprovante apenas com assinatura/nomes.
- Foto opcional.
- Upload direto pelo backend sem URL assinada.

## Consequencias

- Positiva: aumenta evidencia documental da entrega.
- Positiva: foto fica consultavel no web em comprovantes.
- Negativa: fluxo offline ganha uma etapa (`foto_pending`).
- Risco: falhas de upload podem deixar comprovante aguardando envio mesmo com entrega fisica realizada.

Confianca: CONFIRMADO.
