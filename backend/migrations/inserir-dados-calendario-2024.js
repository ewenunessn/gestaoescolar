/**
 * Script para inserir dados de exemplo no Calendário Letivo 2024
 */

const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function inserirDados() {
  console.log('📅 Inserindo dados de exemplo no Calendário Letivo 2024...\n');

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Verificar se já existe calendário 2024
    const calendarioExistente = await client.query(`
      SELECT * FROM calendario_letivo WHERE ano_letivo = 2024
    `);

    let calendarioId;

    if (calendarioExistente.rows.length > 0) {
      console.log('⚠️  Calendário 2024 já existe (ID:', calendarioExistente.rows[0].id, ')');
      calendarioId = calendarioExistente.rows[0].id;
    } else {
      // Criar calendário 2024
      const resultado = await client.query(`
        INSERT INTO calendario_letivo (
          ano_letivo,
          data_inicio,
          data_fim,
          total_dias_letivos_obrigatorio,
          ativo
        ) VALUES (
          2024,
          '2024-02-05',
          '2024-12-20',
          200,
          true
        )
        RETURNING *
      `);
      calendarioId = resultado.rows[0].id;
      console.log('✅ Calendário 2024 criado (ID:', calendarioId, ')');
    }

    // Verificar eventos existentes
    const eventosExistentes = await client.query(`
      SELECT COUNT(*) as total FROM eventos_calendario 
      WHERE calendario_letivo_id = $1
    `, [calendarioId]);

    if (parseInt(eventosExistentes.rows[0].total) > 0) {
      console.log('\n⚠️  Já existem', eventosExistentes.rows[0].total, 'eventos para este calendário');
      console.log('   Pulando inserção de eventos...\n');
    } else {
      // Inserir eventos
      await client.query(`
        INSERT INTO eventos_calendario (
          calendario_letivo_id,
          tipo_evento,
          titulo,
          descricao,
          data_inicio,
          data_fim,
          cor
        ) VALUES 
        ($1, 'feriado_nacional', 'Carnaval', 'Feriado Nacional', '2024-02-13', '2024-02-14', '#dc3545'),
        ($1, 'feriado_nacional', 'Sexta-feira Santa', 'Feriado Nacional', '2024-03-29', '2024-03-29', '#dc3545'),
        ($1, 'feriado_nacional', 'Tiradentes', 'Feriado Nacional', '2024-04-21', '2024-04-21', '#dc3545'),
        ($1, 'feriado_nacional', 'Dia do Trabalho', 'Feriado Nacional', '2024-05-01', '2024-05-01', '#dc3545'),
        ($1, 'feriado_nacional', 'Independência do Brasil', 'Feriado Nacional', '2024-09-07', '2024-09-07', '#dc3545'),
        ($1, 'feriado_nacional', 'Nossa Senhora Aparecida', 'Feriado Nacional', '2024-10-12', '2024-10-12', '#dc3545'),
        ($1, 'feriado_nacional', 'Finados', 'Feriado Nacional', '2024-11-02', '2024-11-02', '#dc3545'),
        ($1, 'feriado_nacional', 'Proclamação da República', 'Feriado Nacional', '2024-11-15', '2024-11-15', '#dc3545'),
        ($1, 'feriado_nacional', 'Natal', 'Feriado Nacional', '2024-12-25', '2024-12-25', '#dc3545'),
        ($1, 'recesso', 'Recesso Escolar de Julho', 'Recesso de Inverno', '2024-07-15', '2024-07-31', '#ffc107'),
        ($1, 'evento_escolar', 'Início do Ano Letivo', 'Primeiro dia de aula', '2024-02-05', '2024-02-05', '#007bff')
      `, [calendarioId]);

      console.log('✅ 11 eventos criados');
    }

    // Verificar períodos existentes
    const periodosExistentes = await client.query(`
      SELECT COUNT(*) as total FROM periodos_avaliativos 
      WHERE calendario_letivo_id = $1
    `, [calendarioId]);

    if (parseInt(periodosExistentes.rows[0].total) > 0) {
      console.log('⚠️  Já existem', periodosExistentes.rows[0].total, 'períodos para este calendário');
      console.log('   Pulando inserção de períodos...\n');
    } else {
      // Inserir períodos avaliativos
      await client.query(`
        INSERT INTO periodos_avaliativos (
          calendario_letivo_id,
          nome,
          numero_periodo,
          data_inicio,
          data_fim
        ) VALUES 
        ($1, '1º Bimestre', 1, '2024-02-05', '2024-04-30'),
        ($1, '2º Bimestre', 2, '2024-05-01', '2024-07-14'),
        ($1, '3º Bimestre', 3, '2024-08-01', '2024-09-30'),
        ($1, '4º Bimestre', 4, '2024-10-01', '2024-12-20')
      `, [calendarioId]);

      console.log('✅ 4 períodos avaliativos (bimestres) criados');
    }

    console.log('\n🎉 Dados inseridos com sucesso!');
    console.log('\n📌 Acesse /calendario-letivo no sistema para visualizar\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

inserirDados();
