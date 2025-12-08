const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function testFullCreation() {
  console.log('🧪 Testando criação completa de usuário (simulando o serviço)...\n');
  
  const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
  const client = await neonPool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('✅ Transação iniciada');
    
    // 1. Criar usuário
    console.log('\n1️⃣ Criando usuário...');
    const hashedPassword = await bcrypt.hash('senha123', 8);
    
    const userResult = await client.query(`
      INSERT INTO usuarios (
        nome, email, senha, tipo, ativo, institution_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, email
    `, [
      'Teste Completo',
      `teste-completo-${Date.now()}@example.com`,
      hashedPassword,
      'usuario',
      true,
      institutionId
    ]);
    
    const user = userResult.rows[0];
    console.log('✅ Usuário criado:', user.id);
    
    // 2. Vincular à instituição
    console.log('\n2️⃣ Vinculando à instituição...');
    try {
      await client.query(`
        INSERT INTO institution_users (
          institution_id, user_id, role, status
        ) VALUES ($1, $2, $3, $4)
      `, [
        institutionId,
        user.id,
        'user',
        'active'
      ]);
      console.log('✅ Vínculo com instituição criado');
    } catch (error) {
      console.log('❌ ERRO ao vincular à instituição:');
      console.log('   Código:', error.code);
      console.log('   Mensagem:', error.message);
      console.log('   Detalhe:', error.detail);
      console.log('   Constraint:', error.constraint);
      throw error;
    }
    
    // 3. Criar log de auditoria
    console.log('\n3️⃣ Criando log de auditoria...');
    try {
      await client.query(`
        INSERT INTO institution_audit_log (
          institution_id, operation, entity_type, entity_id, new_values, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        institutionId,
        'CREATE',
        'user',
        user.id.toString(),
        JSON.stringify({ email: user.email, nome: user.nome }),
        9 // ID do admin
      ]);
      console.log('✅ Log de auditoria criado');
    } catch (error) {
      console.log('❌ ERRO ao criar log:');
      console.log('   Código:', error.code);
      console.log('   Mensagem:', error.message);
      console.log('   Detalhe:', error.detail);
      console.log('   Constraint:', error.constraint);
      throw error;
    }
    
    await client.query('ROLLBACK');
    console.log('\n✅ SUCESSO! Todas as etapas funcionaram');
    console.log('🔄 Transação revertida (teste)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.log('\n❌ ERRO GERAL:');
    console.log('   Código:', error.code);
    console.log('   Mensagem:', error.message);
    if (error.code === '23503') {
      console.log('\n🎯 Erro 23503 - Foreign key violation');
      console.log('   Constraint:', error.constraint);
      console.log('   Detalhe:', error.detail);
    }
  } finally {
    client.release();
    await neonPool.end();
  }
}

testFullCreation();
