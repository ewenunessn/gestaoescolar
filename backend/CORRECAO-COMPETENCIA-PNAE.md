# Correção: Dashboard PNAE usar Competência ao invés de Data de Criação

## 🐛 Problema Identificado

O Dashboard PNAE estava agrupando os pedidos pela `data_pedido` (data de criação do pedido no sistema) ao invés de usar a `competencia_mes_ano` (mês/ano para qual o pedido é destinado).

### Exemplo do Problema:
```
Pedido criado em: Março/2026
Competência: Abril/2026
❌ ANTES: Aparecia no gráfico em Março
✅ DEPOIS: Aparece no gráfico em Abril
```

## ✅ Solução Implementada

### 1. View Atualizada
**Arquivo**: `backend/migrations/20260312_update_pnae_view_competencia.sql`

- Adicionado campo `competencia_mes_ano` na view `vw_pnae_agricultura_familiar`
- Agora a view retorna tanto `data_pedido` quanto `competencia_mes_ano`

### 2. Controller Atualizado
**Arquivo**: `backend/src/controllers/pnaeController.ts`

**Antes:**
```sql
WHERE EXTRACT(YEAR FROM data_pedido) = $1
GROUP BY EXTRACT(MONTH FROM data_pedido)
```

**Depois:**
```sql
WHERE EXTRACT(YEAR FROM TO_DATE(competencia_mes_ano || '-01', 'YYYY-MM-DD')) = $1
GROUP BY competencia_mes_ano
```

### 3. Formatação de Mês
Adicionado CASE para converter número do mês em nome:
- 1 → Jan/2026
- 2 → Fev/2026
- 3 → Mar/2026
- 4 → Abr/2026
- etc.

## 📊 Resultado

### Antes (Incorreto):
```
Março/2026: R$ 40.000,00 (2 pedidos)
  - Pedido para Abril: R$ 30.000,00
  - Pedido para Maio: R$ 10.000,00
```

### Depois (Correto):
```
Abril/2026: R$ 30.000,00 (1 pedido)
Maio/2026: R$ 10.000,00 (1 pedido)
```

## 🧪 Como Testar

### 1. Testar agrupamento por competência
```bash
cd backend
node test-pnae-competencia.js
```

### 2. Testar dashboard
```bash
cd backend
node test-dashboard-competencia.js
```

### 3. Verificar no frontend
1. Acesse o Dashboard PNAE
2. Crie pedidos com competências diferentes
3. Verifique se o gráfico mostra os valores nas competências corretas

## 📝 Arquivos Modificados

1. `backend/migrations/20260312_update_pnae_view_competencia.sql` - Nova migration
2. `backend/src/controllers/pnaeController.ts` - Controller atualizado
3. `backend/apply-pnae-view-competencia.js` - Script para aplicar local
4. `backend/apply-pnae-view-competencia-neon.js` - Script para aplicar no Neon
5. `backend/test-pnae-competencia.js` - Script de teste
6. `backend/test-dashboard-competencia.js` - Script de teste do dashboard

## ✅ Checklist de Aplicação

- ✅ Migration criada
- ✅ View atualizada localmente
- ✅ View atualizada no Neon
- ✅ Controller atualizado
- ✅ Testes criados
- ✅ Documentação atualizada

## 💡 Conceitos Importantes

### Data de Criação vs Competência

**Data de Criação (`data_pedido`):**
- Quando o pedido foi criado no sistema
- Usado para auditoria e rastreamento
- Não reflete quando o pedido será consumido

**Competência (`competencia_mes_ano`):**
- Para qual mês/ano o pedido é destinado
- Quando os produtos serão entregues/consumidos
- ✅ Correto para relatórios PNAE

### Por que isso importa para o PNAE?

O PNAE exige relatórios mensais de gastos com agricultura familiar. Se um município:
- Cria em Março um pedido para Abril
- Cria em Março um pedido para Maio

O relatório deve mostrar:
- Março: R$ 0,00
- Abril: R$ X (pedido 1)
- Maio: R$ Y (pedido 2)

E não:
- Março: R$ X + Y (ambos os pedidos)
- Abril: R$ 0,00
- Maio: R$ 0,00

## 🚀 Próximos Passos

1. ✅ Correção aplicada
2. ⏳ Testar com dados reais
3. ⏳ Validar relatórios PNAE
4. ⏳ Treinar usuários sobre a diferença entre data de criação e competência
