/**
 * Script para migrar modalidades para o tenant Benevides
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const db = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end()
};

async function migrateModalidades() {
  try {
    console.log('🔄 Migrando modalidades para tenant Benevides...\n');

    const tenantEscolaTeste = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f';
    const tenantBenevides = '6b95b81f-8d1f-44b0-912c-68c2fdde9841';

    // 1. Verificar modalidades atuais
    const modalidades = await db.query(`
      SELECT id, nome, descricao, tenant_id FROM modalidades ORDER BY id
    `);

    console.log(`📋 Modalidades encontradas: ${modalidades.rows.length}\n`);
    modalidades.rows.forEach(m => {
      const tenantName = m.tenant_id === tenantEscolaTeste ? 'Escola de Teste' : 
                         m.tenant_id === tenantBenevides ? 'Benevides' : 'Outro';
      console.log(`   ${m.id}. ${m.nome} - Tenant: ${tenantName}`);
    });

    if (!process.argv.includes('--migrate')) {
      console.log('\n⚠️  Para migrar as modalidades, execute com --migrate\n');
      console.log('Opções:');
      console.log('   --migrate : Migrar modalidades do tenant "Escola de Teste" para "Benevides"');
      console.log('   --duplicate : Duplicar modalidades para o tenant "Benevides" (mantém originais)\n');
      return;
    }

    if (process.argv.includes('--duplicate')) {
      // Duplicar modalidades
      console.log('\n🔧 Duplicando modalidades para tenant Benevides...\n');

      for (const modalidade of modalidades.rows) {
        if (modalidade.tenant_id === tenantBenevides) {
          console.log(`⏭️  ${modalidade.nome}: Já existe no tenant Benevides`);
          continue;
        }

        // Verificar se já existe uma modalidade com o mesmo nome no tenant Benevides
        const exists = await db.query(`
          SELECT id FROM modalidades WHERE nome = $1 AND tenant_id = $2
        `, [modalidade.nome, tenantBenevides]);

        if (exists.rows.length > 0) {
          console.log(`⏭️  ${modalidade.nome}: Já existe no tenant Benevides (ID: ${exists.rows[0].id})`);
          continue;
        }

        // Duplicar
        const newModalidade = await db.query(`
          INSERT INTO modalidades (nome, descricao, tenant_id, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING id, nome
        `, [modalidade.nome, modalidade.descricao, tenantBenevides]);

        console.log(`✅ ${modalidade.nome}: Duplicada (novo ID: ${newModalidade.rows[0].id})`);
      }

    } else {
      // Migrar modalidades
      console.log('\n🔧 Migrando modalidades para tenant Benevides...\n');

      const modalidadesParaMigrar = modalidades.rows.filter(m => m.tenant_id === tenantEscolaTeste);

      if (modalidadesParaMigrar.length === 0) {
        console.log('✅ Nenhuma modalidade para migrar\n');
        return;
      }

      for (const modalidade of modalidadesParaMigrar) {
        await db.query(`
          UPDATE modalidades SET tenant_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [tenantBenevides, modalidade.id]);

        console.log(`✅ ${modalidade.nome}: Migrada`);
      }

      console.log(`\n✅ ${modalidadesParaMigrar.length} modalidades migradas!`);
    }

    // Verificação final
    console.log('\n📊 Verificação final:\n');
    const finalCheck = await db.query(`
      SELECT tenant_id, COUNT(*) as total
      FROM modalidades
      GROUP BY tenant_id
      ORDER BY total DESC
    `);

    finalCheck.rows.forEach(row => {
      const tenantName = row.tenant_id === tenantEscolaTeste ? 'Escola de Teste' : 
                         row.tenant_id === tenantBenevides ? 'Benevides' : 'Outro';
      console.log(`   ${tenantName}: ${row.total} modalidades`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

migrateModalidades();
