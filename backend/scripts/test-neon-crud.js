const { Pool } = require('pg');

// Configuração do Neon
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testNeonCRUD() {
  const pool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🧪 Testando operações CRUD na tabela demandas_escolas...\n');

    // 1. Testar listagem com cálculo dinâmico
    console.log('1. Testando listagem com cálculo dinâmico de dias...');
    const listagem = await pool.query(`
      SELECT 
        d.*,
        COALESCE(d.escola_nome, e.nome) as escola_nome_final,
        u.nome as usuario_criacao_nome,
        CASE 
          WHEN d.data_semead IS NULL THEN NULL
          WHEN d.data_resposta_semead IS NOT NULL THEN 
            CASE 
              WHEN d.data_resposta_semead::date = d.data_semead::date THEN 0
              ELSE (d.data_resposta_semead::date - d.data_semead::date)::integer
            END
          WHEN d.data_semead::date = CURRENT_DATE THEN 0
          ELSE (CURRENT_DATE - d.data_semead::date)::integer
        END as dias_calculados
      FROM demandas_escolas d
      LEFT JOIN escolas e ON d.escola_id = e.id
      LEFT JOIN usuarios u ON d.usuario_criacao_id = u.id
      ORDER BY d.created_at DESC
    `);
    
    console.log(`✅ ${listagem.rows.length} demandas encontradas`);
    listagem.rows.forEach(row => {
      console.log(`   ${row.numero_oficio} - ${row.escola_nome_final} (${row.status}) - ${row.dias_calculados || 'N/A'} dias`);
    });

    // 2. Testar criação
    console.log('\n2. Testando criação de nova demanda...');
    const novaDemanda = await pool.query(`
      INSERT INTO demandas_escolas (
        escola_nome, numero_oficio, data_solicitacao,
        objeto, descricao_itens, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *,
      CASE 
        WHEN data_semead IS NULL THEN NULL
        WHEN data_resposta_semead IS NOT NULL THEN 
          CASE 
            WHEN data_resposta_semead::date = data_semead::date THEN 0
            ELSE (data_resposta_semead::date - data_semead::date)::integer
          END
        WHEN data_semead::date = CURRENT_DATE THEN 0
        ELSE (CURRENT_DATE - data_semead::date)::integer
      END as dias_calculados
    `, [
      'Escola Teste CRUD',
      'TEST-CRUD-001',
      '2025-10-10',
      'Teste de criação via script',
      'Testando operações CRUD no Neon',
      'pendente'
    ]);
    
    console.log(`✅ Demanda criada com ID: ${novaDemanda.rows[0].id}`);

    // 3. Testar busca por ID
    console.log('\n3. Testando busca por ID...');
    const demandaId = novaDemanda.rows[0].id;
    const busca = await pool.query(`
      SELECT 
        d.*,
        COALESCE(d.escola_nome, e.nome) as escola_nome_final,
        u.nome as usuario_criacao_nome,
        CASE 
          WHEN d.data_semead IS NULL THEN NULL
          WHEN d.data_resposta_semead IS NOT NULL THEN 
            CASE 
              WHEN d.data_resposta_semead::date = d.data_semead::date THEN 0
              ELSE (d.data_resposta_semead::date - d.data_semead::date)::integer
            END
          WHEN d.data_semead::date = CURRENT_DATE THEN 0
          ELSE (CURRENT_DATE - d.data_semead::date)::integer
        END as dias_calculados
      FROM demandas_escolas d
      LEFT JOIN escolas e ON d.escola_id = e.id
      LEFT JOIN usuarios u ON d.usuario_criacao_id = u.id
      WHERE d.id = $1
    `, [demandaId]);
    
    console.log(`✅ Demanda encontrada: ${busca.rows[0].numero_oficio}`);

    // 4. Testar atualização
    console.log('\n4. Testando atualização...');
    const atualizacao = await pool.query(`
      UPDATE demandas_escolas 
      SET data_semead = $1, status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *,
      CASE 
        WHEN data_semead IS NULL THEN NULL
        WHEN data_resposta_semead IS NOT NULL THEN 
          CASE 
            WHEN data_resposta_semead::date = data_semead::date THEN 0
            ELSE (data_resposta_semead::date - data_semead::date)::integer
          END
        WHEN data_semead::date = CURRENT_DATE THEN 0
        ELSE (CURRENT_DATE - data_semead::date)::integer
      END as dias_calculados
    `, ['2025-10-10', 'enviado_semead', demandaId]);
    
    console.log(`✅ Demanda atualizada. Status: ${atualizacao.rows[0].status}, Dias: ${atualizacao.rows[0].dias_calculados}`);

    // 5. Testar filtros
    console.log('\n5. Testando filtros...');
    
    // Filtro por status
    const filtroStatus = await pool.query(`
      SELECT COUNT(*) as total FROM demandas_escolas WHERE status = $1
    `, ['enviado_semead']);
    console.log(`✅ ${filtroStatus.rows[0].total} demandas com status 'enviado_semead'`);
    
    // Filtro por objeto
    const filtroObjeto = await pool.query(`
      SELECT COUNT(*) as total FROM demandas_escolas WHERE objeto ILIKE $1
    `, ['%móveis%']);
    console.log(`✅ ${filtroObjeto.rows[0].total} demandas com 'móveis' no objeto`);

    // 6. Testar listagem de solicitantes únicos
    console.log('\n6. Testando listagem de solicitantes únicos...');
    const solicitantes = await pool.query(`
      SELECT DISTINCT COALESCE(escola_nome, e.nome) as escola_nome
      FROM demandas_escolas d
      LEFT JOIN escolas e ON d.escola_id = e.id
      WHERE COALESCE(escola_nome, e.nome) IS NOT NULL
      ORDER BY escola_nome
    `);
    
    console.log(`✅ ${solicitantes.rows.length} solicitantes únicos:`);
    solicitantes.rows.forEach(row => {
      console.log(`   - ${row.escola_nome}`);
    });

    // 7. Limpar dados de teste
    console.log('\n7. Limpando dados de teste...');
    await pool.query('DELETE FROM demandas_escolas WHERE numero_oficio = $1', ['TEST-CRUD-001']);
    console.log('✅ Dados de teste removidos');

    console.log('\n🎉 Todos os testes CRUD passaram! Sistema pronto para produção no Neon.');

  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testNeonCRUD();