const axios = require('axios');

// Configure your API base URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Test data
const testData = {
  institution: {
    name: 'Prefeitura de Exemplo',
    slug: 'prefeitura-exemplo',
    legal_name: 'Prefeitura Municipal de Exemplo',
    document_number: '12345678000190',
    type: 'prefeitura',
    email: 'contato@exemplo.gov.br',
    phone: '(11) 3333-4444',
    address: {
      street: 'Rua Principal',
      number: '100',
      city: 'Exemplo',
      state: 'SP',
      zipcode: '12345-678'
    }
  },
  tenant: {
    name: 'Secretaria de Educação',
    slug: 'educacao-exemplo',
    subdomain: 'educacao-exemplo'
  },
  admin: {
    nome: 'Administrador Teste',
    email: 'admin@exemplo.gov.br',
    senha: 'SenhaSegura123!'
  }
};

async function testCompleteProvisioning() {
  console.log('🚀 Testando provisionamento completo...\n');
  
  try {
    // 1. Complete provisioning
    console.log('1️⃣ Criando instituição completa...');
    const provisionResponse = await axios.post(
      `${API_BASE_URL}/provisioning/complete`,
      testData
    );
    
    console.log('✅ Instituição criada com sucesso!');
    console.log('Dados:', JSON.stringify(provisionResponse.data, null, 2));
    
    const { institution, tenant, admin } = provisionResponse.data.data;
    
    // 2. Login with admin user
    console.log('\n2️⃣ Fazendo login com usuário admin...');
    const loginResponse = await axios.post(
      `${API_BASE_URL}/auth/login`,
      {
        email: testData.admin.email,
        senha: testData.admin.senha
      }
    );
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso!');
    console.log('Token:', token.substring(0, 20) + '...');
    
    // 3. Get institution details
    console.log('\n3️⃣ Buscando detalhes da instituição...');
    const institutionResponse = await axios.get(
      `${API_BASE_URL}/institutions/${institution.id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Instituição encontrada:');
    console.log('Nome:', institutionResponse.data.data.name);
    console.log('Status:', institutionResponse.data.data.status);
    
    // 4. Get institution hierarchy
    console.log('\n4️⃣ Buscando hierarquia completa...');
    const hierarchyResponse = await axios.get(
      `${API_BASE_URL}/provisioning/institutions/${institution.id}/hierarchy`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Hierarquia:');
    console.log(JSON.stringify(hierarchyResponse.data.data, null, 2));
    
    // 5. Create additional tenant
    console.log('\n5️⃣ Criando tenant adicional...');
    const newTenantResponse = await axios.post(
      `${API_BASE_URL}/provisioning/institutions/${institution.id}/tenants`,
      {
        name: 'Secretaria de Saúde',
        slug: 'saude-exemplo',
        subdomain: 'saude-exemplo'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Tenant adicional criado:');
    console.log('Nome:', newTenantResponse.data.data.name);
    console.log('Slug:', newTenantResponse.data.data.slug);
    
    // 6. Create additional user
    console.log('\n6️⃣ Criando usuário adicional...');
    const newUserResponse = await axios.post(
      `${API_BASE_URL}/provisioning/institutions/${institution.id}/users`,
      {
        nome: 'Usuário Teste',
        email: 'usuario@exemplo.gov.br',
        senha: 'SenhaUsuario123!',
        tipo: 'usuario',
        tenant_id: tenant.id,
        institution_role: 'user',
        tenant_role: 'user'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Usuário adicional criado:');
    console.log('Nome:', newUserResponse.data.data.nome);
    console.log('Email:', newUserResponse.data.data.email);
    
    // 7. Get institution statistics
    console.log('\n7️⃣ Buscando estatísticas da instituição...');
    const statsResponse = await axios.get(
      `${API_BASE_URL}/institutions/${institution.id}/stats`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Estatísticas:');
    console.log('Total de tenants:', statsResponse.data.data.total_tenants);
    console.log('Total de usuários:', statsResponse.data.data.total_users);
    console.log('Total de escolas:', statsResponse.data.data.total_schools);
    
    // 8. List all tenants
    console.log('\n8️⃣ Listando todos os tenants...');
    const tenantsResponse = await axios.get(
      `${API_BASE_URL}/institutions/${institution.id}/tenants`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Tenants encontrados:', tenantsResponse.data.total);
    tenantsResponse.data.data.forEach(t => {
      console.log(`  - ${t.name} (${t.slug})`);
    });
    
    // 9. List all users
    console.log('\n9️⃣ Listando todos os usuários...');
    const usersResponse = await axios.get(
      `${API_BASE_URL}/institutions/${institution.id}/users`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Usuários encontrados:', usersResponse.data.total);
    usersResponse.data.data.forEach(u => {
      console.log(`  - ${u.user_name} (${u.user_email}) - Role: ${u.role}`);
    });
    
    console.log('\n✅ Todos os testes passaram com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`  Instituição: ${institution.name}`);
    console.log(`  Tenants criados: 2`);
    console.log(`  Usuários criados: 2`);
    console.log(`  Status: Ativo e funcionando`);
    
    return {
      success: true,
      institutionId: institution.id,
      tenantId: tenant.id,
      adminId: admin.id,
      token
    };
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function testLimits() {
  console.log('\n🧪 Testando limites de recursos...\n');
  
  try {
    // Create institution with low limits
    const limitedData = {
      institution: {
        name: 'Prefeitura Limitada',
        slug: 'prefeitura-limitada',
        limits: {
          max_tenants: 1,
          max_users: 2,
          max_schools: 10
        }
      },
      tenant: {
        name: 'Tenant Único',
        slug: 'tenant-unico'
      },
      admin: {
        nome: 'Admin Limitado',
        email: 'admin@limitada.gov.br',
        senha: 'SenhaSegura123!'
      }
    };
    
    console.log('1️⃣ Criando instituição com limites baixos...');
    const provisionResponse = await axios.post(
      `${API_BASE_URL}/provisioning/complete`,
      limitedData
    );
    
    const { institution } = provisionResponse.data.data;
    const loginResponse = await axios.post(
      `${API_BASE_URL}/auth/login`,
      {
        email: limitedData.admin.email,
        senha: limitedData.admin.senha
      }
    );
    
    const token = loginResponse.data.token;
    console.log('✅ Instituição criada com limites: max_tenants=1, max_users=2');
    
    // Try to create second tenant (should fail)
    console.log('\n2️⃣ Tentando criar segundo tenant (deve falhar)...');
    try {
      await axios.post(
        `${API_BASE_URL}/provisioning/institutions/${institution.id}/tenants`,
        {
          name: 'Segundo Tenant',
          slug: 'segundo-tenant'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('❌ Erro: Deveria ter falhado por limite de tenants');
    } catch (error) {
      if (error.response?.data?.message?.includes('Limite')) {
        console.log('✅ Limite de tenants funcionando corretamente!');
        console.log('Mensagem:', error.response.data.message);
      } else {
        throw error;
      }
    }
    
    console.log('\n✅ Teste de limites concluído!');
    
  } catch (error) {
    console.error('\n❌ Erro no teste de limites:', error.message);
    if (error.response) {
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TESTE DE PROVISIONAMENTO DE INSTITUIÇÕES');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Test 1: Complete provisioning
  const result1 = await testCompleteProvisioning();
  
  if (result1.success) {
    console.log('\n═══════════════════════════════════════════════════════\n');
    
    // Test 2: Limits
    await testLimits();
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TESTES CONCLUÍDOS');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Execute if run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testCompleteProvisioning,
  testLimits
};
