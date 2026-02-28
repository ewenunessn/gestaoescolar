const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function verificarEntregasRecentes() {
  try {
    // Buscar todas as entregas recentes
    const result = await pool.query(`
      SELECT 
        he.id,
        he.quantidade_entregue,
        he.data_entrega,
        he.nome_quem_entregou,
        he.nome_quem_recebeu,
        p.nome as produto,
        gpe.unidade,
        gpe.quantidade as quantidade_programada,
        e.nome as escola
      FROM historico_entregas he
      JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      JOIN produtos p ON gpe.produto_id = p.id
      JOIN escolas e ON gpe.escola_id = e.id
      ORDER BY he.data_entrega DESC
      LIMIT 30
    `);
    
    console.log('\n=== ÚLTIMAS 30 ENTREGAS NO BANCO NEON ===\n');
    
    if (result.rows.length === 0) {
      console.log('Nenhuma entrega encontrada.');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`\n[${index + 1}] ID: ${row.id}`);
        console.log(`Produto: ${row.produto}`);
        console.log(`Programado: ${row.quantidade_programada} ${row.unidade}`);
        console.log(`Entregue: ${row.quantidade_entregue} ${row.unidade}`);
        
        // Verificar se é entrega parcial ou diferente
        if (parseFloat(row.quantidade_entregue) !== parseFloat(row.quantidade_programada)) {
          const diff = parseFloat(row.quantidade_programada) - parseFloat(row.quantidade_entregue);
          console.log(`⚠️ DIFERENÇA: ${diff > 0 ? 'Faltam' : 'Excesso de'} ${Math.abs(diff)} ${row.unidade}`);
          
          // Verificar se pode ser erro de digitação (ex: 50 virou 5)
          if (parseFloat(row.quantidade_entregue) * 10 === parseFloat(row.quantidade_programada)) {
            console.log(`🔴 POSSÍVEL ERRO: Parece que faltou um zero! (${row.quantidade_entregue} * 10 = ${row.quantidade_programada})`);
          }
        }
        
        console.log(`Escola: ${row.escola}`);
        console.log(`Entregador: ${row.nome_quem_entregou}`);
        console.log(`Recebedor: ${row.nome_quem_recebeu}`);
        console.log(`Data: ${new Date(row.data_entrega).toLocaleString('pt-BR')}`);
        console.log('---');
      });
      
      console.log(`\n\nTotal de entregas: ${result.rows.length}`);
      
      // Estatísticas
      const parciais = result.rows.filter(r => 
        parseFloat(r.quantidade_entregue) !== parseFloat(r.quantidade_programada)
      );
      console.log(`Entregas parciais/diferentes: ${parciais.length}`);
      
      const possivelErro = result.rows.filter(r => 
        parseFloat(r.quantidade_entregue) * 10 === parseFloat(r.quantidade_programada)
      );
      if (possivelErro.length > 0) {
        console.log(`\n🔴 ATENÇÃO: ${possivelErro.length} entrega(s) com possível erro de digitação (faltou zero):`);
        possivelErro.forEach(r => {
          console.log(`  - ${r.produto}: ${r.quantidade_entregue} ao invés de ${r.quantidade_programada} ${r.unidade}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarEntregasRecentes();
