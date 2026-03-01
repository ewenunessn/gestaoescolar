const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Usar a URL do Neon (produção)
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyMigrationNeon() {
  try {
    console.log('🔄 Aplicando migration de competência no NEON (Vercel)...\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '../src/migrations/20250301_add_competencia_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar a migration
    await pool.query(sql);

    console.log('✅ Migration aplicada com sucesso no NEON!\n');

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

    console.log('📊 Exemplos de registros após migration (NEON):\n');
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

    console.log(`📦 Total de entregas antecipadas no NEON: ${antecipadas.rows[0].total}\n`);

    // Verificar se a view foi criada
    const viewCheck = await pool.query(`
      SELECT COUNT(*) as total
      FROM information_schema.views
      WHERE table_name = 'vw_entregas_programadas'
    `);

    if (viewCheck.rows[0].total > 0) {
      console.log('✅ View vw_entregas_programadas criada com sucesso!\n');
    } else {
      console.log('⚠️  View vw_entregas_programadas não foi criada\n');
    }

    console.log('💡 Migration aplicada em ambos os ambientes:');
    console.log('   ✅ Local (PostgreSQL)');
    console.log('   ✅ Vercel (Neon)\n');

  } catch (error) {
    console.error('❌ Erro ao aplicar migration no NEON:', error);
    console.error('\nDetalhes:', error.message);
  } finally {
    await pool.end();
  }
}

applyMigrationNeon();
