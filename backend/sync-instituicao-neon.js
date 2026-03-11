const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuração do banco Neon (produção)
const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function syncInstituicaoToNeon() {
  try {
    console.log('🔄 Sincronizando tabela instituicoes com Neon...');
    
    // Ler o arquivo de migração
    const sqlPath = path.join(__dirname, 'src/migrations/create_instituicoes_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar migração no Neon
    await neonPool.query(sql);
    console.log('✅ Migração executada no Neon com sucesso!');
    
    // Verificar se a tabela foi criada
    const result = await neonPool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'instituicoes'
    `);
    
    console.log(`📊 Tabela instituicoes no Neon: ${result.rows[0].count > 0 ? 'Criada' : 'Não encontrada'}`);
    
    // Verificar se há registro padrão
    const instituicoes = await neonPool.query('SELECT COUNT(*) as count FROM instituicoes');
    console.log(`📋 Registros na tabela Neon: ${instituicoes.rows[0].count}`);
    
    // Listar registros existentes
    if (instituicoes.rows[0].count > 0) {
      const registros = await neonPool.query('SELECT id, nome, ativo FROM instituicoes ORDER BY id');
      console.log('📝 Registros existentes:');
      registros.rows.forEach(reg => {
        console.log(`   - ID: ${reg.id}, Nome: ${reg.nome}, Ativo: ${reg.ativo}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await neonPool.end();
  }
}

// Função para testar conexão com Neon
async function testNeonConnection() {
  try {
    console.log('🔍 Testando conexão com Neon...');
    const result = await neonPool.query('SELECT NOW() as current_time, version()');
    console.log('✅ Conexão com Neon OK!');
    console.log(`   Hora atual: ${result.rows[0].current_time}`);
    console.log(`   Versão: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão com Neon:', error.message);
    return false;
  }
}

// Executar sincronização
async function main() {
  console.log('🚀 Iniciando sincronização da tabela instituicoes...\n');
  
  // Testar conexão primeiro
  const connected = await testNeonConnection();
  if (!connected) {
    console.log('❌ Não foi possível conectar ao Neon. Verifique as credenciais.');
    process.exit(1);
  }
  
  console.log(''); // Linha em branco
  
  // Executar sincronização
  await syncInstituicaoToNeon();
  
  console.log('\n✅ Sincronização concluída!');
}

main();