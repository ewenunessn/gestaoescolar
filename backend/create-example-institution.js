const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

const exampleInstitution = {
  institution: {
    name: 'Prefeitura Municipal de Exemplo',
    slug: 'prefeitura-exemplo',
    legal_name: 'Prefeitura Municipal de Exemplo - CNPJ',
    document_number: '12345678000190',
    type: 'prefeitura',
    email: 'contato@exemplo.gov.br',
    phone: '(11) 3333-4444',
    address: {
      street: 'Avenida Principal',
      number: '1000',
      complement: 'Centro Administrativo',
      neighborhood: 'Centro',
      city: 'Exemplo',
      state: 'SP',
      zipcode: '12345-678'
    }
  },
  tenant: {
    name: 'Secretaria Municipal de Educação',
    slug: 'educacao-exemplo',
    subdomain: 'educacao-exemplo'
  },
  admin: {
    nome: 'João Silva',
    email: 'joao.silva@exemplo.gov.br',
    senha: 'Senha@123'
  }
};

async function createExampleInstitution() {
  console.log('🚀 Criando instituição de exemplo...\n');
  console.log('📋 Dados da instituição:');
  console.log(JSON.stringify(exampleInstitution, null, 2));
  console.log('\n');

  try {
    const response = await axios.post(
      `${API_URL}/provisioning/complete`,
      exampleInstitution
    );

    console.log('✅ Instituição criada com sucesso!\n');
    console.log('📊 Resultado:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n');

    const { institution, tenant, admin } = response.data.data;

    console.log('═══════════════════════════════════════════════════════');
    console.log('  INSTITUIÇÃO CRIADA COM SUCESSO');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('🏛️  INSTITUIÇÃO:');
    console.log(`   ID: ${institution.id}`);
    console.log(`   Nome: ${institution.name}`);
    console.log(`   Slug: ${institution.slug}`);
    console.log(`   Status: ${institution.status}`);
    console.log('');

    console.log('🏢 TENANT:');
    console.log(`   ID: ${tenant.id}`);
    console.log(`   Nome: ${tenant.name}`);
    console.log(`   Slug: ${tenant.slug}`);
    console.log(`   Subdomínio: ${tenant.subdomain}`);
    console.log('');

    console.log('👤 ADMINISTRADOR:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Nome: ${admin.nome}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Tipo: ${admin.tipo}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  CREDENCIAIS DE ACESSO');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`   Email: ${exampleInstitution.admin.email}`);
    console.log(`   Senha: ${exampleInstitution.admin.senha}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  PRÓXIMOS PASSOS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('1. Acesse o sistema principal com as credenciais acima');
    console.log('2. O usuário terá acesso ao tenant "Secretaria Municipal de Educação"');
    console.log('3. Você pode criar mais tenants para esta instituição');
    console.log('4. Você pode criar mais usuários para esta instituição');
    console.log('');

    console.log('📝 URLs úteis:');
    console.log(`   Sistema Principal: http://localhost:5173`);
    console.log(`   Painel Admin: http://localhost:5174`);
    console.log(`   API: ${API_URL}`);
    console.log('');

    return response.data;

  } catch (error) {
    console.error('❌ Erro ao criar instituição:\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Mensagem:', error.response.data.message);
      console.error('Detalhes:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Erro de conexão. Verifique se o backend está rodando.');
      console.error('URL tentada:', `${API_URL}/provisioning/complete`);
    } else {
      console.error('Erro:', error.message);
    }

    console.log('\n💡 Dicas:');
    console.log('   - Verifique se o backend está rodando (npm run dev)');
    console.log('   - Verifique se a migração foi executada');
    console.log('   - Verifique se o banco de dados está acessível');
    console.log('');

    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createExampleInstitution()
    .then(() => {
      console.log('✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script falhou:', error.message);
      process.exit(1);
    });
}

module.exports = { createExampleInstitution, exampleInstitution };
