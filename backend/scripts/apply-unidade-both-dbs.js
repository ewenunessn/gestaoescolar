/**
 * Script para aplicar migration de unidade em AMBOS os bancos (local e Neon)
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Ler .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function aplicarEmBanco(connectionString, nomeBanco) {
  const pool = new Pool({
    connectionString,
    ssl: nomeBanco === 'Neon' ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  
  try {
    console.log(`\n🔄 Aplicando migration em ${nomeBanco}...\n`);
    
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '../src/migrations/20260304_add_unidade_to_movimentacoes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query('BEGIN');
    
    console.log('📝 Adicionando coluna unidade...');
    await client.query(sql);
    
    // Verificar quantas movimentações foram atualizadas
    const result = await client.query(`
      SELECT COUNT(*) as total
      FROM estoque_central_movimentacoes
      WHERE unidade IS NOT NULL
    `);
    
    console.log(`✅ ${result.rows[0].total} movimentações atualizadas com unidade`);
    
    // Verificar algumas movimentações
    const sample = await client.query(`
      SELECT 
        ecm.id,
        ecm.tipo,
        ecm.quantidade,
        ecm.unidade,
        p.nome as produto_nome,
        p.unidade as unidade_atual_produto,
        ecm.created_at
      FROM estoque_central_movimentacoes ecm
      INNER JOIN estoque_central ec ON ec.id = ecm.estoque_central_id
      INNER JOIN produtos p ON p.id = ec.produto_id
      ORDER BY ecm.created_at DESC
      LIMIT 3
    `);
    
    if (sample.rows.length > 0) {
      console.log('\n📋 Amostra de movimentações:');
      sample.rows.forEach(mov => {
        console.log(`  - ${mov.produto_nome}: ${mov.quantidade} ${mov.unidade} (${mov.tipo})`);
        if (mov.unidade !== mov.unidade_atual_produto) {
          console.log(`    ⚠️  Unidade diferente da atual (${mov.unidade_atual_produto})`);
        }
      });
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Migration aplicada com sucesso em ${nomeBanco}!`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Erro ao aplicar migration em ${nomeBanco}:`, error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Iniciando aplicação de migration em ambos os bancos...\n');
  
  try {
    // Aplicar no banco local
    if (process.env.DATABASE_URL) {
      await aplicarEmBanco(process.env.DATABASE_URL, 'Local');
    } else {
      console.log('⚠️  DATABASE_URL não configurada, pulando banco local');
    }
    
    // Aplicar no Neon
    if (process.env.NEON_DATABASE_URL) {
      await aplicarEmBanco(process.env.NEON_DATABASE_URL, 'Neon');
    } else {
      console.log('⚠️  NEON_DATABASE_URL não configurada, pulando Neon');
    }
    
    console.log('\n🎉 Processo concluído com sucesso!');
    console.log('\n📌 Próximos passos:');
    console.log('   1. Reiniciar o backend');
    console.log('   2. Testar no app mobile');
    console.log('   3. Fazer commit das alterações');
    
  } catch (error) {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  }
}

main();
