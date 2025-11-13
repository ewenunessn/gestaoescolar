require('dotenv').config();
const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend-seven.vercel.app';

async function auditoriaTenantSecurity() {
  console.log('🔒 AUDITORIA DE SEGURANÇA - ISOLAMENTO DE TENANTS\n');
  console.log('=' .repeat(60));

  // Fazer login
  const login = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'ewertonsolon@gmail.com',
    senha: '123456'
  });

  const token = login.data.token;
  const tenants = login.data.availableTenants;
  
  const tenantTesteFix = tenants.find(t => t.name.includes('Teste Fix'));
  const tenantEwerton = tenants.find(t => t.name.includes('Ewerton'));

  console.log(`\n✅ Login realizado`);
  console.log(`📌 Tenant A (Teste Fix): ${tenantTesteFix.id}`);
  console.log(`📌 Tenant B (Ewerton): ${tenantEwerton.id}\n`);

  let vulnerabilidades = [];
  let testesPassaram = 0;
  let testesFalharam = 0;

  // ========================================
  // TESTE 1: Tentar acessar escola de outro tenant por ID
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('TESTE 1: Acesso direto a recurso de outro tenant por ID');
  console.log('='.repeat(60));
  
  try {
    // Primeiro, pegar ID de uma escola do tenant Ewerton
    const escolasEwerton = await axios.get(`${API_URL}/api/escolas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantEwerton.id
      }
    });

    if (escolasEwerton.data.data.length > 0) {
      const escolaId = escolasEwerton.data.data[0].id;
      console.log(`📝 Escola do Tenant B: ID ${escolaId} - "${escolasEwerton.data.data[0].nome}"`);

      // Tentar acessar essa escola usando o Tenant A
      console.log(`🔍 Tentando acessar escola ${escolaId} usando Tenant A (Teste Fix)...`);
      
      try {
        const response = await axios.get(`${API_URL}/api/escolas/${escolaId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': tenantTesteFix.id
          }
        });

        console.log('❌ VULNERABILIDADE CRÍTICA! Conseguiu acessar escola de outro tenant!');
        console.log('   Dados retornados:', response.data);
        vulnerabilidades.push({
          teste: 'Acesso direto por ID',
          severidade: 'CRÍTICA',
          descricao: 'Possível acessar recurso de outro tenant usando ID direto'
        });
        testesFalharam++;
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('✅ SEGURO: Retornou 404 (escola não encontrada no tenant)');
          testesPassaram++;
        } else if (error.response?.status === 403) {
          console.log('✅ SEGURO: Retornou 403 (acesso negado)');
          testesPassaram++;
        } else {
          console.log('⚠️  Erro inesperado:', error.response?.status, error.response?.data);
        }
      }
    } else {
      console.log('⏭️  Pulando teste (nenhuma escola no Tenant B)');
    }
  } catch (error) {
    console.log('❌ Erro ao executar teste:', error.message);
  }

  // ========================================
  // TESTE 2: Tentar criar escola sem especificar tenant
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('TESTE 2: Criar recurso sem header X-Tenant-ID');
  console.log('='.repeat(60));
  
  try {
    console.log('🔍 Tentando criar escola SEM enviar X-Tenant-ID...');
    
    const response = await axios.post(`${API_URL}/api/escolas`, {
      nome: 'Escola Teste Segurança',
      codigo: 'TEST-SEC',
      ativo: true
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
        // Sem X-Tenant-ID
      }
    });

    console.log('⚠️  Escola criada. Verificando em qual tenant foi criada...');
    console.log('   Tenant da escola:', response.data.data?.tenant_id);
    
    // Verificar se foi criada no tenant do token (comportamento esperado)
    if (response.data.data?.tenant_id === tenantEwerton.id) {
      console.log('✅ SEGURO: Escola criada no tenant do token JWT');
      testesPassaram++;
    } else {
      console.log('❌ VULNERABILIDADE: Escola criada em tenant inesperado!');
      vulnerabilidades.push({
        teste: 'Criação sem tenant',
        severidade: 'ALTA',
        descricao: 'Recurso criado em tenant diferente do esperado'
      });
      testesFalharam++;
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('tenant')) {
      console.log('✅ SEGURO: Requer tenant explícito');
      testesPassaram++;
    } else {
      console.log('⚠️  Erro inesperado:', error.response?.status, error.response?.data);
    }
  }

  // ========================================
  // TESTE 3: Tentar manipular tenant_id no body da requisição
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('TESTE 3: Manipular tenant_id no body da requisição');
  console.log('='.repeat(60));
  
  try {
    console.log('🔍 Tentando criar escola com tenant_id diferente no body...');
    console.log(`   Header X-Tenant-ID: ${tenantTesteFix.id.substring(0, 8)}... (Teste Fix)`);
    console.log(`   Body tenant_id: ${tenantEwerton.id.substring(0, 8)}... (Ewerton)`);
    
    const response = await axios.post(`${API_URL}/api/escolas`, {
      nome: 'Escola Teste Manipulação',
      codigo: 'TEST-MAN',
      tenant_id: tenantEwerton.id, // Tentando forçar outro tenant
      ativo: true
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantTesteFix.id
      }
    });

    const tenantCriado = response.data.data?.tenant_id;
    console.log('   Escola criada no tenant:', tenantCriado?.substring(0, 8) + '...');
    
    if (tenantCriado === tenantTesteFix.id) {
      console.log('✅ SEGURO: Ignorou tenant_id do body, usou o do header');
      testesPassaram++;
    } else if (tenantCriado === tenantEwerton.id) {
      console.log('❌ VULNERABILIDADE CRÍTICA! Aceitou tenant_id do body!');
      vulnerabilidades.push({
        teste: 'Manipulação de tenant_id',
        severidade: 'CRÍTICA',
        descricao: 'Possível criar recursos em outros tenants manipulando o body'
      });
      testesFalharam++;
    }
  } catch (error) {
    console.log('⚠️  Erro:', error.response?.status, error.response?.data?.message);
  }

  // ========================================
  // TESTE 4: Verificar se queries retornam apenas dados do tenant correto
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('TESTE 4: Listagem retorna apenas dados do tenant correto');
  console.log('='.repeat(60));
  
  try {
    console.log('🔍 Listando escolas do Tenant A (Teste Fix)...');
    const escolasA = await axios.get(`${API_URL}/api/escolas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantTesteFix.id
      }
    });

    console.log('🔍 Listando escolas do Tenant B (Ewerton)...');
    const escolasB = await axios.get(`${API_URL}/api/escolas`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantEwerton.id
      }
    });

    console.log(`   Tenant A: ${escolasA.data.total} escolas`);
    console.log(`   Tenant B: ${escolasB.data.total} escolas`);

    // Verificar se há escolas duplicadas
    const nomesA = escolasA.data.data.map(e => e.nome);
    const nomesB = escolasB.data.data.map(e => e.nome);
    const duplicadas = nomesA.filter(nome => nomesB.includes(nome));

    if (duplicadas.length > 0) {
      console.log('❌ VULNERABILIDADE! Escolas aparecem em ambos os tenants:');
      duplicadas.forEach(nome => console.log(`   - ${nome}`));
      vulnerabilidades.push({
        teste: 'Listagem com vazamento',
        severidade: 'CRÍTICA',
        descricao: `${duplicadas.length} recursos aparecem em múltiplos tenants`
      });
      testesFalharam++;
    } else {
      console.log('✅ SEGURO: Nenhuma escola duplicada entre tenants');
      testesPassaram++;
    }

    // Verificar se todos os tenant_ids estão corretos
    const tenantIdsIncorretosA = escolasA.data.data.filter(e => e.tenant_id !== tenantTesteFix.id);
    const tenantIdsIncorretosB = escolasB.data.data.filter(e => e.tenant_id !== tenantEwerton.id);

    if (tenantIdsIncorretosA.length > 0 || tenantIdsIncorretosB.length > 0) {
      console.log('❌ VULNERABILIDADE! Escolas com tenant_id incorreto:');
      if (tenantIdsIncorretosA.length > 0) {
        console.log(`   Tenant A: ${tenantIdsIncorretosA.length} escolas com tenant_id errado`);
      }
      if (tenantIdsIncorretosB.length > 0) {
        console.log(`   Tenant B: ${tenantIdsIncorretosB.length} escolas com tenant_id errado`);
      }
      vulnerabilidades.push({
        teste: 'Integridade de tenant_id',
        severidade: 'CRÍTICA',
        descricao: 'Recursos retornados com tenant_id diferente do esperado'
      });
      testesFalharam++;
    } else {
      console.log('✅ SEGURO: Todos os tenant_ids estão corretos');
      testesPassaram++;
    }
  } catch (error) {
    console.log('❌ Erro ao executar teste:', error.message);
  }

  // ========================================
  // TESTE 5: Tentar acessar sem autenticação
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('TESTE 5: Acesso sem autenticação');
  console.log('='.repeat(60));
  
  try {
    console.log('🔍 Tentando listar escolas SEM token de autenticação...');
    
    await axios.get(`${API_URL}/api/escolas`, {
      headers: {
        'X-Tenant-ID': tenantTesteFix.id
        // Sem Authorization
      }
    });

    console.log('❌ VULNERABILIDADE CRÍTICA! Conseguiu acessar sem autenticação!');
    vulnerabilidades.push({
      teste: 'Acesso sem autenticação',
      severidade: 'CRÍTICA',
      descricao: 'Possível acessar recursos sem token de autenticação'
    });
    testesFalharam++;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ SEGURO: Requer autenticação (401)');
      testesPassaram++;
    } else {
      console.log('⚠️  Erro inesperado:', error.response?.status);
    }
  }

  // ========================================
  // RELATÓRIO FINAL
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('RELATÓRIO FINAL DA AUDITORIA');
  console.log('='.repeat(60));
  console.log(`\n✅ Testes passaram: ${testesPassaram}`);
  console.log(`❌ Testes falharam: ${testesFalharam}`);
  console.log(`🔍 Total de testes: ${testesPassaram + testesFalharam}`);

  if (vulnerabilidades.length > 0) {
    console.log(`\n⚠️  VULNERABILIDADES ENCONTRADAS: ${vulnerabilidades.length}\n`);
    vulnerabilidades.forEach((v, i) => {
      console.log(`${i + 1}. [${v.severidade}] ${v.teste}`);
      console.log(`   ${v.descricao}\n`);
    });
    console.log('🚨 AÇÃO NECESSÁRIA: Corrigir vulnerabilidades antes de produção!');
  } else {
    console.log('\n🎉 SISTEMA SEGURO! Nenhuma vulnerabilidade encontrada.');
    console.log('✅ Isolamento de tenants está funcionando corretamente.');
  }

  console.log('\n' + '='.repeat(60));
}

auditoriaTenantSecurity().catch(error => {
  console.error('❌ Erro na auditoria:', error.response?.data || error.message);
});
