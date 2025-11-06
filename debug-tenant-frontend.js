/**
 * Script de debug para identificar problemas de tenant no frontend
 */

console.log('🔍 Debug: Frontend Tenant Issues...');
console.log('=' .repeat(60));

// 1. Verificar estado atual do localStorage
console.log('📦 Estado do localStorage:');
const storageKeys = ['token', 'currentTenantId', 'user'];
storageKeys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`  ${key}: ${value || 'NÃO DEFINIDO'}`);
});

// 2. Verificar se há dados de tenant no sessionStorage
console.log('\n📦 Estado do sessionStorage:');
const sessionKeys = ['currentTenant', 'tenantContext'];
sessionKeys.forEach(key => {
  const value = sessionStorage.getItem(key);
  console.log(`  ${key}: ${value || 'NÃO DEFINIDO'}`);
});

// 3. Verificar URL e subdomain
console.log('\n🌐 Informações da URL:');
console.log(`  URL completa: ${window.location.href}`);
console.log(`  Hostname: ${window.location.hostname}`);
console.log(`  Pathname: ${window.location.pathname}`);
console.log(`  Search: ${window.location.search}`);

const subdomain = window.location.hostname.split('.')[0];
console.log(`  Subdomain: ${subdomain}`);
console.log(`  É localhost: ${window.location.hostname === 'localhost'}`);

// 4. Verificar se há elementos React no DOM
console.log('\n⚛️ Verificando elementos React:');
const reactRoot = document.getElementById('root');
console.log(`  React root encontrado: ${!!reactRoot}`);

if (reactRoot) {
  const hasReactFiber = reactRoot._reactInternalFiber || reactRoot._reactInternalInstance;
  console.log(`  React fiber detectado: ${!!hasReactFiber}`);
}

// 5. Verificar se há erros no console
console.log('\n🚨 Verificando erros no console:');
const originalError = console.error;
const originalWarn = console.warn;
let errorCount = 0;
let warnCount = 0;

console.error = function(...args) {
  errorCount++;
  if (args.some(arg => typeof arg === 'string' && (
    arg.includes('tenant') || 
    arg.includes('Tenant') || 
    arg.includes('TENANT') ||
    arg.includes('403') ||
    arg.includes('ownership')
  ))) {
    console.log(`  ❌ Erro relacionado a tenant: ${args.join(' ')}`);
  }
  return originalError.apply(console, args);
};

console.warn = function(...args) {
  warnCount++;
  if (args.some(arg => typeof arg === 'string' && (
    arg.includes('tenant') || 
    arg.includes('Tenant') || 
    arg.includes('TENANT')
  ))) {
    console.log(`  ⚠️ Warning relacionado a tenant: ${args.join(' ')}`);
  }
  return originalWarn.apply(console, args);
};

// 6. Verificar se há requisições pendentes
console.log('\n📡 Verificando requisições de rede:');

// Interceptar fetch para monitorar requisições
const originalFetch = window.fetch;
let requestCount = 0;
let tenantRequestCount = 0;

window.fetch = function(url, options = {}) {
  requestCount++;
  
  const headers = options.headers || {};
  const hasTenantHeader = headers['X-Tenant-ID'] || headers['x-tenant-id'];
  const hasSubdomainHeader = headers['X-Tenant-Subdomain'] || headers['x-tenant-subdomain'];
  
  if (hasTenantHeader || hasSubdomainHeader) {
    tenantRequestCount++;
    console.log(`  📤 Requisição com tenant: ${url}`);
    console.log(`    X-Tenant-ID: ${hasTenantHeader || 'não definido'}`);
    console.log(`    X-Tenant-Subdomain: ${hasSubdomainHeader || 'não definido'}`);
  } else if (url.includes('/api/')) {
    console.log(`  📤 Requisição SEM tenant: ${url}`);
  }
  
  return originalFetch.apply(this, arguments);
};

// 7. Função para diagnosticar problemas comuns
function diagnosticarProblemas() {
  console.log('\n🔧 Diagnóstico de problemas comuns:');
  
  const problemas = [];
  
  // Problema 1: Sem tenant ID
  if (!localStorage.getItem('currentTenantId')) {
    problemas.push({
      tipo: 'CRÍTICO',
      descricao: 'Tenant ID não encontrado no localStorage',
      solucao: 'Fazer login novamente ou verificar resolução de tenant'
    });
  }
  
  // Problema 2: Sem token
  if (!localStorage.getItem('token')) {
    problemas.push({
      tipo: 'CRÍTICO', 
      descricao: 'Token de autenticação não encontrado',
      solucao: 'Fazer login novamente'
    });
  }
  
  // Problema 3: URL sem contexto de tenant
  const isLocalhost = window.location.hostname === 'localhost';
  const hasSubdomain = subdomain && subdomain !== 'localhost' && subdomain !== 'www';
  const hasTenantId = localStorage.getItem('currentTenantId');
  
  if (!isLocalhost && !hasSubdomain && !hasTenantId) {
    problemas.push({
      tipo: 'AVISO',
      descricao: 'Nenhum método de identificação de tenant encontrado',
      solucao: 'Verificar URL com subdomain ou login com tenant'
    });
  }
  
  // Problema 4: Versão de desenvolvimento sem tenant
  if (isLocalhost && !hasTenantId) {
    problemas.push({
      tipo: 'INFO',
      descricao: 'Desenvolvimento local sem tenant configurado',
      solucao: 'Definir currentTenantId no localStorage ou usar subdomain'
    });
  }
  
  if (problemas.length === 0) {
    console.log('  ✅ Nenhum problema crítico encontrado');
  } else {
    problemas.forEach((problema, index) => {
      console.log(`  ${problema.tipo === 'CRÍTICO' ? '❌' : problema.tipo === 'AVISO' ? '⚠️' : 'ℹ️'} ${index + 1}. ${problema.descricao}`);
      console.log(`     Solução: ${problema.solucao}`);
    });
  }
  
  return problemas;
}

// 8. Função para corrigir problemas automaticamente
function corrigirProblemas() {
  console.log('\n🔧 Tentando corrigir problemas automaticamente...');
  
  // Se estiver em localhost e não tiver tenant, definir um padrão
  if (window.location.hostname === 'localhost' && !localStorage.getItem('currentTenantId')) {
    const tenantPadrao = 'escola-teste';
    localStorage.setItem('currentTenantId', tenantPadrao);
    console.log(`  ✅ Definido tenant padrão para desenvolvimento: ${tenantPadrao}`);
  }
  
  // Se não tiver token mas tiver dados de usuário, tentar recriar sessão
  if (!localStorage.getItem('token') && localStorage.getItem('user')) {
    console.log('  ⚠️ Token ausente mas dados de usuário presentes - pode precisar fazer login novamente');
  }
}

// 9. Executar diagnóstico
const problemas = diagnosticarProblemas();

// 10. Oferecer correções automáticas
if (problemas.some(p => p.tipo === 'CRÍTICO' || p.tipo === 'AVISO')) {
  console.log('\n🤖 Correções automáticas disponíveis. Execute: corrigirProblemas()');
  window.corrigirProblemas = corrigirProblemas;
}

// 11. Função para testar tenant context
window.testarTenantContext = function() {
  console.log('\n🧪 Testando Tenant Context...');
  
  // Tentar acessar o contexto React (se disponível)
  try {
    // Simular verificação de contexto
    const tenantId = localStorage.getItem('currentTenantId');
    const token = localStorage.getItem('token');
    
    console.log('Estado do contexto:');
    console.log(`  Tenant ID: ${tenantId}`);
    console.log(`  Token: ${token ? 'Presente' : 'Ausente'}`);
    console.log(`  URL: ${window.location.href}`);
    
    if (tenantId && token) {
      console.log('✅ Contexto parece estar configurado corretamente');
      return true;
    } else {
      console.log('❌ Contexto incompleto');
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao verificar contexto:', error.message);
    return false;
  }
};

// 12. Função para simular requisição com tenant
window.simularRequisicaoTenant = async function() {
  console.log('\n🧪 Simulando requisição com tenant...');
  
  const tenantId = localStorage.getItem('currentTenantId');
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  
  console.log('Headers que seriam enviados:', headers);
  
  try {
    // Fazer uma requisição de teste (pode falhar se backend não estiver rodando)
    const response = await fetch('/api/tenants/resolve', {
      method: 'GET',
      headers
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resposta:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Erro:', errorText);
    }
  } catch (error) {
    console.log('❌ Erro de rede:', error.message);
    console.log('ℹ️ Isso é normal se o backend não estiver rodando');
  }
};

console.log('\n' + '='.repeat(60));
console.log('🏁 Debug concluído!');
console.log('\n💡 Funções disponíveis:');
console.log('- testarTenantContext()');
console.log('- simularRequisicaoTenant()');
if (window.corrigirProblemas) {
  console.log('- corrigirProblemas()');
}

// Executar teste básico automaticamente
setTimeout(() => {
  console.log('\n🔄 Executando teste automático em 2 segundos...');
  window.testarTenantContext();
}, 2000);