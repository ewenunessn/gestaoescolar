const { Pool } = require('pg');

// URL do Neon (produção)
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function fixHistoricoUsuario() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Ajustando estoque_escolas_historico para não depender de foreign key...\n');
    
    await client.query('BEGIN');
    
    // 1. Adicionar coluna para nome do usuário
    console.log('📝 Adicionando coluna usuario_nome...');
    await client.query(`
      ALTER TABLE estoque_escolas_historico 
      ADD COLUMN IF NOT EXISTS usuario_nome VARCHAR(255)
    `);
    
    // 2. Copiar nomes dos usuários existentes
    console.log('📋 Copiando nomes dos usuários...');
    const result = await client.query(`
      UPDATE estoque_escolas_historico 
      SET usuario_nome = u.nome
      FROM usuarios u
      WHERE estoque_escolas_historico.usuario_id = u.id
      AND estoque_escolas_historico.usuario_nome IS NULL
    `);
    console.log(`✅ ${result.rowCount} registros atualizados com nome do usuário`);
    
    // 3. Remover a foreign key constraint
    console.log('🔓 Removendo foreign key constraint...');
    await client.query(`
      ALTER TABLE estoque_escolas_historico 
      DROP CONSTRAINT IF EXISTS estoque_escolas_historico_usuario_id_fkey
    `);
    console.log('✅ Foreign key removida');
    
    // 4. Tornar usuario_id nullable (opcional)
    console.log('📝 Tornando usuario_id nullable...');
    await client.query(`
      ALTER TABLE estoque_escolas_historico 
      ALTER COLUMN usuario_id DROP NOT NULL
    `);
    console.log('✅ usuario_id agora é nullable');
    
    await client.query('COMMIT');
    
    console.log('\n✅ Ajuste concluído!');
    console.log('\n💡 Agora você pode deletar usuários sem problemas.');
    console.log('   O histórico manterá o nome do usuário em usuario_nome.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixHistoricoUsuario()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
