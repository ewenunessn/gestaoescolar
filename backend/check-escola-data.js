const { Pool } = require('pg');

// URL do Neon (produção)
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkEscolaData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando dados das escolas...\n');
    
    // 1. Verificar escolas
    const escolas = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
      FROM escolas
    `);
    console.log('📊 Escolas:');
    console.log(`   Total: ${escolas.rows[0].total}`);
    console.log(`   Sem tenant_id: ${escolas.rows[0].sem_tenant}\n`);
    
    // 2. Verificar escola_modalidades
    const modalidades = await client.query(`
      SELECT COUNT(*) as total
      FROM escola_modalidades
    `);
    console.log('📊 Escola Modalidades:');
    console.log(`   Total: ${modalidades.rows[0].total}\n`);
    
    // 3. Verificar se tabela alunos existe
    const alunosTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'alunos'
      )
    `);
    
    if (alunosTableExists.rows[0].exists) {
      const alunos = await client.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
        FROM alunos
      `);
      console.log('📊 Alunos:');
      console.log(`   Total: ${alunos.rows[0].total}`);
      console.log(`   Sem tenant_id: ${alunos.rows[0].sem_tenant}\n`);
    } else {
      console.log('⚠️  Tabela "alunos" não existe no banco\n');
    }
    
    // 4. Mostrar algumas escolas de exemplo
    const exemplos = await client.query(`
      SELECT id, nome, tenant_id,
             (SELECT COUNT(*) FROM escola_modalidades WHERE escola_id = escolas.id) as qtd_modalidades
      FROM escolas
      ORDER BY id
      LIMIT 5
    `);
    
    console.log('📋 Exemplos de escolas:');
    exemplos.rows.forEach(e => {
      console.log(`   - ${e.nome}`);
      console.log(`     ID: ${e.id}`);
      console.log(`     Tenant: ${e.tenant_id || 'SEM TENANT'}`);
      console.log(`     Modalidades: ${e.qtd_modalidades}`);
      console.log('');
    });
    
    // 5. Verificar modalidades órfãs (sem tenant_id na escola)
    const orfas = await client.query(`
      SELECT COUNT(*) as total
      FROM escola_modalidades em
      JOIN escolas e ON e.id = em.escola_id
      WHERE e.tenant_id IS NULL
    `);
    
    if (orfas.rows[0].total > 0) {
      console.log(`⚠️  ${orfas.rows[0].total} modalidades associadas a escolas sem tenant_id\n`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkEscolaData()
  .then(() => {
    console.log('✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verificação falhou:', error);
    process.exit(1);
  });
