# Guia de Sincronização com Neon

Este guia explica como sincronizar as tabelas do PostgreSQL local para o banco Neon (produção).

## Novas Tabelas Criadas

As seguintes tabelas foram criadas no PostgreSQL local e precisam ser adicionadas ao Neon:

### Migration 014: Hierarquia de Instituições
- `institutions` - Prefeituras/Organizações
- `institution_users` - Usuários com acesso às instituições
- `institution_contracts` - Contratos das instituições
- `institution_audit_log` - Log de auditoria

### Migration 015: System Admins
- `system_admins` - Administradores do sistema
- `system_admin_audit_log` - Log de ações dos admins

### Migration 016: Planos
- `institution_plans` - Planos disponíveis (Básico, Profissional, Enterprise)

## Método 1: Script Automático (Recomendado)

### Passo 1: Configurar DATABASE_URL

Certifique-se de que o arquivo `.env` tem a URL do Neon:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Passo 2: Executar o Script

```bash
cd backend
node run-neon-migrations.js
```

O script irá:
1. Conectar ao Neon
2. Executar as 3 migrations novas
3. Ignorar erros de "já existe"
4. Mostrar o resultado

### Saída Esperada

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

## Método 2: Script Completo com Verificação

Para uma sincronização mais detalhada com verificação de status:

```bash
cd backend
node sync-to-neon.js
```

Este script:
- Verifica quais tabelas existem antes
- Executa migrations críticas e opcionais
- Mostra um resumo detalhado
- Lista todas as tabelas criadas

## Método 3: Manual via Neon Console

Se preferir executar manualmente:

1. Acesse o [Neon Console](https://console.neon.tech)
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Execute cada migration na ordem:

### Migration 014
```sql
-- Cole o conteúdo de migrations/014_create_institutions_hierarchy.sql
```

### Migration 015
```sql
-- Cole o conteúdo de migrations/015_create_system_admins.sql
```

### Migration 016
```sql
-- Cole o conteúdo de migrations/016_add_institution_plans.sql
```

## Verificação

Após executar as migrations, verifique se as tabelas foram criadas:

```sql
-- Verificar tabelas de instituições
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'institutions',
    'institution_users',
    'institution_contracts',
    'institution_audit_log',
    'system_admins',
    'system_admin_audit_log',
    'institution_plans'
  )
ORDER BY table_name;
```

Deve retornar 7 tabelas.

## Verificar Dados Iniciais

As migrations também inserem dados iniciais:

```sql
-- Verificar planos criados
SELECT * FROM institution_plans ORDER BY id;
```

Deve retornar 3 planos:
1. Básico (5 escolas, 10 usuários)
2. Profissional (20 escolas, 50 usuários)
3. Enterprise (100 escolas, 200 usuários)

## Troubleshooting

### Erro: "relation already exists"
✅ Normal! Significa que a tabela já existe. O script ignora esse erro.

### Erro: "permission denied"
❌ Verifique se o usuário do Neon tem permissões de CREATE TABLE.

### Erro: "connection timeout"
❌ Verifique:
- URL do Neon está correta
- Firewall não está bloqueando
- Neon está online (verifique status em console.neon.tech)

### Erro: "column already exists"
✅ Normal! Significa que a coluna já foi adicionada. Pode ignorar.

## Rollback (se necessário)

Se precisar reverter as migrations:

```sql
-- CUIDADO: Isso apaga todas as tabelas e dados!
DROP TABLE IF EXISTS institution_audit_log CASCADE;
DROP TABLE IF EXISTS institution_contracts CASCADE;
DROP TABLE IF EXISTS institution_users CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;
DROP TABLE IF EXISTS system_admin_audit_log CASCADE;
DROP TABLE IF EXISTS system_admins CASCADE;
DROP TABLE IF EXISTS institution_plans CASCADE;
```

## Próximos Passos

Após sincronizar as tabelas:

1. **Criar primeiro admin do sistema**:
   ```bash
   node create-system-admin.js
   ```

2. **Criar instituição de exemplo**:
   ```bash
   node create-example-institution.js
   ```

3. **Testar o admin panel**:
   ```bash
   cd admin-panel
   npm install
   npm run dev
   ```

4. **Fazer login no admin panel**:
   - URL: http://localhost:5174
   - Email: admin@sistema.com
   - Senha: (a que você definiu)

## Suporte

Se encontrar problemas:
1. Verifique os logs do script
2. Verifique o Neon Console para erros
3. Execute as migrations manualmente uma por uma
4. Verifique se o DATABASE_URL está correto

---

**Última atualização**: 2024
**Versão**: 1.0
