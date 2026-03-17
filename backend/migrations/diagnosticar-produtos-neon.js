/**
 * Script para diagnosticar por que apenas 3 produtos aparecem no Vercel
 * 
 * Executa: node backend/migrations/diagnosticar-produtos-neon.js
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function diagnosticar() {
  console.log('🔍 DIAGNÓSTICO DE PRODUTOS DISPONÍVEIS\n');

  try {
    // 1. Verificar total de produtos
    console.log('1️⃣  Verificando total de produtos cadastrados...');
    const totalProdutos = await pool.query('SELECT COUNT(*) as total FROM produtos');
    console.log(`   ✅ Total de produtos: ${totalProdutos.rows[0].total}\n`);

    // 2. Verificar total de contratos
    console.log('2️⃣  Verificando total de contratos...');
    const totalContratos = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ativo') as ativos,
        COUNT(*) FILTER (WHERE status != 'ativo') as inativos
      FROM contratos
    `);
    console.log(`   ✅ Total de contratos: ${totalContratos.rows[0].total}`);
    console.log(`   ✅ Contratos ativos: ${totalContratos.rows[0].ativos}`);
    console.log(`   ✅ Contratos inativos: ${totalContratos.rows[0].inativos}\n`);

    // 3. Verificar total de contrato_produtos
    console.log('3️⃣  Verificando produtos em contratos...');
    const totalContratoProdutos = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ativo = true) as ativos,
        COUNT(*) FILTER (WHERE ativo = false) as inativos
      FROM contrato_produtos
    `);
    console.log(`   ✅ Total de produtos em contratos: ${totalContratoProdutos.rows[0].total}`);
    console.log(`   ✅ Produtos ativos: ${totalContratoProdutos.rows[0].ativos}`);
    console.log(`   ✅ Produtos inativos: ${totalContratoProdutos.rows[0].inativos}\n`);

    // 4. Verificar produtos disponíveis (mesma query da API)
    console.log('4️⃣  Executando query da API (produtos disponíveis)...');
    const produtosDisponiveis = await pool.query(`
      SELECT 
        cp.id as contrato_produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        cp.ativo as cp_ativo,
        COALESCE(
          (SELECT SUM(cpm2.quantidade_disponivel) 
           FROM contrato_produtos_modalidades cpm2 
           WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
          0
        ) as saldo_disponivel,
        p.id as produto_id,
        p.nome as produto_nome,
        COALESCE(p.unidade, 'UN') as unidade,
        c.id as contrato_id,
        c.numero as contrato_numero,
        c.status as contrato_status,
        f.id as fornecedor_id,
        f.nome as fornecedor_nome
      FROM contrato_produtos cp
      JOIN produtos p ON cp.produto_id = p.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE cp.ativo = true 
        AND c.status = 'ativo'
      ORDER BY f.nome, p.nome
    `);
    
    console.log(`   ✅ Produtos retornados pela query: ${produtosDisponiveis.rows.length}\n`);

    if (produtosDisponiveis.rows.length > 0) {
      console.log('📦 Primeiros 5 produtos encontrados:');
      produtosDisponiveis.rows.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.produto_nome} (${p.fornecedor_nome})`);
        console.log(`      - Contrato: ${p.contrato_numero} (${p.contrato_status})`);
        console.log(`      - Saldo: ${p.saldo_disponivel}`);
        console.log(`      - CP Ativo: ${p.cp_ativo}`);
      });
    }

    // 5. Verificar produtos que NÃO aparecem
    console.log('\n5️⃣  Verificando produtos que NÃO aparecem na lista...');
    const produtosNaoDisponiveis = await pool.query(`
      SELECT 
        cp.id as contrato_produto_id,
        p.nome as produto_nome,
        c.numero as contrato_numero,
        c.status as contrato_status,
        cp.ativo as cp_ativo,
        f.nome as fornecedor_nome,
        CASE 
          WHEN cp.ativo = false THEN 'Produto inativo no contrato'
          WHEN c.status != 'ativo' THEN 'Contrato não está ativo'
          ELSE 'Outro motivo'
        END as motivo
      FROM contrato_produtos cp
      JOIN produtos p ON cp.produto_id = p.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE NOT (cp.ativo = true AND c.status = 'ativo')
      ORDER BY motivo, p.nome
      LIMIT 10
    `);

    if (produtosNaoDisponiveis.rows.length > 0) {
      console.log(`   ⚠️  ${produtosNaoDisponiveis.rows.length} produtos não aparecem. Motivos:\n`);
      produtosNaoDisponiveis.rows.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.produto_nome} (${p.fornecedor_nome})`);
        console.log(`      - Contrato: ${p.contrato_numero}`);
        console.log(`      - Motivo: ${p.motivo}`);
        console.log(`      - Status Contrato: ${p.contrato_status}`);
        console.log(`      - CP Ativo: ${p.cp_ativo}`);
      });
    } else {
      console.log('   ✅ Todos os produtos estão disponíveis!');
    }

    // 6. Verificar modalidades
    console.log('\n6️⃣  Verificando contrato_produtos_modalidades...');
    const modalidades = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ativo = true) as ativos,
        COUNT(*) FILTER (WHERE ativo = false) as inativos,
        SUM(quantidade_disponivel) as total_disponivel
      FROM contrato_produtos_modalidades
    `);
    console.log(`   ✅ Total de registros: ${modalidades.rows[0].total}`);
    console.log(`   ✅ Ativos: ${modalidades.rows[0].ativos}`);
    console.log(`   ✅ Inativos: ${modalidades.rows[0].inativos}`);
    console.log(`   ✅ Quantidade total disponível: ${modalidades.rows[0].total_disponivel}`);

    // 7. Resumo por fornecedor
    console.log('\n7️⃣  Resumo por fornecedor...');
    const resumoFornecedor = await pool.query(`
      SELECT 
        f.nome as fornecedor,
        COUNT(DISTINCT cp.id) as total_produtos,
        COUNT(DISTINCT cp.id) FILTER (WHERE cp.ativo = true AND c.status = 'ativo') as produtos_disponiveis
      FROM fornecedores f
      LEFT JOIN contratos c ON f.id = c.fornecedor_id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
      GROUP BY f.id, f.nome
      ORDER BY produtos_disponiveis DESC
    `);

    console.log('\n   Fornecedores:');
    resumoFornecedor.rows.forEach(f => {
      console.log(`   - ${f.fornecedor}: ${f.produtos_disponiveis}/${f.total_produtos} produtos disponíveis`);
    });

    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!\n');

    // Recomendações
    console.log('💡 RECOMENDAÇÕES:');
    if (produtosDisponiveis.rows.length < 10) {
      console.log('   ⚠️  Poucos produtos disponíveis. Verifique:');
      console.log('      1. Status dos contratos (devem estar "ativo")');
      console.log('      2. Campo "ativo" em contrato_produtos (deve ser true)');
      console.log('      3. Se os produtos estão vinculados a contratos');
    }

    if (produtosNaoDisponiveis.rows.length > 0) {
      console.log('   ⚠️  Produtos não disponíveis encontrados. Ações:');
      console.log('      1. Ativar contratos inativos se necessário');
      console.log('      2. Ativar produtos em contrato_produtos');
      console.log('      3. Verificar se há produtos sem contrato');
    }

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnosticar();
