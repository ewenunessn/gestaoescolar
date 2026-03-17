const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
  ssl: false
});

async function aplicarMigracao() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adicionando período individual por usuário...\n');

    const sqlPath = path.join(__dirname, '20260316_add_periodo_usuario.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    
    console.log('✅ Migração aplicada com sucesso!\n');

    // Verificar resultado
    const result = await client.query(`
      SELECT 
        u.id,
        u.nome,
        u.periodo_selecionado_id,
        p.ano as periodo_ano,
        p.ativo as periodo_ativo,
        CASE 
          WHEN u.periodo_selecionado_id IS NOT NULL THEN '✅ Período selecionado'
          ELSE '⚠️ Usando período global'
        END as status
      FROM usuarios u
      LEFT JOIN periodos p ON u.periodo_selecionado_id = p.id
      ORDER BY u.nome
      LIMIT 10
    `);

    console.log('📊 Usuários:');
    console.table(result.rows);

    console.log('\n✅ Coluna periodo_selecionado_id adicionada!');
    console.log('📝 Usuários podem agora selecionar seu próprio período');

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarMigracao().catch(console.error);
