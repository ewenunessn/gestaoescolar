const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  console.log('✅ Conectado ao Neon\n');

  // Verificar se a tabela modulos existe
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('modulos', 'niveis_permissao', 'funcoes', 'funcao_permissoes')
    ORDER BY table_name
  `);
  console.log('📋 Tabelas existentes:', tables.rows.map(r => r.table_name));

  // Verificar estrutura da tabela modulos
  if (tables.rows.some(r => r.table_name === 'modulos')) {
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'modulos'
      ORDER BY ordinal_position
    `);
    console.log('\n📊 Estrutura da tabela modulos:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Verificar constraints
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'modulos'
    `);
    console.log('\n🔒 Constraints da tabela modulos:');
    constraints.rows.forEach(c => {
      console.log(`  - ${c.constraint_name}: ${c.constraint_type}`);
    });

    // Verificar dados
    const data = await client.query('SELECT * FROM modulos LIMIT 5');
    console.log('\n📝 Primeiros 5 registros:');
    data.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Nome: ${row.nome}, Slug: ${row.slug}`);
    });
  }

  // Verificar niveis_permissao
  if (tables.rows.some(r => r.table_name === 'niveis_permissao')) {
    const data = await client.query('SELECT * FROM niveis_permissao');
    console.log('\n📝 Níveis de permissão:');
    data.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Nome: ${row.nome}, Slug: ${row.slug}, Nível: ${row.nivel}`);
    });
  }

  await client.end();
}

check().catch(e => { console.error('❌ Erro:', e.message); client.end(); });
