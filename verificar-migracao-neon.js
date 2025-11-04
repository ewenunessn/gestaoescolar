const { Client } = require('pg');

// Configurações de conexão - ATUALIZE COM SEUS DADOS DO NEON
const neonConfig = {
  host: 'ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech', // Host Neon
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner', // Usuário Neon
  password: 'npg_PDfBTKRsi29G', // Senha Neon
  ssl: { rejectUnauthorized: false } // Necessário para Neon
};

async function verificarMigracao() {
  const client = new Client(neonConfig);
  
  try {
    await client.connect();
    console.log('✅ Conectado ao banco Neon');
    
    // 1. Verificar estrutura tenant
    console.log('\n📋 Verificando estrutura multi-tenant:');
    
    const estruturaResult = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name IN (
        'tenants', 'escolas', 'produtos', 'usuarios', 
        'fornecedores', 'contratos', 'estoque_escolas'
      )
      AND column_name IN ('id', 'tenant_id', 'nome', 'slug', 'status')
      ORDER BY table_name, ordinal_position;
    `);
    
    console.log('\n📊 Estrutura das tabelas:');
    let tabelaAtual = '';
    estruturaResult.rows.forEach(row => {
      if (row.table_name !== tabelaAtual) {
        console.log(`\n📄 ${row.table_name}:`);
        tabelaAtual = row.table_name;
      }
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    // 2. Verificar tenants existentes
    console.log('\n🏢 Tenants cadastrados:');
    const tenantsResult = await client.query(`
      SELECT 
        id,
        nome,
        slug,
        cnpj,
        email,
        status,
        created_at
      FROM tenants
      ORDER BY created_at;
    `);
    
    if (tenantsResult.rows.length === 0) {
      console.log('   ❌ Nenhum tenant encontrado');
    } else {
      tenantsResult.rows.forEach(tenant => {
        console.log(`   📋 ${tenant.nome} (${tenant.slug})`);
        console.log(`      ID: ${tenant.id}`);
        console.log(`      CNPJ: ${tenant.cnpj}`);
        console.log(`      Email: ${tenant.email}`);
        console.log(`      Status: ${tenant.status}`);
        console.log(`      Criado em: ${tenant.created_at}`);
        console.log('');
      });
    }
    
    // 3. Verificar distribuição de dados por tenant
    console.log('\n📊 Distribuição de dados por tenant:');
    
    const distribuicaoResult = await client.query(`
      SELECT 
        t.nome as tenant_nome,
        t.slug as tenant_slug,
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT p.id) as total_produtos,
        COUNT(DISTINCT u.id) as total_usuarios,
        COUNT(DISTINCT f.id) as total_fornecedores,
        COUNT(DISTINCT c.id) as total_contratos
      FROM tenants t
      LEFT JOIN escolas e ON e.tenant_id = t.id
      LEFT JOIN produtos p ON p.tenant_id = t.id
      LEFT JOIN usuarios u ON u.tenant_id = t.id
      LEFT JOIN fornecedores f ON f.tenant_id = t.id
      LEFT JOIN contratos c ON c.tenant_id = t.id
      GROUP BY t.id, t.nome, t.slug
      ORDER BY t.nome;
    `);
    
    if (distribuicaoResult.rows.length === 0) {
      console.log('   ❌ Nenhuma distribuição encontrada');
    } else {
      distribuicaoResult.rows.forEach(row => {
        console.log(`\n📋 ${row.tenant_nome} (${row.tenant_slug}):`);
        console.log(`   🏫 Escolas: ${row.total_escolas}`);
        console.log(`   📦 Produtos: ${row.total_produtos}`);
        console.log(`   👥 Usuários: ${row.total_usuarios}`);
        console.log(`   🏢 Fornecedores: ${row.total_fornecedores}`);
        console.log(`   📄 Contratos: ${row.total_contratos}`);
      });
    }
    
    // 4. Verificar dados sem tenant
    console.log('\n⚠️  Dados sem tenant_id (problemas):');
    
    const semTenantResult = await client.query(`
      SELECT 
        'escolas' as tabela,
        COUNT(*) as total_sem_tenant
      FROM escolas
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'produtos' as tabela,
        COUNT(*) as total_sem_tenant
      FROM produtos
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'usuarios' as tabela,
        COUNT(*) as total_sem_tenant
      FROM usuarios
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'fornecedores' as tabela,
        COUNT(*) as total_sem_tenant
      FROM fornecedores
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'contratos' as tabela,
        COUNT(*) as total_sem_tenant
      FROM contratos
      WHERE tenant_id IS NULL
      HAVING COUNT(*) > 0;
    `);
    
    if (semTenantResult.rows.length === 0) {
      console.log('   ✅ Todos os dados estão associados a tenants!');
    } else {
      semTenantResult.rows.forEach(row => {
        console.log(`   ❌ ${row.tabela}: ${row.total_sem_tenant} registros sem tenant`);
      });
    }
    
    // 5. Verificar índices e performance
    console.log('\n🔍 Verificando índices de tenant:');
    
    const indicesResult = await client.query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND (indexname LIKE '%tenant%' OR indexname LIKE 'idx_%_tenant%')
      ORDER BY tablename, indexname;
    `);
    
    if (indicesResult.rows.length === 0) {
      console.log('   ❌ Nenhum índice de tenant encontrado');
    } else {
      let tabelaAtual = '';
      indicesResult.rows.forEach(row => {
        if (row.tablename !== tabelaAtual) {
          console.log(`\n📄 ${row.tablename}:`);
          tabelaAtual = row.tablename;
        }
        console.log(`   🔑 ${row.indexname}`);
      });
    }
    
    // 6. Verificar RLS (Row Level Security)
    console.log('\n🔒 Verificando Row Level Security:');
    
    const rlsResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'escolas', 'produtos', 'usuarios', 'fornecedores', 
          'contratos', 'estoque_escolas', 'pedidos'
        )
      ORDER BY tablename;
    `);
    
    rlsResult.rows.forEach(row => {
      const status = row.rls_enabled ? '✅ Ativado' : '❌ Desativado';
      console.log(`   ${row.tablename}: ${status}`);
    });
    
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao verificar migração:', error);
  } finally {
    await client.end();
  }
}

// Executar verificação
console.log('🔍 Verificador de Migração Neon');
console.log('=====================================\n');

// Verificar se pg está instalado
try {
  require('pg');
  
  // Verificar se as configurações foram atualizadas
  if (neonConfig.host.includes('seu-host-neon')) {
    console.error('❌ ERRO: Você precisa atualizar as configurações de conexão do Neon!');
    console.log('📝 Edite o arquivo e substitua:');
    console.log('   - host: "seu-host-neon.aws.neon.tech"');
    console.log('   - user: "seu-usuario-neon"');
    console.log('   - password: "sua-senha-neon"');
    process.exit(1);
  }
  
  verificarMigracao();
  
} catch (error) {
  console.error('❌ pg não está instalado. Instale com: npm install pg');
  process.exit(1);
}