// Script para resetar senha do usuário
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function resetarSenha() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Conectando ao banco...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // Gerar hash da senha
    const senha = '@Nunes8922';
    console.log('🔐 Gerando hash para senha:', senha);
    const hash = await bcrypt.hash(senha, 10);
    console.log('✅ Hash gerado:', hash.substring(0, 20) + '...\n');

    // Atualizar senha
    console.log('📝 Atualizando senha do usuário...');
    const result = await client.query(`
      UPDATE usuarios 
      SET senha = $1, updated_at = CURRENT_TIMESTAMP
      WHERE email = 'ewenunes0@gmail.com'
      RETURNING id, nome, email
    `, [hash]);

    if (result.rows.length > 0) {
      console.log('✅ Senha atualizada com sucesso!');
      console.log('👤 Usuário:', result.rows[0]);
      console.log('\n📋 Credenciais:');
      console.log('   Email: ewenunes0@gmail.com');
      console.log('   Senha: @Nunes8922');
    } else {
      console.log('❌ Usuário não encontrado!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada.');
  }
}

resetarSenha();
