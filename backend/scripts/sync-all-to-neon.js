#!/usr/bin/env node
/**
 * Script para sincronizar todas as mudanças com o Neon
 * Aplica: unidade em produtos + estoque central + views
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const NEON_URL = process.env.POSTGRES_URL;

if (!NEON_URL) {
  console.error('❌ POSTGRES_URL não configurado');
  process.exit(1);
}

async function aplicarTudo() {
  const pool = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Sincronizando com Neon...\n');

    // 1. Adicionar unidade em produtos
    console.log('1️⃣ Adicionando coluna unidade em produtos...');
    try {
      const unidadeSql = fs.readFileSync(
        path.join(__dirname, '../src/migrations/20260303_add_unidade_to_produtos.sql'),
        'utf8'
      );
      await pool.query(unidadeSql);
      console.log('   ✅ Unidade adicionada\n');
    } catch (err) {
      if (err.code === '42701') {
        console.log('   ⏭️  Coluna unidade já existe\n');
      } else {
        throw err;
      }
    }

    // 2. Criar estoque central
    console.log('2️⃣ Criando tabelas do estoque central...');
    try {
      const estoqueSql = fs.readFileSync(
        path.join(__dirname, '../src/migrations/20260303_create_estoque_central.sql'),
        'utf8'
      );
      await pool.query(estoqueSql);
      console.log('   ✅ Estoque central criado\n');
    } catch (err) {
      if (err.code === '42P07' || err.code === '42710') {
        console.log('   ⏭️  Estoque central já existe\n');
      } else {
        throw err;
      }
    }

    // 3. Atualizar views
    console.log('3️⃣ Atualizando views...');
    try {
      await pool.query('DROP VIEW IF EXISTS vw_estoque_baixo CASCADE');
      await pool.query('DROP VIEW IF EXISTS vw_lotes_proximos_vencimento CASCADE');
      await pool.query('DROP VIEW IF EXISTS vw_estoque_central_completo CASCADE');

      const viewsSql = `
        CREATE VIEW vw_estoque_central_completo AS
        SELECT 
          ec.id,
          ec.produto_id,
          p.nome as produto_nome,
          p.unidade,
          p.categoria,
          ec.quantidade,
          ec.quantidade_reservada,
          ec.quantidade_disponivel,
          COUNT(DISTINCT ecl.id) as total_lotes,
          MIN(ecl.data_validade) as proxima_validade,
          ec.created_at,
          ec.updated_at
        FROM estoque_central ec
        INNER JOIN produtos p ON p.id = ec.produto_id
        LEFT JOIN estoque_central_lotes ecl ON ecl.estoque_central_id = ec.id AND ecl.quantidade > 0
        GROUP BY ec.id, p.id, p.nome, p.unidade, p.categoria;

        CREATE VIEW vw_lotes_proximos_vencimento AS
        SELECT 
          ecl.id,
          ecl.estoque_central_id,
          ec.produto_id,
          p.nome as produto_nome,
          p.unidade,
          ecl.lote,
          ecl.data_fabricacao,
          ecl.data_validade,
          ecl.quantidade,
          ecl.quantidade_disponivel,
          (ecl.data_validade - CURRENT_DATE) as dias_para_vencer
        FROM estoque_central_lotes ecl
        INNER JOIN estoque_central ec ON ec.id = ecl.estoque_central_id
        INNER JOIN produtos p ON p.id = ec.produto_id
        WHERE ecl.quantidade > 0
          AND ecl.data_validade <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY ecl.data_validade ASC;

        CREATE VIEW vw_estoque_baixo AS
        SELECT 
          ec.id,
          ec.produto_id,
          p.nome as produto_nome,
          p.unidade,
          ec.quantidade,
          ec.quantidade_disponivel,
          COALESCE(AVG(ABS(m.quantidade)), 0) as media_saidas_mensais,
          CASE 
            WHEN COALESCE(AVG(ABS(m.quantidade)), 0) > 0 
            THEN ec.quantidade_disponivel / COALESCE(AVG(ABS(m.quantidade)), 1)
            ELSE 999
          END as dias_estoque
        FROM estoque_central ec
        INNER JOIN produtos p ON p.id = ec.produto_id
        LEFT JOIN estoque_central_movimentacoes m ON m.estoque_central_id = ec.id 
          AND m.tipo = 'saida' 
          AND m.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY ec.id, p.id, p.nome, p.unidade
        HAVING ec.quantidade_disponivel < COALESCE(AVG(ABS(m.quantidade)) * 0.1, 0)
        ORDER BY dias_estoque ASC;
      `;

      await pool.query(viewsSql);
      console.log('   ✅ Views atualizadas\n');
    } catch (err) {
      console.log('   ⚠️  Erro ao atualizar views:', err.message, '\n');
    }

    // 4. Verificar resultado
    console.log('4️⃣ Verificando resultado...');
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM produtos WHERE unidade IS NOT NULL) as produtos_com_unidade,
        (SELECT COUNT(*) FROM estoque_central) as registros_estoque,
        (SELECT COUNT(*) FROM information_schema.views WHERE table_name LIKE 'vw_estoque%') as views_estoque
    `);

    console.log('   📊 Produtos com unidade:', result.rows[0].produtos_com_unidade);
    console.log('   📦 Registros no estoque:', result.rows[0].registros_estoque);
    console.log('   👁️  Views criadas:', result.rows[0].views_estoque);

    console.log('\n✅ Sincronização concluída com sucesso!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

aplicarTudo();
