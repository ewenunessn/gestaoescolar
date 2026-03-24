const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'merenda_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      }
);

async function executarMigration() {
  console.log('🔧 Executando migration: Adicionar Índice de Cocção\n');
  console.log('=' .repeat(60));

  try {
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'migrations', '20260324_adicionar_indice_coccao.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n📄 Executando SQL...\n');
    await pool.query(sql);

    console.log('✅ Migration executada com sucesso!');

    // Verificar se a coluna foi criada
    console.log('\n🔍 Verificando estrutura da tabela produtos...');
    const colunas = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'produtos'
      AND column_name IN ('fator_correcao', 'indice_coccao')
      ORDER BY column_name
    `);

    console.log('\n📋 Colunas relacionadas a correção/cocção:');
    colunas.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) = ${col.column_default || 'NULL'}`);
    });

    // Contar produtos
    const count = await pool.query('SELECT COUNT(*) as total FROM produtos');
    console.log(`\n📊 Total de produtos: ${count.rows[0].total}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ MIGRATION CONCLUÍDA COM SUCESSO!');
    console.log('\n📚 Próximos passos:');
    console.log('   1. Atualizar backend para usar indice_coccao');
    console.log('   2. Atualizar frontend para exibir e editar indice_coccao');
    console.log('   3. Ajustar cálculos para considerar IC antes de FC');
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

executarMigration()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro no script:', error);
    process.exit(1);
  });
