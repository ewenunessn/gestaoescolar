// Script para verificar quais tabelas referenciam produtos
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function checkTables() {
  try {
    console.log('🔍 Verificando tabelas que referenciam produtos...\n');
    
    const tablesToCheck = [
      'estoque_central',
      'guia_produto_escola',
      'cardapio_refeicao_produtos',
      'faturamento_itens',
      'produto_composicao_nutricional',
      'pedido_itens',
      'contrato_produtos',
      'estoque_lotes',
      'estoque_escolas',
      'estoque_movimentacoes',
      'fornecedor_produtos',
      'refeicao_produtos'
    ];
    
    const existingTables = [];
    
    for (const table of tablesToCheck) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        // Verificar se tem coluna produto_id
        const columnResult = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'produto_id'
        `, [table]);
        
        if (columnResult.rows.length > 0) {
          existingTables.push(table);
          console.log(`✅ ${table} - existe e tem produto_id`);
        } else {
          console.log(`⚠️  ${table} - existe mas não tem produto_id`);
        }
      } else {
        console.log(`❌ ${table} - não existe`);
      }
    }
    
    console.log('\n📋 Tabelas que devem ser incluídas no DELETE:');
    console.log(existingTables.join('\n'));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
