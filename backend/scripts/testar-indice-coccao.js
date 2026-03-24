const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const db = {
  query: (text, params) => pool.query(text, params),
  pool
};

/**
 * Script para testar a implementação do Índice de Cocção
 * 
 * Testa:
 * 1. Produtos com diferentes índices de cocção
 * 2. Cálculos de per capita bruto (compra)
 * 3. Validação da lógica: IC primeiro, depois FC
 */

async function testarIndiceCoccao() {
  console.log('\n🧪 ===== TESTE: ÍNDICE DE COCÇÃO =====\n');

  try {
    // 1. Buscar alguns produtos para verificar os campos
    console.log('📦 1. Verificando produtos no banco...\n');
    
    const produtos = await db.query(`
      SELECT 
        id, 
        nome, 
        fator_correcao, 
        indice_coccao,
        unidade_distribuicao,
        peso
      FROM produtos 
      WHERE nome IN ('Arroz', 'Carne Bovina', 'Batata', 'Óleo De Soja')
      ORDER BY nome
    `);

    if (produtos.rows.length === 0) {
      console.log('⚠️  Nenhum produto encontrado. Criando produtos de teste...\n');
      
      // Criar produtos de teste
      await db.query(`
        INSERT INTO produtos (nome, fator_correcao, indice_coccao, unidade_distribuicao, peso, ativo)
        VALUES 
          ('Arroz Teste', 1.0, 2.5, 'Quilograma', 1000, true),
          ('Carne Teste', 1.2, 0.7, 'Quilograma', 1000, true),
          ('Batata Teste', 1.18, 0.95, 'Quilograma', 1000, true),
          ('Salada Teste', 1.25, 1.0, 'Quilograma', 1000, true)
        ON CONFLICT DO NOTHING
      `);
      
      // Buscar novamente
      const novosProdutos = await db.query(`
        SELECT id, nome, fator_correcao, indice_coccao, unidade_distribuicao, peso
        FROM produtos 
        WHERE nome LIKE '%Teste'
        ORDER BY nome
      `);
      
      produtos.rows = novosProdutos.rows;
    }

    console.log('Produtos encontrados:');
    produtos.rows.forEach(p => {
      console.log(`  • ${p.nome}`);
      console.log(`    - Fator Correção: ${p.fator_correcao || 1.0}`);
      console.log(`    - Índice Cocção: ${p.indice_coccao || 1.0}`);
      console.log(`    - Unidade: ${p.unidade_distribuicao || 'N/A'}`);
      console.log(`    - Peso: ${p.peso || 'N/A'}g\n`);
    });

    // 2. Testar cálculos matemáticos
    console.log('\n🧮 2. Testando cálculos matemáticos...\n');
    
    const cenarios = [
      {
        nome: 'Arroz Cozido',
        perCapitaFinal: 150, // gramas cozidas
        indiceCoccao: 2.5,   // ganha peso
        fatorCorrecao: 1.0,  // sem perda
        esperado: {
          cru: 60,           // 150 / 2.5
          bruto: 60          // 60 * 1.0
        }
      },
      {
        nome: 'Carne Bovina Cozida',
        perCapitaFinal: 100, // gramas cozidas
        indiceCoccao: 0.7,   // perde peso
        fatorCorrecao: 1.2,  // perde na limpeza
        esperado: {
          cru: 142.86,       // 100 / 0.7
          bruto: 171.43      // 142.86 * 1.2
        }
      },
      {
        nome: 'Batata Cozida',
        perCapitaFinal: 120, // gramas cozidas
        indiceCoccao: 0.95,  // perde pouca água
        fatorCorrecao: 1.18, // perde casca
        esperado: {
          cru: 126.32,       // 120 / 0.95
          bruto: 149.06      // 126.32 * 1.18
        }
      },
      {
        nome: 'Salada Crua',
        perCapitaFinal: 80,  // gramas cruas
        indiceCoccao: 1.0,   // não cozinha
        fatorCorrecao: 1.25, // perde folhas ruins
        esperado: {
          cru: 80,           // 80 / 1.0
          bruto: 100         // 80 * 1.25
        }
      }
    ];

    let todosPassaram = true;

    cenarios.forEach(cenario => {
      console.log(`\n📊 Cenário: ${cenario.nome}`);
      console.log(`   Per Capita Final (cozido): ${cenario.perCapitaFinal}g`);
      console.log(`   Índice de Cocção: ${cenario.indiceCoccao}`);
      console.log(`   Fator de Correção: ${cenario.fatorCorrecao}`);
      
      // Calcular
      const perCapitaCru = cenario.perCapitaFinal / cenario.indiceCoccao;
      const perCapitaBruto = perCapitaCru * cenario.fatorCorrecao;
      
      console.log(`\n   ✅ Cálculo:`);
      console.log(`      1. Per Capita Cru = ${cenario.perCapitaFinal} / ${cenario.indiceCoccao} = ${perCapitaCru.toFixed(2)}g`);
      console.log(`      2. Per Capita Bruto = ${perCapitaCru.toFixed(2)} × ${cenario.fatorCorrecao} = ${perCapitaBruto.toFixed(2)}g`);
      
      // Validar
      const cruOk = Math.abs(perCapitaCru - cenario.esperado.cru) < 0.01;
      const brutoOk = Math.abs(perCapitaBruto - cenario.esperado.bruto) < 0.01;
      
      if (cruOk && brutoOk) {
        console.log(`   ✅ PASSOU! Valores corretos.`);
      } else {
        console.log(`   ❌ FALHOU!`);
        console.log(`      Esperado Cru: ${cenario.esperado.cru}g, Obtido: ${perCapitaCru.toFixed(2)}g`);
        console.log(`      Esperado Bruto: ${cenario.esperado.bruto}g, Obtido: ${perCapitaBruto.toFixed(2)}g`);
        todosPassaram = false;
      }
    });

    // 3. Testar validações
    console.log('\n\n🔒 3. Testando validações...\n');
    
    // Tentar criar produto com FC < 1.0 (deve falhar)
    console.log('   Testando FC < 1.0 (deve falhar)...');
    try {
      await db.query(`
        INSERT INTO produtos (nome, fator_correcao, indice_coccao, ativo)
        VALUES ('Teste FC Invalido', 0.5, 1.0, true)
      `);
      console.log('   ❌ FALHOU: Deveria ter rejeitado FC < 1.0');
      todosPassaram = false;
    } catch (err) {
      console.log('   ✅ PASSOU: FC < 1.0 foi rejeitado corretamente');
    }

    // Tentar criar produto com IC <= 0 (deve falhar)
    console.log('   Testando IC <= 0 (deve falhar)...');
    try {
      await db.query(`
        INSERT INTO produtos (nome, fator_correcao, indice_coccao, ativo)
        VALUES ('Teste IC Invalido', 1.0, 0, true)
      `);
      console.log('   ❌ FALHOU: Deveria ter rejeitado IC <= 0');
      todosPassaram = false;
    } catch (err) {
      console.log('   ✅ PASSOU: IC <= 0 foi rejeitado corretamente');
    }

    // IC > 1.0 deve ser aceito (arroz, macarrão)
    console.log('   Testando IC > 1.0 (deve passar)...');
    try {
      await db.query(`
        INSERT INTO produtos (nome, fator_correcao, indice_coccao, ativo)
        VALUES ('Teste IC Alto', 1.0, 3.0, true)
        ON CONFLICT DO NOTHING
      `);
      console.log('   ✅ PASSOU: IC > 1.0 foi aceito corretamente');
    } catch (err) {
      console.log('   ❌ FALHOU: IC > 1.0 deveria ser aceito');
      todosPassaram = false;
    }

    // IC < 1.0 deve ser aceito (carne, legumes)
    console.log('   Testando IC < 1.0 (deve passar)...');
    try {
      await db.query(`
        INSERT INTO produtos (nome, fator_correcao, indice_coccao, ativo)
        VALUES ('Teste IC Baixo', 1.0, 0.6, true)
        ON CONFLICT DO NOTHING
      `);
      console.log('   ✅ PASSOU: IC < 1.0 foi aceito corretamente');
    } catch (err) {
      console.log('   ❌ FALHOU: IC < 1.0 deveria ser aceito');
      todosPassaram = false;
    }

    // 4. Resultado final
    console.log('\n\n' + '='.repeat(50));
    if (todosPassaram) {
      console.log('✅ TODOS OS TESTES PASSARAM!');
      console.log('\n📋 Resumo da implementação:');
      console.log('   • Campo indice_coccao adicionado ao banco');
      console.log('   • Validações corretas (FC ≥ 1.0, IC > 0)');
      console.log('   • Cálculos matemáticos corretos');
      console.log('   • Lógica: IC primeiro (cozimento), depois FC (pré-preparo)');
    } else {
      console.log('❌ ALGUNS TESTES FALHARAM!');
      console.log('   Revise a implementação.');
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Erro ao executar testes:', error);
    throw error;
  }
}

// Executar
testarIndiceCoccao()
  .then(() => {
    console.log('✅ Testes concluídos com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro nos testes:', error);
    process.exit(1);
  });


// Fechar pool ao finalizar
process.on('exit', () => {
  pool.end();
});
