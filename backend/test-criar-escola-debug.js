const { Pool } = require('pg');
require('dotenv').config();

// Usar a mesma lógica do database.ts
let pool;
if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const isLocalDatabase = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  
  pool = new Pool({
    connectionString,
    ssl: isLocalDatabase ? false : { rejectUnauthorized: false }
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: false
  });
}

async function testCriarEscola() {
  try {
    console.log('🧪 Testando criação de escola...\n');
    
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b'; // Brenda Nunes
    
    // Dados da escola
    const dados = {
      nome: 'EMEF Rafael Fernandes Gomes',
      codigo: '5555555',
      codigo_acesso: '123456',
      endereco: 'Av. Joaquim Pereira de Queiroz',
      municipio: 'Benevides',
      endereco_maps: 'https://maps.google.com/@-1.349599,-48.2336799,15z',
      telefone: '91984195460',
      email: 'ewertonsolon@gmail.com',
      nome_gestor: 'Cassio Norona',
      administracao: 'municipal',
      ativo: true
    };
    
    console.log('📋 Dados da escola:');
    console.log(JSON.stringify(dados, null, 2));
    console.log('\n📋 Tenant ID:', tenantId);
    console.log('');
    
    // Verificar se já existe escola com esse nome no tenant
    console.log('1️⃣ Verificando duplicação...');
    const checkDuplicate = await pool.query(`
      SELECT id, nome FROM escolas 
      WHERE nome = $1 AND tenant_id = $2
    `, [dados.nome, tenantId]);
    
    if (checkDuplicate.rows.length > 0) {
      console.log('❌ Já existe escola com esse nome neste tenant!');
      console.log('   ID:', checkDuplicate.rows[0].id);
      console.log('\n💡 Solução: Use outro nome ou delete a escola existente\n');
      return;
    }
    console.log('✅ Nome disponível neste tenant\n');
    
    // Tentar criar
    console.log('2️⃣ Criando escola...');
    const result = await pool.query(`
      INSERT INTO escolas (
        nome, codigo, codigo_acesso, endereco, municipio, endereco_maps, 
        telefone, email, nome_gestor, administracao, ativo, tenant_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      dados.nome, 
      dados.codigo, 
      dados.codigo_acesso, 
      dados.endereco, 
      dados.municipio, 
      dados.endereco_maps,
      dados.telefone, 
      dados.email, 
      dados.nome_gestor, 
      dados.administracao, 
      dados.ativo, 
      tenantId
    ]);
    
    console.log('✅ Escola criada com sucesso!');
    console.log('\n📋 Dados da escola criada:');
    console.log('   ID:', result.rows[0].id);
    console.log('   Nome:', result.rows[0].nome);
    console.log('   Código Acesso:', result.rows[0].codigo_acesso);
    console.log('   Município:', result.rows[0].municipio);
    console.log('   Endereço Maps:', result.rows[0].endereco_maps);
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('\n📋 Detalhes do erro:');
    console.error('   Code:', error.code);
    console.error('   Detail:', error.detail);
    console.error('   Constraint:', error.constraint);
    console.error('');
  } finally {
    await pool.end();
  }
}

testCriarEscola();
