/**
 * Script para aplicar a migration do Calendário Letivo
 * 
 * Execução:
 * node backend/migrations/aplicar-calendario-letivo.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

// Criar cliente PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function aplicarMigration() {
  console.log('🔧 Aplicando migration do Calendário Letivo...\n');

  try {
    // Conectar ao banco
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '20260317_create_calendario_letivo.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Verificar se as tabelas já existem
    const tabelasExistentes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'calendario_letivo',
        'eventos_calendario',
        'periodos_avaliativos',
        'dias_letivos_excecoes'
      )
    `);

    if (tabelasExistentes.rows.length > 0) {
      console.log('⚠️  Algumas tabelas já existem:');
      tabelasExistentes.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      console.log('\n❓ Deseja recriar as tabelas? (Isso apagará todos os dados)');
      console.log('   Para continuar, execute: DROP TABLE IF EXISTS calendario_letivo, eventos_calendario, periodos_avaliativos, dias_letivos_excecoes CASCADE;');
      console.log('   Depois execute este script novamente.\n');
      
      // Apenas mostrar informações das tabelas existentes
      for (const row of tabelasExistentes.rows) {
        const count = await client.query(`SELECT COUNT(*) as total FROM ${row.table_name}`);
        console.log(`   ${row.table_name}: ${count.rows[0].total} registros`);
      }
      
      await client.end();
      process.exit(0);
    }

    // Executar migration
    console.log('📝 Executando SQL...');
    await client.query(sql);

    console.log('\n✅ Migration aplicada com sucesso!\n');

    // Verificar tabelas criadas
    const tabelas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'calendario_letivo',
        'eventos_calendario',
        'periodos_avaliativos',
        'dias_letivos_excecoes'
      )
      ORDER BY table_name
    `);

    console.log('📊 Tabelas criadas:');
    tabelas.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Criar um calendário de exemplo para 2024
    console.log('\n📅 Criando calendário letivo de exemplo para 2024...');
    
    const calendarioExemplo = await client.query(`
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

    console.log('   ✓ Calendário 2024 criado (ID:', calendarioExemplo.rows[0].id, ')');

    // Criar alguns eventos de exemplo
    const calendarioId = calendarioExemplo.rows[0].id;
    
    await client.query(`
      INSERT INTO eventos_calendario (
        calendario_letivo_id,
        tipo_evento,
        titulo,
        descricao,
        data_inicio,
        data_fim,
        dia_letivo,
        cor
      ) VALUES 
      (${calendarioId}, 'feriado_nacional', 'Carnaval', 'Feriado Nacional', '2024-02-13', '2024-02-14', false, '#dc3545'),
      (${calendarioId}, 'feriado_nacional', 'Sexta-feira Santa', 'Feriado Nacional', '2024-03-29', '2024-03-29', false, '#dc3545'),
      (${calendarioId}, 'feriado_nacional', 'Tiradentes', 'Feriado Nacional', '2024-04-21', '2024-04-21', false, '#dc3545'),
      (${calendarioId}, 'feriado_nacional', 'Dia do Trabalho', 'Feriado Nacional', '2024-05-01', '2024-05-01', false, '#dc3545'),
      (${calendarioId}, 'feriado_nacional', 'Independência do Brasil', 'Feriado Nacional', '2024-09-07', '2024-09-07', false, '#dc3545'),
      (${calendarioId}, 'feriado_nacional', 'Nossa Senhora Aparecida', 'Feriado Nacional', '2024-10-12', '2024-10-12', false, '#dc3545'),
      (${calendarioId}, 'feriado_nacional', 'Finados', 'Feriado Nacional', '2024-11-02', '2024-11-02', false, '#dc3545'),
      (${calendarioId}, 'feriado_nacional', 'Proclamação da República', 'Feriado Nacional', '2024-11-15', '2024-11-15', false, '#dc3545'),
      (${calendarioId}, 'feriado_nacional', 'Natal', 'Feriado Nacional', '2024-12-25', '2024-12-25', false, '#dc3545'),
      (${calendarioId}, 'recesso', 'Recesso Escolar de Julho', 'Recesso de Inverno', '2024-07-15', '2024-07-31', false, '#ffc107'),
      (${calendarioId}, 'evento_escolar', 'Início do Ano Letivo', 'Primeiro dia de aula', '2024-02-05', '2024-02-05', true, '#007bff')
    `);

    console.log('   ✓ Eventos de exemplo criados');

    // Criar períodos avaliativos (bimestres)
    await client.query(`
      INSERT INTO periodos_avaliativos (
        calendario_letivo_id,
        tipo_periodo,
        numero_periodo,
        data_inicio,
        data_fim
      ) VALUES 
      (${calendarioId}, 'bimestre', 1, '2024-02-05', '2024-04-30'),
      (${calendarioId}, 'bimestre', 2, '2024-05-01', '2024-07-14'),
      (${calendarioId}, 'bimestre', 3, '2024-08-01', '2024-09-30'),
      (${calendarioId}, 'bimestre', 4, '2024-10-01', '2024-12-20')
    `);

    console.log('   ✓ Períodos avaliativos (bimestres) criados');

    console.log('\n🎉 Configuração inicial concluída!');
    console.log('\n📌 Próximos passos:');
    console.log('   1. Acesse /calendario-letivo no sistema');
    console.log('   2. Ajuste as datas conforme necessário');
    console.log('   3. Adicione eventos específicos da sua instituição');
    console.log('   4. Configure exceções de dias letivos se necessário\n');

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migration:', error);
    console.error('\nDetalhes:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

aplicarMigration();
