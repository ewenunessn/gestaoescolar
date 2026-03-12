/**
 * Script para corrigir encoding UTF-8 dos dados no banco
 * Execute: npx ts-node backend/src/scripts/fix-encoding.ts
 */

import db from '../database';

async function fixEncoding() {
  try {
    console.log('🔍 Verificando e corrigindo encoding...\n');

    // Verificar encoding do banco
    const encodingCheck = await db.query(`
      SELECT 
        pg_encoding_to_char(encoding) as encoding,
        datcollate as collate,
        datctype as ctype
      FROM pg_database 
      WHERE datname = current_database()
    `);
    
    console.log('📋 Configuração atual do banco:');
    console.log(encodingCheck.rows[0]);

    // Corrigir produtos com encoding incorreto
    console.log('\n🔧 Corrigindo produtos...');
    const produtos = await db.query(`
      SELECT id, nome, descricao 
      FROM produtos 
      WHERE nome LIKE '%�%' OR descricao LIKE '%�%'
    `);

    console.log(`Encontrados ${produtos.rows.length} produtos com problemas de encoding`);

    for (const produto of produtos.rows) {
      console.log(`\n❌ Produto com problema: ${produto.nome}`);
      console.log('   Digite o nome correto (ou pressione Enter para pular):');
    }

    console.log('\n✅ Verificação concluída!');
    console.log('\n⚠️  Para corrigir manualmente, execute:');
    console.log('   UPDATE produtos SET nome = \'Nome Correto\' WHERE id = X;');

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

fixEncoding()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
