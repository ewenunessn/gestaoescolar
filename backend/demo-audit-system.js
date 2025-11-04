/**
 * Demonstração do sistema de auditoria em funcionamento
 * Este script simula operações que serão auditadas automaticamente
 */

const { tenantAuditService } = require('./dist/services/tenantAuditService');
const { tenantMonitoringService } = require('./dist/services/tenantMonitoringService');

async function demonstrateAuditSystem() {
  try {
    console.log('🎭 Demonstração do Sistema de Auditoria Multi-Tenant');
    console.log('=' .repeat(60));

    // 1. Simular operações de auditoria
    console.log('\n📝 1. Simulando operações auditadas...');
    
    // Operação de criação de escola
    await tenantAuditService.logAuditEvent({
      tenantId: '00000000-0000-0000-0000-000000000000',
      operation: 'create',
      entityType: 'escola',
      entityId: 'escola_123',
      newValues: {
        nome: 'Escola Municipal João Silva',
        endereco: 'Rua das Flores, 123',
        telefone: '(11) 1234-5678'
      },
      userId: 1,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Demo Browser)',
      severity: 'low',
      category: 'data_access'
    });
    console.log('  ✓ Criação de escola auditada');

    // Operação de atualização de produto
    await tenantAuditService.logAuditEvent({
      tenantId: '00000000-0000-0000-0000-000000000000',
      operation: 'update',
      entityType: 'produto',
      entityId: 'produto_456',
      oldValues: {
        nome: 'Arroz Branco',
        preco: 5.50
      },
      newValues: {
        nome: 'Arroz Branco Premium',
        preco: 6.00
      },
      userId: 2,
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Demo Browser)',
      severity: 'medium',
      category: 'data_access'
    });
    console.log('  ✓ Atualização de produto auditada');

    // Operação de exclusão de contrato
    await tenantAuditService.logAuditEvent({
      tenantId: '00000000-0000-0000-0000-000000000000',
      operation: 'delete',
      entityType: 'contrato',
      entityId: 'contrato_789',
      oldValues: {
        numero: 'CONT-2025-001',
        fornecedor: 'Fornecedor ABC',
        valor: 50000.00
      },
      userId: 1,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Demo Browser)',
      severity: 'high',
      category: 'data_access'
    });
    console.log('  ✓ Exclusão de contrato auditada');

    // 2. Simular eventos de segurança
    console.log('\n🔒 2. Simulando eventos de segurança...');

    // Tentativa de acesso não autorizado
    await tenantAuditService.logSecurityEvent({
      type: 'unauthorized_access',
      tenantId: '00000000-0000-0000-0000-000000000000',
      userId: 3,
      severity: 'medium',
      ipAddress: '192.168.1.200',
      userAgent: 'Suspicious Bot/1.0',
      details: {
        endpoint: '/api/admin/users',
        method: 'GET',
        statusCode: 401,
        reason: 'Invalid JWT token'
      }
    });
    console.log('  ✓ Tentativa de acesso não autorizado registrada');

    // Tentativa de acesso cross-tenant
    await tenantAuditService.logSecurityEvent({
      type: 'cross_tenant_access',
      tenantId: '00000000-0000-0000-0000-000000000000',
      userId: 2,
      severity: 'high',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Demo Browser)',
      details: {
        attemptedTenant: 'other-tenant-id',
        endpoint: '/api/escolas',
        method: 'GET',
        statusCode: 403,
        reason: 'User does not belong to requested tenant'
      }
    });
    console.log('  ✓ Tentativa de acesso cross-tenant registrada');

    // Atividade suspeita
    await tenantAuditService.logSecurityEvent({
      type: 'suspicious_activity',
      tenantId: '00000000-0000-0000-0000-000000000000',
      severity: 'critical',
      ipAddress: '192.168.1.200',
      userAgent: 'Suspicious Bot/1.0',
      details: {
        description: 'Multiple failed login attempts',
        attempts: 15,
        timeWindow: '5 minutes',
        endpoints: ['/api/auth/login', '/api/usuarios/login']
      }
    });
    console.log('  ✓ Atividade suspeita registrada');

    // 3. Simular métricas de uso
    console.log('\n📊 3. Simulando métricas de uso...');

    await tenantAuditService.logUsageMetrics({
      tenantId: '00000000-0000-0000-0000-000000000000',
      period: '2025-11-01',
      apiCalls: 1250,
      dataOperations: 450,
      storageUsed: 2048000, // 2MB
      activeUsers: 15,
      errorCount: 8,
      securityEvents: 3
    });
    console.log('  ✓ Métricas diárias registradas');

    // 4. Verificar limites do tenant
    console.log('\n⚠️ 4. Verificando limites do tenant...');

    const limitCheck = await tenantAuditService.checkTenantLimits('00000000-0000-0000-0000-000000000000');
    console.log('  📋 Violações encontradas:', limitCheck.violations.length);
    
    if (limitCheck.violations.length > 0) {
      limitCheck.violations.forEach(violation => {
        console.log(`    ⚠️ ${violation.type}: ${violation.current}/${violation.limit} (${violation.severity})`);
      });
    } else {
      console.log('  ✅ Nenhuma violação de limite encontrada');
    }

    // 5. Criar alguns alertas
    console.log('\n🚨 5. Criando alertas de monitoramento...');

    await tenantMonitoringService.createAlert({
      tenantId: '00000000-0000-0000-0000-000000000000',
      alertType: 'performance',
      severity: 'warning',
      message: 'Tempo de resposta médio acima do normal',
      details: {
        averageResponseTime: 1200,
        threshold: 1000,
        endpoint: '/api/produtos',
        period: 'última hora'
      }
    });
    console.log('  ✓ Alerta de performance criado');

    await tenantMonitoringService.createAlert({
      tenantId: '00000000-0000-0000-0000-000000000000',
      alertType: 'security',
      severity: 'critical',
      message: 'Múltiplas tentativas de login falharam',
      details: {
        failedAttempts: 10,
        ipAddress: '192.168.1.200',
        timeWindow: '10 minutos',
        action: 'IP temporariamente bloqueado'
      }
    });
    console.log('  ✓ Alerta de segurança crítico criado');

    // 6. Obter relatórios
    console.log('\n📈 6. Gerando relatórios...');

    // Obter logs de auditoria recentes
    const recentLogs = await tenantAuditService.getTenantAuditLogs(
      '00000000-0000-0000-0000-000000000000',
      { limit: 5 }
    );
    console.log(`  📋 Logs de auditoria recentes: ${recentLogs.length} encontrados`);

    // Obter eventos de segurança
    const securityEvents = await tenantAuditService.getTenantSecurityEvents(
      '00000000-0000-0000-0000-000000000000',
      { limit: 5 }
    );
    console.log(`  🔒 Eventos de segurança: ${securityEvents.length} encontrados`);

    // Obter alertas não reconhecidos
    const unacknowledgedAlerts = await tenantMonitoringService.getTenantAlerts(
      '00000000-0000-0000-0000-000000000000',
      { acknowledged: false }
    );
    console.log(`  🚨 Alertas não reconhecidos: ${unacknowledgedAlerts.length} encontrados`);

    // 7. Status do sistema
    console.log('\n🌐 7. Status geral do sistema...');

    const systemHealth = await tenantMonitoringService.getSystemHealth();
    console.log('  📊 Status do sistema:', {
      status: systemHealth.status,
      totalTenants: systemHealth.totalTenants,
      activeTenants: systemHealth.activeTenants,
      criticalAlerts: systemHealth.criticalAlerts,
      averageResponseTime: `${systemHealth.averageResponseTime}ms`
    });

    // 8. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('');
    console.log('📋 Funcionalidades demonstradas:');
    console.log('  ✓ Auditoria automática de operações CRUD');
    console.log('  ✓ Registro de eventos de segurança');
    console.log('  ✓ Coleta de métricas de uso');
    console.log('  ✓ Verificação de limites de tenant');
    console.log('  ✓ Sistema de alertas');
    console.log('  ✓ Relatórios e consultas');
    console.log('  ✓ Monitoramento de saúde do sistema');
    console.log('');
    console.log('🔍 Para visualizar os dados:');
    console.log('  - Logs: SELECT * FROM tenant_audit_log;');
    console.log('  - Segurança: SELECT * FROM tenant_security_events;');
    console.log('  - Métricas: SELECT * FROM tenant_usage_metrics;');
    console.log('  - Alertas: SELECT * FROM tenant_alerts;');
    console.log('');
    console.log('🌐 APIs disponíveis:');
    console.log('  - GET /api/audit/logs');
    console.log('  - GET /api/audit/security-events');
    console.log('  - GET /api/audit/usage-metrics');
    console.log('  - GET /api/audit/alerts');
    console.log('  - GET /api/audit/limit-violations');
    console.log('  - GET /api/audit/system/health');

  } catch (error) {
    console.error('❌ Erro na demonstração:', error.message);
    console.error('\nDetalhes do erro:');
    console.error(error);
    process.exit(1);
  }
}

// Executar demonstração
demonstrateAuditSystem();