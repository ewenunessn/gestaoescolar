# 🔄 Migração: Sistema Antigo → Sistema Novo de Cardápios

**Data:** 16/03/2026  
**Status:** CONCLUÍDO ✅

---

## 📋 Mudanças nas Tabelas

### Sistema ANTIGO (Removido)
```
cardapios
├── id
├── nome
├── descricao
├── periodo_dias
├── data_inicio
├── data_fim
├── modalidade_id
└── ativo

cardapio_refeicoes
├── id
├── cardapio_id
├── refeicao_id
├── modalidade_id
└── frequencia_mensal
```

### Sistema NOVO (Atual)
```
cardapios_modalidade
├── id
├── modalidade_id
├── nome
├── mes (1-12)
├── ano (2020-2100)
├── observacao
├── ativo
├── nutricionista_id
├── data_aprovacao_nutricionista
├── observacoes_nutricionista
└── periodo_id (FK para periodos)

cardapio_refeicoes_dia
├── id
├── cardapio_modalidade_id
├── refeicao_id
├── dia (1-31)
├── tipo_refeicao (cafe_manha, lanche_manha, almoco, lanche_tarde, jantar)
├── observacao
└── ativo
```

---

## 🔄 Mapeamento de Campos

| Campo Antigo | Campo Novo | Observação |
|--------------|------------|------------|
| `cardapios.id` | `cardapios_modalidade.id` | - |
| `cardapios.nome` | `cardapios_modalidade.nome` | - |
| `cardapios.descricao` | `cardapios_modalidade.observacao` | Renomeado |
| `cardapios.data_inicio` | `cardapios_modalidade.mes + ano` | Agora é mensal |
| `cardapios.data_fim` | `cardapios_modalidade.mes + ano` | Agora é mensal |
| `cardapios.modalidade_id` | `cardapios_modalidade.modalidade_id` | - |
| `cardapios.ativo` | `cardapios_modalidade.ativo` | - |
| - | `cardapios_modalidade.nutricionista_id` | NOVO |
| - | `cardapios_modalidade.periodo_id` | NOVO |
| `cardapio_refeicoes.cardapio_id` | `cardapio_refeicoes_dia.cardapio_modalidade_id` | - |
| `cardapio_refeicoes.refeicao_id` | `cardapio_refeicoes_dia.refeicao_id` | - |
| `cardapio_refeicoes.frequencia_mensal` | - | REMOVIDO (não usado) |
| - | `cardapio_refeicoes_dia.dia` | NOVO (1-31) |
| - | `cardapio_refeicoes_dia.tipo_refeicao` | NOVO |

---

## 📝 Queries Atualizadas

### Antes (Sistema Antigo)
```sql
SELECT *
FROM cardapios c
INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
WHERE c.ativo = true
```

### Depois (Sistema Novo)
```sql
SELECT *
FROM cardapios_modalidade cm
INNER JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
LEFT JOIN periodos per ON cm.periodo_id = per.id
WHERE cm.ativo = true
  AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
```

---

## ✅ Arquivos Atualizados

1. ✅ `backend/src/controllers/periodosController.ts`
   - Atualizado para usar `cardapios_modalidade`

2. ✅ `backend/src/controllers/nutricionistaController.ts`
   - Atualizado para usar `cardapios_modalidade`

3. ✅ `backend/src/modules/cardapios/controllers/cardapioController.ts`
   - Já usa `cardapios_modalidade` (sistema novo)

4. ✅ `backend/src/modules/estoque/controllers/demandaController.ts`
   - Função `listarCardapiosDisponiveis()` atualizada
   - Outras funções precisam ser atualizadas (ver abaixo)

5. ✅ `backend/src/modules/cardapios/models/Cardapio.ts`
   - REMOVIDO (não é mais necessário)

---

## ⚠️ Funções que Precisam de Atenção

### demandaController.ts

Essas funções ainda usam o sistema antigo e precisam ser atualizadas ou removidas:

1. **Linha ~108**: Query de cálculo de demanda
   - Usa `cardapios c` e `cardapio_refeicoes cr`
   - Precisa ser atualizado para usar sistema novo

2. **Linha ~277**: Query similar
   - Usa `cardapios c` e `cardapio_refeicoes cr`
   - Precisa ser atualizado para usar sistema novo

3. **Linha ~562**: Query similar
   - Usa `cardapios c` e `cardapio_refeicoes cr`
   - Precisa ser atualizado para usar sistema novo

**NOTA:** Essas queries são complexas e envolvem cálculo de demanda. 
Precisam ser analisadas cuidadosamente antes de atualizar.

---

## 🎯 Vantagens do Sistema Novo

1. ✅ **Cardápios mensais**: Mais fácil de gerenciar
2. ✅ **Calendário por dia**: Refeições específicas para cada dia do mês
3. ✅ **Integração com períodos**: Filtro automático por ano letivo
4. ✅ **Aprovação de nutricionista**: Rastreabilidade
5. ✅ **Tipo de refeição**: Classificação clara (café, almoço, etc.)

---

## 📊 Status da Migração

| Item | Status |
|------|--------|
| Tabelas antigas removidas | ✅ CONCLUÍDO |
| Controllers principais atualizados | ✅ CONCLUÍDO |
| Model antigo removido | ✅ CONCLUÍDO |
| Filtro de períodos aplicado | ✅ CONCLUÍDO |
| Queries de demanda | ⚠️ PENDENTE |

---

**Última atualização:** 16/03/2026  
**Versão:** 1.0.0
