/**
 * Script para verificar migração de modalidades e tabelas relacionadas
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

async function checkModalidadesMigration() {
  try {
    console.log('🔍 Verificando MODALIDADES e tabelas relacionadas...\n');

    const tenantPadrao = '00000000-0000-0000-0000-000000000000';
    const tenantBenevides = '6b95b81f-8d1f-44b0-912c-68c2fdde9841';

    // Tabelas relacionadas a modalidades
    const tabelasModalidades = [
      'modalidades',
      'produto_modalidades',
      'escola_modalidades',
      'contrato_modalidades',
      'saldo_contratos_modalidades'
    ];

    console.log('📊 VERIFICAÇÃO DE MODALIDADES\n');
    console.log('='.repeat(80));

    let totalProblemas = 0;

    for (const tabela of tabelasModalidades) {
      try {
        // Verificar se a tabela existe
        const tableExists = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [tabela]);

        if (!tableExists.rows[0].exists) {
          console.log(`⚠️  ${tabela}: Tabela não existe`);
          continue;
        }

        // Verificar se tem coluna tenant_id
        const columnExists = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1 
            AND column_name = 'tenant_id'
          );
        `, [tabela]);

        if (!columnExists.rows[0].exists) {
          console.log(`⚠️  ${tabela}: Não tem coluna tenant_id`);
          
          // Contar total de registros
          const countTotal = await db.query(`SELECT COUNT(*) as total FROM ${tabela}`);
          console.log(`   Total de registros: ${countTotal.rows[0].total}`);
          
          if (parseInt(countTotal.rows[0].total) > 0) {
            totalProblemas += parseInt(countTotal.rows[0].total);
            console.log(`   ❌ ${countTotal.rows[0].total} registros SEM tenant_id!\n`);
          } else {
            console.log(`   ✅ Tabela vazia\n`);
          }
          continue;
        }

        // Contar dados
        const countPadrao = await db.query(`
          SELECT COUNT(*) as total FROM ${tabela} WHERE tenant_id = $1
        `, [tenantPadrao]);

        const countBenevides = await db.query(`
          SELECT COUNT(*) as total FROM ${tabela} WHERE tenant_id = $1
        `, [tenantBenevides]);

        const countOrfaos = await db.query(`
          SELECT COUNT(*) as total FROM ${tabela} WHERE tenant_id IS NULL
        `);

        const countTotal = await db.query(`
          SELECT COUNT(*) as total FROM ${tabela}
        `);

        const padrao = parseInt(countPadrao.rows[0].total);
        const benevides = parseInt(countBenevides.rows[0].total);
        const orfaos = parseInt(countOrfaos.rows[0].total);
        const total = parseInt(countTotal.rows[0].total);

        // Status
        let status = '✅';
        if (padrao > 0 || orfaos > 0) {
          status = '❌';
          totalProblemas += padrao + orfaos;
        }

        console.log(`${status} ${tabela.padEnd(35)} | Padrão: ${padrao.toString().padStart(4)} | Benevides: ${benevides.toString().padStart(4)} | Órfãos: ${orfaos.toString().padStart(4)} | Total: ${total.toString().padStart(4)}`);

        // Se houver dados, mostrar detalhes
        if (total > 0) {
          const sample = await db.query(`SELECT * FROM ${tabela} LIMIT 3`);
          console.log(`   Exemplo de registros:`);
          sample.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ID: ${row.id}, Nome: ${row.nome || row.descricao || 'N/A'}, Tenant: ${row.tenant_id || 'NULL'}`);
          });
        }
        console.log('');

      } catch (error) {
        console.log(`❌ ${tabela}: Erro - ${error.message}\n`);
      }
    }

    console.log('='.repeat(80));

    if (totalProblemas === 0) {
      console.log('\n✅ TODAS AS MODALIDADES ESTÃO OK!');
      console.log('   Não há dados no tenant padrão ou órfãos\n');
    } else {
      console.log(`\n❌ PROBLEMA: ${totalProblemas} registros precisam ser migrados!\n`);
      console.log('💡 Executando correção automática...\n');

      if (process.argv.includes('--fix')) {
        // Corrigir automaticamente
        for (const tabela of tabelasModalidades) {
          try {
            const tableExists = await db.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
              );
            `, [tabela]);

            if (!tableExists.rows[0].exists) continue;

            const columnExists = await db.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = $1 
                AND column_name = 'tenant_id'
              );
            `, [tabela]);

            if (!columnExists.rows[0].exists) continue;

            // Migrar dados do tenant padrão
            const updatePadrao = await db.query(`
              UPDATE ${tabela} SET tenant_id = $1 WHERE tenant_id = $2
              RETURNING id
            `, [tenantBenevides, tenantPadrao]);

            if (updatePadrao.rows.length > 0) {
              console.log(`✅ ${tabela}: ${updatePadrao.rows.length} registros migrados do tenant padrão`);
            }

            // Migrar dados órfãos
            const updateOrfaos = await db.query(`
              UPDATE ${tabela} SET tenant_id = $1 WHERE tenant_id IS NULL
              RETURNING id
            `, [tenantBenevides]);

            if (updateOrfaos.rows.length > 0) {
              console.log(`✅ ${tabela}: ${updateOrfaos.rows.length} registros órfãos corrigidos`);
            }

          } catch (error) {
            console.log(`❌ ${tabela}: Erro ao corrigir - ${error.message}`);
          }
        }

        console.log('\n✅ Correção concluída! Execute novamente sem --fix para verificar.\n');
      } else {
        console.log('Para corrigir automaticamente, execute com --fix\n');
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

checkModalidadesMigration();
