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

async function checkEscola() {
  try {
    console.log('🔍 Verificando escola "EMEF Rafael Fernandes Gomes"...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        nome,
        codigo_acesso,
        municipio,
        endereco,
        endereco_maps,
        tenant_id,
        (SELECT i.name FROM tenants t LEFT JOIN institutions i ON t.institution_id = i.id WHERE t.id = escolas.tenant_id) as tenant_nome
      FROM escolas 
      WHERE nome ILIKE '%Rafael Fernandes Gomes%'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Escola não encontrada no banco');
    } else {
      console.log(`✅ Encontradas ${result.rows.length} escola(s):\n`);
      result.rows.forEach(escola => {
        console.log('📋 Escola:');
        console.log(`   ID: ${escola.id}`);
        console.log(`   Nome: ${escola.nome}`);
        console.log(`   Código Acesso: ${escola.codigo_acesso}`);
        console.log(`   Município: ${escola.municipio}`);
        console.log(`   Endereço: ${escola.endereco}`);
        console.log(`   Endereço Maps: ${escola.endereco_maps}`);
        console.log(`   Tenant ID: ${escola.tenant_id}`);
        console.log(`   Tenant Nome: ${escola.tenant_nome}`);
        console.log('');
      });
    }
    
    // Verificar tenant Brenda Nunes
    console.log('\n🔍 Verificando tenant "Brenda Nunes"...\n');
    const brendaResult = await pool.query(`
      SELECT t.id, i.name as institution_name 
      FROM tenants t
      LEFT JOIN institutions i ON t.institution_id = i.id
      WHERE t.id = 'f830d523-25c9-4162-b241-6599df73171b'
    `);
    
    if (brendaResult.rows.length > 0) {
      const brendaTenantId = brendaResult.rows[0].id;
      console.log(`✅ Tenant encontrado: ${brendaResult.rows[0].institution_name || 'Sem nome'} (${brendaTenantId})\n`);
      
      // Contar escolas do tenant
      const escolasCount = await pool.query(`
        SELECT COUNT(*) as total FROM escolas WHERE tenant_id = $1
      `, [brendaTenantId]);
      
      console.log(`📊 Total de escolas no tenant: ${escolasCount.rows[0].total}\n`);
      
      // Listar escolas
      const escolasList = await pool.query(`
        SELECT id, nome, codigo_acesso, municipio 
        FROM escolas 
        WHERE tenant_id = $1
        ORDER BY nome
        LIMIT 10
      `, [brendaTenantId]);
      
      if (escolasList.rows.length > 0) {
        console.log('📋 Primeiras escolas do tenant:\n');
        escolasList.rows.forEach(e => {
          console.log(`   - ${e.nome} (${e.municipio || 'sem município'})`);
        });
      }
    } else {
      console.log('❌ Tenant "Brenda Nunes" não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkEscola();
