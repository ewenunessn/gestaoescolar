# 📝 IDs Válidos para Testes

Este documento lista IDs válidos que podem ser usados para testar o sistema após popular os dados de teste.

## 🚀 Como Popular Dados de Teste

Execute o script de seed para criar dados de teste:

```bash
cd backend
node scripts/seed-test-data.js
```

O script irá:
- ✅ Criar 5 escolas de teste (se não existirem)
- ✅ Criar 8 produtos básicos (se não existirem)
- ✅ Popular estoque escolar com quantidades aleatórias
- ✅ Criar competência do mês atual
- ✅ Adicionar itens na guia de demanda

---

## 📊 IDs Padrão Criados

### Escolas
Após executar o seed, você terá escolas com IDs sequenciais. O script mostrará os IDs exatos criados.

**Exemplo de escolas criadas:**
- ID 1: Escola Municipal Centro (Rota 1)
- ID 2: Escola Estadual Norte (Rota 1)
- ID 3: Escola Municipal Sul (Rota 2)
- ID 4: Escola Estadual Leste (Rota 2)
- ID 5: Escola Municipal Oeste (Rota 3)

### Produtos
**Exemplo de produtos criados:**
- ID 1: Arroz Branco (Kg)
- ID 2: Feijão Preto (Kg)
- ID 3: Óleo de Soja (L)
- ID 4: Açúcar Cristal (Kg)
- ID 5: Sal Refinado (Kg)
- ID 6: Macarrão (Kg)
- ID 7: Leite Integral (L)
- ID 8: Ovos (Dz)

### Competência
O script cria automaticamente a competência do mês/ano atual.

---

## 🧪 Endpoints para Testar

### 1. Listar Competências
```bash
GET http://localhost:3000/api/guias/competencias
```

### 2. Listar Escolas com Status
```bash
GET http://localhost:3000/api/guias/status-escolas?mes=3&ano=2026
```

### 3. Listar Produtos de uma Escola
```bash
GET http://localhost:3000/api/guias/escola/1/produtos?mes=3&ano=2026
```

### 4. Verificar Estoque de uma Escola
```bash
GET http://localhost:3000/api/estoque-escolar/escola/1
```

### 5. Listar Produtos
```bash
GET http://localhost:3000/api/produtos
```

---

## ⚠️ Tratamento de Erros 404

O sistema agora possui tratamento amigável de erros 404. Se você tentar acessar um recurso que não existe, receberá uma resposta clara:

```json
{
  "success": false,
  "error": "NotFoundError",
  "message": "Escola com ID 999 não encontrado(a)",
  "statusCode": 404
}
```

### Exemplos de Erros Tratados

**Escola não encontrada:**
```bash
GET /api/estoque-escolar/escola/999
# Resposta: "Escola com ID 999 não encontrado(a)"
```

**Produto não encontrado:**
```bash
GET /api/produtos/999
# Resposta: "Produto com ID 999 não encontrado(a)"
```

**Rota não encontrada:**
```bash
GET /api/rota-inexistente
# Resposta: "Rota GET /api/rota-inexistente não encontrada"
```

---

## 🔍 Verificando IDs Válidos

### Via SQL (PostgreSQL)
```sql
-- Listar escolas
SELECT id, nome FROM escolas ORDER BY id LIMIT 10;

-- Listar produtos
SELECT id, nome, unidade FROM produtos ORDER BY id LIMIT 10;

-- Listar competências
SELECT id, mes, ano, nome FROM guias ORDER BY ano DESC, mes DESC;

-- Verificar estoque
SELECT e.nome as escola, p.nome as produto, ee.quantidade_atual
FROM estoque_escolar ee
JOIN escolas e ON e.id = ee.escola_id
JOIN produtos p ON p.id = ee.produto_id
LIMIT 10;
```

### Via API
```bash
# Health check
curl http://localhost:3000/health

# Listar todas as rotas disponíveis
curl http://localhost:3000/

# Testar conexão do banco
curl http://localhost:3000/api/test-db
```

---

## 📈 Script de Performance

Para testar a performance do sistema com os dados populados:

```bash
cd backend
node scripts/test-performance.js
```

O script irá:
- ✅ Fazer login automático
- ✅ Testar todos os endpoints principais
- ✅ Medir tempo de resposta
- ✅ Gerar relatório detalhado

---

## 🛠️ Troubleshooting

### Erro: "Escola com ID X não encontrado(a)"
**Solução:** Execute o script de seed para criar dados de teste:
```bash
node scripts/seed-test-data.js
```

### Erro: "Rota não encontrada"
**Solução:** Verifique a lista de rotas disponíveis:
```bash
curl http://localhost:3000/
```

### Erro: "Referência inválida"
**Solução:** Verifique se os IDs fornecidos existem no banco:
```sql
SELECT id FROM escolas WHERE id = 1;
SELECT id FROM produtos WHERE id = 1;
```

---

## 📚 Documentos Relacionados

- `RELATORIO-PERFORMANCE.md` - Relatório de performance do sistema
- `PERFORMANCE-E-SEGURANCA.md` - Guia de otimizações e segurança
- `GUIA-DEMANDA-REFATORADO.md` - Documentação do módulo de guias

---

## 🔄 Resetar Dados de Teste

Se precisar resetar os dados de teste:

```sql
-- CUIDADO: Isso irá apagar TODOS os dados!
TRUNCATE TABLE guia_produtos_escola CASCADE;
TRUNCATE TABLE estoque_escolar CASCADE;
TRUNCATE TABLE guias CASCADE;
TRUNCATE TABLE produtos CASCADE;
TRUNCATE TABLE escolas CASCADE;
```

Depois execute novamente:
```bash
node scripts/seed-test-data.js
```

---

**Última atualização:** 06/03/2026
