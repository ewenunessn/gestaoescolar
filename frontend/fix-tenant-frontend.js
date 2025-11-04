/**
 * Script para diagnosticar e corrigir problemas de tenant no frontend
 * Execute no console do browser: copy(fix-tenant-frontend.js) e cole no console
 */

console.log('🔧 DIAGNÓSTICO E CORREÇÃO DE TENANT NO FRONTEND');
console.log('=' .repeat(60));

// Função principal de diagnóstico e correção
async function diagnosticarECorrigirTenant() {
  const problemas = [];
  const correcoes = [];
  
  console.log('🔍 1. Verificando estado atual...');
  
  // 1. Verificar localStorage
  const tenantId = localStorage.getItem('currentTenantId');
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log(`   Tenant ID: ${tenantId || 'NÃO ENCONTRADO'}`);
  console.log(`   Token: ${token ? 'PRESENTE' : 'NÃO ENCONTRADO'}`);
  console.log(`   User: ${user ? 'PRESENTE' : 'NÃO ENCONTRADO'}`);
  
  // 2. Verificar se há problemas críticos
  if (!token) {
    problemas.push({
      tipo: 'CRÍTICO',
      problema: 'Token de autenticação não encontrado',
      solucao: 'Fazer login novamente'
    });
  }
  
  if (!tenantId && token) {
    problemas.push({
      tipo: 'CRÍTICO',
      problema: 'Tenant ID não encontrado mas token presente',
      solucao: 'Tentar resolver tenant automaticamente'
    });
  }
  
  // 3. Tentar resolver tenant automaticamente
  if (token && !tenantId) {
    console.log('\n🔄 2. Tentando resolver tenant automaticamente...');
    
    try {
      const response = await fetch('/api/tenants/resolve', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('   Resposta da API:', data);
        
        if (data.data && data.data.tenant) {
          localStorage.setItem('currentTenantId', data.data.tenant.id);
          correcoes.push(`✅ Tenant ID definido: ${data.data.tenant.id}`);
          console.log(`   ✅ Tenant resolvido: ${data.data.tenant.name} (${data.data.tenant.id})`);
        } else {
          problemas.push({
            tipo: 'AVISO',
            problema: 'API não retornou dados de tenant',
            solucao: 'Verificar configuração do backend'
          });
        }
      } else {
        const errorText = await response.text();
        problemas.push({
          tipo: 'ERRO',
          problema: `Erro ao resolver tenant: ${response.status}`,
          solucao: errorText
        });
      }
    } catch (error) {
      problemas.push({
        tipo: 'ERRO',
        problema: 'Erro de rede ao resolver tenant',
        solucao: error.message
      });
    }
  }
  
  // 4. Se ainda não tem tenant, tentar métodos alternativos
  const tenantIdAtualizado = localStorage.getItem('currentTenantId');
  if (!tenantIdAtualizado) {
    console.log('\n🔄 3. Tentando métodos alternativos...');
    
    // Método 1: Verificar subdomain
    const subdomain = window.location.hostname.split('.')[0];
    if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      localStorage.setItem('currentTenantId', subdomain);
      correcoes.push(`✅ Tenant definido via subdomain: ${subdomain}`);
      console.log(`   ✅ Tenant definido via subdomain: ${subdomain}`);
    }
    // Método 2: Definir tenant padrão para desenvolvimento
    else if (window.location.hostname === 'localhost') {
      const tenantPadrao = 'escola-teste';
      localStorage.setItem('currentTenantId', tenantPadrao);
      correcoes.push(`✅ Tenant padrão definido para desenvolvimento: ${tenantPadrao}`);
      console.log(`   ✅ Tenant padrão definido: ${tenantPadrao}`);
    }
  }
  
  // 5. Testar requisição com tenant
  const tenantIdFinal = localStorage.getItem('currentTenantId');
  if (tenantIdFinal && token) {
    console.log('\n🧪 4. Testando requisição com tenant...');
    
    try {
      const response = await fetch('/api/estoque-escolar', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantIdFinal,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        correcoes.push(`✅ Requisição com tenant bem-sucedida (${data.data?.length || 0} itens)`);
        console.log(`   ✅ Requisição bem-sucedida: ${data.data?.length || 0} itens retornados`);
      } else {
        const errorText = await response.text();
        if (response.status === 403) {
          problemas.push({
            tipo: 'CRÍTICO',
            problema: 'Erro 403 - Problema de permissão de tenant',
            solucao: 'Verificar se o tenant está correto e se o usuário tem acesso'
          });
        } else {
          problemas.push({
            tipo: 'ERRO',
            problema: `Erro ${response.status} na requisição`,
            solucao: errorText
          });
        }
      }
    } catch (error) {
      problemas.push({
        tipo: 'ERRO',
        problema: 'Erro de rede na requisição de teste',
        solucao: error.message
      });
    }
  }
  
  // 6. Verificar React Query cache
  console.log('\n🔍 5. Verificando cache do React Query...');
  
  try {
    // Tentar acessar o queryClient global (se disponível)
    if (window.queryClient || window.__REACT_QUERY_CLIENT__) {
      const client = window.queryClient || window.__REACT_QUERY_CLIENT__;
      const cache = client.getQueryCache();
      const queries = cache.getAll();
      
      console.log(`   Total de queries em cache: ${queries.length}`);
      
      const tenantQueries = queries.filter(q => 
        q.queryKey.some(key => 
          typeof key === 'string' && (key.includes('estoque') || key.includes('escola'))
        )
      );
      
      console.log(`   Queries relacionadas a estoque: ${tenantQueries.length}`);
      
      if (tenantQueries.length > 0) {
        console.log('   Exemplo de query key:', tenantQueries[0].queryKey);
        
        // Verificar se as query keys incluem tenant
        const incluiTenant = tenantQueries.some(q => 
          JSON.stringify(q.queryKey).includes(tenantIdFinal)
        );
        
        if (incluiTenant) {
          correcoes.push('✅ Query keys incluem tenant ID');
        } else {
          problemas.push({
            tipo: 'AVISO',
            problema: 'Query keys podem não incluir tenant ID',
            solucao: 'Recarregar a página para regenerar queries'
          });
        }
      }
    } else {
      console.log('   ⚠️ QueryClient não encontrado globalmente');
    }
  } catch (error) {
    console.log('   ⚠️ Erro ao verificar cache:', error.message);
  }
  
  // 7. Relatório final
  console.log('\n📊 RELATÓRIO FINAL:');
  console.log('=' .repeat(40));
  
  if (correcoes.length > 0) {
    console.log('✅ CORREÇÕES APLICADAS:');
    correcoes.forEach((correcao, i) => {
      console.log(`   ${i + 1}. ${correcao}`);
    });
  }
  
  if (problemas.length > 0) {
    console.log('\n❌ PROBLEMAS ENCONTRADOS:');
    problemas.forEach((problema, i) => {
      const emoji = problema.tipo === 'CRÍTICO' ? '🚨' : problema.tipo === 'ERRO' ? '❌' : '⚠️';
      console.log(`   ${emoji} ${i + 1}. ${problema.problema}`);
      console.log(`      Solução: ${problema.solucao}`);
    });
  }
  
  // 8. Recomendações finais
  console.log('\n💡 RECOMENDAÇÕES:');
  
  const tenantIdFinalCheck = localStorage.getItem('currentTenantId');
  const tokenFinalCheck = localStorage.getItem('token');
  
  if (tenantIdFinalCheck && tokenFinalCheck) {
    console.log('✅ Configuração básica está correta');
    console.log('🔄 Recarregue a página para aplicar as correções');
    console.log('📱 Teste as funcionalidades de estoque');
  } else if (!tokenFinalCheck) {
    console.log('🔑 Faça login novamente para obter um token válido');
  } else if (!tenantIdFinalCheck) {
    console.log('🏢 Configure um tenant válido ou entre em contato com o suporte');
  }
  
  return {
    problemas,
    correcoes,
    tenantId: tenantIdFinalCheck,
    token: !!tokenFinalCheck,
    status: tenantIdFinalCheck && tokenFinalCheck ? 'OK' : 'PROBLEMA'
  };
}

// Função para limpar e reconfigurar
function limparEReconfigurar() {
  console.log('🧹 Limpando configuração atual...');
  
  // Manter apenas dados essenciais
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  // Limpar localStorage relacionado a tenant
  localStorage.removeItem('currentTenantId');
  
  console.log('✅ Configuração limpa');
  console.log('🔄 Execute diagnosticarECorrigirTenant() novamente');
}

// Função para forçar tenant específico
function forcarTenant(tenantId) {
  if (!tenantId) {
    console.log('❌ Forneça um tenant ID válido');
    console.log('💡 Exemplo: forcarTenant("escola-teste")');
    return;
  }
  
  localStorage.setItem('currentTenantId', tenantId);
  console.log(`✅ Tenant forçado: ${tenantId}`);
  console.log('🔄 Recarregue a página para aplicar');
}

// Disponibilizar funções globalmente
window.diagnosticarECorrigirTenant = diagnosticarECorrigirTenant;
window.limparEReconfigurar = limparEReconfigurar;
window.forcarTenant = forcarTenant;

console.log('\n🚀 FUNÇÕES DISPONÍVEIS:');
console.log('• diagnosticarECorrigirTenant() - Executa diagnóstico completo');
console.log('• limparEReconfigurar() - Limpa configuração atual');
console.log('• forcarTenant("tenant-id") - Define tenant específico');

console.log('\n▶️ EXECUTANDO DIAGNÓSTICO AUTOMÁTICO...');

// Executar diagnóstico automaticamente
setTimeout(diagnosticarECorrigirTenant, 1000);