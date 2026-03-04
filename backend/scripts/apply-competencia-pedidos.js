/**
 * Script para aplicar migration de competência em pedidos
 * Aplica em LOCAL e NEON
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function applyMigration(pool, dbName) {
  const client = await pool.connect();
  
  try {
    console.log(`\n🔧 Aplicando migration em ${dbName}...\n`);
    
    const migration = fs.readFileSync(
      path.join(__dirname, '../src/migrations/20260304_add_competencia_to_pedidos.sql'),
      'utf8'
    );

    await client.query(migration);
    console.log(`✅ Migration aplicada em ${dbName}`);

    // Verificar resultado
    const result = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(competencia_mes_ano) as com_competencia
      FROM pedidos
    `);

    console.log(`📊 Pedidos: ${result.rows[0].total} total, ${result.rows[0].com_competencia} com competência`);

    // Mostrar alguns exemplos
    const exemplos = await client.query(`
      SELECT numero, data_pedido, competencia_mes_ano
      FROM pedidos
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (exemplos.rows.length > 0) {
      console.log('\n📋 Exemplos:');
      for (const p of exemplos.rows) {
        console.log(`  - ${p.numero} | ${p.data_pedido} | ${p.competencia_mes_ano}`);
      }
    }

  } catch (error) {
    console.error(`❌ Erro em ${dbName}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Aplicando migration de competência em pedidos...');

  // LOCAL
  if (process.env.DATABASE_URL) {
    const localPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });

    await applyMigration(localPool, 'LOCAL');
    await localPool.end();
  } else {
    console.log('⚠️  DATABASE_URL não configurada, pulando LOCAL');
  }

  // NEON
  if (process.env.NEON_DATABASE_URL) {
    const neonPool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await applyMigration(neonPool, 'NEON');
    await neonPool.end();
  } else {
    console.log('⚠️  NEON_DATABASE_URL não configurada, pulando NEON');
  }

  console.log('\n✅ Migration aplicada com sucesso em ambos os bancos!');
}

main()
  .then(() => {
    console.log('\n🎉 Script finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
