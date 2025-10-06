# 🔄 Guia de Migração - Pedidos Flexíveis

## ⚠️ IMPORTANTE

Este guia mostra como migrar do sistema antigo (pedidos por contrato) para o novo sistema (pedidos flexíveis com múltiplos fornecedores).

## 🎯 Opções de Migração

### Opção 1: Instalação Nova (Recomendado se não tem dados)

```bash
cd backend
node run-migration-pedidos.js
```

✅ **Vantagens:**
- Simples e rápido
- Estrutura limpa

❌ **Desvantagens:**
- Perde dados existentes

---

### Opção 2: Migração com Dados Existentes

Se você já tem pedidos no sistema antigo e quer mantê-los:

#### Passo 1: Backup
```bash
# Fazer backup das tabelas
pg_dump -U postgres -d alimentacao_escolar -t pedidos -t pedido_itens > backup_pedidos_antigo.sql
```

#### Passo 2: Alterar Estrutura
```bash
psql -U postgres -d alimentacao_escolar
```

```sql
-- Remover constraint de contrato
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_contrato_id_fkey;

-- Tornar escola_id opcional
ALTER TABLE pedidos ALTER COLUMN escola_id DROP NOT NULL;

-- Remover coluna contrato_id (dados serão perdidos)
ALTER TABLE pedidos DROP COLUMN IF EXISTS contrato_id;

-- Remover índice antigo
DROP INDEX IF EXISTS idx_pedidos_contrato;

-- Verificar estrutura
\d pedidos
```

#### Passo 3: Verificar
```sql
-- Ver pedidos existentes
SELECT id, numero, escola_id, status, valor_total FROM pedidos LIMIT 5;

-- Sair
\q
```

---

### Opção 3: Recriar Tudo (Limpar e Começar)

```bash
psql -U postgres -d alimentacao_escolar
```

```sql
-- Remover tabelas antigas
DROP TABLE IF EXISTS pedido_itens CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;

-- Sair
\q
```

```bash
# Criar tabelas novas
node run-migration-pedidos.js
```

---

## 🧪 Testar Migração

### 1. Verificar Estrutura
```bash
psql -U postgres -d alimentacao_escolar
```

```sql
-- Ver estrutura da tabela pedidos
\d pedidos

-- Deve mostrar:
-- - escola_id (nullable)
-- - SEM contrato_id
```

### 2. Testar Backend
```bash
cd backend
npm run dev
```

```bash
# Em outro terminal
curl http://localhost:3000/api/pedidos/produtos-disponiveis
```

Deve retornar lista de produtos de todos os contratos ativos.

### 3. Testar Frontend
```bash
cd frontend
npm run dev
```

Acessar: `http://localhost:5173/pedidos/novo`

Deve mostrar:
- ✅ Autocomplete com todos os produtos
- ✅ Produtos agrupados por fornecedor
- ✅ Campo escola opcional

---

## 📊 Comparação

### ANTES (Sistema Antigo)
```sql
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(50),
  contrato_id INTEGER NOT NULL,  -- ❌ Obrigatório
  escola_id INTEGER NOT NULL,     -- ❌ Obrigatório
  ...
);
```

### DEPOIS (Sistema Novo)
```sql
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(50),
  -- contrato_id REMOVIDO        -- ✅ Não existe mais
  escola_id INTEGER,              -- ✅ Opcional
  ...
);
```

---

## 🔍 Verificações Pós-Migração

### 1. Estrutura do Banco
```sql
-- Conectar
psql -U postgres -d alimentacao_escolar

-- Verificar tabelas
\dt

-- Deve mostrar:
-- pedidos
-- pedido_itens

-- Verificar colunas de pedidos
\d pedidos

-- NÃO deve ter: contrato_id
-- Deve ter: escola_id (nullable)
```

### 2. Endpoints da API
```bash
# Listar produtos disponíveis (NOVO)
curl http://localhost:3000/api/pedidos/produtos-disponiveis

# Criar pedido sem contrato (NOVO)
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "itens": [
      {"contrato_produto_id": 1, "quantidade": 100}
    ]
  }'
```

### 3. Frontend
- ✅ Página /pedidos/novo carrega
- ✅ Autocomplete funciona
- ✅ Mostra todos os produtos
- ✅ Agrupa por fornecedor
- ✅ Permite adicionar múltiplos fornecedores

---

## 🐛 Problemas Comuns

### Erro: "column contrato_id does not exist"
**Solução:** Você ainda tem código antigo. Certifique-se de:
1. Atualizar todos os arquivos do backend
2. Reiniciar o servidor

### Erro: "null value in column escola_id"
**Solução:** Isso é normal agora! Escola é opcional.
- No código antigo: `escola_id INTEGER NOT NULL`
- No código novo: `escola_id INTEGER` (nullable)

### Frontend não mostra produtos
**Solução:** 
1. Verificar se backend está rodando
2. Verificar endpoint: `GET /api/pedidos/produtos-disponiveis`
3. Verificar se há contratos ativos com produtos

---

## 📝 Checklist de Migração

- [ ] Backup dos dados (se necessário)
- [ ] Atualizar estrutura do banco
- [ ] Verificar tabelas criadas
- [ ] Testar endpoint de produtos disponíveis
- [ ] Iniciar backend
- [ ] Iniciar frontend
- [ ] Testar criação de pedido
- [ ] Testar com múltiplos fornecedores
- [ ] Verificar listagem de pedidos
- [ ] Verificar detalhes de pedido

---

## 🚀 Comandos Rápidos

```bash
# Migração completa (limpa tudo)
cd backend
psql -U postgres -d alimentacao_escolar -c "DROP TABLE IF EXISTS pedido_itens CASCADE; DROP TABLE IF EXISTS pedidos CASCADE;"
node run-migration-pedidos.js
npm run dev

# Em outro terminal
cd frontend
npm run dev
```

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs do backend**
   ```bash
   # Ver erros no console onde o backend está rodando
   ```

2. **Verificar estrutura do banco**
   ```bash
   psql -U postgres -d alimentacao_escolar
   \d pedidos
   \d pedido_itens
   ```

3. **Verificar arquivos atualizados**
   - `backend/src/migrations/create_pedidos_tables.sql`
   - `backend/src/modules/pedidos/controllers/pedidoController.ts`
   - `frontend/src/pages/NovoPedido.tsx`

---

## ✅ Migração Concluída!

Após seguir este guia, você terá:

- ✅ Sistema de pedidos flexível
- ✅ Múltiplos fornecedores por pedido
- ✅ Escola opcional
- ✅ Busca de produtos de qualquer contrato
- ✅ Interface moderna com autocomplete

**Pronto para usar! 🎉**
