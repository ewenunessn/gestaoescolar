const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração local
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
    console.log('🔧 Adicionando coluna periodo_id em cardapios_modalidade...\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '20260316_add_periodo_cardapios_modalidade.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar migração
    await client.query(sql);
    
    console.log('✅ Migração aplicada com sucesso!\n');

    // Verificar resultado
    const result = await client.query(`
      SELECT 
        cm.id,
        cm.nome,
        cm.ano,
        cm.mes,
        cm.periodo_id,
        p.ano as periodo_ano,
        CASE 
          WHEN cm.periodo_id IS NOT NULL THEN '✅ OK'
          ELSE '⚠️ Sem período'
        END as status
      FROM cardapios_modalidade cm
      LEFT JOIN periodos p ON cm.periodo_id = p.id
      ORDER BY cm.ano DESC, cm.mes DESC
    `);

    console.log('📊 Cardápios por modalidade:');
    console.table(result.rows);

    console.log('\n✅ Coluna periodo_id adicionada com sucesso!');
    console.log('📝 Trigger criado para atribuição automática');

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarMigracao().catch(console.error);
