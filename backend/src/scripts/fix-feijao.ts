/**
 * Script para corrigir o nome "Feijão Carioca"
 */

import db from '../database';

async function fixFeijao() {
  try {
    console.log('🔧 Corrigindo "Feijão Carioca"...\n');

    const result = await db.query(`
      UPDATE produtos 
      SET nome = 'Feijão Carioca' 
      WHERE nome LIKE 'Feij%o Carioca'
      RETURNING id, nome
    `);

    if (result.rows.length > 0) {
      console.log('✅ Produto corrigido:');
      console.log(result.rows[0]);
    } else {
      console.log('⚠️  Nenhum produto encontrado para corrigir');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

fixFeijao()
  .then(() => {
    console.log('\n✅ Correção concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
