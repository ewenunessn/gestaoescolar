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

async function aplicarTrigger() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Aplicando trigger de validação de período ativo...\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '20260316_add_trigger_periodo_ativo_ocultar_dados.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar migração
    await client.query(sql);
    
    console.log('✅ Trigger criado com sucesso!\n');

    // Verificar períodos
    const result = await client.query(`
      SELECT 
        id, 
        ano, 
        ativo, 
        ocultar_dados,
        CASE 
          WHEN ativo = true AND ocultar_dados = false THEN '✅ OK'
          WHEN ativo = true AND ocultar_dados = true THEN '❌ ERRO'
          ELSE '✅ OK'
        END as status
      FROM periodos
      ORDER BY ano DESC
    `);

    console.log('📊 Status dos períodos:');
    console.table(result.rows);

    // Testar trigger
    console.log('\n🧪 Testando trigger...');
    
    // Tentar ativar um período com ocultar_dados = true
    const testResult = await client.query(`
      UPDATE periodos 
      SET ativo = true, ocultar_dados = true 
      WHERE ano = 2025
      RETURNING id, ano, ativo, ocultar_dados
    `);

    if (testResult.rows.length > 0) {
      const periodo = testResult.rows[0];
      if (periodo.ocultar_dados === false) {
        console.log('✅ Trigger funcionando! Tentou definir ocultar_dados=true mas foi forçado para false');
        console.log(`   Período ${periodo.ano}: ativo=${periodo.ativo}, ocultar_dados=${periodo.ocultar_dados}`);
      } else {
        console.log('❌ Trigger não funcionou! ocultar_dados ainda está true');
      }
    }

    // Restaurar período ativo original (2026)
    await client.query(`UPDATE periodos SET ativo = false WHERE ano = 2025`);
    await client.query(`UPDATE periodos SET ativo = true WHERE ano = 2026`);
    
    console.log('\n✅ Migração aplicada com sucesso!');
    console.log('📝 Trigger garantirá que período ativo sempre tenha ocultar_dados = false');

  } catch (error) {
    console.error('❌ Erro ao aplicar trigger:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarTrigger().catch(console.error);
