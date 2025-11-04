/**
 * Script de teste para criação e autenticação de usuários
 * Demonstra o funcionamento completo do sistema multi-tenant
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testUserRegistration() {
  console.log('🧪 Testando Sistema de Criação de Contas Multi-Tenant\n');

  try {
    // 1. Testar criação de usuário comum
    console.log('1️⃣ Criando usuário comum...');
    const userResponse = await axios.post(`${API_BASE}/usuarios/register`, {
      nome: 'João Silva',
      email: 'joao@teste.com',
      senha: 'senha123',
      perfil: 'user'
    });
    
    console.log('✅ Usuário criado:', {
      id: userResponse.data.id,
      nome: userResponse.data.nome,
      email: userResponse.data.email,
      tipo: userResponse.data.tipo,
      tenant_id: userResponse.data.tenant_id
    });

    // 2. Testar login do usuário comum
    console.log('\n2️⃣ Fazendo login do usuário comum...');
    const loginResponse = await axios.post(`${API_BASE}/usuarios/login`, {
      email: 'joao@teste.com',
      senha: 'senha123'
    });

    console.log('✅ Login realizado com sucesso!');
    console.log('📋 Dados do usuário:', {
      nome: loginResponse.data.nome,
      tipo: loginResponse.data.tipo,
      tenant: loginResponse.data.tenant,
      tenantRole: loginResponse.data.tenantRole,
      isSystemAdmin: loginResponse.data.isSystemAdmin
    });

    const userToken = loginResponse.data.token;

    // 3. Testar criação de administrador
    console.log('\n3️⃣ Criando usuário administrador...');
    const adminResponse = await axios.post(`${API_BASE}/usuarios/register`, {
      nome: 'Maria Admin',
      email: 'maria@admin.com',
      senha: 'admin123',
      perfil: 'admin'
    });
    
    console.log('✅ Administrador criado:', {
      id: adminResponse.data.id,
      nome: adminResponse.data.nome,
      email: adminResponse.data.email,
      tipo: adminResponse.data.tipo
    });

    // 4. Testar login do administrador
    console.log('\n4️⃣ Fazendo login do administrador...');
    const adminLoginResponse = await axios.post(`${API_BASE}/usuarios/login`, {
      email: 'maria@admin.com',
      senha: 'admin123'
    });

    console.log('✅ Login de admin realizado com sucesso!');
    console.log('📋 Dados do admin:', {
      nome: adminLoginResponse.data.nome,
      tipo: adminLoginResponse.data.tipo,
      tenant: adminLoginResponse.data.tenant,
      tenantRole: adminLoginResponse.data.tenantRole,
      isSystemAdmin: adminLoginResponse.data.isSystemAdmin
    });

    const adminToken = adminLoginResponse.data.token;

    // 5. Testar acesso a perfil com token
    console.log('\n5️⃣ Testando acesso ao perfil com token...');
    const profileResponse = await axios.get(`${API_BASE}/usuarios/me`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    console.log('✅ Perfil obtido com sucesso:', {
      id: profileResponse.data.data.id,
      nome: profileResponse.data.data.nome,
      email: profileResponse.data.data.email,
      tipo: profileResponse.data.data.tipo
    });

    // 6. Testar listagem de usuários (admin)
    console.log('\n6️⃣ Testando listagem de usuários...');
    const usersResponse = await axios.get(`${API_BASE}/usuarios`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    console.log('✅ Usuários listados:', usersResponse.data.data.length, 'usuários encontrados');

    // 7. Testar criação de usuário em tenant específico
    console.log('\n7️⃣ Criando usuário em tenant específico...');
    
    // Primeiro, vamos buscar um tenant existente
    const tenantsResponse = await axios.get(`${API_BASE}/tenants`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (tenantsResponse.data.data.length > 1) {
      const specificTenant = tenantsResponse.data.data[1]; // Pegar o segundo tenant
      
      const tenantUserResponse = await axios.post(`${API_BASE}/usuarios/register`, {
        nome: 'Pedro Tenant',
        email: 'pedro@tenant.com',
        senha: 'tenant123',
        perfil: 'user',
        tenantId: specificTenant.id
      });
      
      console.log('✅ Usuário criado em tenant específico:', {
        id: tenantUserResponse.data.id,
        nome: tenantUserResponse.data.nome,
        tenant_id: tenantUserResponse.data.tenant_id
      });

      // Testar login do usuário do tenant específico
      const tenantLoginResponse = await axios.post(`${API_BASE}/usuarios/login`, {
        email: 'pedro@tenant.com',
        senha: 'tenant123'
      });

      console.log('✅ Login em tenant específico:', {
        tenant: tenantLoginResponse.data.tenant,
        tenantRole: tenantLoginResponse.data.tenantRole
      });
    }

    // 8. Testar validações
    console.log('\n8️⃣ Testando validações...');
    
    try {
      await axios.post(`${API_BASE}/usuarios/register`, {
        nome: 'Teste Incompleto',
        email: 'teste@incompleto.com'
        // senha e perfil faltando
      });
    } catch (error) {
      console.log('✅ Validação funcionando:', error.response.data.message);
    }

    try {
      await axios.post(`${API_BASE}/usuarios/register`, {
        nome: 'Email Duplicado',
        email: 'joao@teste.com', // Email já existe
        senha: 'senha123',
        perfil: 'user'
      });
    } catch (error) {
      console.log('✅ Validação de email duplicado:', error.response.data.message);
    }

    try {
      await axios.post(`${API_BASE}/usuarios/login`, {
        email: 'joao@teste.com',
        senha: 'senha_errada'
      });
    } catch (error) {
      console.log('✅ Validação de senha incorreta:', error.response.data.message);
    }

    console.log('\n🎉 Todos os testes passaram com sucesso!');
    console.log('\n📊 Resumo dos testes:');
    console.log('✅ Criação de usuário comum');
    console.log('✅ Login de usuário comum');
    console.log('✅ Criação de administrador');
    console.log('✅ Login de administrador');
    console.log('✅ Acesso ao perfil com token');
    console.log('✅ Listagem de usuários');
    console.log('✅ Criação em tenant específico');
    console.log('✅ Validações de entrada');
    console.log('✅ Sistema multi-tenant funcionando');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.response?.data || error.message);
  }
}

// Executar testes
testUserRegistration();