# ADR 0005 - Aplicacao desktop com backend local

Status: Aceito retroativamente.

## Contexto

O commit `d011942 feat: add desktop shell and refine frontend theme` e a analise do modulo `desktop` mostram Electron, preload seguro e backend local empacotado.

## Decisao

Empacotar uma camada desktop Electron que carrega o frontend e, no modo empacotado, inicia o backend local usando `process.execPath` com `ELECTRON_RUN_AS_NODE=1`. A API desktop padrao usa `http://127.0.0.1:3131/api`.

## Alternativas consideradas

- Manter apenas aplicacao web/Vercel.
- Desktop como wrapper de URL remota.
- Backend separado instalado como servico do sistema.

## Consequencias

- Positiva: viabiliza distribuicao desktop com arquivos, downloads e logs locais.
- Positiva: reduz dependencia de ambiente Node externo no cliente.
- Negativa: empacotamento precisa incluir `backend/dist`.
- Risco: renderer pode carregar antes do backend estar saudavel porque o bloqueio esta desativado.

Confianca: CONFIRMADO para implementacao; INFERIDO para alternativas.
