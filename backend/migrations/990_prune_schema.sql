-- Prune Schema: remove tables not required by the current backend
-- Safe by-design: keeps a strict allowlist based on actual queries/controllers
-- Notes:
-- - Runs in a single transaction
-- - Logs all dropped tables into schema_prune_log
-- - Only affects BASE TABLES in the public schema
--
-- PROTEÇÃO: requer confirmação explícita via session variable
-- Execute antes: SET session myvars.confirm_prune = 'YES';

DO $$
BEGIN
  IF current_setting('myvars.confirm_prune', true) != 'YES' THEN
    RAISE EXCEPTION 'PRUNE ABORTADO: execute SET session myvars.confirm_prune = ''YES'' antes de rodar esta migração';
  END IF;
END $$;

BEGIN;

-- Log table
CREATE TABLE IF NOT EXISTS schema_prune_log (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  dropped_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$
DECLARE
  r RECORD;
  allowed TEXT[] := ARRAY[
    -- Infra/Control
    'schema_migrations',
    'schema_prune_log',

    -- Autenticação e administração
    'usuarios',
    'usuario_permissoes',
    'modulos',
    'niveis_permissao',
    'system_admins',
    'system_admin_audit_log',

    -- Instituições
    'institutions',
    'institution_users',
    'institution_audit_log',

    -- Núcleo de domínio
    'fornecedores',
    'produtos',
    'produto_composicao_nutricional',
    'produto_modalidades',
    'modalidades',
    'escolas',
    'escola_modalidades',
    'escolas_modalidades',

    -- Cardápios e refeições
    'cardapios',
    'cardapio_refeicoes',
    'refeicoes',
    'refeicao_produtos',
    'refeicoes_ingredientes',

    -- Contratos
    'contratos',
    'contrato_produtos',
    'contrato_produtos_modalidades',
    'movimentacoes_consumo_contrato',
    'movimentacoes_consumo_modalidade',

    -- Estoque
    'estoque_lotes',
    'estoque_movimentacoes',
    'estoque_escolas',
    'estoque_escolas_historico',

    -- Pedidos e faturamento
    'pedidos',
    'pedido_itens',
    'pedidos_itens', -- tolerância a variações de naming
    'faturamentos',
    'faturamento_itens',
    'faturamento_itens_modalidades',

    -- Guias e entregas
    'guias',
    'guia_produto_escola',
    'rotas_entrega',
    'rota_escolas',
    'planejamento_entregas',

    -- Demandas
    'demandas',
    'demandas_escolas',

    -- Notificações e auditoria
    'notificacoes',
    'configuracoes_notificacao',
    'logs_auditoria',
    'auditoria',
    'auditoria_universal',
    'consistencia_dados',
    'performance_logs',
    'backup_logs',
    'configuracoes',
    'configuracoes_sistema',
    'alertas',

    -- Ferramentas de operação que o código usa
    'backups',
    'performance_monitoring',
    'sistema_configuracao_robusta'
  ];
BEGIN
  FOR r IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    IF NOT (LOWER(r.table_name) = ANY(allowed)) THEN
      -- Logar e remover
      INSERT INTO schema_prune_log (table_name) VALUES (r.table_name);
      EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', r.table_name);
    END IF;
  END LOOP;
END $$;

COMMIT;
