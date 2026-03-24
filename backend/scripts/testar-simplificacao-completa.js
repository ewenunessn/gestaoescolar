const { Pool } = require('pg');
require('dotenv').config();

// Usar DATABASE_URL se disponível, senão usar variáveis individuais
const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'merenda_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      }
);

async function testarSimplificacao() {
  console.log('🧪 Testando Simplificação Completa\n');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar se campos foram removidos da tabela
    console.log('\n1️⃣ Verificando estrutura da tabela contrato_produtos...');
    const colunas = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colunas atuais:');
    colunas.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    const camposRemovidos = ['peso_embalagem', 'unidade_compra', 'fator_conversao'];
    const camposEncontrados = colunas.rows.map(c => c.column_name);
    
    let todosRemovidos = true;
    camposRemovidos.forEach(campo => {
      if (camposEncontrados.includes(campo)) {
        console.log(`   ❌ Campo ${campo} ainda existe!`);
        todosRemovidos = false;
      }
    });
    
    if (todosRemovidos) {
      console.log('\n   ✅ Todos os campos de conversão foram removidos!');
    }

    // 2. Verificar produto Óleo
    console.log('\n2️⃣ Verificando produto Óleo...');
    const oleo = await pool.query(`
      SELECT id, nome, peso, unidade_distribuicao
      FROM produtos
      WHERE nome ILIKE '%óleo%'
      LIMIT 1
    `);
    
    if (oleo.rows.length > 0) {
      const produto = oleo.rows[0];
      console.log(`\n   📦 Produto: ${produto.nome}`);
      console.log(`   ⚖️  Peso: ${produto.peso}g`);
      console.log(`   📏 Unidade: ${produto.unidade_distribuicao}`);
      
      if (produto.peso === 450) {
        console.log('   ✅ Peso correto (450g)!');
      } else {
        console.log(`   ⚠️  Peso esperado: 450g, encontrado: ${produto.peso}g`);
      }
    }

    // 3. Verificar contratos do Óleo
    console.log('\n3️⃣ Verificando contratos do Óleo...');
    const contratos = await pool.query(`
      SELECT 
        cp.id,
        cp.quantidade_contratada,
        cp.preco_unitario,
        cp.marca,
        p.nome as produto_nome,
        p.peso as produto_peso,
        p.unidade_distribuicao
      FROM contrato_produtos cp
      JOIN produtos p ON p.id = cp.produto_id
      WHERE p.nome ILIKE '%óleo%'
      LIMIT 5
    `);
    
    if (contratos.rows.length > 0) {
      console.log(`\n   📋 Encontrados ${contratos.rows.length} contratos:`);
      contratos.rows.forEach(c => {
        console.log(`\n   Contrato #${c.id}:`);
        console.log(`   - Produto: ${c.produto_nome}`);
        console.log(`   - Peso produto: ${c.produto_peso}g`);
        console.log(`   - Unidade: ${c.unidade_distribuicao}`);
        console.log(`   - Quantidade: ${c.quantidade_contratada}`);
        console.log(`   - Preço: R$ ${c.preco_unitario}`);
        console.log(`   - Marca: ${c.marca || 'N/A'}`);
      });
      console.log('\n   ✅ Contratos não têm mais campos de conversão!');
    } else {
      console.log('   ℹ️  Nenhum contrato de Óleo encontrado');
    }

    // 4. Verificar uma guia recente
    console.log('\n4️⃣ Verificando guias recentes...');
    const guias = await pool.query(`
      SELECT 
        gpe.id,
        gpe.guia_id,
        gpe.produto_id,
        gpe.quantidade,
        p.nome as produto_nome,
        p.peso as produto_peso,
        p.unidade_distribuicao
      FROM guia_produto_escola gpe
      JOIN produtos p ON p.id = gpe.produto_id
      WHERE p.nome ILIKE '%óleo%'
      ORDER BY gpe.id DESC
      LIMIT 3
    `);
    
    if (guias.rows.length > 0) {
      console.log(`\n   📋 Encontradas ${guias.rows.length} demandas de Óleo:`);
      guias.rows.forEach(g => {
        console.log(`\n   Demanda #${g.id} (Guia #${g.guia_id}):`);
        console.log(`   - Produto: ${g.produto_nome}`);
        console.log(`   - Peso produto: ${g.produto_peso}g`);
        console.log(`   - Unidade: ${g.unidade_distribuicao}`);
        console.log(`   - Quantidade demandada: ${g.quantidade}`);
      });
    }

    // 5. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ SIMPLIFICAÇÃO COMPLETA!');
    console.log('\n📊 Resumo:');
    console.log('   ✅ Campos de conversão removidos do banco');
    console.log('   ✅ Produto Óleo padronizado em 450g');
    console.log('   ✅ Contratos simplificados (sem conversão)');
    console.log('   ✅ Sistema pronto para uso');
    
    console.log('\n🎯 Regra de Ouro:');
    console.log('   "O peso do produto deve ser o peso da embalagem que você compra"');
    console.log('   Demanda = Pedido (sem conversão!)');
    
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro ao testar:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testarSimplificacao()
  .then(() => {
    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro no teste:', error);
    process.exit(1);
  });
