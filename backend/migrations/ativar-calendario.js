/**
 * Script para ativar um calendário letivo específico
 * (desativa todos os outros automaticamente)
 * 
 * USO:
 * node backend/migrations/ativar-calendario.js 2025
 */

const { Pool } = require('pg');
require('dotenv').config();

// ===== CONFIGURAÇÃO =====
const ANO_LETIVO = process.argv[2];

if (!ANO_LETIVO) {
  console.log('\n❌ Erro: Informe o ano do calendário a ser ativado');
  console.log('\nUSO: node backend/migrations/ativar-calendario.js 2025\n');
  process.exit(1);
}

// Configuração do banco (LOCAL)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gestaoescolar',
  user: 'postgres',
  password: 'admin123'
});

async function ativarCalendario() {
  const client = await pool.connect();
  
  try {
    console.log(`\n🔄 Ativando Calendário Letivo ${ANO_LETIVO}...\n`);

    // Verificar se existe
    const existe = await client.query(
      'SELECT id, ano_letivo, ativo FROM calendario_letivo WHERE ano_letivo = $1',
      [ANO_LETIVO]
    );

    if (existe.rows.length === 0) {
      console.log(`❌ Calendário do ano ${ANO_LETIVO} não encontrado!`);
      console.log(`\n💡 Crie o calendário primeiro usando:`);
      console.log(`   node backend/migrations/criar-calendario-ano.js ${ANO_LETIVO}\n`);
      return;
    }

    const calendario = existe.rows[0];

    if (calendario.ativo) {
      console.log(`✅ O calendário ${ANO_LETIVO} já está ativo!\n`);
      return;
    }

    // Desativar todos os outros
    await client.query('UPDATE calendario_letivo SET ativo = false');

    // Ativar o selecionado
    await client.query(
      'UPDATE calendario_letivo SET ativo = true WHERE ano_letivo = $1',
      [ANO_LETIVO]
    );

    console.log('✅ Calendário ativado com sucesso!\n');
    console.log(`📋 Calendário Letivo ${ANO_LETIVO} agora é o calendário ativo do sistema.\n`);

  } catch (error) {
    console.error('❌ Erro ao ativar calendário:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
ativarCalendario().catch(console.error);
