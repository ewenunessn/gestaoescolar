# 🎯 Migração de Estoque para Tenant "Escola de Teste"

## 📋 Instruções para Execução

### 1. **Executar a Migração**
Execute o arquivo SQL no seu banco de dados PostgreSQL:

```bash
# Conecte ao seu banco e execute:
psql -h localhost -U postgres -d alimentacao_escolar -f backend/migrate-estoque-escola-teste.sql
```

**OU** execute o conteúdo do arquivo `backend/migrate-estoque-escola-teste.sql` diretamente no seu cliente SQL (pgAdmin, DBeaver, etc.).

### 2. **Verificar a Migração**
Após a execução, verifique se tudo funcionou:

```bash
# Execute o script de verificação:
psql -h localhost -U postgres -d alimentacao_escolar -f backend/verify-estoque-escola-teste.sql
```

## 🔄 O que a Migração Faz

### ✅ **Criação do Tenant**
- Cria o tenant "Escola de Teste" com slug `escola-de-teste`
- Configura permissões e limites apropriados
- Define cores personalizadas (verde e laranja)

### ✅ **Estrutura do Banco**
- Adiciona colunas `tenant_id` nas tabelas:
  - `estoque_escolas`
  - `estoque_lotes`
  - `estoque_escolas_historico`
  - `escolas`
  - `produtos`

### ✅ **Migração de Dados**
- **TODOS** os registros de estoque são movidos para "Escola de Teste"
- **TODAS** as escolas são associadas ao tenant "Escola de Teste"
- **TODOS** os produtos são associados ao tenant "Escola de Teste"
- **TODO** o histórico de movimentações é preservado

### ✅ **Otimizações**
- Cria índices compostos para performance
- Implementa triggers automáticos para novos registros
- Garante que novos dados sempre usem o tenant "Escola de Teste"

## 📊 Resultados Esperados

Após a migração, você deve ver:

```
=== RESUMO DA MIGRAÇÃO ===
Tenant "Escola de Teste" ID: [UUID]
Escolas migradas: [número]
Produtos migrados: [número]
Registros estoque_escolas: [número]
Registros estoque_lotes: [número]
Registros estoque_historico: [número]
=== MIGRAÇÃO CONCLUÍDA ===
```

## 🎨 **Frontend - Configuração**

Após a migração do banco, certifique-se de que o frontend está configurado para usar o tenant "Escola de Teste":

### 1. **Verificar TenantContext**
O sistema deve automaticamente detectar e usar o tenant "Escola de Teste".

### 2. **Limpar Cache**
```bash
# No frontend, limpe o cache do navegador ou execute:
localStorage.clear()
```

### 3. **Verificar Funcionamento**
- Acesse as páginas de Estoque Escolar
- Acesse as páginas de Movimentação de Estoque
- Verifique se os dados aparecem corretamente

## 🔧 **Troubleshooting**

### ❌ **Se der erro de conexão**
Verifique as configurações no arquivo `backend/.env`:
```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=alimentacao_escolar
DB_PASSWORD=admin123
DB_PORT=5432
```

### ❌ **Se não aparecerem dados no frontend**
1. Verifique se o tenant "Escola de Teste" está ativo
2. Limpe o cache do navegador
3. Verifique o console do navegador para erros
4. Execute o script de verificação

### ❌ **Se houver problemas de performance**
Os índices criados devem resolver, mas se necessário:
```sql
-- Recriar estatísticas do banco
ANALYZE estoque_escolas;
ANALYZE estoque_lotes;
ANALYZE estoque_escolas_historico;
```

## ✅ **Confirmação de Sucesso**

A migração foi bem-sucedida quando:

1. ✅ O tenant "Escola de Teste" existe no banco
2. ✅ Todas as tabelas têm a coluna `tenant_id`
3. ✅ Todos os registros têm `tenant_id` preenchido
4. ✅ Não existem registros órfãos (sem `tenant_id`)
5. ✅ Os índices foram criados
6. ✅ Os triggers estão funcionando
7. ✅ O frontend mostra os dados corretamente

## 🚀 **Próximos Passos**

Após a migração bem-sucedida:

1. **Teste as funcionalidades** de estoque escolar
2. **Teste as movimentações** de entrada/saída
3. **Verifique o histórico** de movimentações
4. **Confirme o isolamento** de dados por tenant

---

**📞 Suporte**: Se encontrar problemas, execute o script de verificação e compartilhe os resultados.