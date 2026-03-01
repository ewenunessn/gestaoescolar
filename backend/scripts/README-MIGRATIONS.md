# Scripts de Migration

## Status Atual

✅ **Migration de Competência aplicada em ambos os ambientes:**
- Local (PostgreSQL)
- Vercel (Neon)

## Scripts Disponíveis

### 1. Verificar Status
Verifica se a migration está aplicada em ambos os ambientes:

```bash
node backend/scripts/check-migration-status.js
```

**Saída esperada:**
- ✅ Coluna 'data_entrega' existe
- ✅ View 'vw_entregas_programadas' existe
- ✅ Índice criado
- 📊 Estatísticas de uso

### 2. Aplicar Migration Local
Aplica a migration no banco local (PostgreSQL):

```bash
node backend/scripts/apply-competencia-migration.js
```

### 3. Aplicar Migration Vercel
Aplica a migration no banco Vercel (Neon):

```bash
node backend/scripts/apply-competencia-neon.js
```

## Migrations Disponíveis

### 20250301_add_competencia_fields.sql
**Objetivo:** Separar conceito de "quando entregar" vs "para qual mês contabilizar"

**Adiciona:**
- Coluna `data_entrega` (DATE) - quando o produto será entregue fisicamente
- View `vw_entregas_programadas` - facilita consultas
- Índice para performance
- Comentários explicativos

**Uso:**
```sql
-- A guia define o mês de competência (consumo)
-- A data_entrega define quando será entregue fisicamente

-- Exemplo: Entregar em 25/02 para consumo em março
INSERT INTO guia_produto_escola (
  guia_id,           -- Guia 03/2026 (competência)
  produto_id,
  escola_id,
  quantidade,
  unidade,
  data_entrega       -- 2026-02-25 (entrega física)
) VALUES (
  123,               -- Guia de março/2026
  456,
  789,
  50,
  'Kg',
  '2026-02-25'       -- Entrega antecipada
);
```

## Troubleshooting

### Erro: Coluna já existe
Se você receber erro dizendo que a coluna já existe, a migration já foi aplicada. Use o script de verificação:

```bash
node backend/scripts/check-migration-status.js
```

### Erro de Conexão
Verifique se as variáveis de ambiente estão configuradas:

**Local:**
```env
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/alimentacao_escolar
```

**Vercel:**
```env
POSTGRES_URL=postgresql://neondb_owner:...@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Reverter Migration
Se precisar reverter (não recomendado em produção):

```sql
-- Remover view
DROP VIEW IF EXISTS vw_entregas_programadas;

-- Remover índice
DROP INDEX IF EXISTS idx_guia_produto_escola_data_entrega;

-- Remover coluna (CUIDADO: perde dados!)
ALTER TABLE guia_produto_escola DROP COLUMN IF EXISTS data_entrega;
```

## Próximas Migrations

Para criar uma nova migration:

1. Criar arquivo em `backend/src/migrations/` com formato: `YYYYMMDD_descricao.sql`
2. Criar script de aplicação em `backend/scripts/apply-nome-migration.js`
3. Testar no ambiente local primeiro
4. Aplicar no Vercel
5. Atualizar este README

## Histórico de Migrations

| Data | Arquivo | Descrição | Status |
|------|---------|-----------|--------|
| 2024-12-15 | 20241215_create_guias_tables.sql | Criar tabelas de guias | ✅ Aplicado |
| 2025-02-28 | 20250228_create_historico_entregas.sql | Histórico de entregas parciais | ✅ Aplicado |
| 2025-03-01 | 20250301_add_competencia_fields.sql | Separar competência e data entrega | ✅ Aplicado |
