/**
 * Script de Teste de Performance
 * 
 * IMPORTANTE: Troque as credenciais antes de usar!
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const EMAIL = 'ewenunes0@gmail.com'; // TROQUE AQUI
const SENHA = '@Nunes8922'; // TROQUE AQUI

let token = null;

// Função para medir tempo de execução
async function measureTime(name, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`✅ ${name}: ${duration}ms`);
    return { success: true, duration, result };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name}: ${duration}ms - ERRO: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

// Fazer login
async function login() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: EMAIL,
    senha: SENHA
  });
  token = response.data.token;
  return response.data;
}

// Configurar headers com token
function getHeaders() {
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
}

// Testes de endpoints
async function testEndpoints() {
  console.log('\n📊 TESTE DE PERFORMANCE - BACKEND\n');
  console.log('='.repeat(50));

  const results = [];

  // 1. Login
  results.push(await measureTime('Login', login));

  // 2. Listar Competências
  results.push(await measureTime('Listar Competências', async () => {
    return await axios.get(`${BASE_URL}/guias/competencias`, getHeaders());
  }));

  // 3. Listar Escolas
  results.push(await measureTime('Listar Escolas', async () => {
    return await axios.get(`${BASE_URL}/escolas`, getHeaders());
  }));

  // 4. Listar Produtos
  results.push(await measureTime('Listar Produtos', async () => {
    return await axios.get(`${BASE_URL}/produtos`, getHeaders());
  }));

  // 5. Status Escolas (mês atual)
  const mes = new Date().getMonth() + 1;
  const ano = new Date().getFullYear();
  results.push(await measureTime('Status Escolas', async () => {
    return await axios.get(`${BASE_URL}/guias/status-escolas?mes=${mes}&ano=${ano}`, getHeaders());
  }));

  // 6. Listar Estoque Escolar (primeira escola)
  results.push(await measureTime('Estoque Escolar', async () => {
    return await axios.get(`${BASE_URL}/estoque-escolar/escola/1`, getHeaders());
  }));

  // 7. Health Check
  results.push(await measureTime('Health Check', async () => {
    return await axios.get('http://localhost:3000/health');
  }));

  console.log('\n' + '='.repeat(50));
  console.log('\n📈 RESUMO:\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`✅ Sucessos: ${successful}`);
  console.log(`❌ Falhas: ${failed}`);
  console.log(`⏱️  Tempo médio: ${avgTime.toFixed(2)}ms`);

  // Análise de performance
  console.log('\n🎯 ANÁLISE:\n');
  
  if (avgTime < 100) {
    console.log('🟢 EXCELENTE - Sistema muito rápido!');
  } else if (avgTime < 300) {
    console.log('🟡 BOM - Performance aceitável');
  } else if (avgTime < 1000) {
    console.log('🟠 REGULAR - Considere otimizações');
  } else {
    console.log('🔴 LENTO - Necessita otimização urgente!');
  }

  // Endpoints mais lentos
  const slowest = results
    .filter(r => r.success)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 3);

  if (slowest.length > 0) {
    console.log('\n⚠️  Endpoints mais lentos:');
    slowest.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.duration}ms`);
    });
  }

  return results;
}

// Executar testes
async function run() {
  try {
    await testEndpoints();
  } catch (error) {
    console.error('\n❌ Erro ao executar testes:', error.message);
    process.exit(1);
  }
}

// Verificar se credenciais foram configuradas
if (EMAIL === 'SEU_EMAIL_AQUI' || SENHA === 'SUA_SENHA_AQUI') {
  console.error('\n❌ ERRO: Configure suas credenciais no script antes de executar!');
  console.error('   Edite as variáveis EMAIL e SENHA no início do arquivo.\n');
  process.exit(1);
}

run();
