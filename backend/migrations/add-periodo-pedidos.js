const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurações dos bancos
const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123',
  ssl: false
};

const NEON_CONFIG = {
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
};

async function executarMigration(config, nome) {
  const client = new Client(config);
  
  try {
    console.log(`\n🔄 Conectando ao banco ${nome}...`);
    await client.connect();
    console.log(`✅ Conectado ao ${nome}`);

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '20260315_add_periodo_id_to_pedidos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`\n📝 Executando migration em ${nome}...`);
    await client.query(sql);
    console.log(`✅ Migration executada com sucesso em ${nome}`);

    // Verificar se a coluna foi criada
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'pedidos' AND column_name = 'periodo_id'
    `);

    if (result.rows.length > 0) {
      console.log(`✅ Coluna periodo_id criada:`, result.rows[0]);
    } else {
      console.log(`⚠️  Coluna periodo_id não encontrada`);
    }

    // Verificar quantos pedidos foram atualizados
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(periodo_id) as com_periodo
      FROM pedidos
    `);
    console.log(`📊 Pedidos: ${countResult.rows[0].com_periodo}/${countResult.rows[0].total} com periodo_id`);

  } catch (error) {
    console.error(`❌ Erro ao executar migration em ${nome}:`, error.message);
    throw error;
  } finally {
    await client.end();
    console.log(`🔌 Desconectado do ${nome}`);
  }
}

async function main() {
  console.log('🚀 Iniciando execução da migration add_periodo_id_to_pedidos\n');
  
  try {
    // Executar no banco local
    await executarMigration(LOCAL_CONFIG, 'LOCAL');
    
    // Executar no Neon
    await executarMigration(NEON_CONFIG, 'NEON');
    
    console.log('\n✅ Migration executada com sucesso em ambos os bancos!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Testar criação de pedidos no frontend');
    console.log('   2. Verificar se o trigger fn_atribuir_periodo() funciona corretamente');
    console.log('   3. Confirmar que não há mais erro 500');
    
  } catch (error) {
    console.error('\n❌ Erro durante a execução:', error);
    process.exit(1);
  }
}

main();
