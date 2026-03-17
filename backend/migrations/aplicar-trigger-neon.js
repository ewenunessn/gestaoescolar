const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração Neon - SUBSTITUA PELA SUA CONNECTION STRING
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_xxxxxxxxxx@ep-xxxxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
});

async function aplicarTrigger() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Aplicando trigger de validação de período ativo no Neon...\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '20260316_add_trigger_periodo_ativo_ocultar_dados.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar migração
    await client.query(sql);
    
    console.log('✅ Trigger criado com sucesso no Neon!\n');

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

    console.log('📊 Status dos períodos no Neon:');
    console.table(result.rows);

    // Testar trigger
    console.log('\n🧪 Testando trigger no Neon...');
    
    // Buscar um período inativo para testar
    const periodoInativo = await client.query(`
      SELECT id, ano FROM periodos WHERE ativo = false LIMIT 1
    `);

    if (periodoInativo.rows.length > 0) {
      const ano = periodoInativo.rows[0].ano;
      
      // Tentar ativar com ocultar_dados = true
      const testResult = await client.query(`
        UPDATE periodos 
        SET ativo = true, ocultar_dados = true 
        WHERE ano = $1
        RETURNING id, ano, ativo, ocultar_dados
      `, [ano]);

      if (testResult.rows.length > 0) {
        const periodo = testResult.rows[0];
        if (periodo.ocultar_dados === false) {
          console.log('✅ Trigger funcionando! Tentou definir ocultar_dados=true mas foi forçado para false');
          console.log(`   Período ${periodo.ano}: ativo=${periodo.ativo}, ocultar_dados=${periodo.ocultar_dados}`);
        } else {
          console.log('❌ Trigger não funcionou! ocultar_dados ainda está true');
        }
      }

      // Restaurar estado original
      await client.query(`UPDATE periodos SET ativo = false WHERE ano = $1`, [ano]);
      
      // Reativar o período que estava ativo antes
      const periodoAtivoOriginal = await client.query(`
        SELECT id FROM periodos WHERE ano = 2026 LIMIT 1
      `);
      if (periodoAtivoOriginal.rows.length > 0) {
        await client.query(`UPDATE periodos SET ativo = true WHERE id = $1`, [periodoAtivoOriginal.rows[0].id]);
      }
    }
    
    console.log('\n✅ Migração aplicada com sucesso no Neon!');
    console.log('📝 Trigger garantirá que período ativo sempre tenha ocultar_dados = false');

  } catch (error) {
    console.error('❌ Erro ao aplicar trigger no Neon:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarTrigger().catch(console.error);
