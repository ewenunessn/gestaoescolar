const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificar() {
  try {
    console.log('🔍 Verificando assinaturas nos comprovantes...\n');

    const result = await pool.query(`
      SELECT 
        id,
        numero_comprovante,
        nome_quem_recebeu,
        CASE 
          WHEN assinatura_base64 IS NOT NULL THEN LENGTH(assinatura_base64)
          ELSE 0 
        END as tamanho_assinatura
      FROM comprovantes_entrega
      ORDER BY id
    `);

    console.log('📋 Comprovantes:\n');
    result.rows.forEach(r => {
      const temAssinatura = r.tamanho_assinatura > 0;
      const status = temAssinatura ? `✅ ${r.tamanho_assinatura} chars` : '❌ SEM ASSINATURA';
      console.log(`${r.numero_comprovante} - ${r.nome_quem_recebeu}`);
      console.log(`   Assinatura: ${status}\n`);
    });

    const comAssinatura = result.rows.filter(r => r.tamanho_assinatura > 0).length;
    const semAssinatura = result.rows.filter(r => r.tamanho_assinatura === 0).length;

    console.log(`\n📊 Resumo:`);
    console.log(`   Com assinatura: ${comAssinatura}`);
    console.log(`   Sem assinatura: ${semAssinatura}`);
    console.log(`   Total: ${result.rows.length}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificar();
