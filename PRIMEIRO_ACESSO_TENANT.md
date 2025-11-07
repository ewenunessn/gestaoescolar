# Configuração Automática do Primeiro Tenant

## 🎯 Problema Resolvido

Quando você entra pela primeira vez no sistema, agora não precisa mais criar manualmente um tenant. O sistema detecta automaticamente se é o primeiro acesso e cria tudo que você precisa.

## ✨ Como Funciona

### Primeiro Usuário do Sistema

Quando você se registra como o **primeiro usuário** do sistema:

1. ✅ O sistema detecta que não existem tenants
2. ✅ Cria automaticamente um tenant padrão chamado "Sistema Principal"
3. ✅ Você é automaticamente promovido a **administrador do sistema**
4. ✅ Você é associado ao tenant como **tenant_admin**
5. ✅ Todos os recursos ficam disponíveis imediatamente

### Usuários Subsequentes

Quando outros usuários se registram depois:

1. ✅ São automaticamente associados ao tenant padrão
2. ✅ Recebem permissões de usuário normal
3. ✅ Podem ser promovidos pelo administrador se necessário

## 🚀 Fluxo de Uso

### 1. Primeiro Acesso (Novo Sistema)

```bash
# Endpoint de registro
POST /api/usuarios/register

# Body
{
  "nome": "João Silva",
  "email": "joao@empresa.com",
  "senha": "senha123",
  "perfil": "admin"
}

# Resposta
{
  "id": 1,
  "nome": "João Silva",
  "email": "joao@empresa.com",
  "tipo": "admin",
  "tenant_id": "00000000-0000-0000-0000-000000000000",
  "isFirstUser": true,
  "message": "Primeiro usuário criado com sucesso! Você é o administrador do sistema."
}
```

### 2. Verificar Status do Sistema

Antes de fazer o registro, você pode verificar se o sistema precisa de configuração inicial:

```bash
# Endpoint público
GET /api/usuarios/system-status

# Resposta
{
  "success": true,
  "data": {
    "initialized": false,
    "hasUsers": false,
    "hasTenants": false,
    "hasDefaultTenant": false,
    "defaultTenant": null,
    "needsSetup": true
  }
}
```

### 3. Login Após Registro

```bash
POST /api/usuarios/login

# Body
{
  "email": "joao@empresa.com",
  "senha": "senha123"
}

# Resposta
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tipo": "admin",
  "nome": "João Silva",
  "tenant": {
    "id": "00000000-0000-0000-0000-000000000000",
    "slug": "sistema-principal",
    "name": "Sistema Principal",
    "role": "tenant_admin"
  },
  "tenantRole": "tenant_admin",
  "isSystemAdmin": true,
  "availableTenants": [...]
}
```

## 🔧 Tenant Padrão Criado

O tenant padrão é criado com as seguintes configurações:

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "slug": "sistema-principal",
  "name": "Sistema Principal",
  "status": "active",
  "settings": {
    "features": {
      "inventory": true,
      "contracts": true,
      "deliveries": true,
      "reports": true,
      "mobile": true
    }
  },
  "limits": {
    "maxUsers": 100,
    "maxSchools": 50,
    "maxProducts": 1000,
    "storageLimit": 1024,
    "apiRateLimit": 100
  }
}
```

## 👥 Permissões do Primeiro Usuário

O primeiro usuário recebe:

- **Tipo de Usuário**: `admin` (administrador do sistema)
- **Role no Tenant**: `tenant_admin` (administrador do tenant)
- **Permissões Completas**:
  - Gerenciar tenants
  - Gerenciar usuários
  - Gerenciar configurações
  - Acesso a todos os recursos do sistema

## 📝 Próximos Passos Após Primeiro Acesso

1. **Personalizar o Tenant**
   ```bash
   PUT /api/tenants/00000000-0000-0000-0000-000000000000
   {
     "name": "Minha Empresa",
     "subdomain": "minhaempresa"
   }
   ```

2. **Criar Escolas**
   ```bash
   POST /api/escolas
   {
     "nome": "Escola Municipal",
     "endereco": "Rua Principal, 123",
     ...
   }
   ```

3. **Adicionar Produtos**
   ```bash
   POST /api/produtos
   {
     "nome": "Caderno",
     "categoria": "Material Escolar",
     ...
   }
   ```

4. **Convidar Outros Usuários**
   ```bash
   POST /api/usuarios/register
   {
     "nome": "Maria Santos",
     "email": "maria@empresa.com",
     "senha": "senha123",
     "perfil": "user"
   }
   ```

## 🔒 Segurança

- O primeiro usuário é automaticamente promovido a admin apenas se não houver nenhum tenant no sistema
- Usuários subsequentes precisam ser promovidos manualmente pelo administrador
- O tenant padrão pode ser renomeado ou substituído posteriormente
- Todas as operações são registradas no log de auditoria

## 🐛 Troubleshooting

### Problema: "Tenant não especificado e tenant padrão não encontrado"

**Solução**: Isso não deve mais acontecer com a nova implementação. Se ocorrer:
1. Verifique se há tenants no banco: `SELECT * FROM tenants;`
2. Crie manualmente o tenant padrão usando o endpoint: `POST /api/tenants/provision`

### Problema: Usuário criado mas sem permissões

**Solução**: Verifique a associação na tabela `tenant_users`:
```sql
SELECT * FROM tenant_users WHERE user_id = <seu_user_id>;
```

Se não houver registro, crie manualmente:
```sql
INSERT INTO tenant_users (tenant_id, user_id, role, status)
VALUES ('00000000-0000-0000-0000-000000000000', <seu_user_id>, 'tenant_admin', 'active');
```

## 📚 Endpoints Relacionados

- `GET /api/usuarios/system-status` - Verificar status de inicialização
- `POST /api/usuarios/register` - Registrar novo usuário
- `POST /api/usuarios/login` - Fazer login
- `GET /api/tenants` - Listar tenants (requer autenticação)
- `POST /api/tenants` - Criar novo tenant (requer admin)
- `POST /api/tenants/provision` - Provisionar tenant completo (requer admin)

## 🎉 Conclusão

Com essas mudanças, o sistema agora oferece uma experiência de primeiro acesso muito mais suave. Não é mais necessário criar manualmente um tenant antes de começar a usar o sistema!
