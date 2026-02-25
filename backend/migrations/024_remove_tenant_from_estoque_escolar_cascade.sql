BEGIN;

DO $$
DECLARE policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estoque_escolas') THEN
    EXECUTE 'ALTER TABLE estoque_escolas DISABLE ROW LEVEL SECURITY';
    FOR policy_name IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='estoque_escolas' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON estoque_escolas', policy_name);
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estoque_escolas_historico') THEN
    EXECUTE 'ALTER TABLE estoque_escolas_historico DISABLE ROW LEVEL SECURITY';
    FOR policy_name IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='estoque_escolas_historico' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON estoque_escolas_historico', policy_name);
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estoque_lotes') THEN
    EXECUTE 'ALTER TABLE estoque_lotes DISABLE ROW LEVEL SECURITY';
    FOR policy_name IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='estoque_lotes' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON estoque_lotes', policy_name);
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estoque_movimentacoes') THEN
    EXECUTE 'ALTER TABLE estoque_movimentacoes DISABLE ROW LEVEL SECURITY';
    FOR policy_name IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='estoque_movimentacoes' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON estoque_movimentacoes', policy_name);
    END LOOP;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='estoque_alertas') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'estoque_alertas') THEN
      EXECUTE 'ALTER TABLE estoque_alertas DISABLE ROW LEVEL SECURITY';
      FOR policy_name IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='estoque_alertas' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON estoque_alertas', policy_name);
      END LOOP;
    END IF;
  END IF;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='estoque_escolas' AND indexdef ILIKE '%tenant_id%' LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
  END LOOP;
  FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='estoque_escolas_historico' AND indexdef ILIKE '%tenant_id%' LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
  END LOOP;
  FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='estoque_lotes' AND indexdef ILIKE '%tenant_id%' LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
  END LOOP;
  FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='estoque_movimentacoes' AND indexdef ILIKE '%tenant_id%' LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
  END LOOP;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='estoque_alertas') THEN
    FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='estoque_alertas' AND indexdef ILIKE '%tenant_id%' LOOP
      EXECUTE format('DROP INDEX IF EXISTS %I', r.indexname);
    END LOOP;
  END IF;
END $$;

ALTER TABLE IF EXISTS estoque_escolas DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE IF EXISTS estoque_escolas_historico DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE IF EXISTS estoque_lotes DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE IF EXISTS estoque_movimentacoes DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE IF EXISTS estoque_alertas DROP COLUMN IF EXISTS tenant_id;

COMMIT;
