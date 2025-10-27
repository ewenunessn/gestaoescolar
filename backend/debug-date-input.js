const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugDateInput() {
  try {
    console.log('🔍 Investigando como as datas são salvas no cadastro...\n');

    // 1. Verificar o lote específico que você mencionou (100 de abóbora)
    console.log('📦 Lote específico da Abóbora (100 unidades):');
    const loteEspecifico = await pool.query(`
      SELECT 
        id,
        lote,
        quantidade_atual,
        data_validade,
        data_validade::text as data_validade_text,
        created_at,
        updated_at
      FROM estoque_lotes 
      WHERE produto_id = (SELECT id FROM produtos WHERE nome ILIKE '%abóbora%' LIMIT 1)
      AND quantidade_atual = 100
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (loteEspecifico.rows.length > 0) {
      const lote = loteEspecifico.rows[0];
      console.log('ID do lote:', lote.id);
      console.log('Nome do lote:', lote.lote);
      console.log('Quantidade:', lote.quantidade_atual);
      console.log('Data validade (raw):', lote.data_validade);
      console.log('Data validade (text):', lote.data_validade_text);
      console.log('Criado em:', lote.created_at);
      console.log('Atualizado em:', lote.updated_at);
      
      // Simular diferentes interpretações da data
      console.log('\n🔧 Interpretações da data:');
      const dataTexto = lote.data_validade_text;
      
      // Como JavaScript interpretaria
      const jsDate = new Date(dataTexto);
      console.log('new Date(dataTexto):', jsDate);
      console.log('toLocaleDateString():', jsDate.toLocaleDateString('pt-BR'));
      console.log('getDate():', jsDate.getDate()); // Dia do mês
      console.log('getMonth():', jsDate.getMonth() + 1); // Mês (0-based)
      console.log('getFullYear():', jsDate.getFullYear());
      
      // Como seria interpretado em diferentes timezones
      console.log('\n🌍 Em diferentes timezones:');
      console.log('UTC:', jsDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' }));
      console.log('São Paulo:', jsDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
      console.log('New York:', jsDate.toLocaleDateString('pt-BR', { timeZone: 'America/New_York' }));
      
    } else {
      console.log('❌ Lote específico não encontrado');
    }

    // 2. Verificar todos os lotes recentes da Abóbora
    console.log('\n📦 Todos os lotes recentes da Abóbora:');
    const todosLotes = await pool.query(`
      SELECT 
        id,
        lote,
        quantidade_atual,
        data_validade,
        data_validade::text as data_validade_text,
        created_at
      FROM estoque_lotes 
      WHERE produto_id = (SELECT id FROM produtos WHERE nome ILIKE '%abóbora%' LIMIT 1)
      ORDER BY created_at DESC
      LIMIT 5
    `);

    todosLotes.rows.forEach((lote, index) => {
      console.log(`\nLote ${index + 1}:`);
      console.log('  ID:', lote.id);
      console.log('  Nome:', lote.lote);
      console.log('  Quantidade:', lote.quantidade_atual);
      console.log('  Data validade:', lote.data_validade_text);
      console.log('  Criado em:', lote.created_at);
      
      // Verificar se a data seria interpretada como dia anterior
      const jsDate = new Date(lote.data_validade_text);
      const diaEsperado = parseInt(lote.data_validade_text.split('-')[2]);
      const diaInterpretado = jsDate.getDate();
      
      if (diaEsperado !== diaInterpretado) {
        console.log('  ⚠️  PROBLEMA: Esperado dia', diaEsperado, 'mas JavaScript interpreta como', diaInterpretado);
      } else {
        console.log('  ✅ Data interpretada corretamente');
      }
    });

    // 3. Testar como diferentes formatos de entrada seriam salvos
    console.log('\n🧪 Teste de diferentes formatos de entrada:');
    
    const formatosTeste = [
      '2025-11-20',           // Formato ISO date
      '2025-11-20T00:00:00',  // ISO com horário local
      '2025-11-20T03:00:00Z', // ISO com UTC
      '20/11/2025',           // Formato brasileiro
    ];

    for (const formato of formatosTeste) {
      try {
        console.log(`\nTeste: ${formato}`);
        
        // Simular como seria processado no backend
        let dataParaSalvar;
        
        if (formato.includes('/')) {
          // Converter formato brasileiro para ISO
          const [dia, mes, ano] = formato.split('/');
          dataParaSalvar = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        } else {
          dataParaSalvar = formato;
        }
        
        console.log('  Seria salvo como:', dataParaSalvar);
        
        // Testar query de inserção (sem executar)
        const queryTeste = `
          SELECT 
            '${dataParaSalvar}'::date as data_convertida,
            '${dataParaSalvar}'::date::text as data_como_texto
        `;
        
        const resultado = await pool.query(queryTeste);
        console.log('  PostgreSQL converteria para:', resultado.rows[0].data_convertida);
        console.log('  Como texto seria:', resultado.rows[0].data_como_texto);
        
        // Como JavaScript interpretaria
        const jsInterpretacao = new Date(resultado.rows[0].data_como_texto);
        console.log('  JavaScript interpretaria como:', jsInterpretacao.toLocaleDateString('pt-BR'));
        
      } catch (error) {
        console.log('  ❌ Erro:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

debugDateInput();