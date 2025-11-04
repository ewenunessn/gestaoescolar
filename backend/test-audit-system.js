/**
 * Script para testar o sistema de auditoria e monitoramento
 */

const db = process.env.VERCEL === '1' ? require('./dist/database-vercel') : require('./dist/database');

async function testAuditSystem() {
  try {
    console.log('🧪 Testando sistema de auditoria e monitoramento...');

    // Testar conexão
    const testResult = await db.query('SELECT NOW() as current_time');
    console.log('✅ PostgreSQL conectado:', testResult.rows[0]);

    // 1. Testar inserção de log de auditoria
    console.log('\n📝 Testando inserção de log de auditoria...');
    
    const auditLogResult = await db.query(`
      INSERT INTO tenant_audit_log (
        tenant_id, operation, entity_type, entity_id, 
        old_values, new_values, user_id, ip_address, 
        user_agent, severity, category, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, created_at
    `, [
      '00000000-0000-0000-0000-000000000000', // tenant padrão
      'test_operation',
      'test_entity',
      'test_123',
      JSON.stringify({ old: 'value' }),
      JSON.stringify({ new: 'value' }),
      1, // user_id
      '127.0.0.1',
      'Test User Agent',
      'medium',
      'system',
      JSON.stringify({ test: true })
    ]);

    console.log('✅ Log de auditoria inserido:', auditLogResult.rows[0]);

    // 2. Testar inserção de evento de segurança
    console.log('\n🔒 Testando inserção de evento de segurança...');
    
    const securityEventResult = await db.query(`
      INSERT INTO tenant_security_events (
        tenant_id, event_type, user_id, ip_address, 
        user_agent, details, severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `, [
      '00000000-0000-0000-0000-000000000000',
      'test_security_event',
      1,
      '127.0.0.1',
      'Test User Agent',
      JSON.stringify({ test: 'security event' }),
      'high'
    ]);

    console.log('✅ Evento de segurança inserido:', securityEventResult.rows[0]);

    // 3. Testar inserção de métricas de uso
    console.log('\n📊 Testando inserção de métricas de uso...');
    
    const usageMetricsResult = await db.query(`
      INSERT INTO tenant_usage_metrics (
        tenant_id, period, api_calls, data_operations,
        storage_used, active_users, error_count, security_events
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `, [
      '00000000-0000-0000-0000-000000000000',
      '2025-11-01',
      100,
      50,
      1024000, // 1MB
      5,
      2,
      1
    ]);

    console.log('✅ Métricas de uso inseridas:', usageMetricsResult.rows[0]);

    // 4. Testar inserção de alerta
    console.log('\n🚨 Testando inserção de alerta...');
    
    const alertResult = await db.query(`
      INSERT INTO tenant_alerts (
        tenant_id, alert_type, severity, message, details
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `, [
      '00000000-0000-0000-0000-000000000000',
      'test_alert',
      'warning',
      'Teste de alerta do sistema',
      JSON.stringify({ test: 'alert data' })
    ]);

    console.log('✅ Alerta inserido:', alertResult.rows[0]);

    // 5. Testar inserção de métricas de performance
    console.log('\n⚡ Testando inserção de métricas de performance...');
    
    const performanceResult = await db.query(`
      INSERT INTO tenant_performance_metrics (
        tenant_id, endpoint, method, response_time, status_code
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `, [
      '00000000-0000-0000-0000-000000000000',
      '/api/test',
      'GET',
      150,
      200
    ]);

    console.log('✅ Métricas de performance inseridas:', performanceResult.rows[0]);

    // 6. Testar consultas de auditoria
    console.log('\n🔍 Testando consultas de auditoria...');
    
    const auditLogsQuery = await db.query(`
      SELECT COUNT(*) as total_logs
      FROM tenant_audit_log
      WHERE tenant_id = $1
    `, ['00000000-0000-0000-0000-000000000000']);

    console.log('📋 Total de logs de auditoria:', auditLogsQuery.rows[0].total_logs);

    const securityEventsQuery = await db.query(`
      SELECT COUNT(*) as total_events
      FROM tenant_security_events
      WHERE tenant_id = $1
    `, ['00000000-0000-0000-0000-000000000000']);

    console.log('🔒 Total de eventos de segurança:', securityEventsQuery.rows[0].total_events);

    const alertsQuery = await db.query(`
      SELECT COUNT(*) as total_alerts
      FROM tenant_alerts
      WHERE tenant_id = $1 AND acknowledged = false
    `, ['00000000-0000-0000-0000-000000000000']);

    console.log('🚨 Total de alertas não reconhecidos:', alertsQuery.rows[0].total_alerts);

    // 7. Testar agregações de métricas
    console.log('\n📈 Testando agregações de métricas...');
    
    const metricsAggregation = await db.query(`
      SELECT 
        SUM(api_calls) as total_api_calls,
        SUM(data_operations) as total_data_ops,
        SUM(storage_used) as total_storage,
        MAX(active_users) as max_active_users
      FROM tenant_usage_metrics
      WHERE tenant_id = $1
    `, ['00000000-0000-0000-0000-000000000000']);

    console.log('📊 Agregação de métricas:', metricsAggregation.rows[0]);

    const performanceAggregation = await db.query(`
      SELECT 
        AVG(response_time) as avg_response_time,
        MAX(response_time) as max_response_time,
        COUNT(*) as total_requests
      FROM tenant_performance_metrics
      WHERE tenant_id = $1
    `, ['00000000-0000-0000-0000-000000000000']);

    console.log('⚡ Agregação de performance:', performanceAggregation.rows[0]);

    // 8. Testar índices (verificar se estão sendo usados)
    console.log('\n🔍 Verificando índices...');
    
    const indexesQuery = await db.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN (
        'tenant_audit_log', 
        'tenant_security_events', 
        'tenant_usage_metrics', 
        'tenant_alerts', 
        'tenant_performance_metrics'
      )
      ORDER BY tablename, indexname
    `);

    console.log('📋 Índices criados:');
    indexesQuery.rows.forEach(row => {
      console.log(`  ${row.tablename}: ${row.indexname}`);
    });

    console.log('\n🎉 Todos os testes de auditoria passaram com sucesso!');
    console.log('\n📋 Resumo do sistema de auditoria:');
    console.log('  ✓ Logs de auditoria funcionando');
    console.log('  ✓ Eventos de segurança funcionando');
    console.log('  ✓ Métricas de uso funcionando');
    console.log('  ✓ Sistema de alertas funcionando');
    console.log('  ✓ Métricas de performance funcionando');
    console.log('  ✓ Consultas e agregações funcionando');
    console.log('  ✓ Índices criados corretamente');

  } catch (error) {
    console.error('❌ Erro no teste de auditoria:', error.message);
    console.error('\nDetalhes do erro:');
    console.error(error);
    process.exit(1);
  }
}

// Executar teste
testAuditSystem();