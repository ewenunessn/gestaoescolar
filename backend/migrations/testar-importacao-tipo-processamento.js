const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

// Simular validação do frontend
function validarTipoProcessamento(tipo) {
  const tiposValidos = ['in natura', 'minimamente processado', 'processado', 'ultraprocessado'];
  
  if (!tipo) {
    return { valido: true, mensagem: 'Tipo não informado (opcional)' };
  }
  
  if (!tiposValidos.includes(tipo)) {
    return { 
      valido: false, 
      mensagem: `Tipo de processamento deve ser: ${tiposValidos.join(', ')}` 
    };
  }
  
  return { valido: true, mensagem: 'Tipo válido' };
}

async function testarImportacao() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando validação de importação de tipo_processamento...\n');

    const testCases = [
      { tipo: 'in natura', esperado: true },
      { tipo: 'minimamente processado', esperado: true },
      { tipo: 'processado', esperado: true },
      { tipo: 'ultraprocessado', esperado: true },
      { tipo: null, esperado: true },
      { tipo: '', esperado: true },
      { tipo: 'In Natura', esperado: false },
      { tipo: 'Processado', esperado: false },
      { tipo: 'natural', esperado: false },
      { tipo: 'outro', esperado: false },
    ];

    console.log('📋 Testes de Validação Frontend:\n');
    
    let passados = 0;
    let falhados = 0;

    testCases.forEach((test, index) => {
      const resultado = validarTipoProcessamento(test.tipo);
      const passou = resultado.valido === test.esperado;
      
      if (passou) {
        passados++;
        console.log(`✅ Teste ${index + 1}: "${test.tipo || '(vazio)'}" → ${resultado.mensagem}`);
      } else {
        falhados++;
        console.log(`❌ Teste ${index + 1}: "${test.tipo || '(vazio)'}" → FALHOU`);
        console.log(`   Esperado: ${test.esperado ? 'válido' : 'inválido'}`);
        console.log(`   Obtido: ${resultado.valido ? 'válido' : 'inválido'}`);
      }
    });

    console.log(`\n📊 Resultado: ${passados}/${testCases.length} testes passaram\n`);

    // Testar inserção no banco
    console.log('🗄️  Testes de Inserção no Banco:\n');

    const produtosTeste = [
      { nome: 'Teste In Natura', tipo: 'in natura', esperaErro: false },
      { nome: 'Teste Minimamente', tipo: 'minimamente processado', esperaErro: false },
      { nome: 'Teste Processado', tipo: 'processado', esperaErro: false },
      { nome: 'Teste Ultra', tipo: 'ultraprocessado', esperaErro: false },
      { nome: 'Teste NULL', tipo: null, esperaErro: false },
      { nome: 'Teste Inválido', tipo: 'Processado', esperaErro: true },
    ];

    for (const produto of produtosTeste) {
      try {
        await client.query(`
          INSERT INTO produtos (nome, tipo_processamento, ativo)
          VALUES ($1, $2, false)
        `, [produto.nome, produto.tipo]);

        if (produto.esperaErro) {
          console.log(`❌ "${produto.nome}" com tipo "${produto.tipo}" → DEVERIA ter falhado!`);
        } else {
          console.log(`✅ "${produto.nome}" com tipo "${produto.tipo || '(NULL)'}" → Inserido com sucesso`);
        }

        // Limpar
        await client.query(`DELETE FROM produtos WHERE nome = $1`, [produto.nome]);

      } catch (error) {
        if (produto.esperaErro) {
          console.log(`✅ "${produto.nome}" com tipo "${produto.tipo}" → Rejeitado corretamente`);
        } else {
          console.log(`❌ "${produto.nome}" com tipo "${produto.tipo || '(NULL)'}" → Erro inesperado:`);
          console.log(`   ${error.message}`);
        }
      }
    }

    console.log('\n✅ Testes de importação concluídos!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
testarImportacao().catch(console.error);
