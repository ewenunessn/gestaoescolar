# 🚀 Guia: Aplicar Migrações no Neon

**Data:** 16/03/2026  
**Objetivo:** Aplicar todas as migrações de períodos e cardápios no banco Neon (produção)

---

## 📋 Migrações que Serão Aplicadas

1. ✅ **Coluna ocultar_dados em períodos**
   - Arquivo: `20260316_add_ocultar_dados_periodos.sql`
   - Adiciona coluna para ocultar dados de períodos inativos

2. ✅ **Trigger de validação de período ativo**
   - Arquivo: `20260316_add_trigger_periodo_ativo_ocultar_dados.sql`
   - Garante que período ativo sempre tenha `ocultar_dados = false`

3. ✅ **Coluna periodo_id em cardapios_modalidade**
   - Arquivo: `20260316_add_periodo_cardapios_modalidade.sql`
   - Adiciona coluna e trigger para atribuição automática

4. ✅ **Remover tabelas antigas de cardápios**
   - Arquivo: `20260316_remover_cardapios_antigo.sql`
   - Remove `cardapios` e `cardapio_refeicoes` (sistema antigo)

5. ✅ **Período individual por usuário**
   - Arquivo: `20260316_add_periodo_usuario.sql`
   - Adiciona coluna `periodo_selecionado_id` em `usuarios`

---

## 🔧 Como Executar

### Opção 1: Usando variável de ambiente (Recomendado)

```bash
# Windows (PowerShell)
$env:DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"
node backend/migrations/aplicar-todas-migracoes-neon.js

# Linux/Mac
DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require" node backend/migrations/aplicar-todas-migracoes-neon.js
```

### Opção 2: Editando o arquivo

1. Abra `backend/migrations/aplicar-todas-migracoes-neon.js`
2. Localize a linha:
   ```javascript
   const NEON_CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://...';
   ```
3. Substitua pela sua connection string do Neon
4. Execute:
   ```bash
   node backend/migrations/aplicar-todas-migracoes-neon.js
   ```

---

## 📊 O Que o Script Faz

### 1. Aplica as Migrações
- Executa cada arquivo SQL na ordem correta
- Ignora erros de "já existe" (seguro para re-executar)
- Para em caso de erro crítico

### 2. Verificações Finais
- Lista todos os períodos e seus status
- Mostra triggers criados
- Verifica tabelas de cardápios (antigas e novas)
- Testa o filtro de `ocultar_dados`
- Mostra estrutura de `cardapios_modalidade`

### 3. Relatório Completo
- Tabelas com dados formatados
- Status de cada migração
- Resumo final

---

## ✅ Resultado Esperado

```
🚀 APLICANDO TODAS AS MIGRAÇÕES NO NEON

======================================================================

📋 Migrações a serem aplicadas:
   1. Adiciona coluna para ocultar dados de períodos inativos
   2. Garante que período ativo sempre tenha ocultar_dados=false
   3. Adiciona coluna periodo_id e trigger de atribuição automática
   4. Remove tabelas cardapios e cardapio_refeicoes (sistema antigo)
   5. Adiciona coluna periodo_selecionado_id em usuarios

======================================================================

🔧 1. Adicionar coluna ocultar_dados em períodos
----------------------------------------------------------------------
✅ Adiciona coluna para ocultar dados de períodos inativos

🔧 2. Trigger para período ativo sempre visível
----------------------------------------------------------------------
✅ Garante que período ativo sempre tenha ocultar_dados=false

🔧 3. Adicionar periodo_id em cardapios_modalidade
----------------------------------------------------------------------
✅ Adiciona coluna periodo_id e trigger de atribuição automática

🔧 4. Remover tabelas antigas de cardápios
----------------------------------------------------------------------
✅ Remove tabelas cardapios e cardapio_refeicoes (sistema antigo)

🔧 5. Adicionar período individual por usuário
----------------------------------------------------------------------
✅ Adiciona coluna periodo_selecionado_id em usuarios

======================================================================
📊 VERIFICAÇÕES FINAIS

1️⃣  Períodos:
┌─────────┬────┬──────┬───────┬─────────┬───────────────┐
│ (index) │ id │ ano  │ ativo │ fechado │ ocultar_dados │
├─────────┼────┼──────┼───────┼─────────┼───────────────┤
│ 0       │ 3  │ 2026 │ true  │ false   │ false         │
│ 1       │ 2  │ 2025 │ false │ false   │ false         │
│ 2       │ 1  │ 2024 │ false │ false   │ false         │
└─────────┴────┴──────┴───────┴─────────┴───────────────┘

2️⃣  Triggers de períodos:
[Lista de triggers criados]

3️⃣  Tabelas de cardápios:
┌─────────┬──────────────────────────┬──────────────────┐
│ (index) │ table_name               │ status           │
├─────────┼──────────────────────────┼──────────────────┤
│ 0       │ 'cardapio_refeicoes_dia' │ '✅ Sistema novo' │
│ 1       │ 'cardapios_modalidade'   │ '✅ Sistema novo' │
└─────────┴──────────────────────────┴──────────────────┘

======================================================================
✅ TODAS AS MIGRAÇÕES APLICADAS COM SUCESSO!

📝 Resumo:
   ✅ Coluna ocultar_dados adicionada em períodos
   ✅ Trigger de validação de período ativo criado
   ✅ Coluna periodo_id adicionada em cardapios_modalidade
   ✅ Trigger de atribuição automática de período criado
   ✅ Tabelas antigas de cardápios removidas (se existiam)
   ✅ Coluna periodo_selecionado_id adicionada em usuarios
   ✅ Sistema pronto para produção!
```

---

## ⚠️ Avisos Importantes

### 1. Backup
Embora as migrações sejam seguras, é recomendado fazer backup antes:
- Neon faz backups automáticos
- Você pode criar um snapshot manual no dashboard

### 2. Tabelas Antigas
Se houver dados na tabela `cardapios` antiga, eles serão REMOVIDOS.
O script mostra os dados antes de remover e aguarda 5 segundos.

### 3. Re-execução
O script é seguro para re-executar:
- Ignora erros de "já existe"
- Não duplica dados
- Pode ser usado para verificar o estado

### 4. Rollback
Se precisar reverter:
```sql
-- Remover coluna ocultar_dados
ALTER TABLE periodos DROP COLUMN IF EXISTS ocultar_dados;

-- Remover trigger
DROP TRIGGER IF EXISTS trigger_periodo_ativo_visivel ON periodos;
DROP FUNCTION IF EXISTS garantir_periodo_ativo_visivel();

-- Remover coluna periodo_id de cardapios_modalidade
ALTER TABLE cardapios_modalidade DROP COLUMN IF EXISTS periodo_id;
```

---

## 🔍 Verificação Manual

Após executar, você pode verificar manualmente no Neon:

```sql
-- 1. Verificar períodos
SELECT * FROM periodos ORDER BY ano DESC;

-- 2. Verificar triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%periodo%';

-- 3. Verificar tabelas de cardápios
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'cardapio%';

-- 4. Testar filtro
SELECT COUNT(*) FROM cardapios_modalidade cm
LEFT JOIN periodos p ON cm.periodo_id = p.id
WHERE (p.ocultar_dados = false OR p.ocultar_dados IS NULL);
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique a connection string
2. Confirme que tem permissões de ALTER TABLE
3. Verifique os logs do script
4. Execute as migrações manualmente uma por uma

---

## ✅ Checklist Pós-Migração

- [ ] Script executou sem erros
- [ ] Períodos têm coluna `ocultar_dados`
- [ ] Trigger `trigger_periodo_ativo_visivel` existe
- [ ] `cardapios_modalidade` tem coluna `periodo_id`
- [ ] Tabelas antigas (`cardapios`, `cardapio_refeicoes`) foram removidas
- [ ] `usuarios` tem coluna `periodo_selecionado_id`
- [ ] Filtro de períodos funcionando
- [ ] Backend rodando sem erros
- [ ] Frontend carregando cardápios corretamente
- [ ] Seletor de período aparecendo no header

---

**Última atualização:** 16/03/2026  
**Versão:** 1.0.0
