const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function aplicarMigracao() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Aplicando migração de snapshot de escola nas guias...\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '20260331_guia_escola_snapshot.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar migração
    await client.query(sql);

    console.log('\n✅ Migração aplicada com sucesso!');

    // Verificar resultado
    const verificacao = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(escola_nome) as com_snapshot,
        COUNT(*) - COUNT(escola_nome) as sem_snapshot
      FROM guia_produto_escola
    `);

    console.log('\n📊 Estatísticas:');
    console.log('  Total de registros:', verificacao.rows[0].total);
    console.log('  Com snapshot:', verificacao.rows[0].com_snapshot);
    console.log('  Sem snapshot:', verificacao.rows[0].sem_snapshot);

    // Mostrar exemplo de snapshot
    const exemplo = await client.query(`
      SELECT 
        id,
        guia_id,
        escola_id,
        escola_nome,
        escola_endereco,
        escola_total_alunos,
        escola_modalidades,
        escola_snapshot_data
      FROM guia_produto_escola
      WHERE escola_nome IS NOT NULL
      LIMIT 1
    `);

    if (exemplo.rows.length > 0) {
      console.log('\n📦 Exemplo de snapshot:');
      console.log(JSON.stringify(exemplo.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarMigracao();
