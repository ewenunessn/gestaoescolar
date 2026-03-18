const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function simularLogin() {
  try {
    console.log('🔐 Simulando login de usuário de escola...\n');

    // Buscar usuário com escola_id
    const result = await pool.query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.tipo,
        u.tipo_secretaria,
        u.escola_id,
        u.institution_id,
        e.nome as escola_nome
      FROM usuarios u
      LEFT JOIN escolas e ON u.escola_id = e.id
      WHERE u.escola_id IS NOT NULL
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ Nenhum usuário com escola_id encontrado');
      console.log('\n💡 Vou criar um usuário de teste...');
      
      // Buscar primeira escola
      const escolaResult = await pool.query('SELECT id, nome FROM escolas ORDER BY id LIMIT 1');
      if (escolaResult.rows.length === 0) {
        console.log('❌ Nenhuma escola encontrada no banco');
        return;
      }
      
      const escola = escolaResult.rows[0];
      console.log(`   Escola selecionada: ${escola.nome} (ID: ${escola.id})`);
      
      // Criar usuário de teste
      const bcrypt = require('bcryptjs');
      const senhaHash = await bcrypt.hash('123456', 10);
      
      const createResult = await pool.query(`
        INSERT INTO usuarios (nome, email, senha, tipo, tipo_secretaria, escola_id, ativo)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *
      `, [
        'Secretaria Escola Teste',
        'secretaria.escola@teste.com',
        senhaHash,
        'usuario',
        'escola',
        escola.id
      ]);
      
      const user = createResult.rows[0];
      console.log('\n✅ Usuário criado:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Senha: 123456`);
      console.log(`   Escola: ${escola.nome}`);
      
      // Gerar token
      const tokenPayload = {
        id: user.id,
        tipo: user.tipo,
        email: user.email,
        nome: user.nome,
        institution_id: user.institution_id,
        escola_id: user.escola_id,
        tipo_secretaria: user.tipo_secretaria,
        isSystemAdmin: false
      };
      
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
      
      console.log('\n🔑 Token JWT gerado:');
      console.log(token);
      
      console.log('\n📊 Payload do token:');
      console.log(JSON.stringify(tokenPayload, null, 2));
      
      console.log('\n✅ Para testar:');
      console.log('   1. Faça login com:');
      console.log('      Email: secretaria.escola@teste.com');
      console.log('      Senha: 123456');
      console.log('   2. Você será redirecionado para /portal-escola');
      
    } else {
      const user = result.rows[0];
      
      console.log('✅ Usuário encontrado:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Nome: ${user.nome}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Tipo: ${user.tipo}`);
      console.log(`   Tipo Secretaria: ${user.tipo_secretaria}`);
      console.log(`   Escola ID: ${user.escola_id}`);
      console.log(`   Escola Nome: ${user.escola_nome}`);
      
      // Gerar token
      const tokenPayload = {
        id: user.id,
        tipo: user.tipo,
        email: user.email,
        nome: user.nome,
        institution_id: user.institution_id,
        escola_id: user.escola_id,
        tipo_secretaria: user.tipo_secretaria || 'educacao',
        isSystemAdmin: user.tipo === 'admin'
      };
      
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
      
      console.log('\n🔑 Token JWT gerado:');
      console.log(token);
      
      console.log('\n📊 Payload do token:');
      console.log(JSON.stringify(tokenPayload, null, 2));
      
      console.log('\n✅ Para testar manualmente:');
      console.log('   1. Abra o DevTools (F12)');
      console.log('   2. Vá em Console');
      console.log('   3. Execute:');
      console.log(`      localStorage.setItem('token', '${token}')`);
      console.log('   4. Recarregue a página');
      console.log('   5. Acesse: http://localhost:5173/portal-escola');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

simularLogin();
