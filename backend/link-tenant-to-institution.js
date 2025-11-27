/**
 * Script para criar institution e linkar ao tenant "Secretaria de Benevides"
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const db = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end()
};

async function linkTenantToInstitution() {
  try {
    console.log('🔗 Linkando tenant à institution...\n');

    const tenantId = '6b95b81f-8d1f-44b0-912c-68c2fdde9841'; // Secretaria de Benevides

    // 1. Verificar se a coluna tenant_id existe em institutions
    const columnCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'institutions' 
        AND column_name = 'tenant_id'
      );
    `);

    if (!columnCheck.rows[0].exists) {
      console.log('📝 Adicionando coluna tenant_id à tabela institutions...');
      
      await db.query(`
        ALTER TABLE institutions 
        ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
      `);
      
      console.log('✅ Coluna tenant_id adicionada\n');
    } else {
      console.log('✅ Coluna tenant_id já existe\n');
    }

    // 2. Verificar se já existe uma institution para este tenant
    const existingInst = await db.query(`
      SELECT id, name FROM institutions WHERE tenant_id = $1
    `, [tenantId]);

    if (existingInst.rows.length > 0) {
      console.log(`✅ Institution já existe: ${existingInst.rows[0].name}`);
      console.log(`   ID: ${existingInst.rows[0].id}\n`);
      return;
    }

    if (!process.argv.includes('--create')) {
      console.log('💡 Para criar uma institution para o tenant, execute com --create\n');
      console.log('Opções:');
      console.log('   --create : Criar nova institution');
      console.log('   --link-existing=<INSTITUTION_ID> : Linkar a uma institution existente\n');
      return;
    }

    // 3. Criar nova institution
    console.log('🏛️  Criando institution "Secretaria Municipal de Educação de Benevides"...\n');

    const newInstitution = await db.query(`
      INSERT INTO institutions (
        slug,
        name,
        legal_name,
        document_number,
        type,
        status,
        email,
        phone,
        address_city,
        address_state,
        address_country,
        tenant_id,
        settings,
        limits,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        'semed-benevides',
        'Secretaria Municipal de Educação de Benevides',
        'Secretaria Municipal de Educação de Benevides - PA',
        '00.000.000/0001-00',
        'secretaria',
        'active',
        'semed@benevides.pa.gov.br',
        '(91) 0000-0000',
        'Benevides',
        'PA',
        'BR',
        $1,
        '{"theme": "default", "features": ["schools", "inventory", "contracts"]}',
        '{
          "maxUsers": 100,
          "maxSchools": 100,
          "maxProducts": 1000,
          "storageLimit": 5120,
          "apiRateLimit": 1000
        }',
        '{"created_by": "system", "migration": "tenant_reorganization"}',
        NOW(),
        NOW()
      )
      RETURNING *
    `, [tenantId]);

    const institution = newInstitution.rows[0];

    console.log('✅ Institution criada com sucesso!\n');
    console.log(`📋 Detalhes:`);
    console.log(`   Nome: ${institution.name}`);
    console.log(`   ID: ${institution.id}`);
    console.log(`   Slug: ${institution.slug}`);
    console.log(`   Tenant ID: ${institution.tenant_id}`);
    console.log(`   Status: ${institution.status}\n`);

    // 4. Verificar dados do tenant
    const usuarios = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = $1`, [tenantId]);
    const escolas = await db.query(`SELECT COUNT(*) as total FROM escolas WHERE tenant_id = $1`, [tenantId]);
    const produtos = await db.query(`SELECT COUNT(*) as total FROM produtos WHERE tenant_id = $1`, [tenantId]);

    console.log(`📊 Dados do tenant:`);
    console.log(`   Usuários: ${usuarios.rows[0].total}`);
    console.log(`   Escolas: ${escolas.rows[0].total}`);
    console.log(`   Produtos: ${produtos.rows[0].total}\n`);

    console.log('✅ Operação concluída!');
    console.log('\n📝 Agora você tem:');
    console.log('   - Institution: Secretaria Municipal de Educação de Benevides');
    console.log('   - Tenant: Secretaria de Benevides');
    console.log('   - Linkados via tenant_id\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

linkTenantToInstitution();
