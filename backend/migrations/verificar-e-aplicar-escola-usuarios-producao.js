const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Usar DATABASE_URL diretamente (produção)
const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificarEAplicar() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verificando estrutura da tabela usuarios no banco de produção...\n');

    // Verificar se as colunas existem
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position
    `);

    console.log('📊 Colunas atuais da tabela usuarios:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
    });
    console.log('');

    // Verificar se escola_id e tipo_secretaria existem
    const hasEscolaId = result.rows.some(row => row.column_name === 'escola_id');
    const hasTipoSecretaria = result.rows.some(row => row.column_name === 'tipo_secretaria');

    if (hasEscolaId && hasTipoSecretaria) {
      console.log('✅ As colunas escola_id e tipo_secretaria já existem!');
      console.log('✅ Banco de produção está atualizado.\n');
      return;
    }

    console.log('⚠️  Colunas faltando:');
    if (!hasEscolaId) console.log('   - escola_id');
    if (!hasTipoSecretaria) console.log('   - tipo_secretaria');
    console.log('');

    console.log('🔄 Aplicando migration...\n');

    const sql = fs.readFileSync(
      path.join(__dirname, '20260317_add_escola_usuarios.sql'),
      'utf8'
    );

    await client.query(sql);

    console.log('✅ Migration aplicada com sucesso!\n');

    // Verificar novamente
    const resultAfter = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      AND column_name IN ('escola_id', 'tipo_secretaria')
      ORDER BY column_name
    `);

    console.log('📊 Estrutura após migration:');
    resultAfter.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
    });
    console.log('');

    console.log('✅ Banco de produção atualizado com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verificarEAplicar().catch(console.error);
