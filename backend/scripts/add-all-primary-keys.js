#!/usr/bin/env node

/**
 * Script para adicionar chaves primárias em todas as tabelas que não possuem
 * Aplica em LOCAL e NEON
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
};

const NEON_CONFIG = {
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
};

// Tabelas principais que devem ter PK
const TABELAS_PRINCIPAIS = [
  { nome: 'usuarios', coluna: 'id' },
  { nome: 'escolas', coluna: 'id' },
  { nome: 'modalidades', coluna: 'id' },
  { nome: 'escola_modalidades', coluna: 'id' },
  { nome: 'fornecedores', coluna: 'id' },
  { nome: 'contratos', coluna: 'id' },
  { nome: 'contrato_produtos', coluna: 'id' },
  { nome: 'produtos', coluna: 'id' },
  { nome: 'pedidos', coluna: 'id' },
  { nome: 'pedido_itens', coluna: 'id' },
  { nome: 'refeicoes', coluna: 'id' },
  { nome: 'refeicao_produtos', coluna: 'id' },
  { nome: 'cardapios', coluna: 'id' },
  { nome: 'guias', coluna: 'id' },
  { nome: 'guia_itens', coluna: 'id' },
  { nome: 'entregas', coluna: 'id' },
  { nome: 'rotas', coluna: 'id' },
  { nome: 'rota_escolas', coluna: 'id' },
  { nome: 'historico_entregas', coluna: 'id' },
  { nome: 'comprovantes_entrega', coluna: 'id' },
  { nome: 'estoque_central', coluna: 'id' },
  { nome: 'estoque_central_movimentacoes', coluna: 'id' },
  { nome: 'estoque_escolar', coluna: 'id' },
  { nome: 'estoque_escolar_movimentacoes', coluna: 'id' },
  { nome: 'recebimentos', coluna: 'id' },
  { nome: 'faturamentos_pedidos', coluna: 'id' },
  { nome: 'faturamentos_itens', coluna: 'id' },
  { nome: 'demandas', coluna: 'id' },
  { nome: 'produto_modalidades', coluna: 'id' }
];

async function verificarEAdicionarPK(pool, nomeDB) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Verificando chaves primárias em ${nomeDB}`);
  console.log(`${'='.repeat(70)}\n`);

  let tabelasCorrigidas = 0;
  let tabelasJaOK = 0;
  let tabelasNaoExistem = 0;

  for (const tabela of TABELAS_PRINCIPAIS) {
    try {
      // Verificar se a tabela existe
      const tabelaExiste = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tabela.nome]);

      if (!tabelaExiste.rows[0].exists) {
        console.log(`⚪ ${tabela.nome.padEnd(35)} - Tabela não existe`);
        tabelasNaoExistem++;
        continue;
      }

      // Verificar se tem PK
      const pkCheck = await pool.query(`
        SELECT con.conname as constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = $1
        AND con.contype = 'p'
        AND rel.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
      `, [tabela.nome]);

      if (pkCheck.rows.length > 0) {
        console.log(`✅ ${tabela.nome.padEnd(35)} - PK já existe (${pkCheck.rows[0].constraint_name})`);
        tabelasJaOK++;
        continue;
      }

      // Verificar se a coluna existe
      const colunaExiste = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2;
      `, [tabela.nome, tabela.coluna]);

      if (colunaExiste.rows.length === 0) {
        console.log(`❌ ${tabela.nome.padEnd(35)} - Coluna ${tabela.coluna} não existe!`);
        continue;
      }

      // Adicionar PK
      const pkName = `${tabela.nome}_pkey`;
      await pool.query(`
        ALTER TABLE ${tabela.nome} 
        ADD CONSTRAINT ${pkName} PRIMARY KEY (${tabela.coluna});
      `);

      console.log(`🔧 ${tabela.nome.padEnd(35)} - PK adicionada (${pkName})`);
      tabelasCorrigidas++;

    } catch (error) {
      console.log(`❌ ${tabela.nome.padEnd(35)} - Erro: ${error.message}`);
    }
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`📊 Resumo ${nomeDB}:`);
  console.log(`   ✅ Tabelas já com PK: ${tabelasJaOK}`);
  console.log(`   🔧 Tabelas corrigidas: ${tabelasCorrigidas}`);
  console.log(`   ⚪ Tabelas não existem: ${tabelasNaoExistem}`);
  console.log(`${'─'.repeat(70)}\n`);
}

async function main() {
  console.log('\n🚀 Iniciando verificação e correção de chaves primárias...\n');

  try {
    // LOCAL
    const poolLocal = new Pool(LOCAL_CONFIG);
    await verificarEAdicionarPK(poolLocal, 'LOCAL');
    await poolLocal.end();

    // NEON
    if (process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL) {
      const poolNeon = new Pool(NEON_CONFIG);
      await verificarEAdicionarPK(poolNeon, 'NEON');
      await poolNeon.end();
    } else {
      console.log('\n⚠️  DATABASE_URL não configurada, pulando NEON\n');
    }

    console.log(`${'='.repeat(70)}`);
    console.log('✅ Verificação concluída com sucesso!');
    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error('\n❌ Erro durante a execução:', error);
    process.exit(1);
  }
}

main();
