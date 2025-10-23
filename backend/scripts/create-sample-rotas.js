const { Client } = require('pg');

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
};

async function createSampleRotas() {
  const client = new Client(LOCAL_CONFIG);

  try {
    await client.connect();
    console.log('Conectado ao banco local');

    // Verificar estrutura da tabela
    const structure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rotas' 
      ORDER BY ordinal_position
    `);
    
    console.log('Estrutura da tabela rotas:');
    structure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });

    // Limpar rotas existentes
    await client.query('DELETE FROM rotas');
    console.log('Rotas existentes removidas');

    // Criar rotas de exemplo
    const rotas = [
      {
        nome: 'Rota Centro',
        descricao: 'Escolas da região central da cidade',
        cor: '#1976d2',
        ativa: true,
        tipo: 'entrega'
      },
      {
        nome: 'Rota Norte',
        descricao: 'Escolas da região norte da cidade',
        cor: '#4caf50',
        ativa: true,
        tipo: 'entrega'
      },
      {
        nome: 'Rota Sul',
        descricao: 'Escolas da região sul da cidade',
        cor: '#ff9800',
        ativa: true,
        tipo: 'entrega'
      },
      {
        nome: 'Rota Leste',
        descricao: 'Escolas da região leste da cidade',
        cor: '#9c27b0',
        ativa: true,
        tipo: 'entrega'
      }
    ];

    for (const rota of rotas) {
      const result = await client.query(`
        INSERT INTO rotas (nome, descricao, cor, ativa, tipo)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, nome
      `, [rota.nome, rota.descricao, rota.cor, rota.ativa, rota.tipo]);

      console.log(`Rota criada: ${result.rows[0].nome} (ID: ${result.rows[0].id})`);
    }

    // Verificar resultado
    const count = await client.query('SELECT COUNT(*) FROM rotas');
    console.log(`Total de rotas criadas: ${count.rows[0].count}`);

    console.log('Rotas de exemplo criadas com sucesso!');

  } catch (error) {
    console.error('Erro:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('Conexao fechada');
  }
}

// Executar
createSampleRotas()
  .then(() => {
    console.log('Concluido com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Falha:', error);
    process.exit(1);
  });