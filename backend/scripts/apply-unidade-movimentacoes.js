/**
 * Script para aplicar migration de unidade nas movimentações
 * Adiciona campo unidade para preservar histórico correto
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function aplicarMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migration: Adicionar unidade nas movimentações...\n');
    
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '../src/migrations/20260304_add_unidade_to_movimentacoes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar migration
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
      LIMIT 5
    `);
    
    console.log('\n📋 Amostra de movimentações:');
    sample.rows.forEach(mov => {
      console.log(`  - ${mov.produto_nome}: ${mov.quantidade} ${mov.unidade} (${mov.tipo}) - ${new Date(mov.created_at).toLocaleString('pt-BR')}`);
      if (mov.unidade !== mov.unidade_atual_produto) {
        console.log(`    ⚠️  Unidade da movimentação (${mov.unidade}) diferente da atual (${mov.unidade_atual_produto})`);
      }
    });
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration aplicada com sucesso!');
    console.log('\n📌 Próximos passos:');
    console.log('   1. Atualizar o Model para salvar unidade nas novas movimentações');
    console.log('   2. Atualizar as telas do app para exibir a unidade do histórico');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
aplicarMigration()
  .then(() => {
    console.log('\n🎉 Processo concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
