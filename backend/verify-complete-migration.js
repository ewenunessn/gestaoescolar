/**
 * Script para verificar se TODOS os dados foram migrados
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

async function verifyCompleteMigration() {
  try {
    console.log('🔍 Verificando migração completa de TODOS os dados...\n');

    const tenantPadrao = '00000000-0000-0000-0000-000000000000';
    const tenantBenevides = '6b95b81f-8d1f-44b0-912c-68c2fdde9841';

    console.log('📊 VERIFICAÇÃO COMPLETA DE TODAS AS TABELAS\n');
    console.log('='.repeat(80));

    // Lista de todas as tabelas que devem ter tenant_id
    const tabelas = [
      'usuarios',
      'escolas',
      'produtos',
      'fornecedores',
      'contratos',
      'contrato_produtos',
      'demandas',
      'guias',
      'guia_produtos',
      'estoque_escolas',
      'estoque_lotes',
      'estoque_escolas_historico',
      'pedidos',
      'pedido_itens',
      'entregas',
      'entrega_itens',
      'cardapios',
      'cardapio_refeicoes',
      'refeicoes',
      'refeicao_produtos',
      'movimentacoes_consumo_contrato',
      'saldo_contratos_modalidades'
    ];

    let totalDadosPadrao = 0;
    let totalDadosBenevides = 0;
    let totalDadosOrfaos = 0;
    let tabelasComProblema = [];

    for (const tabela of tabelas) {
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
          continue;
        }

        // Contar dados no tenant padrão
        const countPadrao = await db.query(`
          SELECT COUNT(*) as total FROM ${tabela} WHERE tenant_id = $1
        `, [tenantPadrao]);

        // Contar dados no tenant Benevides
        const countBenevides = await db.query(`
          SELECT COUNT(*) as total FROM ${tabela} WHERE tenant_id = $1
        `, [tenantBenevides]);

        // Contar dados órfãos (sem tenant)
        const countOrfaos = await db.query(`
          SELECT COUNT(*) as total FROM ${tabela} WHERE tenant_id IS NULL
        `);

        // Contar total
        const countTotal = await db.query(`
          SELECT COUNT(*) as total FROM ${tabela}
        `);

        const padrao = parseInt(countPadrao.rows[0].total);
        const benevides = parseInt(countBenevides.rows[0].total);
        const orfaos = parseInt(countOrfaos.rows[0].total);
        const total = parseInt(countTotal.rows[0].total);

        totalDadosPadrao += padrao;
        totalDadosBenevides += benevides;
        totalDadosOrfaos += orfaos;

        // Status
        let status = '✅';
        if (padrao > 0) {
          status = '❌';
          tabelasComProblema.push({
            tabela,
            padrao,
            benevides,
            orfaos,
            total
          });
        } else if (orfaos > 0) {
          status = '⚠️ ';
        }

        console.log(`${status} ${tabela.padEnd(35)} | Padrão: ${padrao.toString().padStart(4)} | Benevides: ${benevides.toString().padStart(4)} | Órfãos: ${orfaos.toString().padStart(4)} | Total: ${total.toString().padStart(4)}`);

      } catch (error) {
        console.log(`❌ ${tabela}: Erro ao verificar - ${error.message}`);
      }
    }

    console.log('='.repeat(80));
    console.log(`\n📊 RESUMO GERAL:\n`);
    console.log(`   Dados no tenant PADRÃO (deve ser 0):     ${totalDadosPadrao}`);
    console.log(`   Dados no tenant BENEVIDES:               ${totalDadosBenevides}`);
    console.log(`   Dados ÓRFÃOS (sem tenant):               ${totalDadosOrfaos}`);

    if (totalDadosPadrao === 0 && totalDadosOrfaos === 0) {
      console.log(`\n✅ MIGRAÇÃO 100% COMPLETA!`);
      console.log(`   Todos os dados foram migrados para "Secretaria de Benevides"`);
      console.log(`   Nenhum dado ficou no tenant padrão ou órfão\n`);
    } else {
      console.log(`\n⚠️  MIGRAÇÃO INCOMPLETA!\n`);
      
      if (totalDadosPadrao > 0) {
        console.log(`❌ Ainda há ${totalDadosPadrao} registros no tenant padrão:\n`);
        tabelasComProblema.forEach(t => {
          console.log(`   - ${t.tabela}: ${t.padrao} registros`);
        });
        console.log(`\n💡 Execute o script de migração novamente para essas tabelas.`);
      }

      if (totalDadosOrfaos > 0) {
        console.log(`\n⚠️  Há ${totalDadosOrfaos} registros órfãos (sem tenant)`);
        console.log(`💡 Esses dados precisam ser associados a um tenant.`);
      }
    }

    // Verificar se o tenant padrão ainda existe
    const tenantPadraoExists = await db.query(`
      SELECT name FROM tenants WHERE id = $1
    `, [tenantPadrao]);

    console.log(`\n🏢 Status do tenant padrão:`);
    if (tenantPadraoExists.rows.length === 0) {
      console.log(`   ✅ Tenant padrão foi DELETADO com sucesso`);
    } else {
      console.log(`   ⚠️  Tenant padrão ainda existe: ${tenantPadraoExists.rows[0].name}`);
      if (totalDadosPadrao === 0) {
        console.log(`   💡 Pode ser deletado com segurança (não tem dados)`);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

verifyCompleteMigration();
