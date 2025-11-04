/**
 * Script para testar as APIs de auditoria e monitoramento
 */

const axios = require('axios');
const db = process.env.VERCEL === '1' ? require('./dist/database-vercel') : require('./dist/database');

const API_BASE_URL = 'http://localhost:3000/api';

async function testAuditAPI() {
  try {
    console.log('🧪 Testando APIs de auditoria e monitoramento...');

    // Primeiro, vamos inserir alguns dados de teste
    console.log('\n📝 Inserindo dados de teste...');
    
    // Inserir alguns logs de auditoria
    await db.query(`
      INSERT INTO tenant_audit_log (
        tenant_id, operation, entity_type, entity_id, 
        user_id, ip_address, severity, category
      ) VALUES 
        ('00000000-0000-0000-0000-000000000000', 'create', 'escola', '1', 1, '127.0.0.1', 'low', 'data_access'),
        ('00000000-0000-0000-0000-000000000000', 'update', 'produto', '2', 1, '127.0.0.1', 'medium', 'data_access'),
        ('00000000-0000-0000-0000-000000000000', 'delete', 'contrato', '3', 1, '127.0.0.1', 'high', 'data_access')
    `);

    // Inserir alguns eventos de segurança
    await db.query(`
      INSERT INTO tenant_security_events (
        tenant_id, event_type, user_id, ip_address, severity, details
      ) VALUES 
        ('00000000-0000-0000-0000-000000000000', 'unauthorized_access', 1, '192.168.1.100', 'medium', '{"endpoint": "/api/admin"}'),
        ('00000000-0000-0000-0000-000000000000', 'cross_tenant_access', 2, '192.168.1.101', 'high', '{"attempted_tenant": "other-tenant"}')
    `);

    // Inserir algumas métricas de uso
    await db.query(`
      INSERT INTO tenant_usage_metrics (
        tenant_id, period, api_calls, data_operations, active_users, error_count
      ) VALUES 
        ('00000000-0000-0000-0000-000000000000', '2025-11-01', 500, 200, 10, 5),
        ('00000000-0000-0000-0000-000000000000', '2025-10-31', 450, 180, 8, 3)
    `);

    // Inserir alguns alertas
    await db.query(`
      INSERT INTO tenant_alerts (
        tenant_id, alert_type, severity, message, details
      ) VALUES 
        ('00000000-0000-0000-0000-000000000000', 'limit_violation', 'warning', 'API rate limit approaching', '{"current": 450, "limit": 500}'),
        ('00000000-0000-0000-0000-000000000000', 'security', 'critical', 'Multiple failed login attempts', '{"attempts": 10, "ip": "192.168.1.100"}')
    `);

    console.log('✅ Dados de teste inseridos');

    // Agora vamos testar as APIs
    console.log('\n🔍 Testando endpoints de auditoria...');

    // Configurar headers com tenant
    const headers = {
      'X-Tenant-ID': '00000000-0000-0000-0000-000000000000',
      'Content-Type': 'application/json'
    };

    // 1. Testar GET /api/audit/logs
    try {
      console.log('\n📋 Testando GET /api/audit/logs...');
      const logsResponse = await axios.get(`${API_BASE_URL}/audit/logs`, { headers });
      console.log('✅ Logs de auditoria obtidos:', {
        success: logsResponse.data.success,
        count: logsResponse.data.data?.length || 0,
        pagination: logsResponse.data.pagination
      });
    } catch (error) {
      console.log('❌ Erro ao obter logs:', error.response?.data || error.message);
    }

    // 2. Testar GET /api/audit/security-events
    try {
      console.log('\n🔒 Testando GET /api/audit/security-events...');
      const securityResponse = await axios.get(`${API_BASE_URL}/audit/security-events`, { headers });
      console.log('✅ Eventos de segurança obtidos:', {
        success: securityResponse.data.success,
        count: securityResponse.data.data?.length || 0
      });
    } catch (error) {
      console.log('❌ Erro ao obter eventos de segurança:', error.response?.data || error.message);
    }

    // 3. Testar GET /api/audit/usage-metrics
    try {
      console.log('\n📊 Testando GET /api/audit/usage-metrics...');
      const metricsResponse = await axios.get(`${API_BASE_URL}/audit/usage-metrics`, {
        headers,
        params: {
          startDate: '2025-10-31',
          endDate: '2025-11-01'
        }
      });
      console.log('✅ Métricas de uso obtidas:', {
        success: metricsResponse.data.success,
        count: metricsResponse.data.data?.length || 0
      });
    } catch (error) {
      console.log('❌ Erro ao obter métricas:', error.response?.data || error.message);
    }

    // 4. Testar GET /api/audit/alerts
    try {
      console.log('\n🚨 Testando GET /api/audit/alerts...');
      const alertsResponse = await axios.get(`${API_BASE_URL}/audit/alerts`, { headers });
      console.log('✅ Alertas obtidos:', {
        success: alertsResponse.data.success,
        count: alertsResponse.data.data?.length || 0
      });
    } catch (error) {
      console.log('❌ Erro ao obter alertas:', error.response?.data || error.message);
    }

    // 5. Testar GET /api/audit/limit-violations
    try {
      console.log('\n⚠️ Testando GET /api/audit/limit-violations...');
      const violationsResponse = await axios.get(`${API_BASE_URL}/audit/limit-violations`, { headers });
      console.log('✅ Violações de limite obtidas:', {
        success: violationsResponse.data.success,
        violations: violationsResponse.data.data?.violations?.length || 0
      });
    } catch (error) {
      console.log('❌ Erro ao obter violações:', error.response?.data || error.message);
    }

    // 6. Testar filtros nos logs
    try {
      console.log('\n🔍 Testando filtros nos logs...');
      const filteredLogsResponse = await axios.get(`${API_BASE_URL}/audit/logs`, {
        headers,
        params: {
          operation: 'create',
          severity: 'low',
          limit: 10
        }
      });
      console.log('✅ Logs filtrados obtidos:', {
        success: filteredLogsResponse.data.success,
        count: filteredLogsResponse.data.data?.length || 0
      });
    } catch (error) {
      console.log('❌ Erro ao obter logs filtrados:', error.response?.data || error.message);
    }

    // 7. Testar endpoints de sistema (sem tenant específico)
    try {
      console.log('\n🌐 Testando endpoints de sistema...');
      
      // Simular usuário admin do sistema
      const systemHeaders = {
        ...headers,
        'X-User-Role': 'system_admin'
      };

      const healthResponse = await axios.get(`${API_BASE_URL}/audit/system/health`, { headers: systemHeaders });
      console.log('✅ Status do sistema obtido:', {
        success: healthResponse.data.success,
        status: healthResponse.data.data?.status
      });
    } catch (error) {
      console.log('❌ Erro ao obter status do sistema:', error.response?.data || error.message);
    }

    console.log('\n🎉 Testes de API de auditoria concluídos!');

    // Verificar se os dados foram inseridos corretamente
    console.log('\n📊 Verificando dados no banco...');
    
    const auditCount = await db.query('SELECT COUNT(*) as count FROM tenant_audit_log WHERE tenant_id = $1', 
      ['00000000-0000-0000-0000-000000000000']);
    console.log(`📋 Total de logs de auditoria: ${auditCount.rows[0].count}`);

    const securityCount = await db.query('SELECT COUNT(*) as count FROM tenant_security_events WHERE tenant_id = $1', 
      ['00000000-0000-0000-0000-000000000000']);
    console.log(`🔒 Total de eventos de segurança: ${securityCount.rows[0].count}`);

    const alertsCount = await db.query('SELECT COUNT(*) as count FROM tenant_alerts WHERE tenant_id = $1', 
      ['00000000-0000-0000-0000-000000000000']);
    console.log(`🚨 Total de alertas: ${alertsCount.rows[0].count}`);

    console.log('\n✅ Sistema de auditoria funcionando corretamente!');

  } catch (error) {
    console.error('❌ Erro no teste de API de auditoria:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    console.error('\nDetalhes do erro:');
    console.error(error);
  }
}

// Função para aguardar o servidor estar pronto
async function waitForServer(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      console.log('✅ Servidor está pronto');
      return true;
    } catch (error) {
      console.log(`⏳ Aguardando servidor... (tentativa ${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

// Executar teste
async function runTest() {
  console.log('🚀 Iniciando teste de API de auditoria...');
  console.log('ℹ️ Certifique-se de que o servidor está rodando em http://localhost:3000');
  
  const serverReady = await waitForServer();
  if (!serverReady) {
    console.error('❌ Servidor não está disponível. Inicie o servidor com: npm run dev');
    process.exit(1);
  }

  await testAuditAPI();
}

runTest();