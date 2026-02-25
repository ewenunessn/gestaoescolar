BEGIN;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'estoque_escolas'::regclass
          AND contype = 'u'
          AND (
            (array_length(conkey, 1) = 1 AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'estoque_escolas'::regclass AND attname = 'escola_id'))
            OR
            (array_length(conkey, 1) = 1 AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'estoque_escolas'::regclass AND attname = 'produto_id'))
          )
    LOOP
        EXECUTE format('ALTER TABLE estoque_escolas DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
END $$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT indexrelid::regclass::text AS index_name
        FROM pg_index
        WHERE indrelid = 'estoque_escolas'::regclass
          AND indisunique = true
          AND indisprimary = false
          AND array_length(indkey, 1) = 1
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %s', r.index_name);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS estoque_escolas_escola_id_produto_id_key
ON estoque_escolas (escola_id, produto_id);

COMMIT;
