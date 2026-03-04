/**
 * Script para adicionar PRIMARY KEY em contrato_produtos no NEON
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixPK() {
  if (!process.env.NEON_DATABASE_URL) {
    console.log('⚠️  NEON_DATABASE_URL não configurada');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Corrigindo PRIMARY KEY em contrato_produtos no NEON...\n');
    
    // Verificar se já tem PK
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'contrato_produtos' AND constraint_type = 'PRIMARY KEY'
    `);

    if (constraints.rows.length > 0) {
      console.log('✅ PRIMARY KEY já existe em contrato_produtos');
      return;
    }

    // Verificar duplicatas
    const duplicates = await client.query(`
      SELECT id, COUNT(*) as count
      FROM contrato_produtos
      GROUP BY id
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      console.log('⚠️  IDs duplicados encontrados:');
      for (const dup of duplicates.rows) {
        console.log(`  - ID ${dup.id}: ${dup.count} registros`);
      }
      throw new Error('Não é possível adicionar PRIMARY KEY com IDs duplicados');
    }

    // Verificar NULLs
    const nulls = await client.query(`
      SELECT COUNT(*) as count
      FROM contrato_produtos
      WHERE id IS NULL
    `);

    if (parseInt(nulls.rows[0].count) > 0) {
      console.log(`⚠️  ${nulls.rows[0].count} registros com ID NULL`);
      throw new Error('Não é possível adicionar PRIMARY KEY com IDs NULL');
    }

    // Adicionar PRIMARY KEY
    await client.query(`ALTER TABLE contrato_produtos ADD PRIMARY KEY (id)`);
    console.log('✅ PRIMARY KEY adicionada em contrato_produtos');

    // Agora adicionar a FK que faltou
    console.log('\n🔗 Adicionando FK em pedido_itens...');
    
    try {
      await client.query(`
        ALTER TABLE pedido_itens 
        ADD CONSTRAINT pedido_itens_contrato_produto_id_fkey 
        FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id) ON DELETE RESTRICT
      `);
      console.log('  ✅ FK contrato_produto_id -> contrato_produtos(id)');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⏭️  FK contrato_produto_id já existe');
      } else {
        throw e;
      }
    }

    console.log('\n✅ Correções aplicadas com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixPK()
  .then(() => {
    console.log('\n🎉 Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
