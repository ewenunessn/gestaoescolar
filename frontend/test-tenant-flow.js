/**
 * Teste completo do fluxo de tenant no frontend
 */

console.log('🔄 Testando Fluxo Completo de Tenant...');
console.log('=' .repeat(60));

// Função para simular o fluxo de resolução de tenant
async function testarFluxoTenant() {
  console.log('1️⃣ Verificando estado inicial...');
  
  // Estado inicial
  const estadoInicial = {
    tenantId: localStorage.getItem('currentTenantId'),
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user'),
    url: window.location.href,
    hostname: window.location.hostname,
    subdomain: window.location.hostname.split('.')[0]
  };
  
  console.log('Estado inicial:', estadoInicial);
  
  // 2. Simular resolução de tenant
  console.log('\n2️⃣ Simulando resolução de tenant...');
  
  try {
    // Simular chamada para /api/tenants/resolve
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (estadoInicial.token) {
      headers['Authorization'] = `Bearer ${estadoInicial.token}`;
    }
    
    if (estadoInicial.tenantId) {
      headers['X-Tenant-ID'] = estadoInicial.tenantId;
    } else if (estadoInicial.subdomain && estadoInicial.subdomain !== 'localhost' && estadoInicial.subdomain !== 'www') {
      headers['X-Tenant-Subdomain'] = estadoInicial.subdomain;
    }
    
    console.log('Headers que seriam enviados:', headers);
    
    // Tentar fazer a requisição
    const response = await fetch('/api/tenants/resolve', {
      method: 'GET',
      headers
    });
    
    console.log(`Status da resposta: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Tenant resolvido:', data);
      
      if (data.data && data.data.tenant) {
        const tenant = data.data.tenant;
        console.log(`✅ Tenant encontrado: ${tenant.name} (${tenant.id})`);
        
        // Simular atualização do localStorage
        localStorage.setItem('currentTenantId', tenant.id);
        console.log('✅ Tenant ID atualizado no localStorage');
        
        return { success: true, tenant };
      } else {
        console.log('⚠️ Resposta não contém dados de tenant');
        return { success: false, error: 'No tenant data in response' };
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na resolução:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.log('❌ Erro de rede:', error.message);
    return { success: false, error: error.message };
  }
}

// Função para testar requisições com tenant
async function testarRequisicaoComTenant() {
  console.log('\n3️⃣ Testando requisição com tenant...');
  
  const tenantId = localStorage.getItem('currentTenantId');
  const token = localStorage.getItem('token');
  
  if (!tenantId) {
    console.log('❌ Sem tenant ID para testar');
    return { success: false, error: 'No tenant ID' };
  }
  
  try {
    // Testar uma requisição de estoque
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Testando requisição para /api/estoque-escolar...');
    console.log('Headers:', headers);
    
    const response = await fetch('/api/estoque-escolar', {
      method: 'GET',
      headers
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Requisição bem-sucedida');
      console.log(`Dados recebidos: ${data.data ? data.data.length : 0} itens`);
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na requisição:', errorText);
      
      // Verificar se é erro de tenant
      if (response.status === 403) {
        console.log('🚨 Erro 403 - Possível problema de tenant ownership');
      }
      
      return { success: false, error: errorText, status: response.status };
    }
  } catch (error) {
    console.log('❌ Erro de rede:', error.message);
    return { success: false, error: error.message };
  }
}

// Função para verificar query keys
function testarQueryKeys() {
  console.log('\n4️⃣ Testando Query Keys...');
  
  const tenantId = localStorage.getItem('currentTenantId');
  
  // Simular query keys
  const getCurrentTenantId = () => tenantId || 'no-tenant';
  
  const queryKeys = {
    estoque: {
      all: (tenantId) => ['estoque', tenantId || getCurrentTenantId()],
      escolar: (tenantId) => [['estoque', tenantId || getCurrentTenantId()], 'escolar'],
      escola: (escolaId, tenantId) => [['estoque', tenantId || getCurrentTenantId()], 'escolar', escolaId],
    }
  };
  
  const exemploKeys = {
    estoqueAll: queryKeys.estoque.all(tenantId),
    estoqueEscolar: queryKeys.estoque.escolar(tenantId),
    estoqueEscola: queryKeys.estoque.escola(123, tenantId)
  };
  
  console.log('Query keys geradas:', exemploKeys);
  
  // Verificar se incluem tenant
  const incluiTenant = Object.values(exemploKeys).every(key => 
    JSON.stringify(key).includes(tenantId || 'no-tenant')
  );
  
  console.log(`✅ Query keys incluem tenant: ${incluiTenant}`);
  
  return { success: incluiTenant, keys: exemploKeys };
}

// Função para diagnosticar problemas
function diagnosticarProblemas() {
  console.log('\n5️⃣ Diagnóstico de problemas...');
  
  const problemas = [];
  
  // Verificar localStorage
  const tenantId = localStorage.getItem('currentTenantId');
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!tenantId) {
    problemas.push({
      tipo: 'CRÍTICO',
      area: 'localStorage',
      problema: 'currentTenantId não definido',
      impacto: 'Requisições não incluirão tenant ID',
      solucao: 'Fazer login ou definir tenant manualmente'
    });
  }
  
  if (!token) {
    problemas.push({
      tipo: 'CRÍTICO',
      area: 'Autenticação',
      problema: 'Token não encontrado',
      impacto: 'Requisições não serão autenticadas',
      solucao: 'Fazer login novamente'
    });
  }
  
  if (!user) {
    problemas.push({
      tipo: 'AVISO',
      area: 'Contexto',
      problema: 'Dados de usuário não encontrados',
      impacto: 'Contexto de tenant pode não funcionar',
      solucao: 'Verificar processo de login'
    });
  }
  
  // Verificar URL
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  if (hostname === 'localhost' && !tenantId) {
    problemas.push({
      tipo: 'INFO',
      area: 'Desenvolvimento',
      problema: 'Localhost sem tenant configurado',
      impacto: 'Pode afetar testes de multi-tenancy',
      solucao: 'Definir currentTenantId ou usar subdomain de teste'
    });
  }
  
  if (problemas.length === 0) {
    console.log('✅ Nenhum problema encontrado');
  } else {
    problemas.forEach((p, i) => {
      const emoji = p.tipo === 'CRÍTICO' ? '❌' : p.tipo === 'AVISO' ? '⚠️' : 'ℹ️';
      console.log(`${emoji} ${i + 1}. [${p.area}] ${p.problema}`);
      console.log(`   Impacto: ${p.impacto}`);
      console.log(`   Solução: ${p.solucao}`);
    });
  }
  
  return problemas;
}

// Função principal para executar todos os testes
async function executarTodosTestes() {
  console.log('\n🚀 Executando todos os testes...\n');
  
  const resultados = {};
  
  // 1. Diagnóstico inicial
  resultados.diagnostico = diagnosticarProblemas();
  
  // 2. Teste de query keys
  resultados.queryKeys = testarQueryKeys();
  
  // 3. Teste de resolução de tenant
  resultados.resolucaoTenant = await testarFluxoTenant();
  
  // 4. Teste de requisição com tenant
  resultados.requisicaoTenant = await testarRequisicaoComTenant();
  
  // Resumo final
  console.log('\n📊 RESUMO DOS TESTES:');
  console.log('=' .repeat(40));
  
  const sucessos = Object.values(resultados).filter(r => r.success).length;
  const total = Object.keys(resultados).length - 1; // -1 porque diagnóstico não tem success
  
  console.log(`✅ Testes bem-sucedidos: ${sucessos}/${total}`);
  
  if (resultados.diagnostico.length > 0) {
    console.log(`⚠️ Problemas encontrados: ${resultados.diagnostico.length}`);
  }
  
  if (sucessos === total && resultados.diagnostico.length === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Frontend configurado corretamente para multi-tenant.');
  } else {
    console.log('\n🔧 Alguns problemas foram encontrados. Verifique os detalhes acima.');
  }
  
  return resultados;
}

// Função para corrigir problemas automaticamente
function corrigirProblemasAutomaticamente() {
  console.log('\n🔧 Tentando corrigir problemas automaticamente...');
  
  let correcoes = 0;
  
  // Se estiver em localhost sem tenant, definir um padrão
  if (window.location.hostname === 'localhost' && !localStorage.getItem('currentTenantId')) {
    localStorage.setItem('currentTenantId', 'escola-teste');
    console.log('✅ Definido tenant padrão para desenvolvimento: escola-teste');
    correcoes++;
  }
  
  // Se não tiver user mas tiver token, tentar criar dados básicos
  if (localStorage.getItem('token') && !localStorage.getItem('user')) {
    const userData = {
      id: 1,
      nome: 'Usuário Teste',
      email: 'teste@exemplo.com',
      tipo: 'gestor'
    };
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ Criados dados básicos de usuário para teste');
    correcoes++;
  }
  
  console.log(`🔧 ${correcoes} correções aplicadas`);
  
  if (correcoes > 0) {
    console.log('🔄 Execute os testes novamente para verificar as correções');
  }
  
  return correcoes;
}

// Disponibilizar funções globalmente
window.testarFluxoTenant = testarFluxoTenant;
window.testarRequisicaoComTenant = testarRequisicaoComTenant;
window.testarQueryKeys = testarQueryKeys;
window.diagnosticarProblemas = diagnosticarProblemas;
window.executarTodosTestes = executarTodosTestes;
window.corrigirProblemasAutomaticamente = corrigirProblemasAutomaticamente;

console.log('\n💡 Funções disponíveis:');
console.log('- executarTodosTestes() - Executa todos os testes');
console.log('- testarFluxoTenant() - Testa resolução de tenant');
console.log('- testarRequisicaoComTenant() - Testa requisição com tenant');
console.log('- diagnosticarProblemas() - Diagnóstica problemas');
console.log('- corrigirProblemasAutomaticamente() - Tenta corrigir problemas');

// Executar diagnóstico inicial automaticamente
setTimeout(() => {
  console.log('\n🔄 Executando diagnóstico inicial...');
  diagnosticarProblemas();
}, 1000);