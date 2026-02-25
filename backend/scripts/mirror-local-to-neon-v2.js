const { Client } = require('pg');

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

// Função para obter lista de tabelas com suas dependências
async function getTablesWithDependencies(client) {
  try {
    const result = await client.query(`
      SELECT 
        t.table_name,
        COUNT(tc.constraint_name) as fk_count
      FROM information_schema.tables t
      LEFT JOIN information_schema.table_constraints tc
        ON t.table_name = tc.table_name
        AND t.table_schema = tc.table_schema
        AND tc.constraint_type = 'FOREIGN KEY'
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY COUNT(tc.constraint_name) ASC, t.table_name
    `);
    
    return result.rows.map(row => row.table_name);
  } catch (error) {
    console.error('Erro ao obter lista de tabelas com dependências:', error.message);
    throw error;
  }
}

// Função para extrair schema de uma tabela (sem constraints)
async function getTableSchemaBasic(client, tableName) {
  try {
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

    return columnsResult.rows;
  } catch (error) {
    console.error(`Erro ao extrair schema básico da tabela ${tableName}:`, error.message);
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

// Função para gerar CREATE TABLE (sem constraints)
function generateCreateTableSQLBasic(tableName, columns) {
  const columnsSQL = columns.map(col => {
    const pgType = mapPostgresType(col.data_type, col.udt_name, col.character_maximum_length, col.numeric_precision, col.numeric_scale);
    let colDef = `${col.column_name} ${pgType}`;
    
    if (col.is_nullable === 'NO') {
      colDef += ' NOT NULL';
    }
    
    if (col.column_default) {
      // Ignorar defaults de sequências e funções não disponíveis no Neon
      if (!col.column_default.includes('nextval') && 
          !col.column_default.includes('uuid_generate_v4') &&
          !col.column_default.includes('now()')) {
        colDef += ` DEFAULT ${col.column_default}`;
      }
    }
    
    return colDef;
  }).join(',\n  ');

  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columnsSQL}\n);`;
}

// Função para gerar INSERT statements com tratamento de dados
function generateInsertSQL(tableName, data) {
  if (data.length === 0) return '';
  
  const columns = Object.keys(data[0]);
  const values = data.map(row => {
    const rowValues = columns.map(col => {
      const value = row[col];
      if (value === null) return 'NULL';
      if (typeof value === 'string') {
        // Escapar aspas simples e limitar tamanho se necessário
        const escaped = value.replace(/'/g, "''");
        return `'${escaped}'`;
      }
      if (value instanceof Date) return `'${value.toISOString()}'`;
      if (typeof value === 'object') return `'${JSON.stringify(value)}'`;
      return value;
    });
    return `(${rowValues.join(', ')})`;
  }).join(',\n  ');

  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n  ${values};`;
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
    
    console.log('📋 Obtendo lista de tabelas ordenadas por dependências...');
    const tables = await getTablesWithDependencies(localClient);
    console.log(`📊 Encontradas ${tables.length} tabelas`);
    
    // Processar tabelas uma por uma (sem transação para evitar rollback em caso de erro)
    for (const tableName of tables) {
      console.log(`\n🔧 Processando tabela: ${tableName}`);
      
      try {
        // Dropar tabela existente no Neon (se houver)
        console.log(`  🗑️  Dropando tabela existente...`);
        await neonClient.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
        
        // Extrair schema básico (sem constraints)
        console.log(`  📄 Extraindo schema...`);
        const columns = await getTableSchemaBasic(localClient, tableName);
        
        // Gerar e executar CREATE TABLE
        const createSQL = generateCreateTableSQLBasic(tableName, columns);
        console.log(`  📝 Criando tabela...`);
        await neonClient.query(createSQL);
        
        // Extrair e inserir dados
        console.log(`  💾 Extraindo dados...`);
        const data = await getTableData(localClient, tableName);
        
        if (data.length > 0) {
          console.log(`  ⬆️ Inserindo ${data.length} registros...`);
          const insertSQL = generateInsertSQL(tableName, data);
          if (insertSQL) {
            // Dividir em lotes se for muitos registros
            const batchSize = 1000;
            if (data.length > batchSize) {
              for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                const batchSQL = generateInsertSQL(tableName, batch);
                await neonClient.query(batchSQL);
                console.log(`    ✅ Lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} inserido`);
              }
            } else {
              await neonClient.query(insertSQL);
            }
          }
        } else {
          console.log(`  ✨ Tabela vazia, pulando inserção.`);
        }
        
        console.log(`  ✅ Tabela ${tableName} processada com sucesso.`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar tabela ${tableName}:`, error.message);
        // Continuar com próxima tabela mesmo em caso de erro
      }
    }
    
    console.log('\n🎉 Mirror concluído com sucesso!');
    
  } catch (error) {
    console.error('\n💥 Erro geral:', error.message);
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