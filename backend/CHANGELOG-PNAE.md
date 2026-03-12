# Changelog - Implementação PNAE

## 🎯 Resumo das Implementações

### ✅ Campo Parcelas em Modalidades
**Data**: 12/03/2026

**Mudanças:**
1. Adicionado campo `parcelas` na tabela `modalidades`
2. Valor padrão: 1 parcela
3. Permite configurar quantas vezes o repasse se repete no ano
4. Exemplos:
   - 1 parcela: Repasse único anual
   - 12 parcelas: Repasse mensal
   - 4 parcelas: Repasse trimestral
   - 8 parcelas: Repasse a cada 1,5 meses

**Impacto no Cálculo PNAE:**
- Valor recebido do FNDE = Σ (valor_repasse × parcelas) de todas modalidades ativas
- Percentual AF = (Valor gasto com AF / Valor recebido FNDE) × 100

**Arquivos Modificados:**
- `backend/migrations/20260312_add_parcelas_modalidades.sql`
- `backend/src/modules/cardapios/controllers/modalidadeController.ts`
- `backend/src/controllers/pnaeController.ts`
- `frontend/src/pages/Modalidades.tsx`
- `frontend/src/services/modalidades.ts`

---

### ✅ Atualização Lei 15.226/2025
**Data**: 12/03/2026

**Mudanças:**
1. Percentual mínimo de agricultura familiar aumentado de 30% para 45%
2. Vigência: A partir de 2026
3. Base legal: Lei nº 15.226/2025

**Antes:**
- Mínimo obrigatório: 30% do valor recebido do FNDE

**Depois:**
- Mínimo obrigatório: 45% do valor recebido do FNDE

**Arquivos Modificados:**
- `backend/src/controllers/pnaeController.ts`
- `backend/test-pnae-dashboard.js`
- `backend/exemplo-parcelas.js`
- `backend/PNAE-COMPLIANCE.md`
- `backend/PNAE-API.md`

---

### ✅ Correção do Cálculo PNAE
**Data**: 12/03/2026

**Problema Anterior:**
- Sistema calculava percentual AF sobre total de pedidos
- Fórmula incorreta: (Valor AF / Total Pedidos) × 100

**Correção Implementada:**
- Sistema agora calcula sobre valor recebido do FNDE
- Fórmula correta: (Valor AF / Valor Recebido FNDE) × 100
- Valor recebido FNDE = Soma dos repasses das modalidades ativas × parcelas

**Exemplo Prático:**
```
Município recebe R$ 2.012.586,00 do FNDE
Deve gastar no mínimo R$ 905.663,70 (45%) com AF
Gastou R$ 30.000,00 com AF
Percentual atual: 1,49%
Status: ❌ NÃO ATENDE (faltam R$ 875.663,70)
```

---

### 📊 Dashboard PNAE Atualizado

**Novos Campos Exibidos:**
1. Valor Recebido FNDE (base de cálculo)
2. Percentual Mínimo Obrigatório (45%)
3. Valor Mínimo Obrigatório (45% do FNDE)
4. Valor Faltante para atingir meta
5. Percentual AF calculado corretamente

**Alertas:**
- ✅ Verde: Atende requisito de 45%
- ❌ Vermelho: Não atende requisito de 45%
- ⚠️ Amarelo: Fornecedores com DAP/CAF vencida ou vencendo

---

## 🧪 Como Testar

### 1. Testar Cálculo do Dashboard
```bash
cd backend
node test-pnae-dashboard.js
```

### 2. Testar Exemplo com Parcelas
```bash
cd backend
node exemplo-parcelas.js
```

### 3. Aplicar Migrations
```bash
# Local
cd backend
node apply-parcelas-modalidades.js

# Produção (Neon)
cd backend
node apply-parcelas-neon.js
```

---

## 📝 Próximos Passos

1. ✅ Campo parcelas implementado
2. ✅ Cálculo correto sobre valor FNDE
3. ✅ Lei 15.226/2025 aplicada (45%)
4. ✅ Dashboard atualizado
5. ⏳ Testar com dados reais
6. ⏳ Treinar usuários sobre novo campo parcelas
7. ⏳ Configurar parcelas corretas para cada modalidade

---

## 📚 Referências

- Lei 11.947/2009: Institui o PNAE
- Lei 15.226/2025: Aumenta percentual mínimo para 45%
- Resolução FNDE: Valores per capita por modalidade
