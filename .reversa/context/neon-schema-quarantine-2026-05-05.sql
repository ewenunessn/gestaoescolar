-- Neon schema cleanup quarantine - 2026-05-05
--
-- Objetivo:
--   Renomear objetos legados para _legacy_* sem apagar dados.
--
-- Uso seguro:
--   1. Execute primeiro em um branch/backup do Neon.
--   2. Revise a lista de objetos.
--   3. Habilite explicitamente:
--        SET app.confirm_schema_quarantine = 'YES';
--   4. Rode este arquivo dentro da mesma sessao.
--
-- Rollback:
--   Renomeie cada objeto de volta usando a tabela public.schema_cleanup_quarantine_log.
--   Exemplo:
--     ALTER TABLE public._legacy_demandas_20260505 RENAME TO demandas;

DO $$
BEGIN
  IF current_setting('app.confirm_schema_quarantine', true) <> 'YES' THEN
    RAISE EXCEPTION 'QUARENTENA ABORTADA: execute SET app.confirm_schema_quarantine = ''YES'' antes de rodar este script';
  END IF;
END $$;

BEGIN;

CREATE TABLE IF NOT EXISTS public.schema_cleanup_quarantine_log (
  id bigserial PRIMARY KEY,
  original_name text NOT NULL,
  quarantined_name text NOT NULL,
  object_kind text NOT NULL,
  reason text NOT NULL,
  renamed_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
DECLARE
  item record;
  current_kind char;
  dependent_count integer;
  incoming_fk_count integer;
BEGIN
  FOR item IN
    SELECT *
    FROM (VALUES
      ('demandas', '_legacy_demandas_20260505', 'table', 'Tabela antiga de demandas; runtime atual usa demandas_escolas.'),
      ('movimentacoes_consumo_contrato', '_legacy_movimentacoes_consumo_contrato_20260505', 'table', 'Fluxo antigo de consumo por contrato; sem uso ativo encontrado.'),
      ('movimentacoes_consumo_modalidade', '_legacy_movimentacoes_consumo_modalidade_20260505', 'table', 'Fluxo antigo de consumo por modalidade; sem uso ativo encontrado.'),
      ('performance_monitoring', '_legacy_performance_monitoring_20260505', 'table', 'Monitoramento legado sem uso ativo encontrado.'),
      ('sistema_configuracao_robusta', '_legacy_sistema_configuracao_robusta_20260505', 'table', 'Configuracao robusta legada sem uso ativo encontrado.'),
      ('solicitacoes_alimentos', '_legacy_solicitacoes_alimentos_20260505', 'table', 'Tabela antiga; fluxo atual usa solicitacoes e solicitacoes_itens.'),
      ('schema_prune_log', '_legacy_schema_prune_log_20260505', 'table', 'Log administrativo de prune antigo; preservar antes de remover.'),
      ('data_integrity_quarantine', '_legacy_data_integrity_quarantine_20260505', 'table', 'Quarentena administrativa; preservar antes de remover.'),
      ('view_saldo_contratos_modalidades', '_legacy_view_saldo_contratos_modalidades_20260505', 'view', 'View sem referencia ativa encontrada; validar antes de remover.'),
      ('vw_comprovantes_detalhados', '_legacy_vw_comprovantes_detalhados_20260505', 'view', 'View sem referencia ativa encontrada; validar relatorios antigos.'),
      ('vw_entregas_programadas', '_legacy_vw_entregas_programadas_20260505', 'view', 'View sem referencia ativa encontrada; validar entregas/romaneio antes de remover.'),
      ('vw_faturamento_detalhado_tipo_fornecedor', '_legacy_vw_faturamento_detalhado_tipo_fornecedor_20260505', 'view', 'View sem referencia ativa encontrada; validar relatorios de faturamento.'),
      ('vw_faturamentos_detalhados', '_legacy_vw_faturamentos_detalhados_20260505', 'view', 'View sem referencia ativa encontrada; validar relatorios de faturamento.'),
      ('vw_refeicao_produtos_com_modalidade', '_legacy_vw_refeicao_produtos_com_modalidade_20260505', 'view', 'View sem referencia ativa encontrada; validar nutricao/cardapios.'),
      ('vw_resumo_recebimentos_pedido', '_legacy_vw_resumo_recebimentos_pedido_20260505', 'view', 'View existente, mas runtime referencia vw_recebimentos_detalhados; validar recebimentos.')
    ) AS t(original_name, quarantined_name, object_kind, reason)
  LOOP
    SELECT c.relkind
      INTO current_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = item.original_name
      AND c.relkind IN ('r', 'v', 'm');

    IF current_kind IS NULL THEN
      RAISE NOTICE 'Ignorando %, objeto nao existe', item.original_name;
      CONTINUE;
    END IF;

    IF to_regclass('public.' || quote_ident(item.quarantined_name)) IS NOT NULL THEN
      RAISE EXCEPTION 'Objeto de quarentena ja existe: %', item.quarantined_name;
    END IF;

    SELECT count(*)
      INTO dependent_count
    FROM pg_class target
    JOIN pg_namespace target_ns ON target_ns.oid = target.relnamespace
    JOIN pg_depend dep ON dep.refobjid = target.oid
    JOIN pg_rewrite rw ON rw.oid = dep.objid
    JOIN pg_class dependent ON dependent.oid = rw.ev_class
    WHERE target_ns.nspname = 'public'
      AND target.relname = item.original_name
      AND dependent.oid <> target.oid;

    IF dependent_count > 0 THEN
      RAISE EXCEPTION 'Objeto % possui % views dependentes; abortando', item.original_name, dependent_count;
    END IF;

    IF current_kind = 'r' THEN
      SELECT count(*)
        INTO incoming_fk_count
      FROM pg_class target
      JOIN pg_namespace target_ns ON target_ns.oid = target.relnamespace
      JOIN pg_constraint con ON con.confrelid = target.oid
      WHERE target_ns.nspname = 'public'
        AND target.relname = item.original_name;

      IF incoming_fk_count > 0 THEN
        RAISE EXCEPTION 'Tabela % possui % FKs de entrada; abortando', item.original_name, incoming_fk_count;
      END IF;
    END IF;

    IF current_kind = 'v' THEN
      EXECUTE format('ALTER VIEW public.%I RENAME TO %I', item.original_name, item.quarantined_name);
    ELSIF current_kind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW public.%I RENAME TO %I', item.original_name, item.quarantined_name);
    ELSE
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', item.original_name, item.quarantined_name);
    END IF;

    INSERT INTO public.schema_cleanup_quarantine_log (
      original_name,
      quarantined_name,
      object_kind,
      reason
    )
    VALUES (
      item.original_name,
      item.quarantined_name,
      item.object_kind,
      item.reason
    );
  END LOOP;
END $$;

COMMIT;

