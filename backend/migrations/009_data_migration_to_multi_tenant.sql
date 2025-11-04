-- Migration: Data migration to multi-tenant structure
-- Description: Migrates existing single-tenant data to multi-tenant structure with validation and rollback support
-- Date: 2025-01-27
-- Task: 16. Create data migration scripts for existing installations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS data_migration_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(50) NOT NULL, -- 'START', 'COMPLETE', 'ROLLBACK', 'ERROR'
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    rollback_data JSONB -- Store rollback information
);

-- Create data validation results table
CREATE TABLE IF NOT EXISTS data_migration_validation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_id UUID REFERENCES data_migration_log(id),
    table_name VARCHAR(100) NOT NULL,
    validation_type VARCHAR(50) NOT NULL, -- 'PRE_MIGRATION', 'POST_MIGRATION', 'INTEGRITY_CHECK'
    validation_status VARCHAR(20) NOT NULL, -- 'PASS', 'FAIL', 'WARNING'
    validation_message TEXT,
    record_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to log migration operations
CREATE OR REPLACE FUNCTION log_migration_operation(
    p_migration_name VARCHAR(255),
    p_table_name VARCHAR(100),
    p_operation VARCHAR(50),
    p_records_processed INTEGER DEFAULT 0,
    p_records_failed INTEGER DEFAULT 0,
    p_error_message TEXT DEFAULT NULL,
    p_rollback_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    migration_id UUID;
BEGIN
    INSERT INTO data_migration_log (
        migration_name, table_name, operation, records_processed, 
        records_failed, error_message, rollback_data
    ) VALUES (
        p_migration_name, p_table_name, p_operation, p_records_processed,
        p_records_failed, p_error_message, p_rollback_data
    ) RETURNING id INTO migration_id;
    
    RETURN migration_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate data integrity
CREATE OR REPLACE FUNCTION validate_data_integrity(
    p_migration_id UUID,
    p_table_name VARCHAR(100),
    p_validation_type VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    validation_passed BOOLEAN := TRUE;
    record_count INTEGER;
    null_tenant_count INTEGER;
    orphaned_records INTEGER;
BEGIN
    -- Count total records
    EXECUTE format('SELECT COUNT(*) FROM %I', p_table_name) INTO record_count;
    
    -- Check for NULL tenant_id values (should be 0 after migration)
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL', p_table_name) INTO null_tenant_count;
    
    IF null_tenant_count > 0 THEN
        INSERT INTO data_migration_validation (migration_id, table_name, validation_type, validation_status, validation_message, record_count)
        VALUES (p_migration_id, p_table_name, p_validation_type, 'FAIL', 
                format('Found %s records with NULL tenant_id', null_tenant_count), record_count);
        validation_passed := FALSE;
    ELSE
        INSERT INTO data_migration_validation (migration_id, table_name, validation_type, validation_status, validation_message, record_count)
        VALUES (p_migration_id, p_table_name, p_validation_type, 'PASS', 
                'All records have valid tenant_id', record_count);
    END IF;
    
    -- Check for orphaned tenant references (tenant_id not in tenants table)
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id NOT IN (SELECT id FROM tenants)', p_table_name) INTO orphaned_records;
    
    IF orphaned_records > 0 THEN
        INSERT INTO data_migration_validation (migration_id, table_name, validation_type, validation_status, validation_message, record_count)
        VALUES (p_migration_id, p_table_name, p_validation_type, 'FAIL', 
                format('Found %s records with invalid tenant_id references', orphaned_records), record_count);
        validation_passed := FALSE;
    END IF;
    
    RETURN validation_passed;
END;
$$ LANGUAGE plpgsql;

-- Function to assign tenant to existing data
CREATE OR REPLACE FUNCTION assign_tenant_to_existing_data(
    p_table_name VARCHAR(100),
    p_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
) RETURNS INTEGER AS $$
DECLARE
    records_updated INTEGER;
    migration_id UUID;
BEGIN
    -- Log start of operation
    migration_id := log_migration_operation(
        'ASSIGN_TENANT_DATA', 
        p_table_name, 
        'START'
    );
    
    -- Update records with NULL tenant_id
    EXECUTE format('UPDATE %I SET tenant_id = $1 WHERE tenant_id IS NULL', p_table_name) 
    USING p_tenant_id;
    
    GET DIAGNOSTICS records_updated = ROW_COUNT;
    
    -- Log completion
    PERFORM log_migration_operation(
        'ASSIGN_TENANT_DATA', 
        p_table_name, 
        'COMPLETE',
        records_updated
    );
    
    -- Validate the migration
    PERFORM validate_data_integrity(migration_id, p_table_name, 'POST_MIGRATION');
    
    RETURN records_updated;
END;
$$ LANGUAGE plpgsql;

-- Function to create backup of table before migration
CREATE OR REPLACE FUNCTION create_migration_backup(
    p_table_name VARCHAR(100)
) RETURNS VARCHAR(100) AS $$
DECLARE
    backup_table_name VARCHAR(100);
    migration_id UUID;
BEGIN
    backup_table_name := p_table_name || '_backup_' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS');
    
    -- Log backup creation
    migration_id := log_migration_operation(
        'CREATE_BACKUP', 
        p_table_name, 
        'START'
    );
    
    -- Create backup table
    EXECUTE format('CREATE TABLE %I AS SELECT * FROM %I', backup_table_name, p_table_name);
    
    -- Log completion
    PERFORM log_migration_operation(
        'CREATE_BACKUP', 
        p_table_name, 
        'COMPLETE'
    );
    
    RETURN backup_table_name;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback migration using backup
CREATE OR REPLACE FUNCTION rollback_migration(
    p_table_name VARCHAR(100),
    p_backup_table_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    migration_id UUID;
    records_restored INTEGER;
BEGIN
    -- Log rollback start
    migration_id := log_migration_operation(
        'ROLLBACK_MIGRATION', 
        p_table_name, 
        'START'
    );
    
    -- Truncate current table
    EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', p_table_name);
    
    -- Restore from backup
    EXECUTE format('INSERT INTO %I SELECT * FROM %I', p_table_name, p_backup_table_name);
    
    GET DIAGNOSTICS records_restored = ROW_COUNT;
    
    -- Log completion
    PERFORM log_migration_operation(
        'ROLLBACK_MIGRATION', 
        p_table_name, 
        'COMPLETE',
        records_restored
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        PERFORM log_migration_operation(
            'ROLLBACK_MIGRATION', 
            p_table_name, 
            'ERROR',
            0, 0,
            SQLERRM
        );
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Main migration function
CREATE OR REPLACE FUNCTION migrate_existing_data_to_multi_tenant(
    p_default_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    p_create_backups BOOLEAN DEFAULT TRUE
) RETURNS JSONB AS $$
DECLARE
    table_record RECORD;
    migration_results JSONB := '{}';
    backup_table_name VARCHAR(100);
    records_updated INTEGER;
    total_records INTEGER := 0;
    total_tables INTEGER := 0;
    failed_tables TEXT[] := '{}';
    
    -- List of tables that need tenant migration
    tables_to_migrate TEXT[] := ARRAY[
        'escolas', 'produtos', 'usuarios', 'fornecedores', 'contratos', 'modalidades',
        'refeicoes', 'cardapios', 'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico',
        'estoque_movimentacoes', 'pedidos', 'pedido_itens', 'guias', 'guia_produto_escola',
        'demandas', 'demandas_escolas', 'escola_modalidades', 'escolas_modalidades',
        'contrato_produtos', 'contrato_produtos_modalidades', 'cardapio_refeicoes',
        'faturamentos', 'faturamento_itens', 'estoque_alertas', 'refeicao_produtos',
        'faturamento_itens_modalidades', 'pedidos_itens', 'pedidos_fornecedores',
        'pedidos_historico', 'programacoes_entrega', 'recebimento_itens_controle',
        'recebimentos_simples', 'refeicoes_ingredientes', 'rota_escolas', 'rotas',
        'rotas_entrega', 'produto_composicao_nutricional', 'produto_modalidades',
        'planejamento_entregas', 'movimentacoes_consumo_contratos', 'movimentacoes_consumo_modalidade',
        'notificacoes', 'notificacoes_sistema', 'pedido_itens_modalidades_config',
        'pedidos_faturamentos_controle', 'logs_auditoria', 'itens_pedido',
        'historico_saldos', 'gestor_escola', 'gas_estoque', 'gas_movimentacoes',
        'gas_controle', 'estoque_escolar_movimentacoes', 'estoque_escola',
        'configuracoes_notificacao', 'configuracao_entregas', 'carrinho_itens',
        'calculos_entrega', 'calculos_resultados', 'backup_estoque_escolas',
        'backup_movimentacoes_estoque', 'alertas', 'analises_qualidade',
        'auditoria_universal', 'controle_qualidade', 'aditivos_contratos',
        'aditivos_contratos_itens', 'agrupamentos_faturamentos', 'agrupamentos_mensais',
        'agrupamentos_pedidos', 'movimentacoes_consumo_contrato'
    ];
BEGIN
    -- Ensure default tenant exists
    INSERT INTO tenants (
        id, slug, name, subdomain, status, settings, limits
    ) VALUES (
        p_default_tenant_id,
        'sistema-principal',
        'Sistema Principal',
        'sistema',
        'active',
        '{"features": {"inventory": true, "contracts": true, "deliveries": true, "reports": true}}',
        '{"maxUsers": 1000, "maxSchools": 500, "maxProducts": 10000}'
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Process each table
    FOREACH table_record IN ARRAY tables_to_migrate
    LOOP
        BEGIN
            total_tables := total_tables + 1;
            
            -- Check if table exists and has tenant_id column
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = table_record AND column_name = 'tenant_id'
            ) THEN
                CONTINUE; -- Skip tables that don't have tenant_id column
            END IF;
            
            -- Create backup if requested
            IF p_create_backups THEN
                backup_table_name := create_migration_backup(table_record);
            END IF;
            
            -- Migrate data
            records_updated := assign_tenant_to_existing_data(table_record, p_default_tenant_id);
            total_records := total_records + records_updated;
            
            -- Store results
            migration_results := jsonb_set(
                migration_results,
                ARRAY[table_record],
                jsonb_build_object(
                    'records_updated', records_updated,
                    'backup_table', COALESCE(backup_table_name, 'none'),
                    'status', 'success'
                )
            );
            
        EXCEPTION
            WHEN OTHERS THEN
                failed_tables := array_append(failed_tables, table_record);
                
                -- Log error
                PERFORM log_migration_operation(
                    'MIGRATE_EXISTING_DATA', 
                    table_record, 
                    'ERROR',
                    0, 1,
                    SQLERRM
                );
                
                -- Store error results
                migration_results := jsonb_set(
                    migration_results,
                    ARRAY[table_record],
                    jsonb_build_object(
                        'records_updated', 0,
                        'backup_table', COALESCE(backup_table_name, 'none'),
                        'status', 'error',
                        'error_message', SQLERRM
                    )
                );
        END;
    END LOOP;
    
    -- Add summary to results
    migration_results := jsonb_set(
        migration_results,
        ARRAY['summary'],
        jsonb_build_object(
            'total_tables_processed', total_tables,
            'total_records_updated', total_records,
            'failed_tables', failed_tables,
            'success_rate', ROUND((total_tables - array_length(failed_tables, 1))::numeric / total_tables * 100, 2),
            'migration_completed_at', CURRENT_TIMESTAMP
        )
    );
    
    RETURN migration_results;
END;
$$ LANGUAGE plpgsql;

-- Function to validate all migrated data
CREATE OR REPLACE FUNCTION validate_all_migrated_data() RETURNS JSONB AS $$
DECLARE
    table_name TEXT;
    validation_results JSONB := '{}';
    migration_id UUID;
    is_valid BOOLEAN;
    
    tables_to_validate TEXT[] := ARRAY[
        'escolas', 'produtos', 'usuarios', 'fornecedores', 'contratos', 'modalidades',
        'refeicoes', 'cardapios', 'estoque_escolas', 'estoque_lotes', 'pedidos', 'guias'
    ];
BEGIN
    migration_id := log_migration_operation('VALIDATE_ALL_DATA', 'ALL_TABLES', 'START');
    
    FOREACH table_name IN ARRAY tables_to_validate
    LOOP
        -- Check if table exists and has tenant_id column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_name AND column_name = 'tenant_id'
        ) THEN
            is_valid := validate_data_integrity(migration_id, table_name, 'VALIDATION_CHECK');
            
            validation_results := jsonb_set(
                validation_results,
                ARRAY[table_name],
                jsonb_build_object('is_valid', is_valid)
            );
        END IF;
    END LOOP;
    
    PERFORM log_migration_operation('VALIDATE_ALL_DATA', 'ALL_TABLES', 'COMPLETE');
    
    RETURN validation_results;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for migration tracking tables
CREATE INDEX IF NOT EXISTS idx_data_migration_log_migration_name ON data_migration_log(migration_name);
CREATE INDEX IF NOT EXISTS idx_data_migration_log_table_name ON data_migration_log(table_name);
CREATE INDEX IF NOT EXISTS idx_data_migration_log_operation ON data_migration_log(operation);
CREATE INDEX IF NOT EXISTS idx_data_migration_log_started_at ON data_migration_log(started_at);

CREATE INDEX IF NOT EXISTS idx_data_migration_validation_migration_id ON data_migration_validation(migration_id);
CREATE INDEX IF NOT EXISTS idx_data_migration_validation_table_name ON data_migration_validation(table_name);
CREATE INDEX IF NOT EXISTS idx_data_migration_validation_status ON data_migration_validation(validation_status);

-- Comments for documentation
COMMENT ON TABLE data_migration_log IS 'Tracks all data migration operations with rollback support';
COMMENT ON TABLE data_migration_validation IS 'Stores validation results for data migration operations';
COMMENT ON FUNCTION migrate_existing_data_to_multi_tenant IS 'Main function to migrate existing single-tenant data to multi-tenant structure';
COMMENT ON FUNCTION validate_all_migrated_data IS 'Validates data integrity after migration';
COMMENT ON FUNCTION rollback_migration IS 'Rollback migration using backup tables';