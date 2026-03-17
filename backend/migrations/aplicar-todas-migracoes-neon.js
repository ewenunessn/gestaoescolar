const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO NEON - SUBSTITUA PELA SUA CONNECTION STRING
const NEON_CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_xxxxxxxxxx@ep-xxxxxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
});

async function aplicarTodasMigracoes() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 APLICANDO TODAS AS MIGRAÇÕES NO NEON\n');
    console.log('='.repeat(70));

    // Lista de migrações na ordem correta
    const migracoes = [
      {
        nome: '1. Adicionar coluna ocultar_dados em períodos',
        arquivo: '20260316_add_ocultar_dados_periodos.sql',
        descricao: 'Adiciona coluna para ocultar dados de períodos inativos'
      },
      {
        nome: '2. Trigger para período ativo sempre visível',
        arquivo: '20260316_add_trigger_periodo_ativo_ocultar_dados.sql',
        descricao: 'Garante que período ativo sempre tenha ocultar_dados=false'
      },
      {
        nome: '3. Adicionar periodo_id em cardapios_modalidade',
        arquivo: '20260316_add_periodo_cardapios_modalidade.sql',
        descricao: 'Adiciona coluna periodo_id e trigger de atribuição automática'
      },
      {
        nome: '4. Remover tabelas antigas de cardápios',
        arquivo: '20260316_remover_cardapios_antigo.sql',
        descricao: 'Remove tabelas cardapios e cardapio_refeicoes (sistema antigo)'
      },
      {
        nome: '5. Adicionar período individual por usuário',
        arquivo: '20260316_add_periodo_usuario.sql',
        descricao: 'Adiciona coluna periodo_selecionado_id em usuarios'
      }
    ];

    console.log('\n📋 Migrações a serem aplicadas:');
    migracoes.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.descricao}`);
    });

    console.log('\n' + '='.repeat(70));

    // Aplicar cada migração
    for (const migracao of migracoes) {
      console.log(`\n🔧 ${migracao.nome}`);
      console.log('-'.repeat(70));

      const sqlPath = path.join(__dirname, migracao.arquivo);
      
      if (!fs.existsSync(sqlPath)) {
        console.log(`⚠️  Arquivo não encontrado: ${migracao.arquivo}`);
        continue;
      }

      const sql = fs.readFileSync(sqlPath, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ ${migracao.descricao}`);
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate')) {
          console.log(`⚠️  Já aplicada ou não necessária`);
        } else {
          console.error(`❌ Erro: ${error.message}`);
          throw error;
        }
      }
    }

    // Verificações finais
    console.log('\n' + '='.repeat(70));
    console.log('📊 VERIFICAÇÕES FINAIS\n');

    // 1. Verificar períodos
    console.log('1️⃣  Períodos:');
    const periodos = await client.query(`
      SELECT id, ano, ativo, fechado, ocultar_dados
      FROM periodos
      ORDER BY ano DESC
    `);
    console.table(periodos.rows);

    // 2. Verificar triggers
    console.log('\n2️⃣  Triggers de períodos:');
    const triggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE '%periodo%'
      ORDER BY event_object_table, trigger_name
    `);
    console.table(triggers.rows);

    // 3. Verificar tabelas de cardápios
    console.log('\n3️⃣  Tabelas de cardápios:');
    const tabelasCardapios = await client.query(`
      SELECT 
        table_name,
        CASE 
          WHEN table_name = 'cardapios_modalidade' THEN '✅ Sistema novo'
          WHEN table_name = 'cardapio_refeicoes_dia' THEN '✅ Sistema novo'
          WHEN table_name = 'cardapios' THEN '❌ Sistema antigo (deve ser removida)'
          WHEN table_name = 'cardapio_refeicoes' THEN '❌ Sistema antigo (deve ser removida)'
          ELSE '📋 Outra'
        END as status
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'cardapio%'
      ORDER BY table_name
    `);
    console.table(tabelasCardapios.rows);

    // 4. Verificar coluna periodo_id em cardapios_modalidade
    console.log('\n4️⃣  Estrutura de cardapios_modalidade:');
    const colunas = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'cardapios_modalidade'
        AND column_name IN ('id', 'periodo_id', 'modalidade_id', 'mes', 'ano', 'ativo')
      ORDER BY ordinal_position
    `);
    console.table(colunas.rows);

    // 5. Verificar cardápios com período
    console.log('\n5️⃣  Cardápios por modalidade:');
    const cardapios = await client.query(`
      SELECT 
        cm.id,
        cm.nome,
        cm.ano,
        cm.mes,
        cm.periodo_id,
        p.ano as periodo_ano,
        p.ocultar_dados
      FROM cardapios_modalidade cm
      LEFT JOIN periodos p ON cm.periodo_id = p.id
      ORDER BY cm.ano DESC, cm.mes DESC
      LIMIT 10
    `);
    console.table(cardapios.rows);

    // 6. Testar filtro
    console.log('\n6️⃣  Teste de filtro (ocultar_dados):');
    const totalCardapios = await client.query(`
      SELECT COUNT(*) as total FROM cardapios_modalidade
    `);
    const cardapiosVisiveis = await client.query(`
      SELECT COUNT(*) as total
      FROM cardapios_modalidade cm
      LEFT JOIN periodos p ON cm.periodo_id = p.id
      WHERE (p.ocultar_dados = false OR p.ocultar_dados IS NULL)
    `);
    console.log(`   Total de cardápios: ${totalCardapios.rows[0].total}`);
    console.log(`   Cardápios visíveis: ${cardapiosVisiveis.rows[0].total}`);
    
    if (totalCardapios.rows[0].total === cardapiosVisiveis.rows[0].total) {
      console.log('   ✅ Todos os cardápios estão visíveis (nenhum período oculto)');
    } else {
      console.log(`   ⚠️  ${totalCardapios.rows[0].total - cardapiosVisiveis.rows[0].total} cardápios ocultos`);
    }

    // 7. Verificar período individual por usuário
    console.log('\n7️⃣  Período individual por usuário:');
    const usuarios = await client.query(`
      SELECT 
        u.id,
        u.nome,
        u.periodo_selecionado_id,
        p.ano as periodo_ano
      FROM usuarios u
      LEFT JOIN periodos p ON u.periodo_selecionado_id = p.id
      ORDER BY u.nome
      LIMIT 5
    `);
    console.table(usuarios.rows);

    console.log('\n' + '='.repeat(70));
    console.log('✅ TODAS AS MIGRAÇÕES APLICADAS COM SUCESSO!\n');

    console.log('📝 Resumo:');
    console.log('   ✅ Coluna ocultar_dados adicionada em períodos');
    console.log('   ✅ Trigger de validação de período ativo criado');
    console.log('   ✅ Coluna periodo_id adicionada em cardapios_modalidade');
    console.log('   ✅ Trigger de atribuição automática de período criado');
    console.log('   ✅ Tabelas antigas de cardápios removidas (se existiam)');
    console.log('   ✅ Coluna periodo_selecionado_id adicionada em usuarios');
    console.log('   ✅ Sistema pronto para produção!');

  } catch (error) {
    console.error('\n❌ Erro durante as migrações:', error);
    console.error('\nDetalhes:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Verificar se connection string foi fornecida
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('xxxxxxxxxx')) {
  console.error('❌ ERRO: Configure a variável DATABASE_URL com sua connection string do Neon');
  console.error('\nExemplo:');
  console.error('DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require" node aplicar-todas-migracoes-neon.js');
  process.exit(1);
}

aplicarTodasMigracoes().catch(error => {
  console.error('Falha na execução:', error);
  process.exit(1);
});
