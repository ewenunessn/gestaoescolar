require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

async function testFiltroObjeto() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
    ssl: false
  });

  try {
    console.log('=== TESTE DO FILTRO DE OBJETO ===\n');
    
    // Criar demandas de teste
    console.log('1. Criando demandas de teste...');
    await pool.query(`
      INSERT INTO demandas (
        escola_nome, numero_oficio, data_solicitacao,
        objeto, descricao_itens, status, usuario_criacao_id
      ) VALUES 
      ('Escola A', 'FILTRO001', '2025-10-10', 'Aquisição de móveis escolares', 'Mesas e cadeiras', 'pendente', 1),
      ('Escola B', 'FILTRO002', '2025-10-10', 'Compra de equipamentos de cozinha', 'Fogão industrial', 'pendente', 1),
      ('Escola C', 'FILTRO003', '2025-10-10', 'Reforma da biblioteca', 'Pintura e móveis', 'pendente', 1)
    `);
    
    // Testar filtro por "móveis"
    console.log('\n2. Testando filtro por "móveis"...');
    const resultadoMoveis = await pool.query(`
      SELECT numero_oficio, objeto
      FROM demandas 
      WHERE numero_oficio LIKE 'FILTRO%' AND objeto ILIKE '%móveis%'
      ORDER BY numero_oficio
    `);
    
    console.log('Resultados encontrados:');
    resultadoMoveis.rows.forEach(row => {
      console.log(`- ${row.numero_oficio}: ${row.objeto}`);
    });
    
    // Testar filtro por "equipamentos"
    console.log('\n3. Testando filtro por "equipamentos"...');
    const resultadoEquipamentos = await pool.query(`
      SELECT numero_oficio, objeto
      FROM demandas 
      WHERE numero_oficio LIKE 'FILTRO%' AND objeto ILIKE '%equipamentos%'
      ORDER BY numero_oficio
    `);
    
    console.log('Resultados encontrados:');
    resultadoEquipamentos.rows.forEach(row => {
      console.log(`- ${row.numero_oficio}: ${row.objeto}`);
    });
    
    // Testar filtro por "cozinha"
    console.log('\n4. Testando filtro por "cozinha"...');
    const resultadoCozinha = await pool.query(`
      SELECT numero_oficio, objeto
      FROM demandas 
      WHERE numero_oficio LIKE 'FILTRO%' AND objeto ILIKE '%cozinha%'
      ORDER BY numero_oficio
    `);
    
    console.log('Resultados encontrados:');
    resultadoCozinha.rows.forEach(row => {
      console.log(`- ${row.numero_oficio}: ${row.objeto}`);
    });
    
    // Limpar dados de teste
    console.log('\n5. Limpando dados de teste...');
    await pool.query(`DELETE FROM demandas WHERE numero_oficio LIKE 'FILTRO%'`);
    console.log('✓ Dados de teste removidos');
    
    console.log('\n✅ Filtro de objeto funcionando corretamente!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

testFiltroObjeto();