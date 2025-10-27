const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugTimezoneIssue() {
  try {
    console.log('🔍 Investigando problema de timezone nas datas...\n');

    // 1. Verificar configuração de timezone do banco
    console.log('📅 Configuração de timezone do banco:');
    const timezoneResult = await pool.query('SHOW timezone');
    console.log('Timezone do banco:', timezoneResult.rows[0].TimeZone);
    
    const nowResult = await pool.query('SELECT NOW() as now, CURRENT_DATE as current_date, CURRENT_TIMESTAMP as current_timestamp');
    console.log('NOW():', nowResult.rows[0].now);
    console.log('CURRENT_DATE:', nowResult.rows[0].current_date);
    console.log('CURRENT_TIMESTAMP:', nowResult.rows[0].current_timestamp);
    console.log('');

    // 2. Verificar dados específicos da Abóbora
    console.log('🥕 Dados da Abóbora no banco:');
    const aboboraResult = await pool.query(`
      SELECT 
        id,
        quantidade_atual,
        data_validade,
        data_validade::text as data_validade_text,
        DATE(data_validade) as data_validade_date,
        data_validade AT TIME ZONE 'UTC' as data_validade_utc,
        data_validade AT TIME ZONE 'America/Sao_Paulo' as data_validade_br
      FROM estoque_escolas 
      WHERE produto_id = (SELECT id FROM produtos WHERE nome ILIKE '%abóbora%' LIMIT 1)
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (aboboraResult.rows.length > 0) {
      const item = aboboraResult.rows[0];
      console.log('ID:', item.id);
      console.log('Quantidade:', item.quantidade_atual);
      console.log('data_validade (raw):', item.data_validade);
      console.log('data_validade (text):', item.data_validade_text);
      console.log('data_validade (date only):', item.data_validade_date);
      console.log('data_validade (UTC):', item.data_validade_utc);
      console.log('data_validade (BR timezone):', item.data_validade_br);

    } else {
      console.log('❌ Nenhum item de Abóbora encontrado');
    }
    console.log('');

    // 3. Verificar lotes da Abóbora
    console.log('📦 Lotes da Abóbora:');
    const lotesResult = await pool.query(`
      SELECT 
        id,
        lote,
        quantidade_atual,
        data_validade,
        data_validade::text as data_validade_text,
        DATE(data_validade) as data_validade_date,
        data_validade AT TIME ZONE 'UTC' as data_validade_utc,
        data_validade AT TIME ZONE 'America/Sao_Paulo' as data_validade_br
      FROM estoque_lotes 
      WHERE produto_id = (SELECT id FROM produtos WHERE nome ILIKE '%abóbora%' LIMIT 1)
      AND status = 'ativo'
      ORDER BY data_validade ASC
    `);

    lotesResult.rows.forEach((lote, index) => {
      console.log(`\nLote ${index + 1}:`);
      console.log('  ID:', lote.id);
      console.log('  Lote:', lote.lote);
      console.log('  Quantidade:', lote.quantidade_atual);
      console.log('  data_validade (raw):', lote.data_validade);
      console.log('  data_validade (text):', lote.data_validade_text);
      console.log('  data_validade (date only):', lote.data_validade_date);
      console.log('  data_validade (UTC):', lote.data_validade_utc);
      console.log('  data_validade (BR timezone):', lote.data_validade_br);
    });
    console.log('');

    // 4. Simular como o JavaScript processaria essas datas
    console.log('🔧 Simulação de processamento JavaScript:');
    
    if (aboboraResult.rows.length > 0) {
      const dataValidade = aboboraResult.rows[0].data_validade_text;
      console.log('Data recebida do banco:', dataValidade);
      
      // Método 1: new Date() direto
      const date1 = new Date(dataValidade);
      console.log('new Date(dataValidade):', date1);
      console.log('toLocaleDateString():', date1.toLocaleDateString('pt-BR'));
      
      // Método 2: adicionar T00:00:00 se não tiver timezone
      let date2;
      if (dataValidade.includes('T')) {
        date2 = new Date(dataValidade);
      } else {
        date2 = new Date(dataValidade + 'T00:00:00');
      }
      console.log('Com T00:00:00:', date2);
      console.log('toLocaleDateString():', date2.toLocaleDateString('pt-BR'));
      
      // Método 3: forçar UTC
      const date3 = new Date(dataValidade + (dataValidade.includes('T') ? '' : 'T00:00:00Z'));
      console.log('Forçando UTC:', date3);
      console.log('toLocaleDateString():', date3.toLocaleDateString('pt-BR'));
      
      // Calcular diferença de dias
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      console.log('\n📊 Cálculo de dias:');
      console.log('Hoje (local):', hoje);
      
      [date1, date2, date3].forEach((date, index) => {
        const diffTime = date.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log(`Método ${index + 1} - Diferença: ${diffDays} dias`);
      });
    }

    // 5. Testar query da API
    console.log('\n🔍 Simulando query da API:');
    const apiResult = await pool.query(`
      SELECT 
        ee.id,
        84 as escola_id,
        p.id as produto_id,
        COALESCE(
          (SELECT SUM(el.quantidade_atual) 
           FROM estoque_lotes el 
           WHERE el.produto_id = p.id AND el.status = 'ativo'),
          ee.quantidade_atual,
          0
        ) as quantidade_atual,
        COALESCE(
          (SELECT MIN(el.data_validade) 
           FROM estoque_lotes el 
           WHERE el.produto_id = p.id AND el.status = 'ativo' AND el.quantidade_atual > 0),
          ee.data_validade
        ) as data_validade,
        p.nome as produto_nome
      FROM produtos p
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
      WHERE p.nome ILIKE '%abóbora%'
        AND e.id = 84 
        AND e.ativo = true
      LIMIT 1
    `);

    if (apiResult.rows.length > 0) {
      const apiItem = apiResult.rows[0];
      console.log('Resultado da API:');
      console.log('  Produto:', apiItem.produto_nome);
      console.log('  Quantidade:', apiItem.quantidade_atual);
      console.log('  Data validade:', apiItem.data_validade);
      
      // Simular formatação no app
      const dataValidade = apiItem.data_validade;
      if (dataValidade) {
        console.log('  Tipo da data:', typeof dataValidade);
        console.log('  Data raw:', dataValidade);
        
        let data;
        if (dataValidade instanceof Date) {
          data = dataValidade;
        } else {
          const dataStr = dataValidade.toString();
          if (dataStr.includes('T')) {
            data = new Date(dataStr);
          } else {
            data = new Date(dataStr + 'T00:00:00');
          }
        }
        
        console.log('  Formatada no app:', data.toLocaleDateString('pt-BR'));
        
        // Calcular dias para vencimento
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const diffTime = data.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log('  Dias para vencimento:', diffDays);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

debugTimezoneIssue();