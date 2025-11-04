/**
 * Script para criar modalidades padrão para todos os tenants
 */

const db = require('./dist/database');

const modalidadesPadrao = [
  {
    nome: 'CRECHE',
    descricao: 'Modalidade para crianças de 0 a 3 anos',
    codigo_financeiro: 'CRECHE',
    valor_repasse: 0.50
  },
  {
    nome: 'PRÉ ESCOLA',
    descricao: 'Modalidade para crianças de 4 a 5 anos',
    codigo_financeiro: 'PRE_ESCOLA',
    valor_repasse: 0.60
  },
  {
    nome: 'ENS. FUNDAMENTAL',
    descricao: 'Ensino Fundamental - 1º ao 9º ano',
    codigo_financeiro: 'ENS_FUNDAMENTAL',
    valor_repasse: 0.70
  },
  {
    nome: 'ENS. MÉDIO',
    descricao: 'Ensino Médio - 1º ao 3º ano',
    codigo_financeiro: 'ENS_MEDIO',
    valor_repasse: 0.80
  },
  {
    nome: 'EJA',
    descricao: 'Educação de Jovens e Adultos',
    codigo_financeiro: 'EJA',
    valor_repasse: 0.75
  },
  {
    nome: 'AEE',
    descricao: 'Atendimento Educacional Especializado',
    codigo_financeiro: 'AEE',
    valor_repasse: 1.00
  }
];

async function createModalidadesForTenants() {
  try {
    console.log('🏗️  Criando modalidades padrão para todos os tenants...\n');

    // Buscar todos os tenants
    const tenantsResult = await db.query('SELECT id, name, slug FROM tenants ORDER BY name');
    const tenants = tenantsResult.rows;

    console.log(`📋 Encontrados ${tenants.length} tenants:`);
    tenants.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.slug})`);
    });
    console.log('');

    for (const tenant of tenants) {
      console.log(`🏢 Processando tenant: ${tenant.name}...`);

      // Verificar se já tem modalidades
      const existingModalidades = await db.query(
        'SELECT COUNT(*) as count FROM modalidades WHERE tenant_id = $1',
        [tenant.id]
      );

      const count = parseInt(existingModalidades.rows[0].count);
      
      if (count > 0) {
        console.log(`   ✅ Já possui ${count} modalidades - pulando`);
        continue;
      }

      console.log(`   📝 Criando ${modalidadesPadrao.length} modalidades...`);

      // Criar modalidades para este tenant
      for (const modalidade of modalidadesPadrao) {
        try {
          await db.query(`
            INSERT INTO modalidades (nome, descricao, codigo_financeiro, valor_repasse, tenant_id, ativo)
            VALUES ($1, $2, $3, $4, $5, true)
          `, [
            modalidade.nome,
            modalidade.descricao,
            modalidade.codigo_financeiro,
            modalidade.valor_repasse,
            tenant.id
          ]);

          console.log(`      ✅ ${modalidade.nome}`);
        } catch (error) {
          console.log(`      ❌ Erro ao criar ${modalidade.nome}:`, error.message);
        }
      }

      console.log(`   🎉 Modalidades criadas para ${tenant.name}\n`);
    }

    console.log('🎉 Processo concluído! Verificando resultado...\n');

    // Verificar resultado final
    for (const tenant of tenants) {
      const modalidadesResult = await db.query(
        'SELECT COUNT(*) as count FROM modalidades WHERE tenant_id = $1',
        [tenant.id]
      );
      const count = parseInt(modalidadesResult.rows[0].count);
      console.log(`📊 ${tenant.name}: ${count} modalidades`);
    }

  } catch (error) {
    console.error('❌ Erro no processo:', error);
  } finally {
    process.exit(0);
  }
}

createModalidadesForTenants();