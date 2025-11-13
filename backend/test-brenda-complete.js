const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testBrendaComplete() {
  console.log('🧪 TESTE COMPLETO - Brenda no Vercel\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Login
    console.log('\n1️⃣ TESTE DE LOGIN');
    console.log('-'.repeat(80));
    const loginResponse = await axios.post('https://gestaoescolar-backend.vercel.app/api/auth/login', {
      email: 'ewertonsolon@gmail.com',
      senha: '123456'
    });

    const token = loginResponse.data.token;
    const decoded = jwt.decode(token);
    
    console.log('✅ Login realizado com sucesso!');
    console.log('📊 Token contém:');
    console.log(`   - ID: ${decoded.id}`);
    console.log(`   - Nome: ${decoded.nome}`);
    console.log(`   - Email: ${decoded.email}`);
    console.log(`   - Tipo: ${decoded.tipo}`);
    console.log(`   - Institution ID: ${decoded.institution_id || '❌ AUSENTE'}`);
    console.log(`   - Tenant: ${decoded.tenant?.name || '❌ AUSENTE'}`);
    console.log(`   - Tenants disponíveis: ${decoded.tenants?.length || 0}`);

    // 2. /usuarios/me
    console.log('\n2️⃣ TESTE DE /usuarios/me');
    console.log('-'.repeat(80));
    const meResponse = await axios.get(
      'https://gestaoescolar-backend.vercel.app/api/usuarios/me',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const userData = meResponse.data.data;
    console.log('✅ Endpoint /usuarios/me funcionando!');
    console.log('📊 Dados retornados:');
    console.log(`   - ID: ${userData.id}`);
    console.log(`   - Nome: ${userData.nome}`);
    console.log(`   - Institution ID: ${userData.institution_id || '❌ AUSENTE'}`);

    // 3. /tenants/resolve
    console.log('\n3️⃣ TESTE DE /tenants/resolve');
    console.log('-'.repeat(80));
    const resolveResponse = await axios.get(
      'https://gestaoescolar-backend.vercel.app/api/tenants/resolve',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const resolveData = resolveResponse.data.data;
    console.log('✅ Endpoint /tenants/resolve funcionando!');
    console.log('📊 Resultado:');
    console.log(`   - Tenant: ${resolveData.tenant?.name || '❌ NÃO RESOLVIDO'}`);
    console.log(`   - Método: ${resolveData.method || 'N/A'}`);

    // 4. /tenants/available
    console.log('\n4️⃣ TESTE DE /tenants/available');
    console.log('-'.repeat(80));
    const availableResponse = await axios.get(
      'https://gestaoescolar-backend.vercel.app/api/tenants/available',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const availableData = availableResponse.data.data;
    console.log('✅ Endpoint /tenants/available funcionando!');
    console.log('📊 Resultado:');
    console.log(`   - Tenants disponíveis: ${availableData.availableTenants?.length || 0}`);
    
    if (availableData.availableTenants && availableData.availableTenants.length > 0) {
      console.log('   - Lista de tenants:');
      availableData.availableTenants.forEach(t => {
        console.log(`     • ${t.name} (${t.slug})`);
        console.log(`       ID: ${t.id}`);
        console.log(`       Institution ID: ${t.institution_id || '❌ AUSENTE'}`);
      });
    }

    // 5. Resumo Final
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMO FINAL');
    console.log('='.repeat(80));
    
    const checks = [
      { name: 'Login', status: true },
      { name: 'Token contém institution_id', status: !!decoded.institution_id },
      { name: 'Token contém tenant', status: !!decoded.tenant },
      { name: '/usuarios/me retorna institution_id', status: !!userData.institution_id },
      { name: '/tenants/resolve funciona', status: !!resolveData.tenant },
      { name: '/tenants/available retorna tenants', status: availableData.availableTenants?.length > 0 },
      { name: 'Tenants têm institution_id', status: availableData.availableTenants?.[0]?.institution_id }
    ];

    checks.forEach(check => {
      console.log(`${check.status ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.status);
    console.log('\n' + '='.repeat(80));
    if (allPassed) {
      console.log('🎉 TODOS OS TESTES PASSARAM! Sistema funcionando perfeitamente!');
    } else {
      console.log('⚠️  Alguns testes falharam. Verifique os detalhes acima.');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERRO:', error.response?.data || error.message);
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 URL:', error.config?.url);
    }
  }
}

testBrendaComplete();
