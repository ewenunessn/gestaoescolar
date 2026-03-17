/**
 * Script para corrigir status dos contratos no Neon
 * Converte 'ATIVO' para 'ativo' para padronizar
 * 
 * Executa: node backend/migrations/corrigir-status-contratos-neon.js
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function corrigir() {
  console.log('🔧 CORRIGINDO STATUS DOS CONTRATOS\n');

  try {
    // 1. Verificar status atuais
    console.log('1️⃣  Verificando status atuais...');
    const statusAntes = await pool.query(`
      SELECT 
        status,
        COUNT(*) as total
      FROM contratos
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('   Status encontrados:');
    statusAntes.rows.forEach(s => {
      console.log(`   - "${s.status}": ${s.total} contratos`);
    });

    // 2. Corrigir status para minúsculo
    console.log('\n2️⃣  Convertendo status para minúsculo...');
    const resultado = await pool.query(`
      UPDATE contratos 
      SET status = LOWER(status)
      WHERE status != LOWER(status)
      RETURNING id, numero, status
    `);

    if (resultado.rowCount > 0) {
      console.log(`   ✅ ${resultado.rowCount} contratos atualizados:`);
      resultado.rows.forEach(c => {
        console.log(`      - Contrato ${c.numero} (ID: ${c.id}) → status: "${c.status}"`);
      });
    } else {
      console.log('   ℹ️  Nenhum contrato precisou ser atualizado');
    }

    // 3. Verificar status após correção
    console.log('\n3️⃣  Verificando status após correção...');
    const statusDepois = await pool.query(`
      SELECT 
        status,
        COUNT(*) as total
      FROM contratos
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('   Status atuais:');
    statusDepois.rows.forEach(s => {
      console.log(`   - "${s.status}": ${s.total} contratos`);
    });

    // 4. Verificar produtos disponíveis agora
    console.log('\n4️⃣  Verificando produtos disponíveis após correção...');
    const produtosDisponiveis = await pool.query(`
      SELECT COUNT(DISTINCT cp.id) as total
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      WHERE cp.ativo = true AND c.status = 'ativo'
    `);

    console.log(`   ✅ Produtos disponíveis agora: ${produtosDisponiveis.rows[0].total}`);

    console.log('\n✅ CORREÇÃO CONCLUÍDA!\n');

  } catch (error) {
    console.error('❌ Erro na correção:', error);
  } finally {
    await pool.end();
  }
}

corrigir();
