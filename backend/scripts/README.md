# 🧪 Scripts de Teste e Manutenção

Este diretório contém scripts úteis para testar, popular e manter o sistema.

---

## 🚀 Scripts Principais

### 1. Suite Completa de Testes

Execute todos os testes de uma vez:

```bash
# Windows
run-all-tests.bat

# Linux/Mac
./run-all-tests.sh
```

**O que faz:**
1. Popula dados de teste
2. Executa testes de performance
3. Verifica estoque
4. Gera relatórios

---

### 2. Popular Dados de Teste

```bash
node seed-test-data.js
```

**Cria:**
- 5 escolas de teste
- 8 produtos básicos
- Estoque escolar
- Competência atual
- Itens na guia de demanda

**Saída:** IDs válidos para usar nos testes

---

### 3. Teste de Performance

```bash
node test-performance.js
```

**Testa:**
- Login
- Listar competências
- Listar escolas
- Listar produtos
- Status de escolas
- Estoque escolar
- Health check

**Gera:** `docs/RELATORIO-PERFORMANCE.md`

---

### 4. Verificar Estoque

```bash
node verificar-estoque-atual.js
```

**Verifica:**
- Estoque de todas as escolas
- Produtos com estoque baixo
- Inconsistências

---

## 📋 Outros Scripts Úteis

### Banco de Dados

```bash
# Aplicar migrações
node apply-*.js

# Sincronizar com Neon
node sync-all-to-neon.js

# Verificar estrutura
node check-*.js
```

### Estoque Central

```bash
# Testar estoque central
node test-estoque-central.js

# Testar FEFO
node test-fefo-estoque.js

# Verificar estoque de produto específico
node verificar-estoque-banana.js
```

### Pedidos e Faturamento

```bash
# Verificar pedidos
node verificar-pedidos-com-faturamento.js

# Testar criação de faturamento
node test-criar-faturamento-status.js

# Debug status
node debug-status-pedido-faturamento.js
```

### Entregas

```bash
# Verificar entregas
node verificar-entregas-recentes.js

# Verificar comprovantes
node verificar-comprovantes.js

# Simular entrega
node simular-entrega-completa.js
```

---

## 🎯 Fluxo de Trabalho Recomendado

### Primeira Vez

1. Popular dados de teste:
```bash
node seed-test-data.js
```

2. Executar suite completa:
```bash
# Windows
run-all-tests.bat

# Linux/Mac
./run-all-tests.sh
```

### Desenvolvimento Diário

1. Antes de fazer mudanças:
```bash
node test-performance.js
```

2. Após fazer mudanças:
```bash
node test-performance.js
```

3. Comparar resultados

### Antes de Deploy

```bash
# Windows
run-all-tests.bat

# Linux/Mac
./run-all-tests.sh
```

---

## 📊 Interpretação de Resultados

### Performance
- 🟢 < 100ms: Excelente
- 🟡 100-300ms: Bom
- 🟠 300-1000ms: Regular
- 🔴 > 1000ms: Lento

### Taxa de Sucesso
- 🟢 > 95%: Excelente
- 🟡 90-95%: Bom
- 🟠 80-90%: Regular
- 🔴 < 80%: Crítico

---

## 🛠️ Troubleshooting

### Erro: "Escola não encontrada"
**Solução:** Execute `node seed-test-data.js`

### Erro: "Cannot connect to database"
**Solução:** Verifique se o PostgreSQL está rodando e as credenciais no `.env`

### Erro: "Module not found"
**Solução:** Execute `npm install` no diretório backend

### Erro: "Permission denied" (Linux/Mac)
**Solução:** Execute `chmod +x run-all-tests.sh`

---

## 📚 Documentação

- `docs/TESTE-IDS-VALIDOS.md` - IDs válidos para testes
- `docs/RELATORIO-PERFORMANCE.md` - Relatório de performance
- `docs/PERFORMANCE-E-SEGURANCA.md` - Guia de otimizações
- `docs/IMPLEMENTACAO-RECOMENDACOES.md` - Detalhes das implementações

---

## 🔒 Segurança

⚠️ **NUNCA** commite arquivos com:
- Senhas reais
- Tokens de acesso
- Credenciais de produção
- Dados sensíveis

Use sempre variáveis de ambiente (`.env`) para credenciais.

---

**Última atualização:** 06/03/2026
