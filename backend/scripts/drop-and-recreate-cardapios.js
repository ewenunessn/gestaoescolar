const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function dropAndRecreate() {
  try {
    console.log('🗑️  Removendo tabelas antigas de cardápios...\n');
    
    // Dropar constraints primeiro
    await pool.query('ALTER TABLE IF EXISTS cardapio_refeicao_produtos DROP CONSTRAINT IF EXISTS uk_refeicao_produto CASCADE');
    await pool.query('ALTER TABLE IF EXISTS cardapio_refeicao_produtos DROP CONSTRAINT IF EXISTS uk_cardapio_modalidade_nome CASCADE');
    
    // Dropar tabelas novas se existirem
    await pool.query('DROP TABLE IF EXISTS cardapio_refeicao_produtos CASCADE');
    await pool.query('DROP TABLE IF EXISTS cardapio_refeicoes_dia CASCADE');
    await pool.query('DROP TABLE IF EXISTS cardapios_modalidade CASCADE');
    console.log('✅ Tabelas novas removidas\n');
    
    // Aplicar migration
    console.log('📝 Criando novas tabelas...');
    const sqlPath = path.join(__dirname, '../src/migrations/20260305_refactor_cardapios.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Tabelas criadas com sucesso!\n');
    
    // Verificar
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('cardapios_modalidade', 'cardapio_refeicoes_dia', 'cardapio_refeicao_produtos')
      ORDER BY table_name
    `);
    
    console.log(`✅ Tabelas verificadas: ${result.rows.length}`);
    result.rows.forEach(row => console.log(`   - ${row.table_name}`));
    
    console.log('\n✅ Pronto! Reinicie o servidor backend.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

dropAndRecreate();
