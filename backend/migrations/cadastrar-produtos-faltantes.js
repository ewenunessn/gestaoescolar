const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const PRODUTOS_FALTANTES = [
  {
    nome: 'MILHO PARA PIPOCA',
    unidade: 'PACOTE',
    descricao: 'Milho para pipoca',
    categoria: 'Cereais',
    tipo_processamento: 'in natura',
    perecivel: false,
    ativo: true
  },
  {
    nome: 'CEREL EM PÓ DE ARROZ E AVEIA',
    unidade: 'PACOTE',
    descricao: 'Cereal em pó de arroz e aveia',
    categoria: 'Cereais',
    tipo_processamento: 'processado',
    perecivel: false,
    ativo: true
  }
];

async function run() {
  await client.connect();
  console.log('✅ Conectado ao Neon\n');

  try {
    console.log('📦 Cadastrando produtos faltantes...\n');

    for (const produto of PRODUTOS_FALTANTES) {
      // Verificar se já existe
      const existe = await client.query(
        'SELECT id FROM produtos WHERE UPPER(nome) = UPPER($1) AND UPPER(unidade) = UPPER($2)',
        [produto.nome, produto.unidade]
      );

      if (existe.rows.length > 0) {
        console.log(`⏭️  Produto já existe: ${produto.nome} (ID: ${existe.rows[0].id})`);
        continue;
      }

      // Inserir produto
      const result = await client.query(
        `INSERT INTO produtos (nome, unidade, descricao, categoria, tipo_processamento, perecivel, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [produto.nome, produto.unidade, produto.descricao, produto.categoria, 
         produto.tipo_processamento, produto.perecivel, produto.ativo]
      );

      console.log(`✅ Produto cadastrado: ${produto.nome} (ID: ${result.rows[0].id})`);
    }

    console.log('\n✅ Todos os produtos foram cadastrados!');

  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão fechada');
  }
}

run().catch(console.error);
