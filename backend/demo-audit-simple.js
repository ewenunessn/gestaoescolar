/**
 * Demonstração simples do sistema de auditoria
 * Insere dados diretamente no banco para demonstrar funcionalidade
 */

const db = process.env.VERCEL === '1' ? require('./dist/database-vercel') : require('./dist/database');

async function demonstrateAuditSystem() {
  try {
    console.log('🎭 Demonstração do Sistema de Auditoria Multi-Tenant');
    console.log('=' .repeat(60));

    // Testar conexão
    const testResult = await db.query('SELECT NOW() as current_time');
    console.log('✅ PostgreSQL conectado:', testResult.rows[0]);

    // 1. Inserir logs de auditoria de exemplo
    console.log('\n📝 1. Inserindo logs de auditoria...');
    
    const auditLogs = [
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        operation: 'create',
        entity_type: 'escola',
        entity_id: 'escola_demo_001',
        new_values: JSON.stringify({
          nome: 'Escola Municipal Demo',
          endereco: 'Rua da Demonstração, 123',
          telefone: '(11) 9999-0001'
        }),
        user_id: 1,
        ip_address: '192.168.1.100',
        user_agent: 'Demo Browser/1.0',
        severity: 'low',
        category: 'data_access'
      },
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        operation: 'update',
        entity_type: 'produto',
        entity_id: 'produto_demo_002',
        old_values: JSON.stringify({ nome: 'Arroz', preco: 5.00 }),
        new_values: JSON.stringify({ nome: 'Arroz Premium', preco: 6.50 }),
        user_id: 2,
        ip_address: '192.168.1.101',
        user_agent: 'Demo Browser/1.0',
        severity: 'medium',
        category: 'data_access'
      },
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        operation: 'delete',
        entity_type: 'contrato',
        entity_id: 'contrato_demo_003',
        old_values: JSON.stringify({ numero: 'DEMO-001', valor: 10000.00 }),
        user_id: 1,
        ip_address: '192.168.1.100',
        user_agent: 'Demo Browser/1.0',
        severity: 'high',
        category: 'data_access'
      }
    ];

    for (const log of auditLogs) {
      await db.query(`
        INSERT INTO tenant_audit_log (
          tenant_id, operation, entity_type, entity_id, 
          old_values, new_values, user_id, ip_address, 
          user_agent, severity, category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        log.tenant_id, log.operation, log.entity_type, log.entity_id,
        log.old_values || null, log.new_values || null, log.user_id,
        log.ip_address, log.user_agent, log.severity, log.category
      ]);
    }
    console.log(`  ✓ ${auditLogs.length} logs de auditoria inseridos`);

    // 2. Inserir eventos de segurança
    console.log('\n🔒 2. Inserindo eventos de segurança...');
    
    const securityEvents = [
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        event_type: 'unauthorized_access',
        user_id: 3,
        ip_address: '192.168.1.200',
        user_agent: 'Suspicious Bot/1.0',
        severity: 'medium',
        details: JSON.stringify({
          endpoint: '/api/admin/users',
          method: 'GET',
          statusCode: 401,
          reason: 'Invalid JWT token'
        })
      },
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        event_type: 'cross_tenant_access',
        user_id: 2,
        ip_address: '192.168.1.101',
        user_agent: 'Demo Browser/1.0',
        severity: 'high',
        details: JSON.stringify({
          attemptedTenant: 'other-tenant-id',
          endpoint: '/api/escolas',
          method: 'GET',
          statusCode: 403
        })
      },
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        event_type: 'suspicious_activity',
        ip_address: '192.168.1.200',
        user_agent: 'Attack Bot/2.0',
        severity: 'critical',
        details: JSON.stringify({
          description: 'Multiple failed login attempts',
          attempts: 25,
          timeWindow: '5 minutes'
        })
      }
    ];

    for (const event of securityEvents) {
      await db.query(`
        INSERT INTO tenant_security_events (
          tenant_id, event_type, user_id, ip_address, 
          user_agent, severity, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        event.tenant_id, event.event_type, event.user_id || null,
        event.ip_address, event.user_agent, event.severity, event.details
      ]);
    }
    console.log(`  ✓ ${securityEvents.length} eventos de segurança inseridos`);

    // 3. Inserir métricas de uso
    console.log('\n📊 3. Inserindo métricas de uso...');
    
    const usageMetrics = [
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        period: '2025-11-01',
        api_calls: 1500,
        data_operations: 600,
        storage_used: 3145728, // 3MB
        active_users: 20,
        error_count: 12,
        security_events: 3
      },
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        period: '2025-10-31',
        api_calls: 1200,
        data_operations: 480,
        storage_used: 2097152, // 2MB
        active_users: 18,
        error_count: 8,
        security_events: 1
      }
    ];

    for (const metrics of usageMetrics) {
      await db.query(`
        INSERT INTO tenant_usage_metrics (
          tenant_id, period, api_calls, data_operations,
          storage_used, active_users, error_count, security_events
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tenant_id, period) DO UPDATE SET
          api_calls = EXCLUDED.api_calls,
          data_operations = EXCLUDED.data_operations,
          storage_used = EXCLUDED.storage_used,
          active_users = EXCLUDED.active_users,
          error_count = EXCLUDED.error_count,
          security_events = EXCLUDED.security_events
      `, [
        metrics.tenant_id, metrics.period, metrics.api_calls,
        metrics.data_operations, metrics.storage_used, metrics.active_users,
        metrics.error_count, metrics.security_events
      ]);
    }
    console.log(`  ✓ ${usageMetrics.length} registros de métricas inseridos`);

    // 4. Inserir alertas
    console.log('\n🚨 4. Inserindo alertas...');
    
    const alerts = [
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        alert_type: 'limit_violation',
        severity: 'warning',
        message: 'Limite de API calls se aproximando',
        details: JSON.stringify({
          current: 1500,
          limit: 2000,
          percentage: 75
        })
      },
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        alert_type: 'security',
        severity: 'critical',
        message: 'Múltiplas tentativas de acesso suspeitas',
        details: JSON.stringify({
          ipAddress: '192.168.1.200',
          attempts: 25,
          timeWindow: '5 minutes',
          action: 'IP bloqueado temporariamente'
        })
      },
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        alert_type: 'performance',
        severity: 'medium',
        message: 'Tempo de resposta elevado detectado',
        details: JSON.stringify({
          averageResponseTime: 1800,
          threshold: 1000,
          endpoint: '/api/produtos',
          period: 'última hora'
        })
      }
    ];

    for (const alert of alerts) {
      await db.query(`
        INSERT INTO tenant_alerts (
          tenant_id, alert_type, severity, message, details
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        alert.tenant_id, alert.alert_type, alert.severity,
        alert.message, alert.details
      ]);
    }
    console.log(`  ✓ ${alerts.length} alertas inseridos`);

    // 5. Inserir métricas de performance
    console.log('\n⚡ 5. Inserindo métricas de performance...');
    
    const performanceMetrics = [
      { endpoint: '/api/escolas', method: 'GET', response_time: 150, status_code: 200 },
      { endpoint: '/api/produtos', method: 'GET', response_time: 1200, status_code: 200 },
      { endpoint: '/api/contratos', method: 'POST', response_time: 800, status_code: 201 },
      { endpoint: '/api/usuarios', method: 'PUT', response_time: 600, status_code: 200 },
      { endpoint: '/api/admin/users', method: 'GET', response_time: 50, status_code: 401 }
    ];

    for (const metric of performanceMetrics) {
      await db.query(`
        INSERT INTO tenant_performance_metrics (
          tenant_id, endpoint, method, response_time, status_code
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        '00000000-0000-0000-0000-000000000000',
        metric.endpoint, metric.method, metric.response_time, metric.status_code
      ]);
    }
    console.log(`  ✓ ${performanceMetrics.length} métricas de performance inseridas`);

    // 6. Gerar relatórios
    console.log('\n📈 6. Gerando relatórios...');

    // Relatório de auditoria
    const auditReport = await db.query(`
      SELECT 
        operation,
        entity_type,
        severity,
        COUNT(*) as count
      FROM tenant_audit_log 
      WHERE tenant_id = $1
      GROUP BY operation, entity_type, severity
      ORDER BY count DESC
    `, ['00000000-0000-0000-0000-000000000000']);

    console.log('  📋 Relatório de Auditoria:');
    auditReport.rows.forEach(row => {
      console.log(`    ${row.operation} ${row.entity_type} (${row.severity}): ${row.count} ocorrências`);
    });

    // Relatório de segurança
    const securityReport = await db.query(`
      SELECT 
        event_type,
        severity,
        COUNT(*) as count
      FROM tenant_security_events 
      WHERE tenant_id = $1
      GROUP BY event_type, severity
      ORDER BY count DESC
    `, ['00000000-0000-0000-0000-000000000000']);

    console.log('  🔒 Relatório de Segurança:');
    securityReport.rows.forEach(row => {
      console.log(`    ${row.event_type} (${row.severity}): ${row.count} eventos`);
    });

    // Relatório de performance
    const performanceReport = await db.query(`
      SELECT 
        endpoint,
        method,
        AVG(response_time) as avg_time,
        MAX(response_time) as max_time,
        COUNT(*) as requests
      FROM tenant_performance_metrics 
      WHERE tenant_id = $1
      GROUP BY endpoint, method
      ORDER BY avg_time DESC
    `, ['00000000-0000-0000-0000-000000000000']);

    console.log('  ⚡ Relatório de Performance:');
    performanceReport.rows.forEach(row => {
      console.log(`    ${row.method} ${row.endpoint}: ${Math.round(row.avg_time)}ms avg (${row.max_time}ms max) - ${row.requests} requests`);
    });

    // Relatório de alertas
    const alertsReport = await db.query(`
      SELECT 
        alert_type,
        severity,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged
      FROM tenant_alerts 
      WHERE tenant_id = $1
      GROUP BY alert_type, severity
      ORDER BY count DESC
    `, ['00000000-0000-0000-0000-000000000000']);

    console.log('  🚨 Relatório de Alertas:');
    alertsReport.rows.forEach(row => {
      console.log(`    ${row.alert_type} (${row.severity}): ${row.count} total, ${row.unacknowledged} não reconhecidos`);
    });

    // 7. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('');
    console.log('📊 Dados inseridos:');
    console.log(`  ✓ ${auditLogs.length} logs de auditoria`);
    console.log(`  ✓ ${securityEvents.length} eventos de segurança`);
    console.log(`  ✓ ${usageMetrics.length} registros de métricas de uso`);
    console.log(`  ✓ ${alerts.length} alertas`);
    console.log(`  ✓ ${performanceMetrics.length} métricas de performance`);
    console.log('');
    console.log('🔍 Para visualizar os dados:');
    console.log('  - Logs: SELECT * FROM tenant_audit_log ORDER BY created_at DESC;');
    console.log('  - Segurança: SELECT * FROM tenant_security_events ORDER BY created_at DESC;');
    console.log('  - Métricas: SELECT * FROM tenant_usage_metrics ORDER BY period DESC;');
    console.log('  - Alertas: SELECT * FROM tenant_alerts ORDER BY created_at DESC;');
    console.log('  - Performance: SELECT * FROM tenant_performance_metrics ORDER BY created_at DESC;');
    console.log('');
    console.log('🌐 APIs disponíveis (após iniciar o servidor):');
    console.log('  - GET /api/audit/logs');
    console.log('  - GET /api/audit/security-events');
    console.log('  - GET /api/audit/usage-metrics?startDate=2025-10-31&endDate=2025-11-01');
    console.log('  - GET /api/audit/alerts');
    console.log('  - GET /api/audit/limit-violations');
    console.log('');
    console.log('📋 Headers necessários para as APIs:');
    console.log('  - X-Tenant-ID: 00000000-0000-0000-0000-000000000000');
    console.log('  - Content-Type: application/json');

  } catch (error) {
    console.error('❌ Erro na demonstração:', error.message);
    console.error('\nDetalhes do erro:');
    console.error(error);
    process.exit(1);
  }
}

// Executar demonstração
demonstrateAuditSystem();