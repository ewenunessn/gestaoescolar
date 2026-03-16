const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function aplicarMigracaoPeriodos() {
  try {
    await client.connect();
    console.log('✅ Conectado ao Neon\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '20260315_create_periodos_sistema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Aplicando migração de períodos...\n');

    // Executar SQL
    await client.query(sql);

    console.log('✅ Migração aplicada com sucesso!\n');

    // Verificar períodos criados
    const result = await client.query(`
      SELECT id, ano, descricao, data_inicio, data_fim, ativo, fechado
      FROM periodos
      ORDER BY ano DESC
    `);

    console.log('📊 Períodos cadastrados:\n');
    result.rows.forEach(p => {
      const status = p.ativo ? '🟢 ATIVO' : (p.fechado ? '🔒 FECHADO' : '⚪ INATIVO');
      console.log(`   ${status} ${p.ano} - ${p.descricao}`);
      console.log(`      De ${p.data_inicio.toISOString().split('T')[0]} até ${p.data_fim.toISOString().split('T')[0]}`);
    });

    // Verificar quantos registros foram atualizados
    const pedidosCount = await client.query('SELECT COUNT(*) FROM pedidos WHERE periodo_id IS NOT NULL');
    const guiasCount = await client.query('SELECT COUNT(*) FROM guias WHERE periodo_id IS NOT NULL');
    const cardapiosCount = await client.query('SELECT COUNT(*) FROM cardapios WHERE periodo_id IS NOT NULL');

    console.log('\n📈 Registros vinculados a períodos:');
    console.log(`   Pedidos: ${pedidosCount.rows[0].count}`);
    console.log(`   Guias: ${guiasCount.rows[0].count}`);
    console.log(`   Cardápios: ${cardapiosCount.rows[0].count}`);

    console.log('\n✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migração:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada');
  }
}

aplicarMigracaoPeriodos().catch(console.error);
