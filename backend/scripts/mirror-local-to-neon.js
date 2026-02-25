const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurações de conexão
const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
};

const NEON_CONFIG = {
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
};

if (!NEON_CONFIG.connectionString) {
  console.error('❌ Defina POSTGRES_URL ou DATABASE_URL no ambiente.');
  process.exit(1);
}

// Função para mapear tipos PostgreSQL
function mapPostgresType(dataType, udtName, charMaxLength, numericPrecision, numericScale) {
  switch (dataType) {
    case 'integer':
      return 'INTEGER';
    case 'bigint':
      return 'BIGINT';
    case 'smallint':
      return 'SMALLINT';
    case 'numeric':
    case 'decimal':
      if (numericPrecision && numericScale) {
        return `DECIMAL(${numericPrecision},${numericScale})`;
      }
      return 'DECIMAL';
    case 'real':
      return 'REAL';
    case 'double precision':
      return 'DOUBLE PRECISION';
    case 'character varying':
    case 'varchar':
      return charMaxLength ? `VARCHAR(${charMaxLength})` : 'VARCHAR';
    case 'character':
    case 'char':
      return charMaxLength ? `CHAR(${charMaxLength})` : 'CHAR';
    case 'text':
      return 'TEXT';
    case 'boolean':
    case 'bool':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'timestamp without time zone':
    case 'timestamp':
      return 'TIMESTAMP';
    case 'timestamp with time zone':
    case 'timestamptz':
      return 'TIMESTAMPTZ';
    case 'time without time zone':
    case 'time':
      return 'TIME';
    case 'time with time zone':
    case 'timetz':
      return 'TIMETZ';
    case 'uuid':
      return 'UUID';
    case 'json':
      return 'JSON';
    case 'jsonb':
      return 'JSONB';
    case 'serial':
      return 'SERIAL';
    case 'bigserial':
      return 'BIGSERIAL';
    default:
      // Para tipos não mapeados, usar o nome do tipo
      return udtName || dataType;
  }
}

// Função para extrair schema de uma tabela
async function getTableSchema(client, tableName) {
  try {
    // Obter estrutura da tabela
    const columnsResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    // Obter constraints
    const constraintsResult = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = $1
      ORDER BY tc.constraint_name
    `, [tableName]);

    // Obter índices
    const indexesResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = $1
      ORDER BY indexname
    `, [tableName]);

    return {
      columns: columnsResult.rows,
      constraints: constraintsResult.rows,
      indexes: indexesResult.rows
    };
  } catch (error) {
    console.error(`Erro ao extrair schema da tabela ${tableName}:`, error.message);
    throw error;
  }
}

// Função para extrair dados de uma tabela
async function getTableData(client, tableName) {
  try {
    const result = await client.query(`SELECT * FROM ${tableName}`);
    return result.rows;
  } catch (error) {
    console.error(`Erro ao extrair dados da tabela ${tableName}:`, error.message);
    throw error;
  }
}

// Função para gerar CREATE TABLE
function generateCreateTableSQL(tableName, schema) {
  const columns = schema.columns.map(col => {
    const pgType = mapPostgresType(col.data_type, col.udt_name, col.character_maximum_length, col.numeric_precision, col.numeric_scale);
    let colDef = `${col.column_name} ${pgType}`;
    
    if (col.is_nullable === 'NO') {
      colDef += ' NOT NULL';
    }
    
    if (col.column_default) {
      // Ignorar defaults de sequências (serão recriados)
      if (!col.column_default.includes('nextval')) {
        colDef += ` DEFAULT ${col.column_default}`;
      }
    }
    
    return colDef;
  }).join(',\n  ');

  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns}\n);`;
}

// Função para gerar INSERT statements
function generateInsertSQL(tableName, data) {
  if (data.length === 0) return '';
  
  const columns = Object.keys(data[0]);
  const values = data.map(row => {
    const rowValues = columns.map(col => {
      const value = row[col];
      if (value === null) return 'NULL';
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value instanceof Date) return `'${value.toISOString()}'`;
      return value;
    });
    return `(${rowValues.join(', ')})`;
  }).join(',\n  ');

  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n  ${values};`;
}

// Função para obter lista de tabelas
async function getTables(client) {
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  } catch (error) {
    console.error('Erro ao obter lista de tabelas:', error.message);
    throw error;
  }
}

// Função principal
async function mirrorDatabase() {
  let localClient, neonClient;
  
  try {
    console.log('🔍 Conectando ao banco local...');
    localClient = new Client(LOCAL_CONFIG);
    await localClient.connect();
    
    console.log('🔌 Conectando ao Neon...');
    neonClient = new Client({
      connectionString: NEON_CONFIG.connectionString,
      ssl: { rejectUnauthorized: false }
    });
    await neonClient.connect();
    
    console.log('📋 Obtendo lista de tabelas do banco local...');
    const tables = await getTables(localClient);
    console.log(`📊 Encontradas ${tables.length} tabelas: ${tables.join(', ')}`);
    
    // Iniciar transação no Neon
    await neonClient.query('BEGIN');
    
    for (const tableName of tables) {
      console.log(`\n🔧 Processando tabela: ${tableName}`);
      
      try {
        // Extrair schema
        console.log(`  📄 Extraindo schema...`);
        const schema = await getTableSchema(localClient, tableName);
        
        // Gerar e executar CREATE TABLE
        const createSQL = generateCreateTableSQL(tableName, schema);
        console.log(`  📝 Criando tabela...`);
        console.log(`  SQL: ${createSQL.substring(0, 100)}...`);
        await neonClient.query(createSQL);
        
        // Extrair e inserir dados
        console.log(`  💾 Extraindo dados...`);
        const data = await getTableData(localClient, tableName);
        
        if (data.length > 0) {
          console.log(`  ⬆️ Inserindo ${data.length} registros...`);
          const insertSQL = generateInsertSQL(tableName, data);
          if (insertSQL) {
            await neonClient.query(insertSQL);
          }
        } else {
          console.log(`  ✨ Tabela vazia, pulando inserção.`);
        }
        
        console.log(`  ✅ Tabela ${tableName} processada com sucesso.`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar tabela ${tableName}:`, error.message);
        // Continuar com próxima tabela
      }
    }
    
    // Commit da transação
    await neonClient.query('COMMIT');
    console.log('\n🎉 Mirror concluído com sucesso!');
    
  } catch (error) {
    console.error('\n💥 Erro geral:', error.message);
    if (neonClient) {
      try {
        await neonClient.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Erro ao fazer rollback:', rollbackError.message);
      }
    }
    process.exit(1);
    
  } finally {
    if (localClient) await localClient.end();
    if (neonClient) await neonClient.end();
  }
}

// Executar o mirror
mirrorDatabase().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});