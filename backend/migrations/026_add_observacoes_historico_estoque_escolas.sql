BEGIN;

ALTER TABLE estoque_escolas_historico
ADD COLUMN IF NOT EXISTS observacoes TEXT;

COMMIT;
