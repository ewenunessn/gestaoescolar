const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// FORÇAR uso do banco LOCAL
const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function applyMigration() {
  try {
    console.log('🚀 Iniciando refatoração do módulo de cardápios...\n');
    console.log('📍 Banco: LOCAL (localhost:5432/alimentacao_escolar)\n');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '../src/migrations/20260305_refactor_cardapios.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar a migration
    console.log('📝 Executando migration...');
    await pool.query(sql);
    console.log('✅ Migration executada com sucesso!\n');
    
    // Verificar tabelas criadas
    console.log('🔍 Verificando tabelas criadas...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('cardapios_modalidade', 'cardapio_refeicoes_dia', 'cardapio_refeicao_produtos')
      ORDER BY table_name
    `);
    
    console.log(`✅ Tabelas encontradas: ${tables.rows.length}`);
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('\n✅ Refatoração concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Reiniciar o servidor backend');
    console.log('   2. Testar os endpoints da API');
    console.log('   3. Atualizar o frontend para usar a nova estrutura');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration();
