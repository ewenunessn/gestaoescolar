#!/usr/bin/env node
/**
 * Script para atualizar views do estoque central para incluir unidade
 * Aplica em ambos os ambientes: local e Neon
 */

const { Pool } = require('pg');

const LOCAL_URL = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';
const NEON_URL = process.env.POSTGRES_URL;

const viewsSQL = `
-- Dropar views existentes
DROP VIEW IF EXISTS vw_estoque_baixo CASCADE;
DROP VIEW IF EXISTS vw_lotes_proximos_vencimento CASCADE;
DROP VIEW IF EXISTS vw_estoque_central_completo CASCADE;

-- Recriar views do estoque central com unidade
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

async function atualizarViews(connectionString, ambiente) {
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log(`\n🔄 Atualizando views em ${ambiente}...`);

    await pool.query(viewsSQL);

    console.log(`✅ Views atualizadas com sucesso em ${ambiente}!`);
    console.log(`   - vw_estoque_central_completo`);
    console.log(`   - vw_lotes_proximos_vencimento`);
    console.log(`   - vw_estoque_baixo`);

    await pool.end();
    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar views em ${ambiente}:`, error.message);
    await pool.end();
    return false;
  }
}

async function main() {
  console.log('🔧 Atualizando views do estoque central para incluir unidade\n');
  console.log('='.repeat(60));

  let sucessoLocal = false;
  let sucessoNeon = false;

  // Atualizar no banco local
  console.log('\n📍 BANCO LOCAL');
  console.log('-'.repeat(60));
  sucessoLocal = await atualizarViews(LOCAL_URL, 'LOCAL');

  // Atualizar no Neon se configurado
  if (NEON_URL) {
    console.log('\n☁️  BANCO NEON');
    console.log('-'.repeat(60));
    sucessoNeon = await atualizarViews(NEON_URL, 'NEON');
  } else {
    console.log('\n⚠️  POSTGRES_URL não configurado - pulando Neon');
  }

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMO');
  console.log('='.repeat(60));
  console.log(`Local: ${sucessoLocal ? '✅ Sucesso' : '❌ Falhou'}`);
  console.log(`Neon:  ${NEON_URL ? (sucessoNeon ? '✅ Sucesso' : '❌ Falhou') : '⏭️  Não configurado'}`);

  const todosOk = sucessoLocal && (!NEON_URL || sucessoNeon);
  process.exit(todosOk ? 0 : 1);
}

main();
