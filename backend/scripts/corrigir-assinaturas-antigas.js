const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function corrigir() {
  try {
    console.log('🔧 Verificando comprovantes com assinaturas em formato URI...\n');

    // Buscar comprovantes com assinatura que não seja base64
    const result = await pool.query(`
      SELECT 
        id,
        numero_comprovante,
        nome_quem_recebeu,
        assinatura_base64
      FROM comprovantes_entrega
      WHERE assinatura_base64 IS NOT NULL
        AND assinatura_base64 NOT LIKE 'data:image%'
    `);

    if (result.rows.length === 0) {
      console.log('✅ Nenhum comprovante com assinatura em formato URI encontrado');
      return;
    }

    console.log(`⚠️  Encontrados ${result.rows.length} comprovantes com assinatura em formato URI:\n`);
    
    result.rows.forEach(r => {
      console.log(`   ${r.numero_comprovante} - ${r.nome_quem_recebeu}`);
      console.log(`   Assinatura atual: ${r.assinatura_base64.substring(0, 60)}...`);
    });

    console.log('\n❌ Essas assinaturas estão em formato de URI de arquivo local e não podem ser exibidas.');
    console.log('💡 Solução: Fazer novas entregas com o app atualizado para gerar assinaturas em base64.');
    console.log('\n📝 Opção: Limpar essas assinaturas inválidas? (execute com --limpar para confirmar)');

    if (process.argv.includes('--limpar')) {
      console.log('\n🧹 Limpando assinaturas inválidas...');
      
      for (const row of result.rows) {
        await pool.query(`
          UPDATE comprovantes_entrega
          SET assinatura_base64 = NULL
          WHERE id = $1
        `, [row.id]);
        console.log(`   ✓ ${row.numero_comprovante} - assinatura removida`);
      }
      
      console.log('\n✅ Assinaturas inválidas removidas com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

corrigir();
