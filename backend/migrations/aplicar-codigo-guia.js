const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function aplicarMigracao() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Aplicando migração de código único para guias...\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '20260331_add_codigo_guia.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar migração
    await client.query(sql);

    console.log('\n✅ Migração aplicada com sucesso!');

    // Verificar resultado
    const verificacao = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(codigo_guia) as com_codigo,
        COUNT(*) - COUNT(codigo_guia) as sem_codigo
      FROM guias
    `);

    console.log('\n📊 Estatísticas:');
    console.log('  Total de guias:', verificacao.rows[0].total);
    console.log('  Com código:', verificacao.rows[0].com_codigo);
    console.log('  Sem código:', verificacao.rows[0].sem_codigo);

    // Mostrar exemplos de códigos gerados
    const exemplos = await client.query(`
      SELECT 
        id,
        codigo_guia,
        mes,
        ano,
        nome,
        status
      FROM guias
      WHERE codigo_guia IS NOT NULL
      ORDER BY ano DESC, mes DESC
      LIMIT 5
    `);

    console.log('\n📦 Exemplos de códigos gerados:');
    exemplos.rows.forEach(guia => {
      console.log(`  ${guia.codigo_guia} - ${guia.nome || `Guia ${guia.mes}/${guia.ano}`} (${guia.status})`);
    });

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarMigracao();
