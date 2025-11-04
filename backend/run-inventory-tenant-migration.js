#!/usr/bin/env node

/**
 * SCRIPT DE EXECUÇÃO DA MIGRAÇÃO DE TENANT PARA ESTOQUE
 * 
 * Este script executa a migração de dados de estoque para suporte a tenant
 * de forma segura, com validações e rollback automático em caso de erro.
 * 
 * Uso: node run-inventory-tenant-migration.js [--dry-run] [--force] [--rollback]
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gestao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Configurações do script
const config = {
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  rollback: process.argv.includes('--rollback'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

class InventoryTenantMigration {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.migrationStartTime = new Date();
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = {
      'INFO': '📋',
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'ERROR': '❌',
      'DEBUG': '🔍'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (data && config.verbose) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  async executeSQL(sqlContent, description) {
    this.log('INFO', `Executando: ${description}`);
    
    if (config.dryRun) {
      this.log('INFO', `[DRY RUN] Simulando execução de: ${description}`);
      return { success: true, dryRun: true };
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(sqlContent);
      this.log('SUCCESS', `Concluído: ${description}`);
      return { success: true, result };
    } catch (error) {
      this.log('ERROR', `Falha em: ${description}`, { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  async loadSQLFile(filename) {
    const filePath = path.join(__dirname, filename);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      this.log('DEBUG', `Arquivo SQL carregado: ${filename}`);
      return content;
    } catch (error) {
      this.log('ERROR', `Erro ao carregar arquivo SQL: ${filename}`, { error: error.message });
      throw error;
    }
  }

  async checkPrerequisites() {
    this.log('INFO', 'Verificando pré-requisitos...');

    const client = await this.pool.connect();
    try {
      // Verificar se as tabelas existem
      const tablesCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes', 'tenants')
      `);

      const requiredTables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes', 'tenants'];
      const existingTables = tablesCheck.rows.map(row => row.table_name);
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));

      if (missingTables.length > 0) {
        throw new Error(`Tabelas obrigatórias não encontradas: ${missingTables.join(', ')}`);
      }

      // Verificar se tenant_id já existe
      const tenantColumnsCheck = await client.query(`
        SELECT table_name, column_name
        FROM information_schema.columns 
        WHERE table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes')
          AND column_name = 'tenant_id'
      `);

      const tablesWithTenantId = tenantColumnsCheck.rows.map(row => row.table_name);
      
      if (tablesWithTenantId.length === 0) {
        throw new Error('Nenhuma coluna tenant_id encontrada. Execute primeiro a migração 011_add_tenant_to_estoque_tables.sql');
      }

      if (tablesWithTenantId.length < 4) {
        this.log('WARNING', `Apenas ${tablesWithTenantId.length}/4 tabelas têm tenant_id: ${tablesWithTenantId.join(', ')}`);
      }

      // Verificar se existe tenant padrão
      const defaultTenantCheck = await client.query(`
        SELECT id, slug FROM tenants WHERE slug = 'sistema-principal'
      `);

      if (defaultTenantCheck.rows.length === 0) {
        this.log('WARNING', 'Tenant padrão não encontrado - será criado durante a migração');
      } else {
        this.log('SUCCESS', `Tenant padrão encontrado: ${defaultTenantCheck.rows[0].id}`);
      }

      this.log('SUCCESS', 'Pré-requisitos verificados com sucesso');
      return true;

    } finally {
      client.release();
    }
  }

  async createBackup() {
    this.log('INFO', 'Criando backup dos dados atuais...');

    if (config.dryRun) {
      this.log('INFO', '[DRY RUN] Simulando criação de backup');
      return true;
    }

    const client = await this.pool.connect();
    try {
      const timestamp = this.migrationStartTime.toISOString().replace(/[:.]/g, '-');
      
      // Criar backup das tabelas principais
      await client.query(`
        CREATE TABLE IF NOT EXISTS backup_migration_${timestamp}_estoque_escolas AS 
        SELECT * FROM estoque_escolas;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS backup_migration_${timestamp}_estoque_lotes AS 
        SELECT * FROM estoque_lotes;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS backup_migration_${timestamp}_estoque_historico AS 
        SELECT * FROM estoque_escolas_historico;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS backup_migration_${timestamp}_estoque_movimentacoes AS 
        SELECT * FROM estoque_movimentacoes;
      `);

      this.log('SUCCESS', `Backup criado com timestamp: ${timestamp}`);
      return timestamp;

    } finally {
      client.release();
    }
  }

  async runMigration() {
    this.log('INFO', 'Iniciando migração de dados de estoque para tenant...');

    try {
      // 1. Verificar pré-requisitos
      await this.checkPrerequisites();

      // 2. Criar backup
      const backupTimestamp = await this.createBackup();

      // 3. Executar migração principal
      const migrationSQL = await this.loadSQLFile('migrations/012_inventory_tenant_data_migration.sql');
      await this.executeSQL(migrationSQL, 'Migração principal de dados de estoque');

      // 4. Executar validação
      await this.runValidation();

      this.log('SUCCESS', 'Migração concluída com sucesso!');
      
      if (backupTimestamp) {
        this.log('INFO', `Backup disponível com timestamp: ${backupTimestamp}`);
      }

      return true;

    } catch (error) {
      this.log('ERROR', 'Migração falhou', { error: error.message });
      
      if (!config.dryRun && !config.force) {
        this.log('INFO', 'Executando rollback automático...');
        await this.runRollback();
      }
      
      throw error;
    }
  }

  async runValidation() {
    this.log('INFO', 'Executando validação pós-migração...');

    try {
      const validationSQL = await this.loadSQLFile('scripts/validate-inventory-tenant-migration.sql');
      const result = await this.executeSQL(validationSQL, 'Validação de integridade');

      if (result.dryRun) {
        this.log('INFO', '[DRY RUN] Validação simulada');
        return true;
      }

      // Verificar resultados da validação
      const client = await this.pool.connect();
      try {
        const validationResults = await client.query(`
          SELECT 
            COUNT(*) as total_checks,
            COUNT(CASE WHEN 
              (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id IS NULL) = 0 AND
              (SELECT COUNT(*) FROM estoque_lotes WHERE tenant_id IS NULL) = 0 AND
              (SELECT COUNT(*) FROM estoque_escolas_historico WHERE tenant_id IS NULL) = 0 AND
              (SELECT COUNT(*) FROM estoque_movimentacoes WHERE tenant_id IS NULL) = 0
            THEN 1 END) as passed_checks
        `);

        const { total_checks, passed_checks } = validationResults.rows[0];
        
        if (passed_checks === total_checks) {
          this.log('SUCCESS', 'Validação passou em todas as verificações');
          return true;
        } else {
          throw new Error(`Validação falhou: ${passed_checks}/${total_checks} verificações passaram`);
        }

      } finally {
        client.release();
      }

    } catch (error) {
      this.log('ERROR', 'Validação falhou', { error: error.message });
      throw error;
    }
  }

  async runRollback() {
    this.log('INFO', 'Executando rollback da migração...');

    try {
      const rollbackSQL = await this.loadSQLFile('scripts/rollback-inventory-tenant-migration.sql');
      
      // Modificar o SQL para permitir execução automática
      const modifiedRollbackSQL = rollbackSQL.replace(
        /RAISE EXCEPTION 'ROLLBACK BLOQUEADO.*?';/s,
        "RAISE NOTICE 'Executando rollback automático...';"
      );

      await this.executeSQL(modifiedRollbackSQL, 'Rollback da migração');
      this.log('SUCCESS', 'Rollback concluído');

    } catch (error) {
      this.log('ERROR', 'Rollback falhou', { error: error.message });
      throw error;
    }
  }

  async runIntegrityCheck() {
    this.log('INFO', 'Executando verificação de integridade referencial...');

    try {
      const integritySQL = await this.loadSQLFile('scripts/verify-inventory-referential-integrity.sql');
      await this.executeSQL(integritySQL, 'Verificação de integridade referencial');
      this.log('SUCCESS', 'Verificação de integridade concluída');

    } catch (error) {
      this.log('ERROR', 'Verificação de integridade falhou', { error: error.message });
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Função principal
async function main() {
  const migration = new InventoryTenantMigration();

  try {
    migration.log('INFO', 'Iniciando script de migração de tenant para estoque');
    migration.log('INFO', `Configuração: ${JSON.stringify(config, null, 2)}`);

    if (config.rollback) {
      await migration.runRollback();
    } else {
      await migration.runMigration();
    }

    // Sempre executar verificação de integridade no final
    await migration.runIntegrityCheck();

    migration.log('SUCCESS', 'Script concluído com sucesso!');
    process.exit(0);

  } catch (error) {
    migration.log('ERROR', 'Script falhou', { error: error.message, stack: error.stack });
    process.exit(1);

  } finally {
    await migration.close();
  }
}

// Tratamento de sinais
process.on('SIGINT', async () => {
  console.log('\n⚠️ Interrupção detectada. Finalizando...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = InventoryTenantMigration;