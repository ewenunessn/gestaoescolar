/**
 * Script para criar modalidades para o tenant "Sistema Principal"
 * para demonstrar o isolamento
 */

const db = require('./dist/database');

const SISTEMA_PRINCIPAL_ID = '00000000-0000-0000-0000-000000000000';

const modalidadesSistemaPrincipal = [
  {
    nome: 'BERÇÁRIO',
    descricao: 'Modalidade para bebês de 0 a 1 ano',
    codigo_financeiro: 'BERCARIO',
    valor_repasse: 0.40
  },
  {
    nome: 'MATERNAL',
    descricao: 'Modalidade para crianças de 1 a 2 anos',
    codigo_financeiro: 'MATERNAL',
    valor_repasse: 0.45
  },
  {
    nome: 'TÉCNICO',
    descricao: 'Ensino Técnico Profissionalizante',
    codigo_financeiro: 'TECNICO',
    valor_repasse: 0.90
  }
];

async function createModalidadesSistemaPrincipal() {
  try {
    console.log('🏗️  Criando modalidades para o Sistema Principal...\n');

    // Verificar se já tem modalidades
    const existingModalidades = await db.query(
      'SELECT COUNT(*) as count FROM modalidades WHERE tenant_id = $1',
      [SISTEMA_PRINCIPAL_ID]
    );

    const count = parseInt(existingModalidades.rows[0].count);
    console.log(`📊 Sistema Principal possui ${count} modalidades`);

    if (count > 0) {
      console.log('✅ Sistema Principal já possui modalidades');
      
      // Listar modalidades existentes
      const modalidades = await db.query(
        'SELECT nome FROM modalidades WHERE tenant_id = $1 ORDER BY nome',
        [SISTEMA_PRINCIPAL_ID]
      );
      
      console.log('📋 Modalidades existentes:');
      modalidades.rows.forEach(m => console.log(`   - ${m.nome}`));
      return;
    }

    console.log(`📝 Criando ${modalidadesSistemaPrincipal.length} modalidades para Sistema Principal...`);

    // Criar modalidades para o Sistema Principal
    for (const modalidade of modalidadesSistemaPrincipal) {
      try {
        await db.query(`
          INSERT INTO modalidades (nome, descricao, codigo_financeiro, valor_repasse, tenant_id, ativo)
          VALUES ($1, $2, $3, $4, $5, true)
        `, [
          modalidade.nome,
          modalidade.descricao,
          modalidade.codigo_financeiro,
          modalidade.valor_repasse,
          SISTEMA_PRINCIPAL_ID
        ]);

        console.log(`   ✅ ${modalidade.nome}`);
      } catch (error) {
        console.log(`   ❌ Erro ao criar ${modalidade.nome}:`, error.message);
      }
    }

    console.log('\n🎉 Modalidades criadas para Sistema Principal!');

    // Verificar resultado
    const finalCount = await db.query(
      'SELECT COUNT(*) as count FROM modalidades WHERE tenant_id = $1',
      [SISTEMA_PRINCIPAL_ID]
    );
    
    console.log(`📊 Sistema Principal agora possui ${finalCount.rows[0].count} modalidades`);

  } catch (error) {
    console.error('❌ Erro no processo:', error);
  } finally {
    process.exit(0);
  }
}

createModalidadesSistemaPrincipal();