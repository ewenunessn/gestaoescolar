const { Pool } = require('pg');

// Configuração do Neon
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function checkNeonStructure() {
  const pool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔍 Verificando estrutura atual no Neon...\n');

    // Verificar tabelas existentes
    console.log('1. Tabelas existentes:');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    // Verificar estrutura da tabela demandas se existir
    const demandasExists = tables.rows.some(table => table.table_name === 'demandas');
    
    if (demandasExists) {
      console.log('\n2. Estrutura da tabela demandas:');
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'demandas' 
        ORDER BY ordinal_position;
      `);
      
      columns.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });

      // Verificar constraints
      console.log('\n3. Constraints da tabela demandas:');
      const constraints = await pool.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'demandas';
      `);
      
      constraints.rows.forEach(constraint => {
        console.log(`   ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });

      // Verificar índices
      console.log('\n4. Índices da tabela demandas:');
      const indexes = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'demandas' 
        AND schemaname = 'public';
      `);
      
      indexes.rows.forEach(index => {
        console.log(`   ${index.indexname}`);
      });

      // Contar registros
      console.log('\n5. Dados existentes:');
      const count = await pool.query(`SELECT COUNT(*) as total FROM demandas;`);
      console.log(`   Total de registros: ${count.rows[0].total}`);
      
      if (count.rows[0].total > 0) {
        const sample = await pool.query(`SELECT * FROM demandas LIMIT 1;`);
        console.log('\n   Exemplo de registro:');
        console.log('  ', JSON.stringify(sample.rows[0], null, 2));
      }
    } else {
      console.log('\n2. Tabela demandas não existe');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkNeonStructure();