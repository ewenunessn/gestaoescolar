const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function debugSaldoContratos() {
  try {
    console.log('🔍 ANÁLISE DE SALDO DE CONTRATOS\n');
    console.log('='.repeat(80));

    // 1. Verificar total de produtos em contratos ativos
    console.log('\n1️⃣ PRODUTOS EM CONTRATOS ATIVOS:');
    const totalProdutos = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as total_produtos,
             COUNT(DISTINCT p.nome) as total_produtos_por_nome,
             COUNT(DISTINCT cp.id) as total_contrato_produtos
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.ativo = true
        AND c.ativo = true
    `);
    console.log('   Total de produtos únicos (por ID):', totalProdutos.rows[0].total_produtos);
    console.log('   Total de produtos únicos (por nome):', totalProdutos.rows[0].total_produtos_por_nome);
    console.log('   Total de itens em contratos:', totalProdutos.rows[0].total_contrato_produtos);

    // 2. Listar todos os produtos em contratos
    console.log('\n2️⃣ LISTA DE TODOS OS PRODUTOS EM CONTRATOS:');
    const todosProdutos = await pool.query(`
      SELECT DISTINCT 
        p.id as produto_id,
        p.nome as produto_nome,
        COUNT(DISTINCT cp.id) as qtd_contratos
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.ativo = true
        AND c.ativo = true
      GROUP BY p.id, p.nome
      ORDER BY p.nome
    `);
    
    console.log(`   Total encontrado: ${todosProdutos.rows.length} produtos\n`);
    todosProdutos.rows.forEach((p, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(3, ' ')}. ${p.produto_nome.padEnd(50, ' ')} (${p.qtd_contratos} contrato(s))`);
    });

    // 3. Verificar a query que está sendo usada no controller (agrupando por nome)
    console.log('\n3️⃣ QUERY DO CONTROLLER (agrupando por nome):');
    const queryController = await pool.query(`
      SELECT DISTINCT p.nome as produto_nome, 
             array_agg(DISTINCT cp.id) as contrato_produto_ids,
             COUNT(DISTINCT cp.id) as qtd_contratos
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE cp.ativo = true
        AND c.ativo = true
      GROUP BY p.nome
      ORDER BY p.nome
      LIMIT 25
    `);
    
    console.log(`   Primeiros 25 produtos (como no controller):\n`);
    queryController.rows.forEach((p, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(3, ' ')}. ${p.produto_nome.padEnd(50, ' ')} (${p.qtd_contratos} contrato(s)) - IDs: [${p.contrato_produto_ids.join(', ')}]`);
    });

    // 4. Verificar se há produtos duplicados por nome
    console.log('\n4️⃣ PRODUTOS COM NOMES DUPLICADOS:');
    const duplicados = await pool.query(`
      SELECT 
        p.nome as produto_nome,
        COUNT(DISTINCT p.id) as qtd_ids_diferentes,
        array_agg(DISTINCT p.id) as produto_ids
      FROM produtos p
      WHERE p.id IN (
        SELECT DISTINCT produto_id 
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        WHERE cp.ativo = true AND c.ativo = true
      )
      GROUP BY p.nome
      HAVING COUNT(DISTINCT p.id) > 1
      ORDER BY p.nome
    `);
    
    if (duplicados.rows.length > 0) {
      console.log(`   ⚠️  Encontrados ${duplicados.rows.length} produtos com nomes duplicados:\n`);
      duplicados.rows.forEach((p) => {
        console.log(`   - ${p.produto_nome}: ${p.qtd_ids_diferentes} IDs diferentes [${p.produto_ids.join(', ')}]`);
      });
    } else {
      console.log('   ✅ Não há produtos com nomes duplicados');
    }

    // 5. Verificar contratos ativos
    console.log('\n5️⃣ CONTRATOS ATIVOS:');
    const contratos = await pool.query(`
      SELECT 
        c.id,
        c.numero,
        f.nome as fornecedor,
        COUNT(cp.id) as qtd_produtos,
        c.ativo
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN contrato_produtos cp ON cp.contrato_id = c.id AND cp.ativo = true
      WHERE c.ativo = true
      GROUP BY c.id, c.numero, f.nome, c.ativo
      ORDER BY c.numero
    `);
    
    console.log(`   Total de contratos ativos: ${contratos.rows.length}\n`);
    contratos.rows.forEach((c) => {
      console.log(`   - Contrato ${c.numero} (${c.fornecedor}): ${c.qtd_produtos} produtos`);
    });

    // 6. Testar a query com LIMIT 500
    console.log('\n6️⃣ TESTE COM LIMIT 500:');
    const comLimit500 = await pool.query(`
      SELECT DISTINCT p.nome as produto_nome
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.ativo = true
        AND c.ativo = true
      GROUP BY p.nome
      ORDER BY p.nome
      LIMIT 500
    `);
    console.log(`   Produtos retornados com LIMIT 500: ${comLimit500.rows.length}`);

    // 7. Verificar se há problema com a paginação
    console.log('\n7️⃣ SIMULAÇÃO DE PAGINAÇÃO:');
    for (let page = 1; page <= 3; page++) {
      const limit = 100;
      const offset = (page - 1) * limit;
      
      const paginado = await pool.query(`
        SELECT DISTINCT p.nome as produto_nome
        FROM contrato_produtos cp
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN produtos p ON cp.produto_id = p.id
        WHERE cp.ativo = true
          AND c.ativo = true
        GROUP BY p.nome
        ORDER BY p.nome
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      console.log(`   Página ${page} (LIMIT ${limit} OFFSET ${offset}): ${paginado.rows.length} produtos`);
      if (paginado.rows.length > 0) {
        console.log(`      Primeiro: ${paginado.rows[0].produto_nome}`);
        console.log(`      Último: ${paginado.rows[paginado.rows.length - 1].produto_nome}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Análise concluída!\n');

  } catch (error) {
    console.error('❌ Erro na análise:', error);
  } finally {
    await pool.end();
  }
}

debugSaldoContratos();
