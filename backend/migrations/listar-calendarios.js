/**
 * Script para listar todos os calendários letivos
 * 
 * USO:
 * node backend/migrations/listar-calendarios.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco (LOCAL)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gestaoescolar',
  user: 'postgres',
  password: 'admin123'
});

async function listarCalendarios() {
  const client = await pool.connect();
  
  try {
    console.log('\n📅 CALENDÁRIOS LETIVOS CADASTRADOS\n');

    const resultado = await client.query(`
      SELECT 
        cl.*,
        (SELECT COUNT(*) FROM eventos_calendario WHERE calendario_letivo_id = cl.id) as total_eventos,
        (SELECT COUNT(*) FROM periodos_avaliativos WHERE calendario_letivo_id = cl.id) as total_periodos
      FROM calendario_letivo cl
      ORDER BY cl.ano_letivo DESC
    `);

    if (resultado.rows.length === 0) {
      console.log('❌ Nenhum calendário encontrado.\n');
      console.log('💡 Crie um calendário usando:');
      console.log('   node backend/migrations/criar-calendario-ano.js 2025\n');
      return;
    }

    resultado.rows.forEach((cal, index) => {
      const status = cal.ativo ? '🟢 ATIVO' : '⚪ Inativo';
      
      console.log(`${index + 1}. ${status} - Ano ${cal.ano_letivo}`);
      console.log(`   ID: ${cal.id}`);
      console.log(`   Período: ${new Date(cal.data_inicio).toLocaleDateString('pt-BR')} até ${new Date(cal.data_fim).toLocaleDateString('pt-BR')}`);
      console.log(`   Dias Letivos: ${cal.total_dias_letivos_obrigatorio} dias obrigatórios`);
      console.log(`   Eventos: ${cal.total_eventos} | Períodos Avaliativos: ${cal.total_periodos}`);
      console.log(`   Divisão: ${cal.divisao_ano}`);
      console.log('');
    });

    console.log(`📊 Total: ${resultado.rows.length} calendário(s)\n`);

  } catch (error) {
    console.error('❌ Erro ao listar calendários:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
listarCalendarios().catch(console.error);
