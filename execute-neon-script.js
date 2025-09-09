const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🔧 Script para executar SQL no Neon Database');
console.log('\n📋 INSTRUÇÕES:');
console.log('1. Acesse o painel do Neon (https://console.neon.tech)');
console.log('2. Vá para seu projeto e copie a Connection String');
console.log('3. Execute este script com a URL: node execute-neon-script.js "sua_connection_string"');
console.log('\nOu defina a variável de ambiente:');
console.log('set DATABASE_URL=sua_connection_string && node execute-neon-script.js');

// Obter URL de conexão dos argumentos ou variável de ambiente
const connectionString = process.argv[2] || process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.log('\n❌ URL de conexão não fornecida!');
  console.log('\n💡 Exemplo de uso:');
  console.log('node execute-neon-script.js "postgresql://user:password@host/database"');
  process.exit(1);
}

console.log('\n🔗 Conectando ao Neon Database...');

// Configuração do banco Neon
const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function executeScript() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado ao banco Neon!');
    
    // Comandos SQL individuais
    const commands = [
      `CREATE TABLE IF NOT EXISTS gas_controle (
        id SERIAL PRIMARY KEY,
        nome_local VARCHAR(255) NOT NULL,
        quantidade_total INTEGER NOT NULL DEFAULT 0,
        quantidade_disponivel INTEGER NOT NULL DEFAULT 0,
        quantidade_em_uso INTEGER NOT NULL DEFAULT 0,
        preco_unitario DECIMAL(10,2),
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS gas_movimentacoes (
        id SERIAL PRIMARY KEY,
        gas_controle_id INTEGER NOT NULL,
        tipo_movimentacao VARCHAR(50) NOT NULL CHECK (tipo_movimentacao IN ('entrada', 'saida', 'troca', 'manutencao')),
        quantidade INTEGER NOT NULL,
        preco_unitario DECIMAL(10,2),
        valor_total DECIMAL(10,2),
        observacoes TEXT,
        data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gas_controle_id) REFERENCES gas_controle(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_gas_controle_nome_local ON gas_controle(nome_local)`,
      `CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_gas_controle_id ON gas_movimentacoes(gas_controle_id)`,
      `CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_tipo ON gas_movimentacoes(tipo_movimentacao)`,
      `CREATE INDEX IF NOT EXISTS idx_gas_movimentacoes_data ON gas_movimentacoes(data_movimentacao)`
    ];
    
    console.log(`\n📝 Executando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          await client.query(command);
          console.log(`✅ Comando ${i + 1}/${commands.length} executado`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Comando ${i + 1} - Objeto já existe (normal)`);
          } else {
            console.log(`❌ Comando ${i + 1} falhou:`, error.message);
          }
        }
      }
    }
    
    // Verificar se as tabelas foram criadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('gas_controle', 'gas_movimentacoes')
      ORDER BY table_name
    `);
    
    console.log('\n🎉 Script executado! Tabelas encontradas:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    if (result.rows.length === 2) {
      console.log('\n🚀 Sistema de controle de gás configurado com sucesso no Neon!');
      console.log('\n📊 Próximos passos:');
      console.log('   1. As tabelas estão prontas para uso');
      console.log('   2. O backend já está configurado para usar essas tabelas');
      console.log('   3. O app mobile pode começar a usar o sistema de gás');
    } else {
      console.log('\n⚠️  Algumas tabelas podem não ter sido criadas. Verifique os logs acima.');
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao executar script:', error.message);
    console.log('\n💡 Dicas:');
    console.log('   - Verifique se a URL de conexão está correta');
    console.log('   - Confirme se o banco permite conexões externas');
    console.log('   - Tente executar novamente em alguns segundos');
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar o script
executeScript().catch(console.error);