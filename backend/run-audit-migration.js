/**
 * Script para executar migração das tabelas de auditoria e monitoramento
 */

const fs = require('fs');
const path = require('path');

// Configuração do banco baseada no ambiente
const db = process.env.VERCEL === '1' ? require('./dist/database-vercel') : require('./dist/database');

async function runAuditMigration() {
  try {
    console.log('🚀 Iniciando migração de auditoria e monitoramento...');

    // Testar conexão
    const testResult = await db.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('✅ PostgreSQL conectado:', testResult.rows[0]);

    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', '007_create_audit_monitoring_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executando migração: 007_create_audit_monitoring_tables.sql');
    console.log('  Criando tabelas de auditoria e monitoramento...');

    // Executar migração
    await db.query(migrationSQL);

    console.log('✅ Migração de auditoria executada com sucesso!');

    // Verificar tabelas criadas
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('tenant_security_events', 'tenant_usage_metrics', 'tenant_alerts', 'tenant_performance_metrics')
      ORDER BY table_name
    `);

    console.log('📊 Tabelas de auditoria criadas:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Verificar se a tabela de audit log já tem as colunas necessárias
    const auditLogColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenant_audit_log' 
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('📋 Colunas da tabela tenant_audit_log:');
    auditLogColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Adicionar colunas que podem estar faltando na tabela de audit log
    try {
      await db.query(`
        ALTER TABLE tenant_audit_log 
        ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium',
        ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'system',
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'
      `);
      console.log('✅ Colunas adicionais adicionadas à tabela tenant_audit_log');
    } catch (error) {
      console.log('ℹ️ Colunas já existem na tabela tenant_audit_log');
    }

    console.log('🎉 Migração de auditoria concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na migração de auditoria:', error.message);
    console.error('\nDetalhes do erro:');
    console.error(error);
    process.exit(1);
  }
}

// Executar migração
runAuditMigration();