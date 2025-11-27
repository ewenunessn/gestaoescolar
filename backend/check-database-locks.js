const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function checkLocks() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco\n');
    
    // Verificar locks ativos
    console.log('🔍 Verificando locks ativos...\n');
    const locks = await client.query(`
      SELECT 
        l.pid,
        l.mode,
        l.granted,
        l.relation::regclass as table_name,
        a.query,
        a.state,
        a.wait_event_type,
        a.wait_event,
        now() - a.query_start as duration
      FROM pg_locks l
      LEFT JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE l.relation IS NOT NULL
        AND a.datname = 'alimentacao_escolar'
      ORDER BY duration DESC
      LIMIT 20
    `);
    
    if (locks.rows.length > 0) {
      console.log(`⚠️  ${locks.rows.length} locks encontrados:\n`);
      locks.rows.forEach(lock => {
        console.log(`  PID: ${lock.pid}`);
        console.log(`  Tabela: ${lock.table_name}`);
        console.log(`  Modo: ${lock.mode}`);
        console.log(`  Concedido: ${lock.granted}`);
        console.log(`  Estado: ${lock.state}`);
        console.log(`  Duração: ${lock.duration}`);
        console.log(`  Query: ${lock.query?.substring(0, 100)}...`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhum lock ativo\n');
    }
    
    // Verificar queries lentas
    console.log('🔍 Verificando queries ativas...\n');
    const queries = await client.query(`
      SELECT 
        pid,
        usename,
        application_name,
        state,
        wait_event_type,
        wait_event,
        now() - query_start as duration,
        query
      FROM pg_stat_activity
      WHERE datname = 'alimentacao_escolar'
        AND state != 'idle'
        AND pid != pg_backend_pid()
      ORDER BY duration DESC
    `);
    
    if (queries.rows.length > 0) {
      console.log(`⚠️  ${queries.rows.length} queries ativas:\n`);
      queries.rows.forEach(q => {
        console.log(`  PID: ${q.pid}`);
        console.log(`  Usuário: ${q.usename}`);
        console.log(`  App: ${q.application_name}`);
        console.log(`  Estado: ${q.state}`);
        console.log(`  Wait: ${q.wait_event_type} - ${q.wait_event}`);
        console.log(`  Duração: ${q.duration}`);
        console.log(`  Query: ${q.query?.substring(0, 150)}...`);
        console.log('');
      });
    } else {
      console.log('✅ Nenhuma query ativa\n');
    }
    
    // Verificar configuração RLS
    console.log('🔍 Verificando RLS na tabela demandas...\n');
    const rls = await client.query(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables
      WHERE tablename = 'demandas'
    `);
    
    if (rls.rows.length > 0) {
      console.log('Configuração RLS:');
      console.log(rls.rows[0]);
      console.log('');
    }
    
    // Verificar políticas RLS
    const policies = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE tablename = 'demandas'
    `);
    
    if (policies.rows.length > 0) {
      console.log('Políticas RLS:');
      policies.rows.forEach(p => {
        console.log(`  - ${p.policyname}`);
        console.log(`    Comando: ${p.cmd}`);
        console.log(`    Roles: ${p.roles}`);
        console.log(`    Condição: ${p.qual}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkLocks();
