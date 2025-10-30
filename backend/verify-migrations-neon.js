/**
 * Script para verificar se as migrações foram aplicadas corretamente no Neon
 */

const { Pool } = require('pg');

// Configuração do banco Neon
const pool = new Pool({
  host: 'ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_PDfBTKRsi29G',
  ssl: {
    rejectUnauthorized: false
  }
});

async function verifyMigrations() {
  console.log('🔍 Verificando migrações no banco Neon...\n');
  
  try {
    // Verificar se a coluna motivo permite NULL na tabela estoque_movimentacoes
    console.log('1️⃣ Verificando campo motivo na tabela estoque_movimentacoes...');
    const motivoResult = await pool.query(`
      SELECT 
        column_name,
        is_nullable,
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'estoque_movimentacoes' 
      AND column_name = 'motivo'
    `);
    
    if (motivoResult.rows.length > 0) {
      const row = motivoResult.rows[0];
      console.log(`   ✅ Coluna motivo: ${row.data_type}, nullable: ${row.is_nullable}`);
      
      if (row.is_nullable === 'YES') {
        console.log('   ✅ Campo motivo é opcional (permite NULL)');
      } else {
        console.log('   ❌ Campo motivo ainda é obrigatório');
      }
    } else {
      console.log('   ❌ Coluna motivo não encontrada');
    }
    
    console.log('');
    
    // Verificar se as colunas data_validade e data_entrada existem na tabela estoque_escolas
    console.log('2️⃣ Verificando colunas na tabela estoque_escolas...');
    const estoqueResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'estoque_escolas' 
      AND column_name IN ('data_validade', 'data_entrada')
      ORDER BY column_name
    `);
    
    if (estoqueResult.rows.length > 0) {
      estoqueResult.rows.forEach(row => {
        console.log(`   ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        if (row.column_default) {
          console.log(`      Default: ${row.column_default}`);
        }
      });
    } else {
      console.log('   ❌ Colunas data_validade e data_entrada não encontradas');
    }
    
    console.log('');
    
    // Verificar índices criados
    console.log('3️⃣ Verificando índices criados...');
    const indexResult = await pool.query(`
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('estoque_movimentacoes', 'estoque_escolas')
      AND indexname LIKE '%data_%'
      ORDER BY tablename, indexname
    `);
    
    if (indexResult.rows.length > 0) {
      indexResult.rows.forEach(row => {
        console.log(`   ✅ Índice: ${row.indexname} na tabela ${row.tablename}`);
      });
    } else {
      console.log('   ℹ️  Nenhum índice específico de data encontrado');
    }
    
    console.log('\n🎉 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  verifyMigrations();
}

module.exports = { verifyMigrations };