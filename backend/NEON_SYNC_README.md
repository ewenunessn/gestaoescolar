# 🚀 Sincronização PostgreSQL Local → Neon

Este guia explica como sincronizar as novas tabelas do PostgreSQL local para o banco Neon (produção).

## 📋 O que será sincronizado?

### Novas Tabelas (Migrations 014, 015, 016)

1. **Hierarquia de Instituições** (Migration 014)
   - `institutions` - Prefeituras/Secretarias
   - `institution_users` - Usuários das instituições
   - `institution_contracts` - Contratos
   - `institution_audit_log` - Auditoria

2. **System Admins** (Migration 015)
   - `system_admins` - Administradores do sistema
   - `system_admin_audit_log` - Log de ações

3. **Planos** (Migration 016)
   - `institution_plans` - Planos (Básico, Profissional, Enterprise)

## 🎯 Processo Completo (3 Passos)

### Passo 1: Verificar o que está faltando

```bash
cd backend
npm run check-neon
```

**Saída esperada:**
```
📊 VERIFICAÇÃO DE TABELAS NO NEON
============================================================

📁 Instituições
------------------------------------------------------------
  ❌ institutions                      MISSING
  ❌ institution_users                 MISSING
  ❌ institution_contracts             MISSING
  ❌ institution_audit_log             MISSING

📁 System Admins
------------------------------------------------------------
  ❌ system_admins                     MISSING
  ❌ system_admin_audit_log            MISSING

📁 Planos
------------------------------------------------------------
  ❌ institution_plans                 MISSING

============================================================

📈 RESUMO

Total esperado:  7
Existentes:      0 ✅
Faltando:        7 ❌

⚠️  AÇÃO NECESSÁRIA: Execute as migrations faltantes
   npm run sync-neon
```

### Passo 2: Sincronizar as tabelas

```bash
npm run sync-neon
```

**Saída esperada:**
```
🔌 Conectando ao Neon...
✅ Conectado!

📄 Executando: 014_create_institutions_hierarchy.sql
✅ 014_create_institutions_hierarchy.sql - OK

📄 Executando: 015_create_system_admins.sql
✅ 015_create_system_admins.sql - OK

📄 Executando: 016_add_institution_plans.sql
✅ 016_add_institution_plans.sql - OK

✅ Migrations concluídas!
```

### Passo 3: Verificar novamente

```bash
npm run check-neon
```

**Saída esperada:**
```
📊 VERIFICAÇÃO DE TABELAS NO NEON
============================================================

📁 Instituições
------------------------------------------------------------
  ✅ institutions                      EXISTS
  ✅ institution_users                 EXISTS
  ✅ institution_contracts             EXISTS
  ✅ institution_audit_log             EXISTS

📁 System Admins
------------------------------------------------------------
  ✅ system_admins                     EXISTS
  ✅ system_admin_audit_log            EXISTS

📁 Planos
------------------------------------------------------------
  ✅ institution_plans                 EXISTS

============================================================

📈 RESUMO

Total esperado:  7
Existentes:      7 ✅
Faltando:        0 ❌

🎉 Todas as tabelas estão sincronizadas!
```

## 🛠️ Comandos Disponíveis

```bash
# Verificar status das tabelas
npm run check-neon

# Sincronizar (simples e rápido)
npm run sync-neon

# Sincronizar com verificação completa
npm run sync-neon-full

# Criar primeiro admin do sistema
npm run create-admin

# Criar instituição de exemplo
npm run create-institution
```

## ⚙️ Configuração

Certifique-se de que o arquivo `.env` tem a URL do Neon:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## 🔍 Verificação Manual (Opcional)

Se preferir verificar manualmente no Neon Console:

```sql
-- Listar todas as tabelas de instituições
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%institution%' 
    OR table_name LIKE '%system_admin%')
ORDER BY table_name;

-- Verificar planos criados
SELECT id, name, max_schools, max_users, price_monthly 
FROM institution_plans 
ORDER BY id;
```

Deve retornar:
```
id | name          | max_schools | max_users | price_monthly
---+---------------+-------------+-----------+--------------
 1 | Básico        |           5 |        10 |         0.00
 2 | Profissional  |          20 |        50 |       299.00
 3 | Enterprise    |         100 |       200 |       999.00
```

## 🚨 Troubleshooting

### Erro: "DATABASE_URL não configurado"
**Solução:** Adicione DATABASE_URL no arquivo `.env`

### Erro: "relation already exists"
**Status:** ✅ Normal! A tabela já existe, pode ignorar.

### Erro: "permission denied"
**Solução:** Verifique se o usuário do Neon tem permissões de CREATE TABLE.

### Erro: "connection timeout"
**Soluções:**
- Verifique se a URL do Neon está correta
- Verifique se o Neon está online em console.neon.tech
- Verifique firewall/proxy

### Tabelas não aparecem após sync
**Solução:** Execute `npm run check-neon` para verificar o status real.

## 📚 Próximos Passos

Após sincronizar as tabelas:

### 1. Criar Admin do Sistema
```bash
npm run create-admin
```

### 2. Criar Instituição de Exemplo
```bash
npm run create-institution
```

### 3. Testar Admin Panel
```bash
cd admin-panel
npm install
npm run dev
```

Acesse: http://localhost:5174

### 4. Fazer Login
- Email: admin@sistema.com
- Senha: (a que você definiu)

## 📖 Documentação Adicional

- [SYNC_NEON_GUIDE.md](./SYNC_NEON_GUIDE.md) - Guia completo e detalhado
- [QUICK_SYNC_NEON.md](./QUICK_SYNC_NEON.md) - Guia rápido
- [INSTITUTION_HIERARCHY_GUIDE.md](./INSTITUTION_HIERARCHY_GUIDE.md) - Arquitetura do sistema

## ✅ Checklist Final

- [ ] Verificar tabelas faltantes: `npm run check-neon`
- [ ] Sincronizar tabelas: `npm run sync-neon`
- [ ] Verificar sincronização: `npm run check-neon`
- [ ] Criar admin: `npm run create-admin`
- [ ] Criar instituição: `npm run create-institution`
- [ ] Testar admin panel
- [ ] Testar login no sistema principal

---

**Última atualização:** 2024  
**Versão:** 1.0  
**Status:** ✅ Pronto para produção
