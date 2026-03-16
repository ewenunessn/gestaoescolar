# 📅 Sistema de Períodos/Exercícios

## O que é?

O sistema de períodos permite separar os dados por **ano letivo**, evitando que relatórios e dashboards misturem dados de anos diferentes.

## Problema que resolve

**Antes (sem períodos):**
```sql
-- Dashboard PNAE contabilizava TODOS os pedidos de TODOS os anos
SELECT SUM(valor) FROM pedidos WHERE EXTRACT(YEAR FROM data_pedido) = 2026
-- ❌ Problema: Se tiver pedidos de 2024, 2025, 2026... todos são somados
```

**Depois (com períodos):**
```sql
-- Dashboard PNAE contabiliza APENAS o período ativo
SELECT SUM(valor) FROM pedidos WHERE periodo_id = (SELECT id FROM periodos WHERE ativo = true)
-- ✅ Solução: Apenas dados do período ativo (ex: 2026)
```

## Como funciona

### 1. Tabela `periodos`

```sql
CREATE TABLE periodos (
  id SERIAL PRIMARY KEY,
  ano INTEGER NOT NULL UNIQUE,
  descricao VARCHAR(255),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN DEFAULT false,      -- Apenas um pode estar ativo
  fechado BOOLEAN DEFAULT false,     -- Período fechado não permite alterações
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 2. Períodos padrão criados

| Ano  | Descrição        | Data Início | Data Fim   | Status  |
|------|------------------|-------------|------------|---------|
| 2024 | Ano Letivo 2024  | 2024-01-01  | 2024-12-31 | Inativo |
| 2025 | Ano Letivo 2025  | 2025-01-01  | 2025-12-31 | Inativo |
| 2026 | Ano Letivo 2026  | 2026-01-01  | 2026-12-31 | 🟢 ATIVO |

### 3. Tabelas vinculadas a períodos

As seguintes tabelas agora têm `periodo_id`:

- `pedidos` - Pedidos pertencem a um período
- `guias` - Guias de demanda pertencem a um período
- `cardapios` - Cardápios pertencem a um período
- `faturamentos` - Faturamentos pertencem a um período

### 4. Atribuição automática

Quando você cria um novo registro, o sistema:

1. Tenta encontrar o período baseado na data do registro
2. Se não encontrar, usa o período ativo
3. Salva o `periodo_id` automaticamente

**Exemplo:**
```javascript
// Criar pedido em 15/03/2026
await db.query('INSERT INTO pedidos (data_pedido, ...) VALUES ($1, ...)', ['2026-03-15']);
// Sistema automaticamente atribui periodo_id = 3 (período de 2026)
```

## Regras de negócio

### ✅ Apenas um período ativo

- Apenas um período pode estar ativo por vez
- Ao ativar um período, todos os outros são desativados automaticamente
- O período ativo é usado como padrão para novos registros

### 🔒 Períodos fechados

- Períodos fechados não permitem alterações
- Use para "trancar" dados de anos anteriores
- Evita modificações acidentais em dados históricos

### 📊 Relatórios e Dashboards

Todos os relatórios devem filtrar por período:

```javascript
// Dashboard PNAE - apenas período ativo
const periodoAtivo = await db.query('SELECT id FROM periodos WHERE ativo = true');
const pedidos = await db.query('SELECT * FROM pedidos WHERE periodo_id = $1', [periodoAtivo.id]);
```

## Como usar

### Criar novo período

```sql
INSERT INTO periodos (ano, descricao, data_inicio, data_fim, ativo)
VALUES (2027, 'Ano Letivo 2027', '2027-01-01', '2027-12-31', false);
```

### Ativar período

```sql
UPDATE periodos SET ativo = true WHERE ano = 2027;
-- Automaticamente desativa todos os outros
```

### Fechar período

```sql
UPDATE periodos SET fechado = true WHERE ano = 2026;
-- Período 2026 fica "trancado" para alterações
```

### Consultar período ativo

```sql
SELECT * FROM periodos WHERE ativo = true;
```

### Filtrar dados por período

```sql
-- Pedidos do período ativo
SELECT * FROM pedidos WHERE periodo_id = (SELECT id FROM periodos WHERE ativo = true);

-- Pedidos de 2025
SELECT * FROM pedidos WHERE periodo_id = (SELECT id FROM periodos WHERE ano = 2025);

-- Pedidos de todos os períodos
SELECT p.*, per.ano, per.descricao
FROM pedidos p
JOIN periodos per ON p.periodo_id = per.id
ORDER BY per.ano DESC, p.data_pedido DESC;
```

## Migração de dados existentes

A migração já atualizou automaticamente todos os registros existentes:

```sql
-- Pedidos foram vinculados ao período baseado na data_pedido
UPDATE pedidos p
SET periodo_id = per.id
FROM periodos per
WHERE p.data_pedido BETWEEN per.data_inicio AND per.data_fim;

-- Registros sem data foram vinculados ao período ativo
UPDATE pedidos SET periodo_id = (SELECT id FROM periodos WHERE ativo = true)
WHERE periodo_id IS NULL;
```

## Benefícios

### ✅ Separação clara de dados
- Cada ano letivo tem seus próprios dados
- Relatórios não misturam anos diferentes

### ✅ Controle de acesso
- Pode fechar períodos antigos
- Evita alterações acidentais

### ✅ Auditoria
- Sabe exatamente a qual período cada registro pertence
- Facilita prestação de contas

### ✅ Performance
- Consultas mais rápidas (filtra por periodo_id)
- Índices otimizados

### ✅ Flexibilidade
- Pode ter períodos com datas customizadas
- Não precisa seguir ano civil (pode ser fev-dez, por exemplo)

## Exemplo prático: Dashboard PNAE

**Antes:**
```javascript
// Contabilizava TODOS os anos
const pedidos = await db.query(`
  SELECT SUM(valor) FROM pedidos 
  WHERE EXTRACT(YEAR FROM data_pedido) = 2026
`);
// ❌ Se tiver pedidos de 2024, 2025... todos entram
```

**Depois:**
```javascript
// Contabiliza APENAS o período ativo
const periodoAtivo = await db.query('SELECT id FROM periodos WHERE ativo = true');
const pedidos = await db.query(`
  SELECT SUM(valor) FROM pedidos 
  WHERE periodo_id = $1
`, [periodoAtivo.id]);
// ✅ Apenas dados do período 2026
```

## Próximos passos

1. ✅ Criar tabela `periodos`
2. ✅ Adicionar `periodo_id` nas tabelas
3. ✅ Criar triggers de atribuição automática
4. ✅ Migrar dados existentes
5. ⏳ Criar página de gerenciamento de períodos
6. ⏳ Atualizar todos os relatórios para usar períodos
7. ⏳ Adicionar seletor de período nos dashboards

## Aplicar migração

```bash
# No Neon (Vercel)
node backend/migrations/apply-periodos-neon.js

# No local (se necessário)
psql -U postgres -d gestaoescolar -f backend/migrations/20260315_create_periodos_sistema.sql
```

## Verificar

```sql
-- Ver períodos
SELECT * FROM periodos ORDER BY ano DESC;

-- Ver quantos registros por período
SELECT 
  p.ano,
  p.descricao,
  COUNT(DISTINCT ped.id) as total_pedidos,
  COUNT(DISTINCT g.id) as total_guias,
  COUNT(DISTINCT c.id) as total_cardapios
FROM periodos p
LEFT JOIN pedidos ped ON ped.periodo_id = p.id
LEFT JOIN guias g ON g.periodo_id = p.id
LEFT JOIN cardapios c ON c.periodo_id = p.id
GROUP BY p.id, p.ano, p.descricao
ORDER BY p.ano DESC;
```
