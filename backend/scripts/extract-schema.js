const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Script para extrair schema do banco Neon e criar arquivo SQL
 * para replicar a estrutura em um banco local
 */

// Configuração do banco Neon
const NEON_CONFIG = {
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || ''
};

// Configuração do banco local (exemplo)
const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'gestao_escolar',
  user: 'postgres',
  password: 'postgres'
};

class SchemaExtractor {
  constructor() {
    this.neonClient = new Client(NEON_CONFIG);
    this.outputPath = path.join(__dirname, '../database/schema.sql');
    this.localSetupPath = path.join(__dirname, '../database/setup-local.sql');
  }

  async connect() {
    try {
      await this.neonClient.connect();
      console.log('✅ Conectado ao banco Neon');
    } catch (error) {
      console.error('❌ Erro ao conectar no banco Neon:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.neonClient.end();
    console.log('🔌 Desconectado do banco Neon');
  }

  /**
   * Extrai informações das tabelas
   */
  async extractTables() {
    const query = `
      SELECT 
        table_name,
        table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const result = await this.neonClient.query(query);
    return result.rows;
  }

  /**
   * Extrai DDL de uma tabela específica
   */
  async extractTableDDL(tableName) {
    // Obter colunas
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = $1
      ORDER BY ordinal_position;
    `;

    const columns = await this.neonClient.query(columnsQuery, [tableName]);

    // Obter constraints (chaves primárias, foreign keys, etc)
    const constraintsQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_schema = 'public' 
        AND tc.table_name = $1;
    `;

    const constraints = await this.neonClient.query(constraintsQuery, [tableName]);

    // Obter índices
    const indexesQuery = `
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = $1
        AND indexname NOT LIKE '%_pkey';
    `;

    const indexes = await this.neonClient.query(indexesQuery, [tableName]);

    return {
      tableName,
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows
    };
  }

  /**
   * Gera DDL SQL para uma tabela
   */
  generateTableDDL(tableInfo) {
    const { tableName, columns, constraints, indexes } = tableInfo;
    
    let ddl = `-- Tabela: ${tableName}\n`;
    ddl += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

    // Colunas
    const columnDefs = columns.map(col => {
      let def = `  ${col.column_name} ${col.data_type}`;
      
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      }
      
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL';
      }
      
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      
      return def;
    });

    ddl += columnDefs.join(',\n');

    // Constraints
    const primaryKeys = constraints.filter(c => c.constraint_type === 'PRIMARY KEY');
    const foreignKeys = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
    const uniqueKeys = constraints.filter(c => c.constraint_type === 'UNIQUE');

    if (primaryKeys.length > 0) {
      const pkColumns = primaryKeys.map(pk => pk.column_name).join(', ');
      ddl += `,\n  PRIMARY KEY (${pkColumns})`;
    }

    foreignKeys.forEach(fk => {
      ddl += `,\n  FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name})`;
    });

    uniqueKeys.forEach(uk => {
      ddl += `,\n  UNIQUE (${uk.column_name})`;
    });

    ddl += '\n);\n\n';

    // Índices
    indexes.forEach(idx => {
      ddl += `${idx.indexdef};\n`;
    });

    ddl += '\n';
    return ddl;
  }

  /**
   * Extrai dados de tabelas pequenas (lookup tables)
   */
  async extractTableData(tableName) {
    try {
      const result = await this.neonClient.query(`SELECT * FROM ${tableName} ORDER BY id`);
      
      if (result.rows.length === 0) {
        return '';
      }

      let insertSQL = `-- Dados da tabela: ${tableName}\n`;
      
      const columns = Object.keys(result.rows[0]);
      const columnsList = columns.join(', ');
      
      result.rows.forEach(row => {
        const values = columns.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          if (value instanceof Date) return `'${value.toISOString()}'`;
          return value;
        }).join(', ');
        
        insertSQL += `INSERT INTO ${tableName} (${columnsList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
      });
      
      insertSQL += '\n';
      return insertSQL;
    } catch (error) {
      console.warn(`⚠️  Erro ao extrair dados de ${tableName}:`, error.message);
      return '';
    }
  }

  /**
   * Executa a extração completa
   */
  async extractFullSchema() {
    try {
      await this.connect();
      
      console.log('📋 Extraindo lista de tabelas...');
      const tables = await this.extractTables();
      console.log(`✅ Encontradas ${tables.length} tabelas`);

      let fullSchema = `-- Schema extraído do banco Neon\n`;
      fullSchema += `-- Gerado em: ${new Date().toISOString()}\n`;
      fullSchema += `-- Banco origem: ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech\n\n`;

      // Criar database
      fullSchema += `-- Criar database (execute manualmente se necessário)\n`;
      fullSchema += `-- CREATE DATABASE gestao_escolar;\n`;
      fullSchema += `-- \\c gestao_escolar;\n\n`;

      console.log('🔄 Extraindo estrutura das tabelas...');
      
      for (const table of tables) {
        console.log(`  📄 Processando tabela: ${table.table_name}`);
        const tableInfo = await this.extractTableDDL(table.table_name);
        const tableDDL = this.generateTableDDL(tableInfo);
        fullSchema += tableDDL;
      }

      // Extrair dados de tabelas de configuração
      const configTables = ['modalidades', 'usuarios', 'fornecedores'];
      
      console.log('📊 Extraindo dados de configuração...');
      for (const tableName of configTables) {
        if (tables.some(t => t.table_name === tableName)) {
          console.log(`  📊 Extraindo dados: ${tableName}`);
          const tableData = await this.extractTableData(tableName);
          fullSchema += tableData;
        }
      }

      // Salvar arquivo
      const outputDir = path.dirname(this.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(this.outputPath, fullSchema, 'utf8');
      console.log(`✅ Schema salvo em: ${this.outputPath}`);

      // Criar script de setup local
      this.createLocalSetupScript();

      await this.disconnect();
      
      console.log('🎉 Extração concluída com sucesso!');
      console.log(`📁 Arquivos gerados:`);
      console.log(`   - ${this.outputPath}`);
      console.log(`   - ${this.localSetupPath}`);
      
    } catch (error) {
      console.error('❌ Erro durante extração:', error.message);
      throw error;
    }
  }

  /**
   * Cria script para configurar banco local
   */
  createLocalSetupScript() {
    const setupScript = `#!/bin/bash
# Script para configurar banco PostgreSQL local
# Execute este script após instalar PostgreSQL

echo "🚀 Configurando banco de dados local..."

# Configurações
DB_NAME="gestao_escolar"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Criar database
echo "📋 Criando database..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Executar schema
echo "🔧 Executando schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$(dirname "$0")/schema.sql"

echo "✅ Configuração concluída!"
echo "🔗 String de conexão local:"
echo "postgresql://$DB_USER:SUA_SENHA@$DB_HOST:$DB_PORT/$DB_NAME"

# Instruções para Windows
echo ""
echo "📝 Para Windows (PowerShell):"
echo "createdb -h localhost -p 5432 -U postgres gestao_escolar"
echo "psql -h localhost -p 5432 -U postgres -d gestao_escolar -f schema.sql"
`;

    const setupDir = path.dirname(this.localSetupPath);
    if (!fs.existsSync(setupDir)) {
      fs.mkdirSync(setupDir, { recursive: true });
    }

    fs.writeFileSync(this.localSetupPath, setupScript, 'utf8');
    
    // Tornar executável no Unix
    try {
      fs.chmodSync(this.localSetupPath, '755');
    } catch (error) {
      // Ignorar erro no Windows
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const extractor = new SchemaExtractor();
  extractor.extractFullSchema()
    .then(() => {
      console.log('🎯 Próximos passos:');
      console.log('1. Instale PostgreSQL localmente');
      console.log('2. Execute: cd backend/database && ./setup-local.sql');
      console.log('3. Configure a string de conexão no .env');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha na extração:', error);
      process.exit(1);
    });
}

module.exports = SchemaExtractor;