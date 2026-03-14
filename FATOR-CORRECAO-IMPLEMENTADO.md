# Fator de Correção - Per Capita Líquido e Bruto ✅

## Implementação Completa

**IMPORTANTE:** A partir de agora, o usuário cadastra per capita LÍQUIDO (consumo) e o sistema calcula BRUTO (compra) automaticamente.

### 1. Database - Coluna fator_correcao ✅
- Adicionada coluna `fator_correcao` na tabela `produtos`
- Padrão: 1.000 (sem perda)
- Exemplos pré-configurados para produtos comuns
- Migration aplicada com sucesso

### 2. Frontend - Cálculo em Tempo Real ✅
- `AdicionarIngredienteDialog`: Campo "Per Capita Líquido (consumo)"
- `EditarIngredienteDialog`: Campo "Per Capita Líquido (consumo)"
- Alert mostra per capita BRUTO calculado automaticamente
- Funciona em modo simples e avançado
- Cálculo: `per_capita_bruto = per_capita_liquido * fator_correcao`

### 3. Tabela de Ingredientes ✅
- Duas colunas: "Per Capita Líquido" e "Per Capita Bruto"
- Ordem invertida: líquido primeiro (é o valor principal)
- Mostra range (menor - maior) para ambos
- Per capita líquido em azul para destaque
- Tooltip com detalhes por modalidade incluindo fator de correção

### 4. Cálculos Nutricionais ✅
- Usa per capita LÍQUIDO (consumo efetivo)
- Backend usa valor cadastrado diretamente
- Valores nutricionais baseados no líquido (parte aproveitável)

### 5. Cálculos de Custo ✅
- Usa per capita BRUTO (quantidade comprada)
- Backend multiplica líquido por fator de correção
- Custo reflete o que será comprado, não o aproveitado
- Correto para orçamento e compras

### 6. Backend - Queries Atualizadas ✅
- `RefeicaoProduto.ts`: Retorna fator_correcao
- `refeicaoCalculosController.ts`: Calcula bruto para custo
- `refeicaoIngredientesController.ts`: Retorna per_capita_liquido e per_capita_bruto

### 7. PDF - Ficha Técnica ✅
- Mostra per capita LÍQUIDO e BRUTO
- Coluna "Líq." (líquido em azul) primeiro, depois "Bruto"
- Ajustado para caber em UMA ÚNICA PÁGINA
- Margens reduzidas: 30x40 (antes 40x60)
- Fontes reduzidas: 6-8pt (antes 7-10pt)
- Removidas seções: Modo de Preparo, Utensílios, Observações
- Mantidas seções essenciais: Ingredientes, Valores Nutricionais, Custo

## Exemplo de Uso

### Produto: Batata
- Fator de correção: 1.15 (15% de perda ao descascar)
- Per capita líquido: 100g (cadastrado pelo nutricionista)
- Per capita bruto: 115g (100 * 1.15 - calculado automaticamente)
- Cálculos nutricionais baseados em 100g (líquido)
- Custo baseado em 115g (bruto - quantidade a comprar)

## Estrutura do PDF (1 página)

```
┌─────────────────────────────────────────┐
│ FICHA TÉCNICA DE PREPARAÇÃO             │
│ Nome da Refeição                        │
│ Modalidade: Ensino Fundamental          │
├─────────────────────────────────────────┤
│ INFORMAÇÕES GERAIS                      │
│ Categoria | Tempo | Rendimento          │
├─────────────────────────────────────────┤
│ INGREDIENTES E COMPOSIÇÃO NUTRICIONAL   │
│ ┌──────────────────────────────────┐   │
│ │Prod│Líq │Bruto│Un│Prot│Lip│...│  │   │
│ │────┼────┼─────┼──┼────┼───┼───┤  │   │
│ │Bat │100g│115g │g │2.1 │0.1│...│  │   │
│ └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ VALORES NUTRICIONAIS TOTAIS             │
│ Proteínas | Lipídios | Carboidratos     │
│ Cálcio | Ferro | Vit A | Vit C | Sódio  │
├─────────────────────────────────────────┤
│ CUSTO ESTIMADO                          │
│ Custo Total | Custo por Porção          │
└─────────────────────────────────────────┘
```

## Arquivos Modificados

### Frontend
- `frontend/src/types/produto.ts` - Interface com fator_correcao
- `frontend/src/components/AdicionarIngredienteDialog.tsx` - Cálculo em tempo real
- `frontend/src/components/EditarIngredienteDialog.tsx` - Cálculo em tempo real
- `frontend/src/pages/RefeicaoDetalhe.tsx` - Tabela com 2 colunas + PDF otimizado

### Backend
- `backend/migrations/20260313_add_fator_correcao_produtos.sql` - Migration
- `backend/src/modules/cardapios/models/RefeicaoProduto.ts` - Query com fator_correcao
- `backend/src/controllers/refeicaoCalculosController.ts` - Cálculos com correção
- `backend/src/controllers/refeicaoIngredientesController.ts` - Per capita líquido

## Benefícios

1. **Precisão Nutricional**: Valores baseados na parte comestível
2. **Orçamento Correto**: Custo baseado na quantidade a comprar
3. **Transparência**: Mostra líquido e bruto lado a lado
4. **Tempo Real**: Feedback imediato ao digitar
5. **PDF Compacto**: Tudo em uma página, fácil de imprimir
6. **Lógica Intuitiva**: Nutricionista pensa em consumo, sistema calcula compra

---
**Status**: ✅ 100% Implementado (Lógica Invertida em 2026-03-14)
**Data**: 2026-03-13 (Criação) | 2026-03-14 (Inversão)
**Versão**: 3.0 (Líquido → Bruto)

