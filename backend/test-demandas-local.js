const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function testDemandas() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testando adaptação de Demandas - BANCO LOCAL\n');

    // 1. Verificar estrutura
    console.log('1️⃣ Verificando estrutura da tabela demandas...');
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'demandas'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas:');
    structure.rows.forEach(col => {
      const mark = col.column_name === 'tenant_id' ? '✅' : '  ';
      console.log(`${mark} ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    // 2. Verificar índices
    console.log('2️⃣ Verificando índices de tenant...');
    const indexes = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'demandas' AND indexname LIKE '%tenant%'
    `);
    
    indexes.rows.forEach(idx => {
      console.log(`✅ ${idx.indexname}`);
    });
    console.log('');

    // 3. Verificar RLS
    console.log('3️⃣ Verificando RLS policies...');
    const policies = await client.query(`
      SELECT policyname, cmd FROM pg_policies
      WHERE tablename = 'demandas'
    `);
    
    if (policies.rows.length > 0) {
      policies.rows.forEach(p => {
        console.log(`✅ ${p.policyname} (${p.cmd})`);
      });
    } else {
      console.log('⚠️  Nenhuma policy encontrada');
    }
    console.log('');

    // 4. Verificar dados
    console.log('4️⃣ Verificando dados...');
    const count = await client.query('SELECT COUNT(*) as total FROM demandas');
    const total = parseInt(count.rows[0].total);
    console.log(`Total de demandas: ${total}`);

    if (total > 0) {
      const withTenant = await client.query(`
        SELECT COUNT(*) as total FROM demandas WHERE tenant_id IS NOT NULL
      `);
      console.log(`Com tenant_id: ${withTenant.rows[0].total}`);
      console.log(`Sem tenant_id: ${total - parseInt(withTenant.rows[0].total)}`);
    }
    console.log('');

    // 5. Distribuição por tenant
    if (total > 0) {
      console.log('5️⃣ Distribuição por tenant:');
      const dist = await client.query(`
        SELECT t.nome, COUNT(d.id) as total
        FROM tenants t
        LEFT JOIN demandas d ON d.tenant_id = t.id
        GROUP BY t.id, t.nome
        ORDER BY total DESC
      `);
      
      dist.rows.forEach(row => {
        console.log(`  ${row.nome}: ${row.total} demandas`);
      });
    }
    console.log('');

    console.log('✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testDemandas();
