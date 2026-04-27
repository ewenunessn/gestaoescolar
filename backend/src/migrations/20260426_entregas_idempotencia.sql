DO $$
BEGIN
  IF to_regclass('public.historico_entregas') IS NOT NULL THEN
    ALTER TABLE public.historico_entregas
      ADD COLUMN IF NOT EXISTS client_operation_id VARCHAR(100);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_historico_entregas_client_operation_id
      ON public.historico_entregas (client_operation_id)
      WHERE client_operation_id IS NOT NULL;
  END IF;
END $$;
