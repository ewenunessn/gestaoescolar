/**
 * Script para criar calendário letivo de um ano específico
 * 
 * USO:
 * node backend/migrations/criar-calendario-ano.js 2025
 * 
 * Ou edite a variável ANO_LETIVO abaixo e execute:
 * node backend/migrations/criar-calendario-ano.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// ===== CONFIGURAÇÃO =====
const ANO_LETIVO = process.argv[2] || 2025; // Ano via argumento ou padrão 2025

// Configuração do banco (LOCAL)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gestaoescolar',
  user: 'postgres',
  password: 'admin123'
});

async function criarCalendarioLetivo() {
  const client = await pool.connect();
  
  try {
    console.log(`\n🗓️  Criando Calendário Letivo ${ANO_LETIVO}...\n`);

    // Verificar se já existe
    const existe = await client.query(
      'SELECT id, ano_letivo FROM calendario_letivo WHERE ano_letivo = $1',
      [ANO_LETIVO]
    );

    if (existe.rows.length > 0) {
      console.log(`⚠️  Já existe um calendário para o ano ${ANO_LETIVO}!`);
      console.log(`   ID: ${existe.rows[0].id}`);
      console.log(`\n❌ Operação cancelada. Delete o calendário existente primeiro se quiser recriar.\n`);
      return;
    }

    // Criar calendário
    const dataInicio = `${ANO_LETIVO}-02-01`;
    const dataFim = `${ANO_LETIVO}-12-20`;

    const resultado = await client.query(`
      INSERT INTO calendario_letivo (
        ano_letivo,
        data_inicio,
        data_fim,
        total_dias_letivos_obrigatorio,
        divisao_ano,
        dias_semana_letivos,
        ativo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      ANO_LETIVO,
      dataInicio,
      dataFim,
      200, // Dias letivos obrigatórios
      'bimestral',
      JSON.stringify(['seg', 'ter', 'qua', 'qui', 'sex']),
      false // Não ativar automaticamente
    ]);

    const calendario = resultado.rows[0];

    console.log('✅ Calendário criado com sucesso!\n');
    console.log('📋 Detalhes:');
    console.log(`   ID: ${calendario.id}`);
    console.log(`   Ano Letivo: ${calendario.ano_letivo}`);
    console.log(`   Período: ${new Date(calendario.data_inicio).toLocaleDateString('pt-BR')} até ${new Date(calendario.data_fim).toLocaleDateString('pt-BR')}`);
    console.log(`   Dias Letivos Obrigatórios: ${calendario.total_dias_letivos_obrigatorio}`);
    console.log(`   Divisão: ${calendario.divisao_ano}`);
    console.log(`   Ativo: ${calendario.ativo ? 'Sim' : 'Não'}`);

    console.log('\n📝 Próximos passos:');
    console.log('   1. Acesse o sistema e vá em Configurações → Calendário Letivo');
    console.log('   2. Adicione os eventos do ano (feriados, recessos, etc.)');
    console.log('   3. Se quiser ativar este calendário, use o script ativar-calendario.js');
    console.log('   4. Ou importe feriados automaticamente pelo menu do sistema\n');

  } catch (error) {
    console.error('❌ Erro ao criar calendário:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
criarCalendarioLetivo().catch(console.error);
