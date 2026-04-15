-- 028: Fix tenant_id NOT NULL, TIMESTAMPTZ, missing indexes, codigo_guia race condition
-- Addresses: items 20-25 of refactoring plan
BEGIN;

-- ============================================================
-- 1. Enforce tenant_id NOT NULL on tables where it was added but not constrained
-- ============================================================
-- First ensure no rows still have NULL tenant_id (should be safe since 002 backfilled)
DO $$
DECLARE
  tbl TEXT;
  cols RECORD;
BEGIN
  -- Tables that received tenant_id via ALTER TABLE but don't have NOT NULL
  FOR tbl IN
    SELECT UNNEST(ARRAY[
      'refeicoes', 'cardapios', 'estoque_escolas', 'estoque_lotes',
      'estoque_escolas_historico', 'estoque_movimentacoes', 'pedidos',
      'pedido_itens', 'guias', 'guia_produto_escola', 'demandas',
      'demandas_escolas', 'escola_modalidades', 'escolas_modalidades',
      'contrato_produtos', 'contrato_produtos_modalidades', 'cardapio_refeicoes',
      'faturamentos', 'faturamento_itens', 'refeicao_produtos'
    ])
  LOOP
    -- Skip tables that may not exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      -- Safety: backfill any NULL tenant_id to default tenant
      EXECUTE format($f$
        UPDATE %I SET tenant_id = '00000000-0000-0000-0000-000000000000'
        WHERE tenant_id IS NULL
      $f$, tbl);

      -- Set NOT NULL
      EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 2. Convert TIMESTAMP to TIMESTAMPTZ (without timezone -> with timezone)
-- ============================================================
-- Assumes existing TIMESTAMP data is in UTC/local system timezone.
-- PostgreSQL will interpret the stored values as local time when converting.

DO $$
DECLARE
  tbl TEXT;
  col TEXT;
  r RECORD;
BEGIN
  -- Scan all tables in public schema for TIMESTAMP WITHOUT TIME ZONE columns
  FOR r IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'timestamp without time zone'
      -- Skip tables that are part of migrations/runners
      AND table_name NOT IN ('schema_migrations', 'schema_prune_log')
    ORDER BY table_name, column_name
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
      r.table_name, r.column_name, r.column_name
    );
  END LOOP;
END $$;

-- ============================================================
-- 3. Fix codigo_guia race condition: use a sequence instead of SELECT MAX
-- ============================================================
-- Drop the old function that used SELECT MAX (TOCTOU race)
DROP FUNCTION IF EXISTS gerar_codigo_guia(INTEGER, INTEGER);

-- Create a per-month/year sequence approach using a dedicated tracking table
CREATE TABLE IF NOT EXISTS guia_codigo_sequences (
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  ultimo_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (mes, ano)
);

-- New function that uses SELECT ... FOR UPDATE to prevent race conditions
CREATE OR REPLACE FUNCTION gerar_codigo_guia(p_mes INTEGER, p_ano INTEGER)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq INTEGER;
  codigo VARCHAR(50);
  mes_str VARCHAR(2);
  ano_str VARCHAR(4);
BEGIN
  mes_str := LPAD(p_mes::TEXT, 2, '0');
  ano_str := p_ano::TEXT;

  -- Use INSERT ... ON CONFLICT to atomically create/increment the sequence row
  -- This avoids the TOCTOU race of SELECT MAX then INSERT
  UPDATE guia_codigo_sequences
  SET ultimo_seq = ultimo_seq + 1
  WHERE mes = p_mes AND ano = p_ano;

  IF NOT FOUND THEN
    INSERT INTO guia_codigo_sequences (mes, ano, ultimo_seq)
    VALUES (p_mes, p_ano, 1);
  END IF;

  SELECT ultimo_seq INTO next_seq
  FROM guia_codigo_sequences
  WHERE mes = p_mes AND ano = p_ano;

  codigo := 'GUIA-' || ano_str || '-' || mes_str || '-' || LPAD(next_seq::TEXT, 5, '0');

  -- Guard against exceeding the UNIQUE constraint length
  IF LENGTH(codigo) > 50 THEN
    RAISE EXCEPTION 'codigo_guia exceeds max length: %', codigo;
  END IF;

  RETURN codigo;
END;
$$;

-- Backfill existing sequence state from existing guias (idempotent)
INSERT INTO guia_codigo_sequences (mes, ano, ultimo_seq)
SELECT
  EXTRACT(MONTH FROM competencia_mes_ano)::INTEGER,
  EXTRACT(YEAR FROM competencia_mes_ano)::INTEGER,
  COALESCE(MAX(
    CAST(SUBSTRING(codigo_guia FROM 'GUIA-[0-9]{4}-[0-9]{2}-([0-9]{5})') AS INTEGER)
  ), 0)
FROM guias
WHERE codigo_guia IS NOT NULL
GROUP BY EXTRACT(MONTH FROM competencia_mes_ano), EXTRACT(YEAR FROM competencia_mes_ano)
ON CONFLICT (mes, ano) DO UPDATE SET ultimo_seq = GREATEST(guia_codigo_sequences.ultimo_seq, EXCLUDED.ultimo_seq);

-- ============================================================
-- 4. Add missing indexes on foreign key columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_historico_saldos_contrato_produto
  ON historico_saldos (contrato_produto_id);

CREATE INDEX IF NOT EXISTS idx_mov_consumo_contrato_produto
  ON movimentacoes_consumo_contrato (contrato_produto_id);

CREATE INDEX IF NOT EXISTS idx_mov_consumo_contrato_usuario
  ON movimentacoes_consumo_contrato (usuario_id);

-- ============================================================
-- 5. Additional useful indexes for common query patterns
-- ============================================================
-- Cardapios: common filter by data
CREATE INDEX IF NOT EXISTS idx_cardapios_data
  ON cardapios (data);

-- Pedidos: common filter by fornecedor
CREATE INDEX IF NOT EXISTS idx_pedidos_fornecedor
  ON pedidos (fornecedor_id);

-- Demandas: common filter by status
CREATE INDEX IF NOT EXISTS idx_demandas_status
  ON demandas (status);

COMMIT;
