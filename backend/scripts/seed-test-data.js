/**
 * Script para popular dados de teste no sistema
 * Garante que todas as escolas tenham dados básicos para testes
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seedTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Iniciando população de dados de teste...\n');

    // 1. Verificar escolas existentes
    console.log('📋 Verificando escolas...');
    const escolasResult = await client.query('SELECT id, nome FROM escolas ORDER BY id LIMIT 10');
    const escolas = escolasResult.rows;
    
    if (escolas.length === 0) {
      console.log('⚠️  Nenhuma escola encontrada. Criando escolas de teste...');
      
      const escolasTest = [
        { nome: 'Escola Municipal Centro', rota: 'Rota 1', ordem: 1 },
        { nome: 'Escola Estadual Norte', rota: 'Rota 1', ordem: 2 },
        { nome: 'Escola Municipal Sul', rota: 'Rota 2', ordem: 1 },
        { nome: 'Escola Estadual Leste', rota: 'Rota 2', ordem: 2 },
        { nome: 'Escola Municipal Oeste', rota: 'Rota 3', ordem: 1 }
      ];

      for (const escola of escolasTest) {
        await client.query(
          'INSERT INTO escolas (nome, rota, ordem_rota) VALUES ($1, $2, $3)',
          [escola.nome, escola.rota, escola.ordem]
        );
      }
      
      const novasEscolas = await client.query('SELECT id, nome FROM escolas ORDER BY id LIMIT 10');
      escolas.push(...novasEscolas.rows);
      console.log(`✅ ${escolasTest.length} escolas criadas`);
    } else {
      console.log(`✅ ${escolas.length} escolas encontradas`);
    }

    // 2. Verificar produtos existentes
    console.log('\n📦 Verificando produtos...');
    const produtosResult = await client.query('SELECT id, nome, unidade FROM produtos ORDER BY id LIMIT 10');
    const produtos = produtosResult.rows;
    
    if (produtos.length === 0) {
      console.log('⚠️  Nenhum produto encontrado. Criando produtos de teste...');
      
      const produtosTest = [
        { nome: 'Arroz Branco', unidade: 'Kg' },
        { nome: 'Feijão Preto', unidade: 'Kg' },
        { nome: 'Óleo de Soja', unidade: 'L' },
        { nome: 'Açúcar Cristal', unidade: 'Kg' },
        { nome: 'Sal Refinado', unidade: 'Kg' },
        { nome: 'Macarrão', unidade: 'Kg' },
        { nome: 'Leite Integral', unidade: 'L' },
        { nome: 'Ovos', unidade: 'Dz' }
      ];

      for (const produto of produtosTest) {
        await client.query(
          'INSERT INTO produtos (nome, unidade) VALUES ($1, $2)',
          [produto.nome, produto.unidade]
        );
      }
      
      const novosProdutos = await client.query('SELECT id, nome, unidade FROM produtos ORDER BY id LIMIT 10');
      produtos.push(...novosProdutos.rows);
      console.log(`✅ ${produtosTest.length} produtos criados`);
    } else {
      console.log(`✅ ${produtos.length} produtos encontrados`);
    }

    // 3. Popular estoque escolar básico
    console.log('\n📊 Populando estoque escolar...');
    let estoqueCount = 0;
    
    for (const escola of escolas.slice(0, 5)) {
      for (const produto of produtos.slice(0, 5)) {
        // Verificar se já existe
        const existente = await client.query(
          'SELECT id FROM estoque_escolar WHERE escola_id = $1 AND produto_id = $2',
          [escola.id, produto.id]
        );

        if (existente.rows.length === 0) {
          const quantidadeAleatoria = Math.floor(Math.random() * 100) + 10;
          
          await client.query(
            `INSERT INTO estoque_escolar (escola_id, produto_id, quantidade_atual, unidade, data_atualizacao)
             VALUES ($1, $2, $3, $4, NOW())`,
            [escola.id, produto.id, quantidadeAleatoria, produto.unidade]
          );
          estoqueCount++;
        }
      }
    }
    
    console.log(`✅ ${estoqueCount} registros de estoque criados`);

    // 4. Criar competência de teste
    console.log('\n📅 Criando competência de teste...');
    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();
    
    const competenciaExistente = await client.query(
      'SELECT id FROM guias WHERE mes = $1 AND ano = $2',
      [mesAtual, anoAtual]
    );

    let guiaId;
    if (competenciaExistente.rows.length === 0) {
      const guiaResult = await client.query(
        `INSERT INTO guias (nome, mes, ano, status) 
         VALUES ($1, $2, $3, 'ativo') 
         RETURNING id`,
        [`Guia ${mesAtual}/${anoAtual}`, mesAtual, anoAtual]
      );
      guiaId = guiaResult.rows[0].id;
      console.log(`✅ Competência ${mesAtual}/${anoAtual} criada (ID: ${guiaId})`);
    } else {
      guiaId = competenciaExistente.rows[0].id;
      console.log(`✅ Competência ${mesAtual}/${anoAtual} já existe (ID: ${guiaId})`);
    }

    // 5. Adicionar alguns itens na guia de demanda
    console.log('\n📝 Adicionando itens na guia de demanda...');
    let guiaItensCount = 0;
    
    for (const escola of escolas.slice(0, 3)) {
      for (const produto of produtos.slice(0, 3)) {
        const existente = await client.query(
          `SELECT id FROM guia_produtos_escola 
           WHERE escola_id = $1 AND produto_id = $2 AND mes_competencia = $3 AND ano_competencia = $4`,
          [escola.id, produto.id, mesAtual, anoAtual]
        );

        if (existente.rows.length === 0) {
          const quantidade = Math.floor(Math.random() * 50) + 10;
          const status = ['pendente', 'programada', 'entregue'][Math.floor(Math.random() * 3)];
          
          await client.query(
            `INSERT INTO guia_produtos_escola 
             (escola_id, produto_id, quantidade, unidade, mes_competencia, ano_competencia, status, data_entrega)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '7 days')`,
            [escola.id, produto.id, quantidade, produto.unidade, mesAtual, anoAtual, status]
          );
          guiaItensCount++;
        }
      }
    }
    
    console.log(`✅ ${guiaItensCount} itens adicionados na guia de demanda`);

    // 6. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('✅ DADOS DE TESTE POPULADOS COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📊 Resumo:');
    console.log(`   • Escolas: ${escolas.length}`);
    console.log(`   • Produtos: ${produtos.length}`);
    console.log(`   • Estoque: ${estoqueCount} registros`);
    console.log(`   • Competência: ${mesAtual}/${anoAtual} (ID: ${guiaId})`);
    console.log(`   • Itens Guia: ${guiaItensCount}`);
    
    console.log('\n📝 IDs Válidos para Testes:');
    console.log(`   • Escola ID: ${escolas[0]?.id} (${escolas[0]?.nome})`);
    console.log(`   • Produto ID: ${produtos[0]?.id} (${produtos[0]?.nome})`);
    console.log(`   • Guia ID: ${guiaId}`);
    
    console.log('\n🚀 Sistema pronto para testes!\n');

  } catch (error) {
    console.error('❌ Erro ao popular dados:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
seedTestData().catch(console.error);
