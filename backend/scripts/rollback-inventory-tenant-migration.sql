-- SCRIPT DE ROLLBACK DA MIGRAÇÃO DE TENANT PARA ESTOQUE
-- Data: 2025-11-03
-- Descrição: Reverte as alterações da migração de tenant no estoque
-- ATENÇÃO: Este script remove dados de tenant_id. Use com cuidado!

-- ========================================
-- CONFIRMAÇÃO DE SEGURANÇA
-- ========================================

-- Verificar se o usuário realmente quer fazer rollback
DO $
BEGIN
    -- Esta verificação força o usuário a comentar esta linha para executar o rollback
    RAISE EXCEPTION 'ROLLBACK BLOQUEADO: Para executar o rollback, comente a linha "RAISE EXCEPTION" neste bloco';
    
    -- Para executar o rollback, comente a linha acima e descomente a linha abaixo:
    -- RAISE NOTICE 'Iniciando rollback da migração de tenant para estoque...';
END $;

BEGIN;

-- ========================================
-- 1. LOG DE ROLLBACK
-- ========================================

-- Criar tabela temporária para log do rollback
CREATE TEMP TABLE rollback_log (
    id SERIAL PRIMARY KEY,
    step VARCHAR(100),
    status VARCHAR(20),
    message TEXT,
    affected_rows INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Função para log do rollback
CREATE OR REPLACE FUNCTION log_rollback_step(
    step_name VARCHAR(100),
    step_status VARCHAR(20),
    step_message TEXT DEFAULT NULL,
    rows_affected INTEGER DEFAULT NULL
) RETURNS VOID AS $
BEGIN
    INSERT INTO rollback_log (step, status, message, affected_rows)
    VALUES (step_name, step_status, step_message, rows_affected);
    
    RAISE NOTICE '[%] %: % (% rows)', 
        step_status, step_name, COALESCE(step_message, 'Completed'), COALESCE(rows_affected, 0);
END;
$ LANGUAGE plpgsql;

PERFORM log_rollback_step('ROLLBACK_START', 'INFO', 'Iniciando rollback da migração de tenant para estoque');

-- ========================================
-- 2. BACKUP DOS DADOS ATUAIS
-- ========================================

-- Criar backup das tabelas com tenant_id antes do rollback
CREATE TABLE IF NOT EXISTS backup_rollback_estoque_escolas AS 
SELECT * FROM estoque_escolas WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS backup_rollback_estoque_lotes AS 
SELECT * FROM estoque_lotes WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS backup_rollback_estoque_historico AS 
SELECT * FROM estoque_escolas_historico WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS backup_rollback_estoque_movimentacoes AS 
SELECT * FROM estoque_movimentacoes WHERE tenant_id IS NOT NULL;

PERFORM log_rollback_step('CREATE_BACKUP', 'SUCCESS', 'Backup dos dados criado');

-- ========================================
-- 3. REMOVER TRIGGERS DE TENANT
-- ========================================

-- Remover triggers que definem tenant_id automaticamente
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_escolas ON estoque_escolas;
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_lotes ON estoque_lotes;
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_historico ON estoque_escolas_historico;
DROP TRIGGER IF EXISTS trigger_set_tenant_id_estoque_movimentacoes ON estoque_movimentacoes;

PERFORM log_rollback_step('REMOVE_TRIGGERS', 'SUCCESS', 'Triggers de tenant removidos');

-- ========================================
-- 4. DESABILITAR ROW LEVEL SECURITY
-- ========================================

-- Remover políticas RLS
DROP POLICY IF EXISTS tenant_isolation_estoque_escolas ON estoque_escolas;
DROP POLICY IF EXISTS tenant_isolation_estoque_lotes ON estoque_lotes;
DROP POLICY IF EXISTS tenant_isolation_estoque_historico ON estoque_escolas_historico;
DROP POLICY IF EXISTS tenant_isolation_estoque_movimentacoes ON estoque_movimentacoes;

-- Desabilitar RLS
ALTER TABLE estoque_escolas DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_lotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_escolas_historico DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes DISABLE ROW LEVEL SECURITY;

PERFORM log_rollback_step('DISABLE_RLS', 'SUCCESS', 'Row Level Security desabilitado');

-- ========================================
-- 5. REMOVER ÍNDICES TENANT-AWARE
-- ========================================

-- Remover índices criados para tenant
DROP INDEX IF EXISTS idx_estoque_escolas_tenant_escola_produto;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_escola_produto;
DROP INDEX IF EXISTS idx_estoque_lotes_tenant_validade_ativo;
DROP INDEX IF EXISTS idx_estoque_historico_tenant_escola_data;
DROP INDEX IF EXISTS idx_estoque_movimentacoes_tenant_lote_data;

PERFORM log_rollback_step('REMOVE_INDEXES', 'SUCCESS', 'Índices tenant-aware removidos');

-- ========================================
-- 6. REMOVER CONSTRAINTS NOT NULL DE TENANT_ID
-- ========================================

-- Tornar tenant_id nullable novamente
ALTER TABLE estoque_escolas ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE estoque_lotes ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE estoque_escolas_historico ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE estoque_movimentacoes ALTER COLUMN tenant_id DROP NOT NULL;

PERFORM log_rollback_step('REMOVE_NOT_NULL', 'SUCCESS', 'Constraints NOT NULL removidas');

-- ========================================
-- 7. LIMPAR DADOS DE TENANT_ID (OPCIONAL)
-- ========================================

-- ATENÇÃO: Esta seção remove os dados de tenant_id
-- Descomente apenas se quiser remover completamente os dados de tenant

/*
DO $
DECLARE
    updated_count INTEGER;
BEGIN
    -- Limpar tenant_id de estoque_escolas
    UPDATE estoque_escolas SET tenant_id = NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    PERFORM log_rollback_step('CLEAR_TENANT_ESTOQUE_ESCOLAS', 'SUCCESS', 
        'tenant_id limpo', updated_count);
    
    -- Limpar tenant_id de estoque_lotes
    UPDATE estoque_lotes SET tenant_id = NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    PERFORM log_rollback_step('CLEAR_TENANT_ESTOQUE_LOTES', 'SUCCESS', 
        'tenant_id limpo', updated_count);
    
    -- Limpar tenant_id de estoque_escolas_historico
    UPDATE estoque_escolas_historico SET tenant_id = NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    PERFORM log_rollback_step('CLEAR_TENANT_ESTOQUE_HISTORICO', 'SUCCESS', 
        'tenant_id limpo', updated_count);
    
    -- Limpar tenant_id de estoque_movimentacoes
    UPDATE estoque_movimentacoes SET tenant_id = NULL;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    PERFORM log_rollback_step('CLEAR_TENANT_ESTOQUE_MOVIMENTACOES', 'SUCCESS', 
        'tenant_id limpo', updated_count);
END $;
*/

PERFORM log_rollback_step('CLEAR_TENANT_DATA', 'SKIP', 'Limpeza de tenant_id pulada (descomente para executar)');

-- ========================================
-- 8. REMOVER COLUNAS TENANT_ID (OPCIONAL)
-- ========================================

-- ATENÇÃO: Esta seção remove completamente as colunas tenant_id
-- Descomente apenas se quiser remover completamente o suporte a tenant

/*
-- Remover foreign key constraints primeiro
ALTER TABLE estoque_escolas DROP CONSTRAINT IF EXISTS estoque_escolas_tenant_id_fkey;
ALTER TABLE estoque_lotes DROP CONSTRAINT IF EXISTS estoque_lotes_tenant_id_fkey;
ALTER TABLE estoque_escolas_historico DROP CONSTRAINT IF EXISTS estoque_escolas_historico_tenant_id_fkey;
ALTER TABLE estoque_movimentacoes DROP CONSTRAINT IF EXISTS estoque_movimentacoes_tenant_id_fkey;

-- Remover colunas tenant_id
ALTER TABLE estoque_escolas DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE estoque_lotes DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE estoque_escolas_historico DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE estoque_movimentacoes DROP COLUMN IF EXISTS tenant_id;

PERFORM log_rollback_step('REMOVE_TENANT_COLUMNS', 'SUCCESS', 'Colunas tenant_id removidas');
*/

PERFORM log_rollback_step('REMOVE_TENANT_COLUMNS', 'SKIP', 'Remoção de colunas tenant_id pulada (descomente para executar)');

-- ========================================
-- 9. REMOVER ESCOLA_ID DE ESTOQUE_LOTES (OPCIONAL)
-- ========================================

-- ATENÇÃO: Esta seção remove a coluna escola_id que foi adicionada
-- Descomente apenas se ela não existia antes da migração

/*
-- Remover foreign key constraint
ALTER TABLE estoque_lotes DROP CONSTRAINT IF EXISTS estoque_lotes_escola_id_fkey;

-- Remover coluna escola_id
ALTER TABLE estoque_lotes DROP COLUMN IF EXISTS escola_id;

PERFORM log_rollback_step('REMOVE_ESCOLA_ID', 'SUCCESS', 'Coluna escola_id removida de estoque_lotes');
*/

PERFORM log_rollback_step('REMOVE_ESCOLA_ID', 'SKIP', 'Remoção de escola_id pulada (descomente para executar)');

-- ========================================
-- 10. REMOVER FUNÇÕES DE TENANT
-- ========================================

-- Remover função de tenant_id automático
DROP FUNCTION IF EXISTS set_tenant_id_estoque();

-- Remover função de contexto de tenant (cuidado - pode ser usada por outras partes)
-- DROP FUNCTION IF EXISTS get_current_tenant_id();

PERFORM log_rollback_step('REMOVE_FUNCTIONS', 'SUCCESS', 'Funções de tenant removidas');

-- ========================================
-- 11. VERIFICAÇÃO PÓS-ROLLBACK
-- ========================================

DO $
DECLARE
    report_text TEXT := '';
    table_name TEXT;
    tenant_column_exists BOOLEAN;
    escola_id_exists BOOLEAN;
BEGIN
    report_text := E'\n========================================\n';
    report_text := report_text || 'RELATÓRIO DO ROLLBACK\n';
    report_text := report_text || E'========================================\n\n';
    
    -- Verificar se colunas tenant_id ainda existem
    FOR table_name IN SELECT unnest(ARRAY['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes']) LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_name AND column_name = 'tenant_id'
        ) INTO tenant_column_exists;
        
        report_text := report_text || format('Tabela %s:\n', table_name);
        report_text := report_text || format('  Coluna tenant_id: %s\n', 
            CASE WHEN tenant_column_exists THEN 'AINDA EXISTE' ELSE 'REMOVIDA' END);
    END LOOP;
    
    -- Verificar escola_id em estoque_lotes
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'estoque_lotes' AND column_name = 'escola_id'
    ) INTO escola_id_exists;
    
    report_text := report_text || format('\nColuna escola_id em estoque_lotes: %s\n', 
        CASE WHEN escola_id_exists THEN 'AINDA EXISTE' ELSE 'REMOVIDA' END);
    
    report_text := report_text || E'\nTabelas de backup criadas:\n';
    report_text := report_text || '  - backup_rollback_estoque_escolas\n';
    report_text := report_text || '  - backup_rollback_estoque_lotes\n';
    report_text := report_text || '  - backup_rollback_estoque_historico\n';
    report_text := report_text || '  - backup_rollback_estoque_movimentacoes\n';
    
    report_text := report_text || E'\n========================================\n';
    
    RAISE NOTICE '%', report_text;
    
    PERFORM log_rollback_step('ROLLBACK_COMPLETE', 'SUCCESS', 'Rollback concluído');
END $;

COMMIT;

-- Exibir log do rollback
SELECT 
    step,
    status,
    message,
    affected_rows,
    timestamp
FROM rollback_log
ORDER BY id;

-- ========================================
-- INSTRUÇÕES PÓS-ROLLBACK
-- ========================================

/*
INSTRUÇÕES APÓS O ROLLBACK:

1. VERIFICAÇÃO:
   - Execute o script de validação para confirmar o estado atual
   - Verifique se as aplicações ainda funcionam corretamente

2. LIMPEZA (OPCIONAL):
   - Se o rollback foi completo, você pode remover as tabelas de backup:
     DROP TABLE IF EXISTS backup_rollback_estoque_escolas;
     DROP TABLE IF EXISTS backup_rollback_estoque_lotes;
     DROP TABLE IF EXISTS backup_rollback_estoque_historico;
     DROP TABLE IF EXISTS backup_rollback_estoque_movimentacoes;

3. RESTAURAÇÃO (SE NECESSÁRIO):
   - Se precisar restaurar os dados de tenant, use as tabelas de backup:
     UPDATE estoque_escolas SET tenant_id = b.tenant_id 
     FROM backup_rollback_estoque_escolas b 
     WHERE estoque_escolas.id = b.id;

4. REEXECUÇÃO DA MIGRAÇÃO:
   - Se quiser tentar a migração novamente, execute primeiro:
     - 011_add_tenant_to_estoque_tables.sql
     - 012_inventory_tenant_data_migration.sql
*/