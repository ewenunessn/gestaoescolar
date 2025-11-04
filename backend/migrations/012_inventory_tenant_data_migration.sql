-- MIGRAÇÃO DE DADOS DE ESTOQUE PARA SUPORTE A TENANT
-- Data: 2025-11-03
-- Descrição: Migra dados existentes de estoque para estrutura multi-tenant

BEGIN;

-- ========================================
-- 1. ANÁLISE E PREPARAÇÃO PRÉ-MIGRAÇÃO
-- ========================================

-- Criar tabela temporária para log da migração
CREATE TEMP TABLE migration_log (
    id SERIAL PRIMARY KEY,
    step VARCHAR(100),
    status VARCHAR(20),
    message TEXT,
    affected_rows INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Função para log da migração
CREATE OR REPLACE FUNCTION log_migration_step(
    step_name VARCHAR(100),
    step_status VARCHAR(20),
    step_message TEXT DEFAULT NULL,
    rows_affected INTEGER DEFAULT NULL
) RETURNS VOID AS $
BEGIN
    INSERT INTO migration_log (step, status, message, affected_rows)
    VALUES (step_name, step_status, step_message, rows_affected);
    
    RAISE NOTICE '[%] %: % (% rows)', 
        step_status, step_name, COALESCE(step_message, 'Completed'), COALESCE(rows_affected, 0);
END;
$ LANGUAGE plpgsql;

-- Log início da migração
PERFORM log_migration_step('MIGRATION_START', 'INFO', 'Iniciando migração de dados de estoque para tenant');

-- ========================================
-- 2. VERIFICAÇÃO E CORREÇÃO DE ESTRUTURA
-- ========================================

-- Verificar se tenant_id já existe nas tabelas
DO $
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
    column_exists BOOLEAN;
BEGIN
    -- Verificar cada tabela de estoque
    FOR table_name IN SELECT unnest(ARRAY['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes']) LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_name AND column_name = 'tenant_id'
        ) INTO column_exists;
        
        IF NOT column_exists THEN
            missing_columns := array_append(missing_columns, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        PERFORM log_migration_step('STRUCTURE_CHECK', 'ERROR', 
            'Colunas tenant_id faltando em: ' || array_to_string(missing_columns, ', '));
        RAISE EXCEPTION 'Execute primeiro a migração 011_add_tenant_to_estoque_tables.sql';
    END IF;
    
    PERFORM log_migration_step('STRUCTURE_CHECK', 'SUCCESS', 'Todas as colunas tenant_id existem');
END $;

-- Verificar se escola_id existe em estoque_lotes
DO $
DECLARE
    escola_id_exists BOOLEAN;
    missing_escola_id_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'estoque_lotes' AND column_name = 'escola_id'
    ) INTO escola_id_exists;
    
    IF NOT escola_id_exists THEN
        PERFORM log_migration_step('ADD_ESCOLA_ID', 'INFO', 'Adicionando coluna escola_id em estoque_lotes');
        
        -- Adicionar coluna escola_id
        ALTER TABLE estoque_lotes ADD COLUMN escola_id INTEGER;
        
        -- Adicionar foreign key constraint
        ALTER TABLE estoque_lotes 
        ADD CONSTRAINT estoque_lotes_escola_id_fkey 
        FOREIGN KEY (escola_id) REFERENCES escolas(id);
        
        PERFORM log_migration_step('ADD_ESCOLA_ID', 'SUCCESS', 'Coluna escola_id adicionada');
    ELSE
        PERFORM log_migration_step('ADD_ESCOLA_ID', 'SKIP', 'Coluna escola_id já existe');
    END IF;
    
    -- Verificar quantos lotes não têm escola_id
    SELECT COUNT(*) INTO missing_escola_id_count
    FROM estoque_lotes WHERE escola_id IS NULL;
    
    IF missing_escola_id_count > 0 THEN
        PERFORM log_migration_step('ESCOLA_ID_CHECK', 'WARNING', 
            'Lotes sem escola_id encontrados', missing_escola_id_count);
    END IF;
END $;

-- ========================================
-- 3. POPULAR ESCOLA_ID EM ESTOQUE_LOTES
-- ========================================

-- Popular escola_id baseado em estoque_escolas (relacionamento produto -> escola)
DO $
DECLARE
    updated_count INTEGER;
BEGIN
    -- Tentar popular escola_id baseado em estoque_escolas
    UPDATE estoque_lotes 
    SET escola_id = (
        SELECT ee.escola_id 
        FROM estoque_escolas ee 
        WHERE ee.produto_id = estoque_lotes.produto_id 
        ORDER BY ee.id 
        LIMIT 1
    )
    WHERE escola_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    PERFORM log_migration_step('POPULATE_ESCOLA_ID_FROM_ESTOQUE', 'SUCCESS', 
        'Escola_id populado baseado em estoque_escolas', updated_count);
    
    -- Para lotes que ainda não têm escola_id, usar primeira escola ativa
    UPDATE estoque_lotes 
    SET escola_id = (
        SELECT id FROM escolas WHERE ativo = true ORDER BY id LIMIT 1
    )
    WHERE escola_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        PERFORM log_migration_step('POPULATE_ESCOLA_ID_DEFAULT', 'WARNING', 
            'Escola_id populado com escola padrão', updated_count);
    END IF;
END $;

-- ========================================
-- 4. VERIFICAR E CRIAR TENANT PADRÃO
-- ========================================

-- Garantir que existe um tenant padrão
DO $
DECLARE
    default_tenant_id UUID;
    tenant_exists BOOLEAN;
BEGIN
    -- Verificar se tenant padrão existe
    SELECT id INTO default_tenant_id
    FROM tenants 
    WHERE slug = 'sistema-principal' 
    LIMIT 1;
    
    IF default_tenant_id IS NULL THEN
        -- Criar tenant padrão
        INSERT INTO tenants (
            id,
            slug, 
            name, 
            subdomain, 
            status, 
            settings, 
            limits
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            'sistema-principal',
            'Sistema Principal',
            'sistema',
            'active',
            '{"features": {"inventory": true}}',
            '{"maxUsers": 1000}'
        );
        
        default_tenant_id := '00000000-0000-0000-0000-000000000000';
        PERFORM log_migration_step('CREATE_DEFAULT_TENANT', 'SUCCESS', 'Tenant padrão criado');
    ELSE
        PERFORM log_migration_step('CREATE_DEFAULT_TENANT', 'SKIP', 'Tenant padrão já existe');
    END IF;
END $;

-- ========================================
-- 5. MIGRAÇÃO DE DADOS - ESTOQUE_ESCOLAS
-- ========================================

DO $
DECLARE
    updated_count INTEGER;
    null_count INTEGER;
BEGIN
    -- Contar registros sem tenant_id
    SELECT COUNT(*) INTO null_count
    FROM estoque_escolas WHERE tenant_id IS NULL;
    
    IF null_count > 0 THEN
        PERFORM log_migration_step('MIGRATE_ESTOQUE_ESCOLAS', 'INFO', 
            'Migrando estoque_escolas', null_count);
        
        -- Atualizar baseado na escola
        UPDATE estoque_escolas 
        SET tenant_id = COALESCE(
            (SELECT tenant_id FROM escolas WHERE id = estoque_escolas.escola_id),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        PERFORM log_migration_step('MIGRATE_ESTOQUE_ESCOLAS', 'SUCCESS', 
            'Registros migrados', updated_count);
    ELSE
        PERFORM log_migration_step('MIGRATE_ESTOQUE_ESCOLAS', 'SKIP', 
            'Todos os registros já têm tenant_id');
    END IF;
END $;

-- ========================================
-- 6. MIGRAÇÃO DE DADOS - ESTOQUE_LOTES
-- ========================================

DO $
DECLARE
    updated_count INTEGER;
    null_count INTEGER;
BEGIN
    -- Contar registros sem tenant_id
    SELECT COUNT(*) INTO null_count
    FROM estoque_lotes WHERE tenant_id IS NULL;
    
    IF null_count > 0 THEN
        PERFORM log_migration_step('MIGRATE_ESTOQUE_LOTES', 'INFO', 
            'Migrando estoque_lotes', null_count);
        
        -- Atualizar baseado na escola (agora que escola_id foi populado)
        UPDATE estoque_lotes 
        SET tenant_id = COALESCE(
            (SELECT tenant_id FROM escolas WHERE id = estoque_lotes.escola_id),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        PERFORM log_migration_step('MIGRATE_ESTOQUE_LOTES', 'SUCCESS', 
            'Registros migrados', updated_count);
    ELSE
        PERFORM log_migration_step('MIGRATE_ESTOQUE_LOTES', 'SKIP', 
            'Todos os registros já têm tenant_id');
    END IF;
END $;

-- ========================================
-- 7. MIGRAÇÃO DE DADOS - ESTOQUE_ESCOLAS_HISTORICO
-- ========================================

DO $
DECLARE
    updated_count INTEGER;
    null_count INTEGER;
BEGIN
    -- Contar registros sem tenant_id
    SELECT COUNT(*) INTO null_count
    FROM estoque_escolas_historico WHERE tenant_id IS NULL;
    
    IF null_count > 0 THEN
        PERFORM log_migration_step('MIGRATE_ESTOQUE_HISTORICO', 'INFO', 
            'Migrando estoque_escolas_historico', null_count);
        
        -- Atualizar baseado na escola
        UPDATE estoque_escolas_historico 
        SET tenant_id = COALESCE(
            (SELECT tenant_id FROM escolas WHERE id = estoque_escolas_historico.escola_id),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        PERFORM log_migration_step('MIGRATE_ESTOQUE_HISTORICO', 'SUCCESS', 
            'Registros migrados', updated_count);
    ELSE
        PERFORM log_migration_step('MIGRATE_ESTOQUE_HISTORICO', 'SKIP', 
            'Todos os registros já têm tenant_id');
    END IF;
END $;

-- ========================================
-- 8. MIGRAÇÃO DE DADOS - ESTOQUE_MOVIMENTACOES
-- ========================================

DO $
DECLARE
    updated_count INTEGER;
    null_count INTEGER;
    constraint_violations INTEGER;
BEGIN
    -- Verificar se há violações de constraint (movimentações órfãs)
    SELECT COUNT(*) INTO constraint_violations
    FROM estoque_movimentacoes em
    LEFT JOIN estoque_lotes el ON el.id = em.lote_id
    WHERE el.id IS NULL;
    
    IF constraint_violations > 0 THEN
        PERFORM log_migration_step('CHECK_MOVIMENTACOES_CONSTRAINTS', 'WARNING', 
            'Movimentações órfãs encontradas', constraint_violations);
        
        -- Remover movimentações órfãs (sem lote correspondente)
        DELETE FROM estoque_movimentacoes 
        WHERE lote_id NOT IN (SELECT id FROM estoque_lotes);
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        PERFORM log_migration_step('CLEANUP_ORPHAN_MOVIMENTACOES', 'WARNING', 
            'Movimentações órfãs removidas', updated_count);
    END IF;
    
    -- Contar registros sem tenant_id
    SELECT COUNT(*) INTO null_count
    FROM estoque_movimentacoes WHERE tenant_id IS NULL;
    
    IF null_count > 0 THEN
        PERFORM log_migration_step('MIGRATE_ESTOQUE_MOVIMENTACOES', 'INFO', 
            'Migrando estoque_movimentacoes', null_count);
        
        -- Atualizar baseado no lote
        UPDATE estoque_movimentacoes 
        SET tenant_id = COALESCE(
            (SELECT el.tenant_id FROM estoque_lotes el WHERE el.id = estoque_movimentacoes.lote_id),
            '00000000-0000-0000-0000-000000000000'::uuid
        )
        WHERE tenant_id IS NULL;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        PERFORM log_migration_step('MIGRATE_ESTOQUE_MOVIMENTACOES', 'SUCCESS', 
            'Registros migrados', updated_count);
    ELSE
        PERFORM log_migration_step('MIGRATE_ESTOQUE_MOVIMENTACOES', 'SKIP', 
            'Todos os registros já têm tenant_id');
    END IF;
END $;

-- ========================================
-- 9. MIGRAÇÃO DE PRODUTOS (SE NECESSÁRIO)
-- ========================================

DO $
DECLARE
    updated_count INTEGER;
    null_count INTEGER;
BEGIN
    -- Verificar se produtos precisam de tenant_id
    SELECT COUNT(*) INTO null_count
    FROM produtos WHERE tenant_id IS NULL;
    
    IF null_count > 0 THEN
        PERFORM log_migration_step('MIGRATE_PRODUTOS', 'INFO', 
            'Migrando produtos para tenant padrão', null_count);
        
        -- Atualizar produtos para tenant padrão
        UPDATE produtos 
        SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
        WHERE tenant_id IS NULL;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        PERFORM log_migration_step('MIGRATE_PRODUTOS', 'SUCCESS', 
            'Produtos migrados para tenant padrão', updated_count);
    ELSE
        PERFORM log_migration_step('MIGRATE_PRODUTOS', 'SKIP', 
            'Todos os produtos já têm tenant_id');
    END IF;
END $;

-- ========================================
-- 10. CRIAR ÍNDICES OTIMIZADOS
-- ========================================

-- Índices compostos com tenant_id para performance
CREATE INDEX IF NOT EXISTS idx_estoque_escolas_tenant_escola_produto 
ON estoque_escolas(tenant_id, escola_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_escola_produto 
ON estoque_lotes(tenant_id, escola_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_estoque_lotes_tenant_validade_ativo 
ON estoque_lotes(tenant_id, data_validade) 
WHERE data_validade IS NOT NULL AND status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_estoque_historico_tenant_escola_data 
ON estoque_escolas_historico(tenant_id, escola_id, data_movimentacao);

CREATE INDEX IF NOT EXISTS idx_estoque_movimentacoes_tenant_lote_data 
ON estoque_movimentacoes(tenant_id, lote_id, data_movimentacao);

PERFORM log_migration_step('CREATE_INDEXES', 'SUCCESS', 'Índices otimizados criados');

-- ========================================
-- 11. DEFINIR COLUNAS COMO NOT NULL (APÓS MIGRAÇÃO)
-- ========================================

-- Verificar se todos os registros têm tenant_id antes de tornar NOT NULL
DO $
DECLARE
    table_name TEXT;
    null_count INTEGER;
    all_tables_ok BOOLEAN := true;
BEGIN
    FOR table_name IN SELECT unnest(ARRAY['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes']) LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL', table_name) INTO null_count;
        
        IF null_count > 0 THEN
            all_tables_ok := false;
            PERFORM log_migration_step('CHECK_NULL_TENANT_ID', 'ERROR', 
                format('Tabela %s ainda tem %s registros sem tenant_id', table_name, null_count));
        END IF;
    END LOOP;
    
    IF all_tables_ok THEN
        -- Tornar tenant_id NOT NULL
        ALTER TABLE estoque_escolas ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE estoque_lotes ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE estoque_escolas_historico ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE estoque_movimentacoes ALTER COLUMN tenant_id SET NOT NULL;
        
        PERFORM log_migration_step('SET_NOT_NULL', 'SUCCESS', 'Colunas tenant_id definidas como NOT NULL');
    ELSE
        PERFORM log_migration_step('SET_NOT_NULL', 'ERROR', 'Não foi possível definir NOT NULL devido a valores nulos');
        RAISE EXCEPTION 'Migração falhou: ainda existem registros sem tenant_id';
    END IF;
END $;

-- ========================================
-- 12. VERIFICAÇÃO FINAL E RELATÓRIO
-- ========================================

-- Criar relatório final da migração
DO $
DECLARE
    report_text TEXT := '';
    table_name TEXT;
    total_records INTEGER;
    records_with_tenant INTEGER;
    success_rate NUMERIC;
BEGIN
    report_text := E'\n========================================\n';
    report_text := report_text || 'RELATÓRIO FINAL DA MIGRAÇÃO DE ESTOQUE\n';
    report_text := report_text || E'========================================\n\n';
    
    FOR table_name IN SELECT unnest(ARRAY['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes']) LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO total_records;
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NOT NULL', table_name) INTO records_with_tenant;
        
        success_rate := CASE WHEN total_records > 0 THEN (records_with_tenant::NUMERIC / total_records::NUMERIC) * 100 ELSE 100 END;
        
        report_text := report_text || format('Tabela: %s\n', table_name);
        report_text := report_text || format('  Total de registros: %s\n', total_records);
        report_text := report_text || format('  Com tenant_id: %s\n', records_with_tenant);
        report_text := report_text || format('  Taxa de sucesso: %.2f%%\n', success_rate);
        report_text := report_text || format('  Status: %s\n\n', 
            CASE WHEN success_rate = 100 THEN '✅ SUCESSO' ELSE '❌ FALHA' END);
    END LOOP;
    
    -- Verificar integridade referencial
    SELECT COUNT(*) INTO total_records
    FROM estoque_movimentacoes em
    LEFT JOIN estoque_lotes el ON el.id = em.lote_id
    WHERE el.id IS NULL;
    
    report_text := report_text || format('Integridade Referencial:\n');
    report_text := report_text || format('  Movimentações órfãs: %s\n', total_records);
    report_text := report_text || format('  Status: %s\n\n', 
        CASE WHEN total_records = 0 THEN '✅ OK' ELSE '❌ PROBLEMA' END);
    
    report_text := report_text || E'========================================\n';
    
    RAISE NOTICE '%', report_text;
    
    PERFORM log_migration_step('MIGRATION_COMPLETE', 'SUCCESS', 'Migração de dados de estoque concluída');
END $;

COMMIT;

-- Exibir log da migração
SELECT 
    step,
    status,
    message,
    affected_rows,
    timestamp
FROM migration_log
ORDER BY id;