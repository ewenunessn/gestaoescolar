const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function applyMigration() {
  try {
    console.log('🔄 Aplicando migration de competência...\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '../src/migrations/20250301_add_competencia_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar a migration
    await pool.query(sql);

    console.log('✅ Migration aplicada com sucesso!\n');

    // Verificar os dados
    const result = await pool.query(`
      SELECT 
        gpe.id,
        p.nome as produto,
        e.nome as escola,
        g.mes as mes_competencia,
        g.ano as ano_competencia,
        gpe.data_entrega,
        EXTRACT(MONTH FROM gpe.data_entrega) as mes_entrega,
        EXTRACT(YEAR FROM gpe.data_entrega) as ano_entrega,
        CASE 
          WHEN EXTRACT(MONTH FROM gpe.data_entrega) < g.mes 
            OR (EXTRACT(MONTH FROM gpe.data_entrega) = g.mes AND EXTRACT(YEAR FROM gpe.data_entrega) < g.ano)
          THEN 'SIM'
          ELSE 'NÃO'
        END as entrega_antecipada
      FROM guia_produto_escola gpe
      INNER JOIN guias g ON gpe.guia_id = g.id
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      WHERE gpe.para_entrega = true
      ORDER BY gpe.data_entrega DESC
      LIMIT 10
    `);

    console.log('📊 Exemplos de registros após migration:\n');
    console.log('┌─────────────────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Produto          │ Escola           │ Competência │ Data Entrega │ Antecipada? │');
    console.log('├─────────────────────────────────────────────────────────────────────────────────────────┤');
    
    result.rows.forEach(row => {
      const produto = row.produto.substring(0, 15).padEnd(15);
      const escola = row.escola.substring(0, 15).padEnd(15);
      const competencia = `${String(row.mes_competencia).padStart(2, '0')}/${row.ano_competencia}`.padEnd(10);
      const dataEntrega = row.data_entrega 
        ? new Date(row.data_entrega).toLocaleDateString('pt-BR').padEnd(12)
        : 'N/A'.padEnd(12);
      const antecipada = row.entrega_antecipada.padEnd(11);
      
      console.log(`│ ${produto} │ ${escola} │ ${competencia} │ ${dataEntrega} │ ${antecipada} │`);
    });
    
    console.log('└─────────────────────────────────────────────────────────────────────────────────────────┘\n');

    // Contar entregas antecipadas
    const antecipadas = await pool.query(`
      SELECT COUNT(*) as total
      FROM vw_entregas_programadas
      WHERE entrega_antecipada = true
    `);

    console.log(`📦 Total de entregas antecipadas: ${antecipadas.rows[0].total}\n`);

    console.log('💡 Agora você pode:');
    console.log('   1. Programar entregas para qualquer data');
    console.log('   2. Especificar o mês de competência (consumo) separadamente');
    console.log('   3. Exemplo: Entregar em 25/02 mas contabilizar para Março/2026\n');

  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
  } finally {
    await pool.end();
  }
}

applyMigration();
