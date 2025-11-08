const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function criarEscolas() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const tenantId = '00000000-0000-0000-0000-000000000000';
    console.log('🏫 Criando escolas de exemplo para Sistema Principal...');
    
    const escolas = [
      {
        nome: 'Escola Municipal João da Silva',
        endereco: 'Rua das Flores, 123',
        municipio: 'São Paulo',
        telefone: '(11) 3333-4444',
        nome_gestor: 'Maria Santos',
        administracao: 'municipal',
        email: 'joaosilva@escola.edu.br'
      },
      {
        nome: 'Escola Estadual Pedro Álvares',
        endereco: 'Av. Principal, 456',
        municipio: 'São Paulo',
        telefone: '(11) 5555-6666',
        nome_gestor: 'João Oliveira',
        administracao: 'estadual',
        email: 'pedroalvares@escola.edu.br'
      },
      {
        nome: 'Colégio Municipal Santa Maria',
        endereco: 'Rua da Igreja, 789',
        municipio: 'São Paulo',
        telefone: '(11) 7777-8888',
        nome_gestor: 'Ana Costa',
        administracao: 'municipal',
        email: 'santamaria@escola.edu.br'
      }
    ];
    
    for (const escola of escolas) {
      const result = await client.query(`
        INSERT INTO escolas (
          nome, endereco, municipio, telefone, nome_gestor, 
          administracao, email, tenant_id, ativo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING id, nome
      `, [
        escola.nome,
        escola.endereco,
        escola.municipio,
        escola.telefone,
        escola.nome_gestor,
        escola.administracao,
        escola.email,
        tenantId
      ]);
      
      console.log(`✅ Criada: ${result.rows[0].nome} (ID: ${result.rows[0].id})`);
    }
    
    console.log('\n🎉 Escolas criadas com sucesso!');
    
    // Verificar total
    const count = await client.query(`
      SELECT COUNT(*) as total FROM escolas WHERE tenant_id = $1
    `, [tenantId]);
    
    console.log(`\n📊 Total de escolas do tenant: ${count.rows[0].total}`);
    
  } finally {
    await client.end();
  }
}

criarEscolas();
