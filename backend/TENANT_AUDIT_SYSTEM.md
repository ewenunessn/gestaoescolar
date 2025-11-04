# Sistema de Auditoria e Monitoramento Multi-Tenant

## Visão Geral

O Sistema de Auditoria e Monitoramento Multi-Tenant fornece rastreamento abrangente, monitoramento de segurança e coleta de métricas para todas as operações do sistema. Este sistema garante conformidade, segurança e observabilidade em um ambiente multi-tenant.

## Funcionalidades Implementadas

### ✅ 1. Auditoria Automática de Operações
- **Middleware de Auditoria**: Captura automaticamente todas as operações HTTP
- **Logs Detalhados**: Registra operações CRUD com contexto completo
- **Rastreamento de Mudanças**: Armazena valores antigos e novos para operações de atualização
- **Contexto de Usuário**: Inclui informações do usuário, IP e user agent

### ✅ 2. Monitoramento de Segurança
- **Detecção de Violações**: Identifica tentativas de acesso cross-tenant
- **Alertas de Segurança**: Monitora atividades suspeitas e falhas de autenticação
- **Análise de Padrões**: Detecta múltiplas tentativas de acesso falhadas
- **Eventos Críticos**: Gera alertas para eventos de segurança críticos

### ✅ 3. Métricas de Uso e Performance
- **Métricas por Tenant**: Coleta dados de uso específicos por tenant
- **Monitoramento de Performance**: Rastreia tempos de resposta por endpoint
- **Análise de Carga**: Monitora chamadas de API e operações de dados
- **Alertas de Limite**: Verifica violações de limites de recursos

### ✅ 4. Sistema de Alertas
- **Alertas Automáticos**: Gera alertas baseados em thresholds configuráveis
- **Categorização**: Organiza alertas por tipo e severidade
- **Reconhecimento**: Permite que administradores reconheçam alertas
- **Notificações**: Sistema preparado para integração com email/Slack

### ✅ 5. APIs de Consulta
- **Endpoints RESTful**: APIs completas para acessar dados de auditoria
- **Filtros Avançados**: Suporte a filtros por data, operação, severidade
- **Paginação**: Suporte a paginação para grandes volumes de dados
- **Agregações**: Relatórios e métricas agregadas

## Estrutura do Banco de Dados

### Tabelas Criadas

#### `tenant_audit_log`
Armazena todos os logs de auditoria das operações do sistema.

```sql
CREATE TABLE tenant_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    operation VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50) DEFAULT 'system',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `tenant_security_events`
Registra eventos de segurança e violações.

```sql
CREATE TABLE tenant_security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}',
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `tenant_usage_metrics`
Armazena métricas de uso agregadas por tenant e período.

```sql
CREATE TABLE tenant_usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period DATE NOT NULL,
    api_calls INTEGER DEFAULT 0,
    data_operations INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    security_events INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, period)
);
```

#### `tenant_alerts`
Sistema de alertas para administradores.

```sql
CREATE TABLE tenant_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `tenant_performance_metrics`
Métricas detalhadas de performance por endpoint.

```sql
CREATE TABLE tenant_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time INTEGER NOT NULL,
    status_code INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## APIs Disponíveis

### Endpoints de Auditoria (Tenant-Specific)

#### `GET /api/audit/logs`
Obtém logs de auditoria para o tenant atual.

**Parâmetros de Query:**
- `limit` (opcional): Número máximo de registros (padrão: 100)
- `offset` (opcional): Offset para paginação (padrão: 0)
- `startDate` (opcional): Data de início (formato: YYYY-MM-DD)
- `endDate` (opcional): Data de fim (formato: YYYY-MM-DD)
- `operation` (opcional): Filtrar por operação (create, update, delete, etc.)
- `category` (opcional): Filtrar por categoria
- `severity` (opcional): Filtrar por severidade (low, medium, high, critical)

**Headers Necessários:**
```
X-Tenant-ID: 00000000-0000-0000-0000-000000000000
Content-Type: application/json
```

**Exemplo de Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "operation": "create",
      "entity_type": "escola",
      "entity_id": "escola_123",
      "new_values": { "nome": "Escola Nova" },
      "user_id": 1,
      "ip_address": "192.168.1.100",
      "severity": "low",
      "category": "data_access",
      "created_at": "2025-11-01T19:00:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 1
  }
}
```

#### `GET /api/audit/security-events`
Obtém eventos de segurança para o tenant atual.

**Parâmetros similares ao endpoint de logs, com adição de:**
- `eventType` (opcional): Tipo de evento de segurança
- `severity` (opcional): Severidade do evento

#### `GET /api/audit/usage-metrics`
Obtém métricas de uso para o tenant atual.

**Parâmetros Obrigatórios:**
- `startDate`: Data de início (YYYY-MM-DD)
- `endDate`: Data de fim (YYYY-MM-DD)

#### `GET /api/audit/alerts`
Obtém alertas para o tenant atual.

**Parâmetros de Query:**
- `severity` (opcional): Filtrar por severidade
- `acknowledged` (opcional): Filtrar por status de reconhecimento (true/false)

#### `POST /api/audit/alerts/:alertId/acknowledge`
Reconhece um alerta específico.

#### `GET /api/audit/limit-violations`
Verifica violações de limite atuais para o tenant.

### Endpoints de Sistema (System Admin Only)

#### `GET /api/audit/system/health`
Obtém status de saúde geral do sistema.

#### `GET /api/audit/system/alerts`
Obtém alertas de todo o sistema.

#### `POST /api/audit/system/generate-report`
Gera relatório diário de monitoramento.

## Componentes Implementados

### 1. TenantAuditService
Serviço principal para logging e consulta de auditoria.

**Principais Métodos:**
- `logAuditEvent(entry)`: Registra evento de auditoria
- `logSecurityEvent(event)`: Registra evento de segurança
- `logUsageMetrics(metrics)`: Registra métricas de uso
- `getTenantAuditLogs(tenantId, options)`: Consulta logs de auditoria
- `checkTenantLimits(tenantId)`: Verifica limites do tenant

### 2. TenantMonitoringService
Serviço de monitoramento e alertas.

**Principais Métodos:**
- `checkAllTenantLimits()`: Verifica limites de todos os tenants
- `createAlert(alert)`: Cria novo alerta
- `getTenantAlerts(tenantId, options)`: Obtém alertas do tenant
- `getSystemHealth()`: Obtém status do sistema
- `generateDailyReport(date)`: Gera relatório diário

### 3. AuditMiddleware
Middleware que captura automaticamente todas as operações HTTP.

**Funcionalidades:**
- Intercepta requests/responses
- Determina operação e entidade automaticamente
- Registra contexto completo (usuário, IP, user agent)
- Detecta violações de segurança
- Log de métricas de performance

### 4. TenantPerformanceMonitor
Monitor de performance em tempo real.

**Funcionalidades:**
- Coleta métricas de tempo de resposta
- Detecta queries lentas
- Monitora cache hit rate
- Gera alertas de performance
- Estatísticas do sistema

## Configuração e Uso

### 1. Instalação
As tabelas são criadas automaticamente através da migração:

```bash
node run-audit-migration.js
```

### 2. Integração no Código
O middleware de auditoria é aplicado automaticamente a todas as rotas:

```typescript
// No index.ts
import AuditMiddleware from "./middleware/auditMiddleware";

// Aplicar middleware
app.use(AuditMiddleware.auditLogger());
```

### 3. Uso Manual dos Serviços
```typescript
import { tenantAuditService } from './services/tenantAuditService';

// Registrar evento personalizado
await tenantAuditService.logAuditEvent({
  tenantId: 'tenant-id',
  operation: 'custom_operation',
  entityType: 'custom_entity',
  userId: 1,
  severity: 'medium'
});
```

### 4. Configuração de Alertas
Os alertas são gerados automaticamente baseados em:
- Violações de limite de recursos
- Eventos de segurança críticos
- Performance degradada
- Atividades suspeitas

## Monitoramento Automático

### Tarefas Periódicas
O sistema executa automaticamente:

1. **Verificação de Limites** (a cada 5 minutos)
   - Verifica limites de todos os tenants ativos
   - Gera alertas para violações

2. **Relatórios Diários** (meia-noite)
   - Gera métricas agregadas do dia
   - Consolida dados de uso por tenant

3. **Limpeza de Métricas** (a cada hora)
   - Remove métricas antigas de performance
   - Mantém dados relevantes

### Detecção Automática
- **Cross-Tenant Access**: Detectado via middleware
- **Atividade Suspeita**: Múltiplas falhas de autenticação
- **Performance Issues**: Queries lentas e alta latência
- **Limit Violations**: Uso excessivo de recursos

## Exemplos de Uso

### 1. Consultar Logs de Auditoria
```bash
curl -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000000" \
     -H "Content-Type: application/json" \
     "http://localhost:3000/api/audit/logs?operation=create&limit=10"
```

### 2. Verificar Eventos de Segurança
```bash
curl -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000000" \
     "http://localhost:3000/api/audit/security-events?severity=critical"
```

### 3. Obter Métricas de Uso
```bash
curl -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000000" \
     "http://localhost:3000/api/audit/usage-metrics?startDate=2025-11-01&endDate=2025-11-01"
```

### 4. Listar Alertas Não Reconhecidos
```bash
curl -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000000" \
     "http://localhost:3000/api/audit/alerts?acknowledged=false"
```

## Testes e Demonstração

### Scripts de Teste Disponíveis

1. **test-audit-system.js**: Testa funcionalidade básica do banco
2. **demo-audit-simple.js**: Demonstração completa com dados de exemplo
3. **test-audit-api.js**: Testa APIs (requer servidor rodando)

### Executar Demonstração
```bash
# Criar tabelas
node run-audit-migration.js

# Inserir dados de demonstração
node demo-audit-simple.js

# Testar APIs (com servidor rodando)
node test-audit-api.js
```

## Conformidade e Segurança

### Conformidade LGPD/GDPR
- Logs incluem apenas dados necessários para auditoria
- Suporte a anonimização de dados sensíveis
- Retenção configurável de dados de auditoria
- Capacidade de exportação e exclusão de dados

### Segurança
- Logs de auditoria são imutáveis
- Acesso restrito por tenant
- Criptografia de dados sensíveis em trânsito
- Monitoramento de tentativas de acesso não autorizado

### Performance
- Índices otimizados para consultas frequentes
- Particionamento por tenant para escalabilidade
- Cache de consultas frequentes
- Agregação eficiente de métricas

## Próximos Passos

### Melhorias Futuras
1. **Dashboard Web**: Interface visual para monitoramento
2. **Integração com Alertas**: Email, Slack, SMS
3. **Machine Learning**: Detecção avançada de anomalias
4. **Exportação de Dados**: Relatórios em PDF/Excel
5. **Retenção Automática**: Limpeza automática de dados antigos

### Integrações Planejadas
- Elasticsearch para busca avançada
- Grafana para visualização de métricas
- Prometheus para monitoramento de sistema
- Webhook para notificações externas

---

## Conclusão

O Sistema de Auditoria e Monitoramento Multi-Tenant fornece uma base sólida para observabilidade, segurança e conformidade. Com logging automático, monitoramento em tempo real e APIs abrangentes, o sistema garante que todas as operações sejam rastreadas e monitoradas adequadamente.

Para mais informações ou suporte, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.