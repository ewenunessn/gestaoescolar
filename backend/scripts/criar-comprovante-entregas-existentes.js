const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function criar() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Criando comprovante para entregas existentes...\n');

    // Buscar as entregas recentes (IDs 50 e 51)
    const entregas = await client.query(`
      SELECT 
        he.id as historico_id,
        he.quantidade_entregue,
        he.nome_quem_entregou,
        he.nome_quem_recebeu,
        he.observacao,
        he.assinatura_base64,
        gpe.escola_id,
        gpe.unidade,
        e.nome as escola_nome,
        p.nome as produto_nome
      FROM historico_entregas he
      INNER JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      INNER JOIN produtos p ON gpe.produto_id = p.id
      WHERE he.id IN (50, 51)
      ORDER BY he.id
    `);

    if (entregas.rows.length === 0) {
      console.log('❌ Entregas não encontradas');
      await client.query('ROLLBACK');
      return;
    }

    const primeiraEntrega = entregas.rows[0];
    
    console.log(`📋 Escola: ${primeiraEntrega.escola_nome}`);
    console.log(`👤 Entregador: ${primeiraEntrega.nome_quem_entregou}`);
    console.log(`👤 Recebedor: ${primeiraEntrega.nome_quem_recebeu}`);
    console.log(`📦 Itens: ${entregas.rows.length}\n`);

    // Gerar número do comprovante
    const numeroResult = await client.query('SELECT gerar_numero_comprovante() as numero');
    const numeroComprovante = numeroResult.rows[0].numero;

    // Criar comprovante
    const comprovante = await client.query(`
      INSERT INTO comprovantes_entrega (
        numero_comprovante,
        escola_id,
        nome_quem_entregou,
        nome_quem_recebeu,
        observacao,
        assinatura_base64,
        total_itens,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      numeroComprovante,
      primeiraEntrega.escola_id,
      primeiraEntrega.nome_quem_entregou,
      primeiraEntrega.nome_quem_recebeu,
      primeiraEntrega.observacao,
      primeiraEntrega.assinatura_base64,
      entregas.rows.length,
      'finalizado'
    ]);

    console.log(`✅ Comprovante criado: ${numeroComprovante}\n`);

    // Inserir itens do comprovante
    for (const entrega of entregas.rows) {
      await client.query(`
        INSERT INTO comprovante_itens (
          comprovante_id,
          historico_entrega_id,
          produto_nome,
          quantidade_entregue,
          unidade
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        comprovante.rows[0].id,
        entrega.historico_id,
        entrega.produto_nome,
        entrega.quantidade_entregue,
        entrega.unidade
      ]);
      console.log(`   ✓ ${entrega.produto_nome}: ${entrega.quantidade_entregue} ${entrega.unidade}`);
    }

    await client.query('COMMIT');
    
    console.log('\n🎉 Comprovante criado com sucesso!');
    console.log(`\nAcesse: http://localhost:5173/comprovantes-entrega`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

criar();
