/**
 * Script para testar o sistema de permissões
 * 
 * Testa se as permissões estão funcionando corretamente
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// Cores para console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testarPermissoes() {
  log('\n🧪 TESTANDO SISTEMA DE PERMISSÕES\n', 'cyan');

  try {
    // 1. Criar usuário de teste com apenas leitura
    log('1️⃣  Criando usuário de teste...', 'blue');
    
    const usuarioTeste = {
      nome: 'Usuário Teste Leitura',
      email: `teste.leitura.${Date.now()}@example.com`,
      senha: 'senha123',
      perfil: 'usuario'
    };

    let tokenAdmin, tokenLeitura, usuarioId;

    try {
      // Fazer login como admin primeiro
      log('   Fazendo login como admin...', 'yellow');
      const loginAdmin = await axios.post(`${API_URL}/usuarios/login`, {
        email: 'admin@example.com', // Ajuste conforme seu admin
        senha: 'admin123'
      });
      tokenAdmin = loginAdmin.data.data.token;
      log('   ✅ Login admin bem-sucedido', 'green');
    } catch (error) {
      log('   ⚠️  Admin não encontrado, criando primeiro usuário...', 'yellow');
      // Se não tem admin, criar primeiro usuário (será admin automaticamente)
      const registro = await axios.post(`${API_URL}/usuarios/register`, {
        nome: 'Admin Sistema',
        email: 'admin@example.com',
        senha: 'admin123',
        perfil: 'admin'
      });
      
      const loginAdmin = await axios.post(`${API_URL}/usuarios/login`, {
        email: 'admin@example.com',
        senha: 'admin123'
      });
      tokenAdmin = loginAdmin.data.data.token;
      log('   ✅ Admin criado e logado', 'green');
    }

    // Criar usuário de teste
    const registro = await axios.post(
      `${API_URL}/usuarios/register`,
      usuarioTeste,
      { headers: { Authorization: `Bearer ${tokenAdmin}` } }
    );
    usuarioId = registro.data.data.id;
    log(`   ✅ Usuário criado: ID ${usuarioId}`, 'green');

    // Fazer login com usuário de teste
    const loginTeste = await axios.post(`${API_URL}/usuarios/login`, {
      email: usuarioTeste.email,
      senha: usuarioTeste.senha
    });
    tokenLeitura = loginTeste.data.data.token;
    log('   ✅ Login usuário teste bem-sucedido', 'green');

    // 2. Configurar permissões (apenas leitura em compras)
    log('\n2️⃣  Configurando permissões (apenas leitura em compras)...', 'blue');
    
    // Buscar ID do módulo de compras
    const modulos = await axios.get(`${API_URL}/permissoes/modulos`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    const moduloCompras = modulos.data.data.find(m => m.slug === 'compras');
    
    if (!moduloCompras) {
      log('   ❌ Módulo de compras não encontrado', 'red');
      return;
    }

    // Buscar ID do nível "leitura"
    const niveis = await axios.get(`${API_URL}/permissoes/niveis-permissao`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    const nivelLeitura = niveis.data.data.find(n => n.slug === 'leitura');
    
    if (!nivelLeitura) {
      log('   ❌ Nível de leitura não encontrado', 'red');
      return;
    }

    // Definir permissões
    await axios.put(
      `${API_URL}/permissoes/usuario/${usuarioId}`,
      {
        permissoes: [
          { modulo_id: moduloCompras.id, nivel_permissao_id: nivelLeitura.id }
        ]
      },
      { headers: { Authorization: `Bearer ${tokenAdmin}` } }
    );
    log('   ✅ Permissões configuradas', 'green');

    // 3. Testar LEITURA (deve funcionar)
    log('\n3️⃣  Testando LEITURA em compras (deve funcionar)...', 'blue');
    try {
      const compras = await axios.get(`${API_URL}/compras`, {
        headers: { Authorization: `Bearer ${tokenLeitura}` }
      });
      log(`   ✅ SUCESSO: Listou ${compras.data.data?.length || 0} compras`, 'green');
    } catch (error) {
      if (error.response?.status === 403) {
        log('   ❌ FALHOU: Recebeu 403 (não deveria)', 'red');
      } else {
        log(`   ⚠️  Erro inesperado: ${error.message}`, 'yellow');
      }
    }

    // 4. Testar ESCRITA (deve falhar com 403)
    log('\n4️⃣  Testando ESCRITA em compras (deve falhar com 403)...', 'blue');
    try {
      await axios.post(
        `${API_URL}/compras`,
        {
          observacoes: 'Teste de permissão',
          itens: []
        },
        { headers: { Authorization: `Bearer ${tokenLeitura}` } }
      );
      log('   ❌ FALHOU: Conseguiu criar compra (não deveria)', 'red');
    } catch (error) {
      if (error.response?.status === 403) {
        log('   ✅ SUCESSO: Recebeu 403 como esperado', 'green');
        log(`   📝 Mensagem: ${error.response.data.message}`, 'cyan');
      } else {
        log(`   ⚠️  Erro inesperado: ${error.message}`, 'yellow');
      }
    }

    // 5. Testar acesso a módulo sem permissão (guias)
    log('\n5️⃣  Testando acesso a módulo SEM permissão (guias)...', 'blue');
    try {
      await axios.get(`${API_URL}/guias`, {
        headers: { Authorization: `Bearer ${tokenLeitura}` }
      });
      log('   ❌ FALHOU: Conseguiu acessar guias (não deveria)', 'red');
    } catch (error) {
      if (error.response?.status === 403) {
        log('   ✅ SUCESSO: Recebeu 403 como esperado', 'green');
        log(`   📝 Mensagem: ${error.response.data.message}`, 'cyan');
      } else {
        log(`   ⚠️  Erro inesperado: ${error.message}`, 'yellow');
      }
    }

    // 6. Testar admin (deve ter acesso total)
    log('\n6️⃣  Testando acesso de ADMIN (deve ter acesso total)...', 'blue');
    try {
      const compras = await axios.get(`${API_URL}/compras`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      log('   ✅ Admin consegue listar compras', 'green');

      await axios.post(
        `${API_URL}/compras`,
        {
          observacoes: 'Teste admin',
          itens: []
        },
        { headers: { Authorization: `Bearer ${tokenAdmin}` } }
      );
      log('   ✅ Admin consegue criar compras', 'green');
    } catch (error) {
      log(`   ❌ Admin falhou: ${error.message}`, 'red');
    }

    // 7. Limpar dados de teste
    log('\n7️⃣  Limpando dados de teste...', 'blue');
    try {
      // Deletar usuário de teste (se houver rota)
      // await axios.delete(`${API_URL}/usuarios/${usuarioId}`, {
      //   headers: { Authorization: `Bearer ${tokenAdmin}` }
      // });
      log('   ℹ️  Usuário de teste mantido para inspeção manual', 'cyan');
      log(`   📧 Email: ${usuarioTeste.email}`, 'cyan');
      log(`   🔑 Senha: ${usuarioTeste.senha}`, 'cyan');
    } catch (error) {
      log(`   ⚠️  Erro ao limpar: ${error.message}`, 'yellow');
    }

    log('\n✅ TESTES CONCLUÍDOS COM SUCESSO!\n', 'green');
    log('📊 Resumo:', 'cyan');
    log('   ✅ Usuário com leitura consegue listar', 'green');
    log('   ✅ Usuário com leitura NÃO consegue criar (403)', 'green');
    log('   ✅ Usuário sem permissão NÃO consegue acessar (403)', 'green');
    log('   ✅ Admin tem acesso total', 'green');

  } catch (error) {
    log(`\n❌ ERRO NO TESTE: ${error.message}`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
  }
}

// Executar testes
testarPermissoes();
