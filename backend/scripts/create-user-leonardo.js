const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configuração do Neon
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function createUserLeonardo() {
  const pool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('👤 Criando usuário Leonardo no Neon PostgreSQL...\n');

    // 1. Verificar se a tabela usuarios existe
    console.log('1. Verificando tabela usuarios...');
    const usuariosExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);

    if (!usuariosExist.rows[0].exists) {
      console.log('⚠️  Criando tabela usuarios...');
      await pool.query(`
        CREATE TABLE usuarios (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          senha VARCHAR(255) NOT NULL,
          tipo VARCHAR(50) DEFAULT 'usuario',
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabela usuarios criada');
    } else {
      console.log('✅ Tabela usuarios existe');
    }

    // 2. Verificar se o usuário Leonardo já existe
    console.log('\n2. Verificando se usuário Leonardo já existe...');
    const usuarioExiste = await pool.query(`
      SELECT id, nome, email FROM usuarios WHERE email = $1
    `, ['leonardo@semed.com']);

    if (usuarioExiste.rows.length > 0) {
      console.log('⚠️  Usuário Leonardo já existe:');
      console.log(`   ID: ${usuarioExiste.rows[0].id}`);
      console.log(`   Nome: ${usuarioExiste.rows[0].nome}`);
      console.log(`   Email: ${usuarioExiste.rows[0].email}`);
      
      // Atualizar senha
      console.log('\n   Atualizando senha...');
      const senhaHash = await bcrypt.hash('@leosemed', 10);
      await pool.query(`
        UPDATE usuarios 
        SET senha = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE email = $2
      `, [senhaHash, 'leonardo@semed.com']);
      console.log('✅ Senha atualizada');
    } else {
      // 3. Criar usuário Leonardo
      console.log('\n3. Criando usuário Leonardo...');
      const senhaHash = await bcrypt.hash('@leosemed', 10);
      
      const novoUsuario = await pool.query(`
        INSERT INTO usuarios (nome, email, senha, tipo, ativo)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, nome, email, tipo, ativo, created_at
      `, ['Leonardo SEMED', 'leonardo@semed.com', senhaHash, 'admin', true]);

      console.log('✅ Usuário Leonardo criado com sucesso!');
      console.log('   Dados do usuário:');
      console.log(`   ID: ${novoUsuario.rows[0].id}`);
      console.log(`   Nome: ${novoUsuario.rows[0].nome}`);
      console.log(`   Email: ${novoUsuario.rows[0].email}`);
      console.log(`   Tipo: ${novoUsuario.rows[0].tipo}`);
      console.log(`   Ativo: ${novoUsuario.rows[0].ativo}`);
      console.log(`   Criado em: ${novoUsuario.rows[0].created_at}`);
    }

    // 4. Listar todos os usuários
    console.log('\n4. Usuários cadastrados no sistema:');
    const todosUsuarios = await pool.query(`
      SELECT id, nome, email, tipo, ativo, created_at
      FROM usuarios 
      ORDER BY created_at DESC
    `);

    todosUsuarios.rows.forEach((usuario, index) => {
      console.log(`   ${index + 1}. ${usuario.nome}`);
      console.log(`      Email: ${usuario.email}`);
      console.log(`      Tipo: ${usuario.tipo}`);
      console.log(`      Status: ${usuario.ativo ? 'Ativo' : 'Inativo'}`);
      console.log(`      Criado: ${new Date(usuario.created_at).toLocaleDateString('pt-BR')}`);
      console.log('      ---');
    });

    console.log('\n🎉 Usuário Leonardo configurado com sucesso!');
    console.log('\n📝 Credenciais de acesso:');
    console.log('   Email: leonardo@semed.com');
    console.log('   Senha: @leosemed');
    console.log('   Tipo: admin');
    console.log('\n🔐 O usuário pode fazer login no sistema com essas credenciais.');

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createUserLeonardo();