const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function aplicarFix(config, nome) {
  const client = new Client(config);
  
  try {
    console.log(`\n🔄 Conectando ao banco ${nome}...`);
    await client.connect();
    console.log(`✅ Conectado ao ${nome}`);

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'fix-trigger-atribuir-periodo.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log(`\n📝 Aplicando correção do trigger em ${nome}...`);
    await client.query(sql);
    console.log(`✅ Trigger corrigido com sucesso em ${nome}`);

  } catch (error) {
    console.error(`❌ Erro ao aplicar correção em ${nome}:`, error.message);
    throw error;
  } finally {
    await client.end();
    console.log(`🔌 Desconectado do ${nome}`);
  }
}

async function main() {
  console.log('🚀 Iniciando correção do trigger fn_atribuir_periodo\n');
  
  try {
    await aplicarFix(LOCAL_CONFIG, 'LOCAL');
    await aplicarFix(NEON_CONFIG, 'NEON');
    
    console.log('\n✅ Correção aplicada com sucesso em ambos os bancos!');
    console.log('\n📝 Próximo passo: Executar teste novamente');
    
  } catch (error) {
    console.error('\n❌ Erro durante a execução:', error);
    process.exit(1);
  }
}

main();
