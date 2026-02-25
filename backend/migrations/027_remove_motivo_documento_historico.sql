BEGIN;

ALTER TABLE estoque_escolas_historico
DROP COLUMN IF EXISTS motivo;

ALTER TABLE estoque_escolas_historico
DROP COLUMN IF EXISTS documento_referencia;

COMMIT;
