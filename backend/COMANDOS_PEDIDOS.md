# Comandos Úteis - Sistema de Pedidos

## 🔧 Setup Inicial

### 1. Executar Migration
```bash
cd backend
node run-migration-pedidos.js
```

### 2. Verificar Tabelas Criadas
```bash
# Conectar ao PostgreSQL
psql -U postgres -d alimentacao_escolar

# Listar tabelas
\dt

# Ver estrutura da tabela pedidos
\d pedidos

# Ver estrutura da tabela pedido_itens
\d pedido_itens

# Sair
\q
```

## 🚀 Desenvolvimento

### Iniciar Servidor
```bash
cd backend
npm run dev
```

### Verificar API
```bash
# Health check
curl http://localhost:3000/health

# Listar rotas disponíveis
curl http://localhost:3000/
```

## 📊 Consultas SQL Úteis

### Ver todos os pedidos
```sql
SELECT 
  p.id,
  p.numero,
  p.status,
  p.valor_total,
  c.numero as contrato,
  e.nome as escola,
  f.nome as fornecedor
FROM pedidos p
JOIN contratos c ON p.contrato_id = c.id
JOIN escolas e ON p.escola_id = e.id
JOIN fornecedores f ON c.fornecedor_id = f.id
ORDER BY p.created_at DESC;
```

### Ver itens de um pedido
```sql
SELECT 
  pi.id,
  p.nome as produto,
  pi.quantidade,
  pi.preco_unitario,
  pi.valor_total
FROM pedido_itens pi
JOIN produtos p ON pi.produto_id = p.id
WHERE pi.pedido_id = 1;
```

### Estatísticas rápidas
```sql
SELECT 
  status,
  COUNT(*) as total,
  SUM(valor_total) as valor_total
FROM pedidos
GROUP BY status
ORDER BY total DESC;
```

### Pedidos por escola
```sql
SELECT 
  e.nome as escola,
  COUNT(p.id) as total_pedidos,
  SUM(p.valor_total) as valor_total
FROM escolas e
LEFT JOIN pedidos p ON e.id = p.escola_id
GROUP BY e.id, e.nome
HAVING COUNT(p.id) > 0
ORDER BY total_pedidos DESC;
```

### Produtos mais pedidos
```sql
SELECT 
  p.nome as produto,
  COUNT(pi.id) as vezes_pedido,
  SUM(pi.quantidade) as quantidade_total,
  SUM(pi.valor_total) as valor_total
FROM produtos p
JOIN pedido_itens pi ON p.id = pi.produto_id
GROUP BY p.id, p.nome
ORDER BY vezes_pedido DESC
LIMIT 10;
```

## 🧪 Testes com curl

### Criar pedido de teste
```bash
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "contrato_id": 1,
    "escola_id": 1,
    "data_entrega_prevista": "2025-01-20",
    "observacoes": "Pedido de teste",
    "itens": [
      {
        "contrato_produto_id": 1,
        "quantidade": 100
      }
    ]
  }'
```

### Listar pedidos
```bash
curl http://localhost:3000/api/pedidos
```

### Buscar pedido específico
```bash
curl http://localhost:3000/api/pedidos/1
```

### Aprovar pedido
```bash
curl -X PATCH http://localhost:3000/api/pedidos/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "aprovado"}'
```

### Cancelar pedido
```bash
curl -X POST http://localhost:3000/api/pedidos/1/cancelar \
  -H "Content-Type: application/json" \
  -d '{"motivo": "Teste de cancelamento"}'
```

### Estatísticas
```bash
curl http://localhost:3000/api/pedidos/estatisticas
```

## 🔍 Debug

### Ver logs do servidor
```bash
# No terminal onde o servidor está rodando
# Os logs aparecem automaticamente
```

### Verificar conexão com banco
```bash
curl http://localhost:3000/api/test-db
```

### Testar query específica
```bash
# Conectar ao PostgreSQL
psql -U postgres -d alimentacao_escolar

# Executar query
SELECT * FROM pedidos LIMIT 5;
```

## 🗑️ Limpeza (Desenvolvimento)

### Remover todos os pedidos (CUIDADO!)
```sql
-- Conectar ao PostgreSQL
psql -U postgres -d alimentacao_escolar

-- Remover itens primeiro (por causa da FK)
DELETE FROM pedido_itens;

-- Remover pedidos
DELETE FROM pedidos;

-- Resetar sequências
ALTER SEQUENCE pedidos_id_seq RESTART WITH 1;
ALTER SEQUENCE pedido_itens_id_seq RESTART WITH 1;
```

### Recriar tabelas
```sql
-- Remover tabelas
DROP TABLE IF EXISTS pedido_itens CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;

-- Executar migration novamente
-- node run-migration-pedidos.js
```

## 📦 Backup

### Backup apenas das tabelas de pedidos
```bash
pg_dump -U postgres -d alimentacao_escolar \
  -t pedidos -t pedido_itens \
  > backup_pedidos.sql
```

### Restaurar backup
```bash
psql -U postgres -d alimentacao_escolar < backup_pedidos.sql
```

## 🔄 Atualização

### Adicionar nova coluna (exemplo)
```sql
ALTER TABLE pedidos 
ADD COLUMN numero_nota_fiscal VARCHAR(50);
```

### Criar índice adicional
```sql
CREATE INDEX idx_pedidos_usuario_criacao 
ON pedidos(usuario_criacao_id);
```

## 📈 Monitoramento

### Ver tamanho das tabelas
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('pedidos', 'pedido_itens')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Ver quantidade de registros
```sql
SELECT 
  'pedidos' as tabela,
  COUNT(*) as registros
FROM pedidos
UNION ALL
SELECT 
  'pedido_itens' as tabela,
  COUNT(*) as registros
FROM pedido_itens;
```

## 🎯 Comandos Rápidos

```bash
# Setup completo
cd backend && node run-migration-pedidos.js && npm run dev

# Testar API
curl http://localhost:3000/api/pedidos

# Ver logs em tempo real (Linux/Mac)
tail -f backend/logs/app.log

# Verificar status do PostgreSQL
pg_isready -U postgres

# Conectar ao banco
psql -U postgres -d alimentacao_escolar
```

## 📝 Notas

- Sempre faça backup antes de modificar estruturas
- Use transações para operações críticas
- Monitore o tamanho das tabelas regularmente
- Mantenha índices atualizados
- Documente alterações customizadas
