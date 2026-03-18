const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function analisarEstrutura() {
  const client = await pool.connect();
  try {
    console.log('🔍 Analisando estrutura de cardápios e modalidades...\n');

    // Estrutura da tabela cardapios_modalidade
    console.log('📊 Estrutura: cardapios_modalidade');
    const cardapios = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'cardapios_modalidade'
      ORDER BY ordinal_position
    `);
    cardapios.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    console.log('');

    // Estrutura da tabela cardapio_refeicoes_dia
    console.log('📊 Estrutura: cardapio_refeicoes_dia');
    const refeicoesDia = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'cardapio_refeicoes_dia'
      ORDER BY ordinal_position
    `);
    refeicoesDia.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    console.log('');

    // Verificar constraints e foreign keys
    console.log('🔗 Foreign Keys e Constraints:');
    const constraints = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name IN ('cardapios_modalidade', 'cardapio_refeicoes_dia')
      ORDER BY tc.table_name, tc.constraint_type
    `);
    constraints.rows.forEach(row => {
      if (row.constraint_type === 'FOREIGN KEY') {
        console.log(`   ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      }
    });
    console.log('');

    // Exemplo de dados
    console.log('📝 Exemplo de cardápios existentes:');
    const exemplos = await client.query(`
      SELECT 
        cm.id,
        cm.nome,
        cm.modalidade_id,
        m.nome as modalidade_nome,
        cm.data_inicio,
        cm.data_fim,
        (SELECT COUNT(*) FROM cardapio_refeicoes_dia WHERE cardapio_id = cm.id) as total_dias
      FROM cardapios_modalidade cm
      LEFT JOIN modalidades m ON m.id = cm.modalidade_id
      ORDER BY cm.created_at DESC
      LIMIT 5
    `);
    exemplos.rows.forEach(row => {
      console.log(`   ID ${row.id}: ${row.nome} - Modalidade: ${row.modalidade_nome} (${row.total_dias} dias)`);
    });
    console.log('');

    // Verificar se existe tabela de junção
    console.log('🔍 Verificando tabelas de junção existentes:');
    const juncao = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%cardapio%modalidade%'
      OR table_name LIKE '%modalidade%cardapio%'
    `);
    if (juncao.rows.length > 0) {
      console.log('   Tabelas encontradas:');
      juncao.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('   ❌ Nenhuma tabela de junção encontrada');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

analisarEstrutura().catch(console.error);
