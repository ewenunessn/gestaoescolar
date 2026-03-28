/**
 * Adiciona:
 *   produtos.unidade_distribuicao       - unidade interna de referência (distribuição/estoque)
 *   contrato_produtos.fator_conversao   - quantas unidades_distribuicao = 1 unidade_compra
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. unidade_distribuicao em produtos
    await client.query(`
      ALTER TABLE produtos 
      ADD COLUMN IF NOT EXISTS unidade_distribuicao VARCHAR(50)
    `);
    console.log('✅ produtos.unidade_distribuicao adicionada');

    // Migrar: se já existe unidade_compra, usar como base para unidade_distribuicao
    await client.query(`
      UPDATE produtos 
      SET unidade_distribuicao = unidade_compra 
      WHERE unidade_distribuicao IS NULL AND unidade_compra IS NOT NULL
    `);
    console.log('✅ unidade_distribuicao populada a partir de unidade_compra');

    // 2. fator_conversao em contrato_produtos
    await client.query(`
      ALTER TABLE contrato_produtos 
      ADD COLUMN IF NOT EXISTS fator_conversao DECIMAL(12,6)
    `);
    console.log('✅ contrato_produtos.fator_conversao adicionada');

    // Migrar: se peso_embalagem existe e unidade_compra é PCT/SC/etc, fator = peso_embalagem
    // (heurística: se unidade_compra não é KG/G/L/ML/UN, e tem peso, fator = peso)
    await client.query(`
      UPDATE contrato_produtos
      SET fator_conversao = peso_embalagem
      WHERE fator_conversao IS NULL 
        AND peso_embalagem IS NOT NULL 
        AND peso_embalagem > 0
        AND unidade_compra NOT IN ('KG', 'G', 'L', 'ML', 'UN')
    `);
    console.log('✅ fator_conversao populado a partir de peso_embalagem onde aplicável');

    await client.query('COMMIT');
    console.log('\n✅ Migration concluída!');

    // Confirmar
    const p = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'produtos' AND column_name IN ('unidade_compra','unidade_distribuicao')
    `);
    console.log('Colunas em produtos:', p.rows.map(r => r.column_name).join(', '));

    const cp = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name IN ('unidade_compra','peso_embalagem','fator_conversao')
    `);
    console.log('Colunas em contrato_produtos:', cp.rows.map(r => r.column_name).join(', '));

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
