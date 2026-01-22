const { Pool } = require('pg');
const fs = require('fs').promises;

// Configurações dos bancos
const LOCAL_CONFIG = {
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
};

const NEON_CONFIG = {
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
};

class DatabaseSync {
  constructor() {
    this.localPool = new Pool(LOCAL_CONFIG);
    this.neonPool = new Pool(NEON_CONFIG);
    this.differences = [];
    this.migrations = [];
  }

  async compareSchemas() {
    console.log('🔍 Comparando esquemas dos bancos...\n');
    
    try {
      // Comparar tabelas
      await this.compareTables();
      
      // Comparar colunas
      await this.compareColumns();
      
      // Comparar índices
      await this.compareIndexes();
      
      return this.differences;
    } catch (error) {
      console.error('❌ Erro ao comparar esquemas:', error.message);
      throw error;
    }
  }

  async getTables(pool) {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.table_name);
  }

  async getColumns(pool, tableName) {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position;
    `;
    const result = await pool.query(query, [tableName]);
    return result.rows;
  }

  async getIndexes(pool, tableName) {
    const query = `
      SELECT 
        i.indexname,
        i.indexdef
      FROM pg_indexes i
      WHERE i.schemaname = 'public' 
      AND i.tablename = $1
      AND i.indexname NOT LIKE '%_pkey';
    `;
    const result = await pool.query(query, [tableName]);
    return result.rows;
  }

  async compareTables() {
    const localTables = await this.getTables(this.localPool);
    const neonTables = await this.getTables(this.neonPool);
    
    console.log(`📊 Local: ${localTables.length} tabelas | Neon: ${neonTables.length} tabelas`);
    
    // Tabelas que existem no local mas não no Neon
    const missingInNeon = localTables.filter(t => !neonTables.includes(t));
    if (missingInNeon.length > 0) {
      console.log('❌ Tabelas faltando no Neon:', missingInNeon);
      this.differences.push({ type: 'missing_tables', tables: missingInNeon });
    }
    
    // Tabelas que existem no Neon mas não no local
    const extraInNeon = neonTables.filter(t => !localTables.includes(t));
    if (extraInNeon.length > 0) {
      console.log('⚠️ Tabelas extras no Neon:', extraInNeon);
      this.differences.push({ type: 'extra_tables', tables: extraInNeon });
    }

    if (missingInNeon.length === 0 && extraInNeon.length === 0) {
      console.log('✅ Todas as tabelas estão sincronizadas');
    }
  }

  async compareColumns() {
    console.log('\n🔍 Comparando colunas das tabelas...');
    
    const localTables = await this.getTables(this.localPool);
    
    for (const table of localTables) {
      const localColumns = await this.getColumns(this.localPool, table);
      const neonColumns = await this.getColumns(this.neonPool, table);
      
      // Verificar colunas faltando no Neon
      const missingColumns = localColumns.filter(lc => 
        !neonColumns.find(nc => nc.column_name === lc.column_name)
      );
      
      if (missingColumns.length > 0) {
        console.log(`❌ Tabela ${table} - Colunas faltando no Neon:`, 
          missingColumns.map(c => c.column_name));
        this.differences.push({ 
          type: 'missing_columns', 
          table, 
          columns: missingColumns 
        });
      }
      
      // Verificar diferenças de tipo
      for (const localCol of localColumns) {
        const neonCol = neonColumns.find(nc => nc.column_name === localCol.column_name);
        if (neonCol && (
          localCol.data_type !== neonCol.data_type ||
          localCol.is_nullable !== neonCol.is_nullable ||
          localCol.column_default !== neonCol.column_default
        )) {
          console.log(`⚠️ Tabela ${table} - Coluna ${localCol.column_name} tem diferenças`);
          this.differences.push({ 
            type: 'column_difference', 
            table, 
            column: localCol.column_name,
            local: localCol,
            neon: neonCol
          });
        }
      }
    }
  }

  async compareIndexes() {
    console.log('\n🔍 Comparando índices...');
    
    const localTables = await this.getTables(this.localPool);
    
    for (const table of localTables) {
      const localIndexes = await this.getIndexes(this.localPool, table);
      const neonIndexes = await this.getIndexes(this.neonPool, table);
      
      const missingIndexes = localIndexes.filter(li => 
        !neonIndexes.find(ni => ni.indexname === li.indexname)
      );
      
      if (missingIndexes.length > 0) {
        console.log(`❌ Tabela ${table} - Índices faltando no Neon:`, 
          missingIndexes.map(i => i.indexname));
        this.differences.push({ 
          type: 'missing_indexes', 
          table, 
          indexes: missingIndexes 
        });
      }
    }
  }

  async generateMigrations() {
    console.log('\n🔧 Gerando migrações...');
    
    for (const diff of this.differences) {
      switch (diff.type) {
        case 'missing_tables':
          await this.generateTableMigrations(diff.tables);
          break;
        case 'missing_columns':
          await this.generateColumnMigrations(diff.table, diff.columns);
          break;
        case 'missing_indexes':
          await this.generateIndexMigrations(diff.table, diff.indexes);
          break;
      }
    }
    
    return this.migrations;
  }

  async generateTableMigrations(tables) {
    for (const table of tables) {
      const createTableQuery = await this.getCreateTableStatement(table);
      this.migrations.push({
        type: 'CREATE_TABLE',
        table,
        sql: createTableQuery
      });
    }
  }

  async generateColumnMigrations(table, columns) {
    for (const column of columns) {
      const alterQuery = this.buildAlterColumnStatement(table, column);
      this.migrations.push({
        type: 'ADD_COLUMN',
        table,
        column: column.column_name,
        sql: alterQuery
      });
    }
  }

  async generateIndexMigrations(table, indexes) {
    for (const index of indexes) {
      this.migrations.push({
        type: 'CREATE_INDEX',
        table,
        index: index.indexname,
        sql: index.indexdef
      });
    }
  }

  async getCreateTableStatement(tableName) {
    const query = `
      SELECT 
        'CREATE TABLE ' || quote_ident($1) || ' (' ||
        string_agg(
          quote_ident(column_name) || ' ' || 
          CASE 
            WHEN data_type = 'character varying' AND character_maximum_length IS NOT NULL 
            THEN 'character varying(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL
            THEN 'numeric(' || numeric_precision || ',' || numeric_scale || ')'
            WHEN data_type = 'numeric' AND numeric_precision IS NOT NULL
            THEN 'numeric(' || numeric_precision || ')'
            ELSE data_type
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
          ', ' ORDER BY ordinal_position
        ) || ');' as create_statement
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1;
    `;
    
    const result = await this.localPool.query(query, [tableName]);
    return result.rows[0]?.create_statement || '';
  }

  buildAlterColumnStatement(table, column) {
    let dataType = column.data_type;
    
    // Handle specific data types properly
    if (column.data_type === 'character varying' && column.character_maximum_length) {
      dataType = `character varying(${column.character_maximum_length})`;
    } else if (column.data_type === 'numeric' && column.numeric_precision) {
      if (column.numeric_scale) {
        dataType = `numeric(${column.numeric_precision},${column.numeric_scale})`;
      } else {
        dataType = `numeric(${column.numeric_precision})`;
      }
    }
    
    let sql = `ALTER TABLE ${table} ADD COLUMN ${column.column_name} ${dataType}`;
    
    if (column.is_nullable === 'NO') {
      sql += ' NOT NULL';
    }
    
    if (column.column_default) {
      sql += ` DEFAULT ${column.column_default}`;
    }
    
    return sql + ';';
  }

  async executeMigrations(dryRun = true) {
    console.log(`\n${dryRun ? '🧪 SIMULAÇÃO' : '🚀 EXECUTANDO'} migrações no Neon...`);
    
    if (this.migrations.length === 0) {
      console.log('✅ Nenhuma migração necessária!');
      return;
    }

    for (const migration of this.migrations) {
      console.log(`\n${dryRun ? '[DRY RUN]' : '[EXEC]'} ${migration.type}: ${migration.table || migration.index}`);
      console.log(`SQL: ${migration.sql}`);
      
      if (!dryRun) {
        try {
          await this.neonPool.query(migration.sql);
          console.log('✅ Executado com sucesso');
        } catch (error) {
          console.error('❌ Erro na execução:', error.message);
          throw error;
        }
      }
    }
  }

  async createBackup() {
    console.log('\n💾 Criando backup do Neon...');
    
    try {
      const tables = await this.getTables(this.neonPool);
      const backupData = {};
      
      for (const table of tables) {
        const result = await this.neonPool.query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `backup-neon-${timestamp}.json`;
      
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      console.log(`✅ Backup salvo em: ${backupFile}`);
      
      return backupFile;
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error.message);
      throw error;
    }
  }

  async verifySync() {
    console.log('\n🔍 Verificando sincronização...');
    
    const differences = await this.compareSchemas();
    
    if (differences.length === 0) {
      console.log('✅ Bancos estão 100% sincronizados!');
      return true;
    } else {
      console.log(`❌ Ainda existem ${differences.length} diferenças`);
      return false;
    }
  }

  async close() {
    await this.localPool.end();
    await this.neonPool.end();
  }
}

// Função principal
async function main() {
  const sync = new DatabaseSync();
  
  try {
    console.log('🚀 Iniciando sincronização de bancos de dados...\n');
    
    // 1. Criar backup do Neon
    console.log('ETAPA 1: Backup de segurança');
    await sync.createBackup();
    
    // 2. Comparar esquemas
    console.log('\nETAPA 2: Análise de diferenças');
    const differences = await sync.compareSchemas();
    
    if (differences.length === 0) {
      console.log('\n🎉 Bancos já estão sincronizados!');
      return;
    }
    
    // 3. Gerar migrações
    console.log('\nETAPA 3: Geração de migrações');
    const migrations = await sync.generateMigrations();
    
    // 4. Executar em modo dry-run primeiro
    console.log('\nETAPA 4: Simulação das migrações');
    await sync.executeMigrations(true);
    
    // 5. Confirmar execução
    console.log('\n❓ Deseja executar as migrações no Neon? (y/N)');
    
    // Para automação, vamos executar automaticamente
    // Em produção, você pode adicionar readline para confirmação manual
    const shouldExecute = process.argv.includes('--execute');
    
    if (shouldExecute) {
      console.log('\nETAPA 5: Executando migrações no Neon');
      await sync.executeMigrations(false);
      
      // 6. Verificar sincronização
      console.log('\nETAPA 6: Verificação final');
      const isSync = await sync.verifySync();
      
      if (isSync) {
        console.log('\n🎉 Sincronização concluída com sucesso!');
      } else {
        console.log('\n⚠️ Ainda existem diferenças. Verifique os logs.');
      }
    } else {
      console.log('\n💡 Para executar as migrações, rode: node sync-neon-database.js --execute');
    }
    
  } catch (error) {
    console.error('\n💥 Erro durante a sincronização:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sync.close();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { DatabaseSync };