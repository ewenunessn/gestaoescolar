const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function executarMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migration de unidades de medida...\n');
    
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '../migrations/20260323_criar_tabela_unidades_medida.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar migration
    await client.query(sql);
    
    console.log('✅ Migration executada com sucesso!\n');
    
    // Verificar unidades criadas
    const unidades = await client.query(`
      SELECT codigo, nome, tipo, fator_conversao_base 
      FROM unidades_medida 
      ORDER BY tipo, codigo
    `);
    
    console.log('📊 Unidades de medida criadas:');
    console.log('─'.repeat(70));
    
    let tipoAtual = '';
    unidades.rows.forEach(u => {
      if (u.tipo !== tipoAtual) {
        tipoAtual = u.tipo;
        console.log(`\n${tipoAtual.toUpperCase()}:`);
      }
      console.log(`  ${u.codigo.padEnd(5)} - ${u.nome.padEnd(20)} (fator: ${u.fator_conversao_base})`);
    });
    
    // Verificar migração de produtos
    const produtosMigrados = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(unidade_medida_id) as migrados
      FROM produtos
    `);
    
    console.log('\n📦 Status da migração de produtos:');
    console.log(`  Total: ${produtosMigrados.rows[0].total}`);
    console.log(`  Migrados: ${produtosMigrados.rows[0].migrados}`);
    console.log(`  Pendentes: ${produtosMigrados.rows[0].total - produtosMigrados.rows[0].migrados}`);
    
    // Verificar migração de contratos
    const contratosMigrados = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(unidade_medida_compra_id) as migrados
      FROM contrato_produtos
    `);
    
    console.log('\n📋 Status da migração de contratos:');
    console.log(`  Total: ${contratosMigrados.rows[0].total}`);
    console.log(`  Migrados: ${contratosMigrados.rows[0].migrados}`);
    console.log(`  Pendentes: ${contratosMigrados.rows[0].total - contratosMigrados.rows[0].migrados}`);
    
    // Mostrar produtos não migrados
    if (produtosMigrados.rows[0].total - produtosMigrados.rows[0].migrados > 0) {
      const naoMigrados = await client.query(`
        SELECT id, nome, unidade_distribuicao
        FROM produtos
        WHERE unidade_medida_id IS NULL
        LIMIT 10
      `);
      
      console.log('\n⚠️  Produtos não migrados (primeiros 10):');
      naoMigrados.rows.forEach(p => {
        console.log(`  ID ${p.id}: ${p.nome} (${p.unidade_distribuicao || 'sem unidade'})`);
      });
    }
    
    console.log('\n✅ Migration concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executarMigration();
