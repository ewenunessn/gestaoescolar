// Configurar ambiente para produção para usar a tabela correta
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const { demandaModel } = require('../src/modules/demandas/models/demandaModel.ts');

async function testNeonConnection() {
  try {
    console.log('🧪 Testando conexão com Neon usando o modelo atualizado...\n');

    // 1. Testar listagem
    console.log('1. Testando listagem de demandas...');
    const demandas = await demandaModel.listar();
    console.log(`✅ ${demandas.length} demandas encontradas`);
    
    if (demandas.length > 0) {
      console.log('   Primeira demanda:', {
        id: demandas[0].id,
        numero_oficio: demandas[0].numero_oficio,
        escola_nome: demandas[0].escola_nome,
        status: demandas[0].status,
        dias_solicitacao: demandas[0].dias_solicitacao
      });
    }

    // 2. Testar busca por ID
    if (demandas.length > 0) {
      console.log('\n2. Testando busca por ID...');
      const demanda = await demandaModel.buscarPorId(demandas[0].id);
      console.log(`✅ Demanda ${demanda.numero_oficio} encontrada`);
      console.log('   Escola:', demanda.escola_nome);
      console.log('   Objeto:', demanda.objeto.substring(0, 50) + '...');
    }

    // 3. Testar listagem de solicitantes
    console.log('\n3. Testando listagem de solicitantes...');
    const solicitantes = await demandaModel.listarSolicitantes();
    console.log(`✅ ${solicitantes.length} solicitantes únicos encontrados`);
    solicitantes.forEach(solicitante => {
      console.log(`   - ${solicitante}`);
    });

    // 4. Testar filtros
    console.log('\n4. Testando filtros...');
    const demandasFiltradas = await demandaModel.listar({
      status: 'enviado_semead'
    });
    console.log(`✅ ${demandasFiltradas.length} demandas com status 'enviado_semead'`);

    // 5. Testar filtro por objeto
    console.log('\n5. Testando filtro por objeto...');
    const demandasObjeto = await demandaModel.listar({
      objeto: 'móveis'
    });
    console.log(`✅ ${demandasObjeto.length} demandas com 'móveis' no objeto`);

    console.log('\n🎉 Todos os testes passaram! Conexão com Neon funcionando perfeitamente.');

  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNeonConnection();