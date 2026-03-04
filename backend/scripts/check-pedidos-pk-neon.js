/**
 * Script para verificar PRIMARY KEY da tabela pedidos no NEON
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkPK() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verificando PRIMARY KEY de pedidos no NEON...\n');
    
    // Verificar constraints
    const constraints = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      LEFT JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'pedidos'
      ORDER BY tc.constraint_type, tc.constraint_name
    `);

    console.log('📋 Constraints encontradas:');
    for (const c of constraints.rows) {
      console.log(`  - ${c.constraint_type}: ${c.constraint_name} (${c.column_name || 'N/A'})`);
    }

    const hasPK = constraints.rows.some(c => c.constraint_type === 'PRIMARY KEY');
    
    if (!hasPK) {
      console.log('\n❌ Tabela pedidos NÃO tem PRIMARY KEY!');
      console.log('\n💡 Solução:');
      console.log('   ALTER TABLE pedidos ADD PRIMARY KEY (id);');
    } else {
      console.log('\n✅ Tabela pedidos tem PRIMARY KEY');
    }

    // Verificar se há duplicatas no id
    const duplicates = await client.query(`
      SELECT id, COUNT(*) as count
      FROM pedidos
      GROUP BY id
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      console.log('\n⚠️  IDs duplicados encontrados:');
      for (const dup of duplicates.rows) {
        console.log(`  - ID ${dup.id}: ${dup.count} registros`);
      }
    } else {
      console.log('\n✅ Nenhum ID duplicado');
    }

    // Verificar se há NULLs no id
    const nulls = await client.query(`
      SELECT COUNT(*) as count
      FROM pedidos
      WHERE id IS NULL
    `);

    if (parseInt(nulls.rows[0].count) > 0) {
      console.log(`\n⚠️  ${nulls.rows[0].count} registros com ID NULL`);
    } else {
      console.log('\n✅ Nenhum ID NULL');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPK()
  .then(() => {
    console.log('\n🎉 Verificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
