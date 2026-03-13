const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function aplicarMigration() {
  try {
    console.log('🔄 Aplicando Ficha Técnica no Neon...\n');

    const migrationPath = path.join(__dirname, 'migrations', '20260312_add_ficha_tecnica_refeicoes.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log('✅ Migration aplicada com sucesso!\n');

    // Verificar campos
    const refeicoesResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'refeicoes'
      AND column_name IN (
        'modo_preparo', 'tempo_preparo_minutos', 'rendimento_porcoes', 
        'utensílios', 'calorias_por_porcao', 'proteinas_g', 'carboidratos_g',
        'lipidios_g', 'fibras_g', 'sodio_mg', 'custo_por_porcao',
        'observacoes_tecnicas', 'categoria'
      )
      ORDER BY column_name
    `);

    console.log('📋 Campos de Ficha Técnica em refeicoes:');
    refeicoesResult.rows.forEach(col => {
      console.log(`   ✓ ${col.column_name.padEnd(30)} ${col.data_type}`);
    });

    console.log('\n✅ Tudo pronto no Neon!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

aplicarMigration();
