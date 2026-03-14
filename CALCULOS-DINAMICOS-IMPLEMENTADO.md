# Cálculos Dinâmicos de Valores Nutricionais e Custo - Implementado

## Resumo da Implementação

Implementado sistema de cálculos dinâmicos em tempo real para valores nutricionais e custo das refeições, conforme solicitado pelo usuário.

## Mudanças Realizadas

### 1. Remoção do Botão "Calcular Automaticamente"

- ❌ Removido botão manual de cálculo
- ✅ Implementado cálculo automático em tempo real

### 2. Hooks React Query para Cálculos Dinâmicos

**Arquivo:** `frontend/src/hooks/useRefeicaoCalculos.ts`

Criados dois hooks customizados:

```typescript
// Hook para buscar valores nutricionais automaticamente
useValoresNutricionais(refeicaoId, rendimentoPorcoes, enabled)

// Hook para buscar custo automaticamente
useCustoRefeicao(refeicaoId, rendimentoPorcoes, enabled)
```

**Características:**
- Busca automática quando há rendimento_porcoes definido
- Cache de 30 segundos (staleTime)
- Não faz retry em caso de erro
- Só executa quando a aba "Ficha Técnica" está ativa

### 3. Invalidação de Queries ao Modificar Ingredientes

Quando ingredientes são adicionados, removidos ou editados, as queries de cálculo são invalidadas automaticamente:

```typescript
// Após adicionar/remover/editar ingrediente
queryClient.invalidateQueries({ queryKey: ['valores-nutricionais', Number(id)] });
queryClient.invalidateQueries({ queryKey: ['custo-refeicao', Number(id)] });
```

### 4. Campos Editáveis na Ficha Técnica

**Modo Edição - Campos que podem ser salvos:**
- ✅ Categoria
- ✅ Tempo de Preparo (minutos)
- ✅ Rendimento (porções)
- ✅ Modo de Preparo
- ✅ Utensílios Necessários
- ✅ Observações Técnicas

**Campos Removidos do Formulário (não editáveis):**
- ❌ Calorias por porção
- ❌ Proteínas
- ❌ Carboidratos
- ❌ Lipídios
- ❌ Fibras
- ❌ Sódio
- ❌ Custo por porção

### 5. Visualização Dinâmica de Valores Calculados

**Modo Visualização - Seções Dinâmicas:**

#### Composição Nutricional Calculada
- Mostra valores calculados em tempo real
- Exibe loading spinner durante cálculo
- Mostra avisos se produtos não têm informação nutricional
- Exibe alertas nutricionais (calorias, proteínas, sódio, fibras)

#### Custo Estimado
- Mostra custo total e custo por porção
- Exibe loading spinner durante cálculo
- Mostra avisos se produtos não têm contrato ativo
- Exibe alertas de custo elevado

### 6. Tratamento de Erros

**Produtos sem informação nutricional:**
```
⚠️ X ingrediente(s) sem informação nutricional cadastrada
```

**Produtos sem contrato ativo:**
```
⚠️ X ingrediente(s) sem contrato ativo cadastrado
```

**Sem rendimento definido:**
```
⚠️ Informe o rendimento (número de porções) para calcular valores nutricionais e custo
```

**Sem ingredientes:**
```
⚠️ Adicione ingredientes na aba "Ingredientes" para calcular valores
```

### 7. Alertas Automáticos

**Alertas Nutricionais:**
- Calorias < 300 kcal ou > 800 kcal
- Proteínas < 10g
- Sódio > 800mg
- Fibras < 3g

**Alertas de Custo:**
- Custo por porção > R$ 5,00
- Ingredientes sem contrato ativo

## Fluxo de Funcionamento

1. Usuário acessa a página de detalhes da refeição
2. Adiciona ingredientes na aba "Ingredientes"
3. Define o rendimento (número de porções) na aba "Ficha Técnica"
4. Valores nutricionais e custo são calculados AUTOMATICAMENTE
5. Ao modificar ingredientes ou per capita, valores são recalculados automaticamente
6. Valores são exibidos em tempo real, sem necessidade de salvar

## Arquivos Modificados

### Frontend
- `frontend/src/pages/RefeicaoDetalhe.tsx` - Página principal com cálculos dinâmicos
- `frontend/src/hooks/useRefeicaoCalculos.ts` - Hooks customizados (já existia)
- `frontend/src/services/refeicaoCalculos.ts` - Serviços de API (já existia)

### Backend (já implementado anteriormente)
- `backend/src/controllers/refeicaoCalculosController.ts` - Endpoints de cálculo
- `backend/src/routes/refeicaoCalculosRoutes.ts` - Rotas de cálculo

## Endpoints Utilizados

```
POST /api/refeicoes/:id/calcular-nutricional
Body: { rendimento_porcoes: number }
Response: ValoresNutricionais

POST /api/refeicoes/:id/calcular-custo
Body: { rendimento_porcoes: number }
Response: CustoRefeicao
```

## Vantagens da Implementação

✅ Cálculos em tempo real sem necessidade de botão
✅ Feedback imediato ao modificar ingredientes
✅ Cache inteligente para evitar requisições desnecessárias
✅ Tratamento robusto de erros
✅ Alertas automáticos de valores inadequados
✅ Interface limpa e intuitiva
✅ Não salva valores calculados no banco (sempre dinâmico)

## Status

✅ **IMPLEMENTADO E TESTADO**

- Cálculos dinâmicos funcionando
- Invalidação de queries ao modificar ingredientes
- Tratamento de erros implementado
- Alertas automáticos funcionando
- Código compila sem erros
