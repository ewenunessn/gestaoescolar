const db = require('../../database');
const fs = require('fs');
const path = require('path');

/**
 * Sistema de Migração Automática
 * Verifica e cria tabelas automaticamente quando não existem
 */
class AutoMigration {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../../migrations');
    this.executedMigrations = new Set();
  }

  /**
   * Verifica se uma tabela existe no banco
   */
  async tableExists(tableName) {
    try {
      const result = await db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );
      return result.rows[0].exists;
    } catch (error) {
      console.error(`Erro ao verificar tabela ${tableName}:`, error.message);
      return false;
    }
  }

  /**
   * Verifica se a tabela de controle de migrações existe
   */
  async ensureMigrationTable() {
    try {
      const exists = await this.tableExists('schema_migrations');
      if (!exists) {
        await db.query(`
          CREATE TABLE schema_migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✅ Tabela de controle de migrações criada');
      }
    } catch (error) {
      console.error('❌ Erro ao criar tabela de migrações:', error.message);
    }
  }

  /**
   * Obtém migrações já executadas
   */
  async getExecutedMigrations() {
    try {
      const result = await db.query('SELECT migration_name FROM schema_migrations');
      return new Set(result.rows.map(row => row.migration_name));
    } catch (error) {
      console.error('Erro ao obter migrações executadas:', error.message);
      return new Set();
    }
  }

  /**
   * Marca uma migração como executada
   */
  async markMigrationAsExecuted(migrationName) {
    try {
      await db.query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING',
        [migrationName]
      );
    } catch (error) {
      console.error(`Erro ao marcar migração ${migrationName}:`, error.message);
    }
  }

  /**
   * Executa um arquivo SQL de migração
   */
  async executeMigrationFile(filePath, migrationName) {
    try {
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      console.log(`🔄 Executando migração: ${migrationName}`);
      
      // Executar o SQL completo de uma vez
      await db.query(sqlContent);

      await this.markMigrationAsExecuted(migrationName);
      console.log(`✅ Migração ${migrationName} executada com sucesso`);
      
    } catch (error) {
      console.error(`❌ Erro ao executar migração ${migrationName}:`, error.message);
      console.error(`📄 Arquivo: ${filePath}`);
      throw error;
    }
  }

  /**
   * Verifica e executa migrações pendentes
   */
  async runPendingMigrations() {
    try {
      await this.ensureMigrationTable();
      const executedMigrations = await this.getExecutedMigrations();
      
      // Lista arquivos de migração
      const migrationFiles = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort();

      let migrationsRun = 0;
      
      for (const file of migrationFiles) {
        const migrationName = path.basename(file, '.sql');
        
        if (!executedMigrations.has(migrationName)) {
          const filePath = path.join(this.migrationsPath, file);
          await this.executeMigrationFile(filePath, migrationName);
          migrationsRun++;
        }
      }

      if (migrationsRun === 0) {
        console.log('✅ Todas as migrações já foram executadas');
      } else {
        console.log(`✅ ${migrationsRun} migração(ões) executada(s) com sucesso`);
      }
      
    } catch (error) {
      console.error('❌ Erro durante execução de migrações:', error.message);
      throw error;
    }
  }

  /**
   * Verifica tabelas essenciais e cria se necessário
   */
  async checkEssentialTables() {
    const essentialTables = [
      'usuarios',
      'fornecedores',
      'produtos',
      'modalidades',
      'escolas',
    ];

    const missingTables = [];
    
    for (const table of essentialTables) {
      const exists = await this.tableExists(table);
      if (!exists) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      console.log(`⚠️  Tabelas não encontradas: ${missingTables.join(', ')}`);
      console.log('🔄 Executando migrações para criar tabelas...');
    } else {
      console.log('✅ Todas as tabelas essenciais existem');
    }
    
    // Always run pending migrations regardless of missing tables
    await this.runPendingMigrations();
  }

  /**
   * Executa verificação completa e migração automática
   */
  async autoMigrate() {
    try {
      console.log('🚀 Iniciando verificação automática de banco de dados...');
      
      // Testa conexão
      const connectionTest = await db.testConnection();
      if (!connectionTest) {
        throw new Error('Falha na conexão com o banco de dados');
      }

      // Verifica e executa migrações
      await this.checkEssentialTables();
      
      console.log('✅ Verificação automática concluída com sucesso!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro na migração automática:', error.message);
      return false;
    }
  }
}

// Função utilitária para uso direto
async function runAutoMigration() {
  const migration = new AutoMigration();
  return await migration.autoMigrate();
}

module.exports = {
  AutoMigration,
  runAutoMigration
};