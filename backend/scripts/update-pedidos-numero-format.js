/**
 * Script para atualizar formato dos números de pedidos existentes
 * De: PED2026000001
 * Para: PED-MAR2026000001 (baseado na competencia_mes_ano)
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function updateNumeros(pool, dbName) {
  const client = await pool.connect();
  
  try {
    console.log(`\n🔧 Atualizando números de pedidos em ${dbName}...\n`);
    
    // Buscar pedidos que precisam ser atualizados
    const pedidos = await client.query(`
      SELECT id, numero, competencia_mes_ano
      FROM pedidos
      WHERE numero NOT LIKE 'PED-%'
      ORDER BY id
    `);

    if (pedidos.rows.length === 0) {
      console.log('✅ Nenhum pedido precisa ser atualizado');
      return;
    }

    console.log(`📋 ${pedidos.rows.length} pedido(s) para atualizar\n`);

    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    for (const pedido of pedidos.rows) {
      const numeroAntigo = pedido.numero;
      
      // Extrair ano e sequencial do número antigo (PED2026000001)
      const match = numeroAntigo.match(/PED(\d{4})(\d{6})/);
      
      if (!match) {
        console.log(`⚠️  Formato inválido: ${numeroAntigo}`);
        continue;
      }

      const [, ano, sequencial] = match;
      
      // Usar competencia_mes_ano para determinar o mês
      const [anoComp, mesComp] = pedido.competencia_mes_ano.split('-');
      const mesAbrev = meses[parseInt(mesComp) - 1];
      
      // Gerar novo número: PED-MAR2026000001
      const numeroNovo = `PED-${mesAbrev}${anoComp}${sequencial}`;
      
      // Atualizar
      await client.query(`
        UPDATE pedidos 
        SET numero = $1
        WHERE id = $2
      `, [numeroNovo, pedido.id]);

      console.log(`  ✅ ${numeroAntigo} → ${numeroNovo}`);
    }

    console.log(`\n✅ ${pedidos.rows.length} pedido(s) atualizado(s) em ${dbName}`);

  } catch (error) {
    console.error(`❌ Erro em ${dbName}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Atualizando formato de números de pedidos...');

  // LOCAL
  if (process.env.DATABASE_URL) {
    const localPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });

    await updateNumeros(localPool, 'LOCAL');
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

    await updateNumeros(neonPool, 'NEON');
    await neonPool.end();
  } else {
    console.log('⚠️  NEON_DATABASE_URL não configurada, pulando NEON');
  }

  console.log('\n✅ Atualização concluída em ambos os bancos!');
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
