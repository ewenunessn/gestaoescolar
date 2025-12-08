const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function testCreateUser() {
  const institutionId = 'c1c7aabd-7f03-43ab-8d6d-ff003ea9005f';
  
  console.log('🧪 Testando criação de usuário no Neon...\n');
  
  try {
    // Verificar se a instituição existe
    console.log('1️⃣ Verificando instituição...');
    const instResult = await neonPool.query(
      'SELECT * FROM institutions WHERE id = $1',
      [institutionId]
    );
    
    if (instResult.rows.length === 0) {
      console.log('❌ Instituição não encontrada!');
      return;
    }
    
    console.log('✅ Instituição encontrada:', instResult.rows[0].name);
    console.log('   Limits:', instResult.rows[0].limits);
    
    // Verificar quantos usuários já existem
    console.log('\n2️⃣ Verificando usuários existentes...');
    const userCountResult = await neonPool.query(
      'SELECT COUNT(*) as count FROM institution_users WHERE institution_id = $1 AND status = $2',
      [institutionId, 'active']
    );
    
    console.log('   Usuários ativos:', userCountResult.rows[0].count);
    
    // Tentar criar um usuário de teste
    console.log('\n3️⃣ Tentando criar usuário de teste...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('senha123', 10);
    
    const client = await neonPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Criar usuário
      const userQuery = `
        INSERT INTO usuarios (
          nome, email, senha, tipo, ativo, institution_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome, email, tipo, ativo, institution_id, created_at
      `;
      
      const userValues = [
        'Teste Usuario',
        `teste${Date.now()}@example.com`,
        hashedPassword,
        'usuario',
        true,
        institutionId
      ];
      
      console.log('   Criando usuário...');
      const userResult = await client.query(userQuery, userValues);
      const user = userResult.rows[0];
      console.log('   ✅ Usuário criado:', user);
      
      // Link to institution
      console.log('\n4️⃣ Vinculando usuário à instituição...');
      const instUserResult = await client.query(`
        INSERT INTO institution_users (
          institution_id, user_id, role, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        institutionId,
        user.id,
        'user',
        'active'
      ]);
      
      console.log('   ✅ Vínculo criado:', instUserResult.rows[0]);
      
      // Create audit log
      console.log('\n5️⃣ Criando log de auditoria...');
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
      
      console.log('   ✅ Log criado');
      
      await client.query('COMMIT');
      console.log('\n✅ SUCESSO! Usuário criado com sucesso no Neon');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n❌ ERRO durante a transação:', error.message);
      console.error('   Stack:', error.stack);
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await neonPool.end();
  }
}

testCreateUser();
