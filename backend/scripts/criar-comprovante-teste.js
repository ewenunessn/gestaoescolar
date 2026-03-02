const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarTeste() {
  try {
    console.log('🔧 Criando comprovante de teste...\n');

    // Buscar uma escola
    const escola = await pool.query('SELECT id, nome FROM escolas LIMIT 1');
    if (escola.rows.length === 0) {
      console.log('❌ Nenhuma escola encontrada');
      return;
    }

    // Buscar alguns históricos de entrega
    const historicos = await pool.query(`
      SELECT 
        he.id,
        p.nome as produto_nome,
        he.quantidade_entregue,
        gpe.unidade,
        gpe.escola_id
      FROM historico_entregas he
      INNER JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      INNER JOIN produtos p ON gpe.produto_id = p.id
      WHERE gpe.escola_id = $1
      LIMIT 3
    `, [escola.rows[0].id]);

    if (historicos.rows.length === 0) {
      console.log('❌ Nenhum histórico de entrega encontrado para esta escola');
      return;
    }

    console.log(`📋 Escola: ${escola.rows[0].nome}`);
    console.log(`📦 Itens encontrados: ${historicos.rows.length}`);

    // Gerar número do comprovante
    const numeroResult = await pool.query('SELECT gerar_numero_comprovante() as numero');
    const numeroComprovante = numeroResult.rows[0].numero;

    // Criar comprovante
    const comprovante = await pool.query(`
      INSERT INTO comprovantes_entrega (
        numero_comprovante,
        escola_id,
        nome_quem_entregou,
        nome_quem_recebeu,
        cargo_recebedor,
        observacao,
        total_itens
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      numeroComprovante,
      escola.rows[0].id,
      'João Silva (Teste)',
      'Maria Santos (Teste)',
      'Diretora',
      'Comprovante de teste criado automaticamente',
      historicos.rows.length
    ]);

    console.log(`\n✅ Comprovante criado: ${numeroComprovante}`);

    // Inserir itens
    for (const hist of historicos.rows) {
      await pool.query(`
        INSERT INTO comprovante_itens (
          comprovante_id,
          historico_entrega_id,
          produto_nome,
          quantidade_entregue,
          unidade
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        comprovante.rows[0].id,
        hist.id,
        hist.produto_nome,
        hist.quantidade_entregue,
        hist.unidade
      ]);
      console.log(`   ✓ ${hist.produto_nome}: ${hist.quantidade_entregue} ${hist.unidade}`);
    }

    console.log('\n🎉 Comprovante de teste criado com sucesso!');
    console.log(`\nAcesse: http://localhost:5173/comprovantes-entrega`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

criarTeste();
