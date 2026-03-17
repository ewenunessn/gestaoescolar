# 🔒 Funcionalidade: Ocultar Dados de Períodos Inativos

**Data:** 16/03/2026  
**Versão:** 1.0.0

---

## 📋 Descrição

Permite ocultar pedidos, guias e cardápios de períodos inativos nas listagens gerais do sistema, mantendo apenas os dados do período ativo visíveis.

---

## 🎯 Objetivo

Quando você tem múltiplos anos letivos cadastrados, pode querer visualizar apenas os dados do período atual nas listagens, ocultando dados de anos anteriores para:
- Melhorar a performance das consultas
- Reduzir a poluição visual nas listagens
- Focar apenas no período ativo
- Manter dados históricos acessíveis quando necessário

---

## 🔧 Implementação

### Banco de Dados

Nova coluna na tabela `periodos`:

```sql
ALTER TABLE periodos 
ADD COLUMN ocultar_dados BOOLEAN DEFAULT false;
```

**Comportamento:**
- `ocultar_dados = false` (padrão): Dados do período aparecem nas listagens
- `ocultar_dados = true`: Dados do período são ocultados nas listagens gerais

---

## 🎨 Interface

### Página de Gerenciamento de Períodos

**Indicador Visual:**
- Chip "Dados ocultos" aparece ao lado do status do período quando `ocultar_dados = true`

**Botão de Toggle:**
- Ícone de olho (👁️) para exibir dados
- Ícone de olho cortado (🚫👁️) para ocultar dados
- Disponível apenas para períodos inativos (não ativo e não fechado)

**Localização:**
- Coluna "Ações" da tabela de períodos
- Primeiro botão da esquerda para direita

---

## 📊 Como Usar

### 1. Ocultar Dados de um Período Inativo

1. Acesse "Configurações > Períodos"
2. Encontre o período inativo que deseja ocultar
3. Clique no ícone de olho (👁️) na coluna "Ações"
4. Os dados deste período serão ocultados nas listagens

**Resultado:**
- Pedidos deste período não aparecem na lista de pedidos
- Guias deste período não aparecem na lista de guias
- Cardápios deste período não aparecem na lista de cardápios
- Chip "Dados ocultos" aparece no status do período

### 2. Exibir Dados Novamente

1. Acesse "Configurações > Períodos"
2. Encontre o período com "Dados ocultos"
3. Clique no ícone de olho cortado (🚫👁️)
4. Os dados voltam a aparecer nas listagens

---

## 🔍 Regras de Negócio

### Quando Pode Ocultar Dados

✅ **Permitido:**
- Períodos inativos (não ativo e não fechado)

❌ **Não Permitido:**
- Período ativo (sempre visível)
- Períodos fechados (mantém visibilidade para auditoria)

### Comportamento Automático

**Ao criar novo período:**
- `ocultar_dados = false` (dados visíveis por padrão)

**Ao ativar período:**
- `ocultar_dados` é automaticamente definido como `false`
- Garante que dados do período ativo sempre apareçam

**Ao fechar período:**
- `ocultar_dados` permanece como está
- Períodos fechados mantêm visibilidade para consulta histórica

---

## 💡 Casos de Uso

### Caso 1: Início do Ano Letivo 2027

**Situação:**
- Período 2026 está ativo
- Período 2025 está inativo
- Período 2024 está inativo

**Ação:**
1. Ocultar dados de 2024 e 2025
2. Criar período 2027
3. Ativar período 2027

**Resultado:**
- Apenas dados de 2027 aparecem nas listagens
- Dados de 2024, 2025 e 2026 ficam ocultos
- Sistema mais limpo e focado no ano atual

### Caso 2: Consulta Histórica

**Situação:**
- Precisa consultar dados de 2025

**Ação:**
1. Ir em "Configurações > Períodos"
2. Clicar no ícone de olho cortado do período 2025
3. Dados de 2025 voltam a aparecer nas listagens

**Resultado:**
- Pode consultar pedidos, guias e cardápios de 2025
- Após consulta, pode ocultar novamente

### Caso 3: Auditoria de Período Fechado

**Situação:**
- Período 2025 foi fechado para auditoria

**Ação:**
- Nenhuma ação necessária

**Resultado:**
- Dados de períodos fechados sempre ficam visíveis
- Não é possível ocultar dados de períodos fechados
- Garante acesso para auditoria e prestação de contas

---

## 🔄 Integração com Listagens

### Implementação Futura

Para que a ocultação funcione nas listagens, os controllers precisam ser atualizados:

**Exemplo - Controller de Pedidos:**

```typescript
// Antes
const pedidos = await db.query('SELECT * FROM pedidos');

// Depois
const pedidos = await db.query(`
  SELECT p.* 
  FROM pedidos p
  INNER JOIN periodos per ON p.periodo_id = per.id
  WHERE per.ocultar_dados = false OR per.ativo = true
`);
```

**Controllers a Atualizar:**
- ✅ `pedidosController.ts` - Listar pedidos
- ✅ `guiasController.ts` - Listar guias
- ✅ `cardapiosController.ts` - Listar cardápios
- ✅ `faturamentosController.ts` - Listar faturamentos

---

## 📈 Benefícios

### Performance
- ✅ Menos dados processados nas consultas
- ✅ Queries mais rápidas
- ✅ Menos dados transferidos para o frontend

### Usabilidade
- ✅ Interface mais limpa
- ✅ Foco no período atual
- ✅ Menos scroll nas listagens
- ✅ Reduz confusão entre anos

### Flexibilidade
- ✅ Pode exibir/ocultar a qualquer momento
- ✅ Não deleta dados (apenas oculta)
- ✅ Períodos fechados sempre visíveis
- ✅ Período ativo sempre visível

---

## ⚠️ Importante

### O que NÃO faz

❌ **Não deleta dados** - Apenas oculta nas listagens
❌ **Não impede acesso direto** - Dados ainda podem ser acessados por ID
❌ **Não afeta relatórios** - Relatórios podem incluir todos os períodos
❌ **Não afeta auditoria** - Períodos fechados sempre visíveis

### Segurança

✅ **Dados preservados** - Nenhum dado é deletado
✅ **Reversível** - Pode exibir dados a qualquer momento
✅ **Auditável** - Períodos fechados não podem ser ocultados
✅ **Transparente** - Indicador visual mostra quando dados estão ocultos

---

## 🧪 Testes

### Teste 1: Ocultar Dados

1. Criar período inativo
2. Adicionar pedidos ao período
3. Ocultar dados do período
4. Verificar que pedidos não aparecem na listagem

✅ **Resultado esperado:** Pedidos não aparecem

### Teste 2: Exibir Dados

1. Período com dados ocultos
2. Clicar para exibir dados
3. Verificar que pedidos voltam a aparecer

✅ **Resultado esperado:** Pedidos aparecem novamente

### Teste 3: Período Ativo

1. Tentar ocultar dados do período ativo
2. Verificar que botão não está disponível

✅ **Resultado esperado:** Botão não aparece para período ativo

### Teste 4: Período Fechado

1. Fechar período
2. Tentar ocultar dados
3. Verificar que botão não está disponível

✅ **Resultado esperado:** Botão não aparece para período fechado

---

## 📝 Arquivos Modificados

### Backend
- `backend/migrations/20260316_add_ocultar_dados_periodos.sql` - Migração SQL
- `backend/src/controllers/periodosController.ts` - Atualizado para incluir ocultar_dados

### Frontend
- `frontend/src/services/periodos.ts` - Interface atualizada
- `frontend/src/pages/GerenciamentoPeriodos.tsx` - UI para toggle

---

## 🚀 Próximos Passos

### Implementação Completa

Para que a funcionalidade funcione completamente, é necessário:

1. ✅ Adicionar coluna `ocultar_dados` na tabela
2. ✅ Atualizar controller de períodos
3. ✅ Adicionar UI para toggle
4. ⏳ Atualizar controllers de listagens (pedidos, guias, cardápios)
5. ⏳ Adicionar filtro nas queries
6. ⏳ Testar em todas as listagens

---

## ✅ Conclusão

A funcionalidade de ocultar dados de períodos inativos está implementada na interface de gerenciamento. Para que funcione completamente nas listagens, os controllers precisam ser atualizados para filtrar dados baseado no campo `ocultar_dados`.

**Status:** Interface completa, integração com listagens pendente

---

**Última atualização:** 16/03/2026  
**Versão:** 1.0.0
