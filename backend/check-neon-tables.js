/**
 * Script para verificar quais tabelas existem no Neon
 * Compara com as tabelas esperadas
 */

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não configurado');
  process.exit(1);
}

const expectedTables = {
  'Instituições': [
    'institutions',
    'institution_users',
    'institution_contracts',
    'institution_audit_log'
  ],
  'System Admins': [
    'system_admins',
    'system_admin_audit_log'
  ],
  'Planos': [
    'institution_plans'
  ],
  'Multi-Tenant': [
    'tenants',
    'tenant_users',
    'tenant_configurations',
    'tenant_audit_log'
  ],
  'Core': [
    'usuarios',
    'escolas',
    'produtos',
    'contratos',
    'fornecedores',
    'modalidades'
  ],
  'Estoque': [
    'estoque_escolas',
    'estoque_lotes',
    'estoque_escolas_historico'
  ]
};

async function checkTables() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao Neon...\n');
    await client.connect();
    console.log('✅ Conectado!\n');

    // Buscar todas as tabelas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const existingTables = result.rows.map(row => row.table_name);
    
    console.log('📊 VERIFICAÇÃO DE TABELAS NO NEON\n');
    console.log('='.repeat(60));

    let totalExpected = 0;
    let totalExisting = 0;
    let totalMissing = 0;

    for (const [category, tables] of Object.entries(expectedTables)) {
      console.log(`\n📁 ${category}`);
      console.log('-'.repeat(60));

      for (const table of tables) {
        totalExpected++;
        const exists = existingTables.includes(table);
        
        if (exists) {
          totalExisting++;
          console.log(`  ✅ ${table.padEnd(35)} EXISTS`);
        } else {
          totalMissing++;
          console.log(`  ❌ ${table.padEnd(35)} MISSING`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📈 RESUMO\n');
    console.log(`Total esperado:  ${totalExpected}`);
    console.log(`Existentes:      ${totalExisting} ✅`);
    console.log(`Faltando:        ${totalMissing} ❌`);
    
    if (totalMissing > 0) {
      console.log('\n⚠️  AÇÃO NECESSÁRIA: Execute as migrations faltantes');
      console.log('   npm run sync-neon');
    } else {
      console.log('\n🎉 Todas as tabelas estão sincronizadas!');
    }

    // Mostrar tabelas extras (não esperadas)
    const extraTables = existingTables.filter(table => {
      return !Object.values(expectedTables).flat().includes(table);
    });

    if (extraTables.length > 0) {
      console.log('\n📦 Tabelas adicionais encontradas:');
      extraTables.forEach(table => {
        console.log(`  ℹ️  ${table}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkTables();
