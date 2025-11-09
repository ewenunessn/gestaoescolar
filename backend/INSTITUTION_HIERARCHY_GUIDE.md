# Guia de Hierarquia de Instituições

## 📋 Visão Geral

Este sistema implementa uma arquitetura hierárquica de multi-tenancy com três níveis:

```
Instituição (Prefeitura/Organização)
    ├── Tenant 1 (Ambiente isolado)
    │   ├── Usuário A
    │   ├── Usuário B
    │   └── Escolas, Contratos, etc.
    ├── Tenant 2 (Outro ambiente)
    │   └── Usuários...
    └── Usuários da Instituição
```

## 🏗️ Estrutura

### 1. Instituições (`institutions`)
- Representa uma prefeitura, secretaria ou organização
- Pode ter múltiplos tenants
- Pode ter múltiplos usuários
- Possui limites configuráveis (max_tenants, max_users, max_schools)

### 2. Tenants (`tenants`)
- Ambientes isolados dentro de uma instituição
- Cada tenant tem seus próprios dados (escolas, contratos, estoque, etc.)
- Vinculado a uma instituição via `institution_id`

### 3. Usuários (`usuarios`)
- Pertencem a uma instituição via `institution_id`
- Podem ter acesso a um ou mais tenants
- Possuem roles diferentes em cada nível (instituição e tenant)

## 🚀 Fluxo de Provisionamento

### Provisionamento Completo (Nova Prefeitura)

```bash
POST /api/provisioning/complete
```

**Request Body:**
```json
{
  "institution": {
    "name": "Prefeitura de São Paulo",
    "slug": "prefeitura-sp",
    "legal_name": "Prefeitura Municipal de São Paulo",
    "document_number": "12345678000190",
    "type": "prefeitura",
    "email": "contato@prefeitura.sp.gov.br",
    "phone": "(11) 3333-4444",
    "address": {
      "street": "Rua da Prefeitura",
      "number": "100",
      "city": "São Paulo",
      "state": "SP",
      "zipcode": "01000-000"
    }
  },
  "tenant": {
    "name": "Secretaria de Educação",
    "slug": "educacao-sp",
    "subdomain": "educacao-sp"
  },
  "admin": {
    "nome": "João Silva",
    "email": "joao.silva@prefeitura.sp.gov.br",
    "senha": "senha_segura_123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Instituição provisionada com sucesso",
  "data": {
    "institution": {
      "id": "uuid-da-instituicao",
      "slug": "prefeitura-sp",
      "name": "Prefeitura de São Paulo",
      "status": "active"
    },
    "tenant": {
      "id": "uuid-do-tenant",
      "slug": "educacao-sp",
      "name": "Secretaria de Educação",
      "subdomain": "educacao-sp"
    },
    "admin": {
      "id": 1,
      "nome": "João Silva",
      "email": "joao.silva@prefeitura.sp.gov.br",
      "tipo": "admin"
    }
  }
}
```

### Criar Tenant Adicional

```bash
POST /api/provisioning/institutions/:institutionId/tenants
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Secretaria de Saúde",
  "slug": "saude-sp",
  "subdomain": "saude-sp",
  "settings": {
    "features": {
      "inventory": true,
      "contracts": false
    }
  }
}
```

### Criar Usuário na Instituição

```bash
POST /api/provisioning/institutions/:institutionId/users
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "nome": "Maria Santos",
  "email": "maria.santos@prefeitura.sp.gov.br",
  "senha": "senha_segura_456",
  "tipo": "usuario",
  "tenant_id": "uuid-do-tenant",
  "institution_role": "manager",
  "tenant_role": "user"
}
```

## 📊 Endpoints Disponíveis

### Instituições

```bash
# Listar todas as instituições
GET /api/institutions

# Buscar instituição por ID
GET /api/institutions/:id

# Buscar instituição por slug
GET /api/institutions/slug/:slug

# Atualizar instituição
PUT /api/institutions/:id

# Desativar instituição
DELETE /api/institutions/:id

# Estatísticas da instituição
GET /api/institutions/:id/stats

# Listar usuários da instituição
GET /api/institutions/:id/users

# Adicionar usuário à instituição
POST /api/institutions/:id/users

# Remover usuário da instituição
DELETE /api/institutions/:id/users/:userId

# Listar tenants da instituição
GET /api/institutions/:id/tenants
```

### Provisionamento

```bash
# Provisionamento completo
POST /api/provisioning/complete

# Criar tenant adicional
POST /api/provisioning/institutions/:institutionId/tenants

# Criar usuário
POST /api/provisioning/institutions/:institutionId/users

# Ver hierarquia completa
GET /api/provisioning/institutions/:institutionId/hierarchy
```

## 🔐 Roles e Permissões

### Roles de Instituição
- `institution_admin`: Administrador da instituição (pode criar tenants e usuários)
- `manager`: Gerente (pode gerenciar usuários)
- `user`: Usuário básico

### Roles de Tenant
- `tenant_admin`: Administrador do tenant
- `user`: Usuário do tenant
- `viewer`: Apenas visualização

## 💾 Estrutura do Banco de Dados

### Tabelas Principais

1. **institutions** - Dados das instituições
2. **institution_users** - Vínculo usuário-instituição com roles
3. **institution_contracts** - Contratos/acordos com instituições
4. **institution_audit_log** - Log de auditoria
5. **tenants** - Tenants (agora com `institution_id`)
6. **usuarios** - Usuários (agora com `institution_id`)

## 🔧 Configuração

### 1. Executar Migration

```bash
cd backend
node run-institution-migration.js
```

### 2. Adicionar Rotas no App

```typescript
// backend/src/app.ts ou index.ts
import institutionRoutes from './routes/institutionRoutes';
import provisioningRoutes from './routes/provisioningRoutes';

app.use('/api/institutions', institutionRoutes);
app.use('/api/provisioning', provisioningRoutes);
```

### 3. Testar Provisionamento

```bash
# Criar nova instituição completa
curl -X POST http://localhost:3000/api/provisioning/complete \
  -H "Content-Type: application/json" \
  -d '{
    "institution": {
      "name": "Prefeitura Teste",
      "slug": "prefeitura-teste"
    },
    "tenant": {
      "name": "Tenant Principal",
      "slug": "tenant-principal"
    },
    "admin": {
      "nome": "Admin Teste",
      "email": "admin@teste.com",
      "senha": "senha123"
    }
  }'
```

## 📈 Limites e Quotas

Cada instituição possui limites configuráveis:

```json
{
  "limits": {
    "max_tenants": 5,      // Máximo de tenants
    "max_users": 100,      // Máximo de usuários
    "max_schools": 50      // Máximo de escolas
  }
}
```

Esses limites são verificados automaticamente ao criar novos recursos.

## 🔍 Consultas Úteis

### Ver hierarquia completa de uma instituição

```sql
SELECT 
  i.name as instituicao,
  t.name as tenant,
  u.nome as usuario,
  iu.role as role_instituicao,
  tu.role as role_tenant
FROM institutions i
LEFT JOIN tenants t ON t.institution_id = i.id
LEFT JOIN institution_users iu ON iu.institution_id = i.id
LEFT JOIN usuarios u ON u.id = iu.user_id
LEFT JOIN tenant_users tu ON tu.tenant_id = t.id AND tu.user_id = u.id
WHERE i.id = 'uuid-da-instituicao';
```

### Contar recursos por instituição

```sql
SELECT 
  i.name,
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT iu.user_id) as total_users,
  COUNT(DISTINCT e.id) as total_schools
FROM institutions i
LEFT JOIN tenants t ON t.institution_id = i.id
LEFT JOIN institution_users iu ON iu.institution_id = i.id
LEFT JOIN escolas e ON e.tenant_id = t.id
GROUP BY i.id, i.name;
```

## 🎯 Casos de Uso

### 1. Prefeitura com múltiplas secretarias
```
Prefeitura Municipal
├── Secretaria de Educação (Tenant)
├── Secretaria de Saúde (Tenant)
└── Secretaria de Assistência Social (Tenant)
```

### 2. Prefeitura com ambientes de teste e produção
```
Prefeitura Municipal
├── Produção (Tenant)
└── Homologação (Tenant)
```

### 3. Múltiplas prefeituras no mesmo sistema
```
Sistema
├── Prefeitura A
│   └── Tenants...
├── Prefeitura B
│   └── Tenants...
└── Prefeitura C
    └── Tenants...
```

## 🛡️ Segurança

- Todos os endpoints (exceto provisionamento inicial) requerem autenticação
- Usuários só podem acessar dados de suas instituições/tenants
- Logs de auditoria registram todas as operações
- Senhas são hasheadas com bcrypt
- Suporte a Row Level Security (RLS) no PostgreSQL

## 📝 Próximos Passos

1. ✅ Estrutura de banco criada
2. ✅ Models e controllers implementados
3. ✅ Serviço de provisionamento completo
4. ⏳ Middleware de autorização por instituição
5. ⏳ Interface administrativa
6. ⏳ Dashboard de métricas por instituição
7. ⏳ Sistema de billing/faturamento
8. ⏳ API de webhooks para eventos

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique os logs de auditoria
2. Consulte a documentação da API
3. Entre em contato com o suporte técnico
