const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function aplicarConstraint() {
  // Conectar ao banco LOCAL
  const localPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gestaoescolar',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  // Conectar ao banco NEON
  const neonPool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📋 Aplicando atualização de constraint de status...\n');

    // Ler migration
    const migrationPath = path.join(__dirname, '../src/migrations/20260304_update_pedidos_status_constraint.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    // Aplicar no LOCAL
    console.log('🔧 Aplicando no banco LOCAL...');
    await localPool.query(migration);
    console.log('✅ Constraint atualizada no LOCAL\n');

    // Verificar pedidos no LOCAL
    const localCheck = await localPool.query(`
      SELECT id, numero, status 
      FROM pedidos 
      WHERE status NOT IN ('pendente', 'recebido_parcial', 'concluido', 'suspenso', 'cancelado')
    `);
    
    if (localCheck.rows.length > 0) {
      console.log('⚠️  LOCAL - Pedidos com status inválido:', localCheck.rows);
    } else {
      console.log('✅ LOCAL - Todos os pedidos têm status válido');
    }

    // Aplicar no NEON
    console.log('\n🔧 Aplicando no banco NEON...');
    await neonPool.query(migration);
    console.log('✅ Constraint atualizada no NEON\n');

    // Verificar pedidos no NEON
    const neonCheck = await neonPool.query(`
      SELECT id, numero, status 
      FROM pedidos 
      WHERE status NOT IN ('pendente', 'recebido_parcial', 'concluido', 'suspenso', 'cancelado')
    `);
    
    if (neonCheck.rows.length > 0) {
      console.log('⚠️  NEON - Pedidos com status inválido:', neonCheck.rows);
    } else {
      console.log('✅ NEON - Todos os pedidos têm status válido');
    }

    console.log('\n✅ Constraint atualizada com sucesso em ambos os bancos!');

  } catch (error) {
    console.error('❌ Erro ao aplicar constraint:', error);
    throw error;
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

aplicarConstraint();
