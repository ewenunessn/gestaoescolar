const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Configurar token de autenticação (substitua pelo seu token)
const TOKEN = 'seu_token_aqui';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testarCodigoFinanceiroModalidades() {
  console.log('🧪 Testando campo código financeiro em modalidades...\n');

  try {
    // 1. Listar modalidades existentes
    console.log('1. Listando modalidades existentes...');
    const listResponse = await api.get('/modalidades');
    const modalidades = listResponse.data.data || [];
    
    console.log(`✅ Encontradas ${modalidades.length} modalidades`);
    
    if (modalidades.length > 0) {
      console.log('\n📋 Modalidades atuais:');
      modalidades.forEach(modalidade => {
        console.log(`  - ID: ${modalidade.id}, Nome: ${modalidade.nome}, Código Financeiro: ${modalidade.codigo_financeiro || 'Não definido'}`);
      });
    }

    // 2. Criar uma nova modalidade com código financeiro
    console.log('\n2. Criando modalidade com código financeiro...');
    const novaModalidade = {
      nome: 'Modalidade Teste Código Financeiro',
      descricao: 'Modalidade criada para testar o campo código financeiro',
      codigo_financeiro: '2.036',
      valor_repasse: 15.50,
      ativo: true
    };

    try {
      const createResponse = await api.post('/modalidades', novaModalidade);
      const modalidadeCriada = createResponse.data.data;
      
      console.log(`✅ Modalidade criada com sucesso!`);
      console.log(`   ID: ${modalidadeCriada.id}`);
      console.log(`   Nome: ${modalidadeCriada.nome}`);
      console.log(`   Código Financeiro: ${modalidadeCriada.codigo_financeiro}`);
      console.log(`   Valor Repasse: ${modalidadeCriada.valor_repasse}`);

      // 3. Buscar a modalidade criada
      console.log('\n3. Buscando modalidade criada...');
      const getResponse = await api.get(`/modalidades/${modalidadeCriada.id}`);
      const modalidadeBuscada = getResponse.data.data;
      
      console.log(`✅ Modalidade encontrada:`);
      console.log(`   Código Financeiro: ${modalidadeBuscada.codigo_financeiro}`);

      // 4. Atualizar o código financeiro
      console.log('\n4. Atualizando código financeiro...');
      const novoCodigoFinanceiro = '3.142';
      const updateResponse = await api.put(`/modalidades/${modalidadeCriada.id}`, {
        ...modalidadeBuscada,
        codigo_financeiro: novoCodigoFinanceiro
      });
      
      const modalidadeAtualizada = updateResponse.data.data;
      console.log(`✅ Código financeiro atualizado:`);
      console.log(`   Anterior: ${modalidadeBuscada.codigo_financeiro}`);
      console.log(`   Novo: ${modalidadeAtualizada.codigo_financeiro}`);

      // 5. Criar modalidade sem código financeiro (deve funcionar)
      console.log('\n5. Criando modalidade sem código financeiro...');
      const modalidadeSemCodigo = {
        nome: 'Modalidade Sem Código',
        descricao: 'Modalidade sem código financeiro',
        valor_repasse: 10.00,
        ativo: true
      };

      const createResponse2 = await api.post('/modalidades', modalidadeSemCodigo);
      const modalidadeCriada2 = createResponse2.data.data;
      
      console.log(`✅ Modalidade sem código criada:`);
      console.log(`   ID: ${modalidadeCriada2.id}`);
      console.log(`   Nome: ${modalidadeCriada2.nome}`);
      console.log(`   Código Financeiro: ${modalidadeCriada2.codigo_financeiro || 'null (correto)'}`);

      // 6. Listar todas as modalidades novamente
      console.log('\n6. Listando todas as modalidades após testes...');
      const finalListResponse = await api.get('/modalidades');
      const modalidadesFinais = finalListResponse.data.data || [];
      
      console.log(`📊 Total de modalidades: ${modalidadesFinais.length}`);
      console.log('\n📋 Modalidades com código financeiro:');
      modalidadesFinais
        .filter(m => m.codigo_financeiro)
        .forEach(modalidade => {
          console.log(`  - ${modalidade.nome}: ${modalidade.codigo_financeiro}`);
        });

      console.log('\n📋 Modalidades sem código financeiro:');
      modalidadesFinais
        .filter(m => !m.codigo_financeiro)
        .forEach(modalidade => {
          console.log(`  - ${modalidade.nome}`);
        });

    } catch (error) {
      console.error('❌ Erro durante os testes:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Erro ao listar modalidades:', error.response?.data || error.message);
  }
}

// Executar testes
async function executarTestes() {
  console.log('🚀 Iniciando testes do campo código financeiro em modalidades\n');
  console.log('=' .repeat(70));
  
  await testarCodigoFinanceiroModalidades();
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Testes concluídos!');
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  executarTestes().catch(console.error);
}

module.exports = {
  testarCodigoFinanceiroModalidades
};