# Solução Definitiva: Padronizar Peso do Produto

## Problema Atual

Quando produto e contrato têm pesos diferentes, surgem vários problemas:

1. ❌ Conversão complexa (demanda ÷ fator)
2. ❌ Risco de erro humano na entrega
3. ❌ Confusão: guia diz "1 unidade", mas entrega 2 garrafas
4. ❌ Sistema mais complexo
5. ❌ Difícil de auditar

**Exemplo atual:**
- Produto: 900g
- Contrato: 450g
- Demanda: 13 unidades → Pedido: 26 unidades
- Entregador precisa calcular: 1 unidade = 2 garrafas

## ✅ Solução Recomendada: PADRONIZAR O PESO

**Mudar o produto para o peso real da embalagem comprada**

### Implementação:

```
Produto Óleo:
  Peso: 900g → 450g ✅
  Unidade: Unidade (mantém)

Contrato:
  Peso: 450g (mantém)
  Fator: 0.5 → 1.0 ✅

Cardápios:
  Quantidade: 1 unidade → 2 unidades ✅
```

### Resultado:

**Antes (complexo):**
```
Cardápio: 1 unidade de 900g
Demanda: 13 escolas × 1 = 13 unidades
Pedido: 13 ÷ 0.5 = 26 unidades (conversão!)
Entrega: 2 garrafas por escola (confuso!)
```

**Depois (simples):**
```
Cardápio: 2 unidades de 450g
Demanda: 13 escolas × 2 = 26 unidades
Pedido: 26 ÷ 1.0 = 26 unidades (sem conversão!)
Entrega: 2 garrafas por escola (claro!)
```

## Vantagens

### 1. Zero Conversão
- Fator sempre 1.0
- Demanda = Pedido
- Sem cálculos complexos

### 2. Zero Erro Humano
- Guia: "2 unidades"
- Entregador entrega: 2 garrafas
- Simples e direto!

### 3. Sistema Mais Simples
- Menos código
- Menos bugs
- Mais confiável

### 4. Fácil de Auditar
- Tudo bate 1:1
- Sem conversões para conferir
- Transparente

### 5. Flexível
- Se mudar fornecedor, ajusta o produto
- Mantém histórico correto
- Fácil de entender

## Desvantagens

### Única desvantagem: Trabalho inicial

- Precisa ajustar cardápios existentes
- Multiplicar quantidades por 2
- Trabalho único, mas vale a pena

**Tempo estimado:** 1-2 horas para ajustar tudo

## Comparação: Solução 1 vs Solução 2

### Solução 1: Interface com Conversão
```
✅ Flexível
✅ Sem retrabalho
❌ Sistema complexo
❌ Risco de erro humano
❌ Difícil de auditar
❌ Confuso para entregador
```

### Solução 2: Padronizar Peso (RECOMENDADA)
```
✅ Sistema simples
✅ Zero erro humano
✅ Fácil de auditar
✅ Claro para entregador
✅ Mais confiável
❌ Trabalho inicial (único)
```

## Implementação Passo a Passo

### 1. Backup
```bash
# Fazer backup do banco antes
pg_dump > backup_antes_padronizacao.sql
```

### 2. Executar Script
```bash
node backend/scripts/padronizar-peso-oleo.js
```

O script irá:
1. Atualizar peso do produto: 900g → 450g
2. Atualizar fator dos contratos: 0.5 → 1.0
3. Multiplicar por 2 as quantidades nos cardápios
4. Multiplicar por 2 as quantidades nas guias

### 3. Verificar
```bash
node backend/scripts/verificar-pedido-oleo-atual.js
```

Deve mostrar:
- Demanda: 26 unidades
- Pedido: 26 unidades
- Fator: 1.0

### 4. Testar
1. Criar nova guia de demanda
2. Gerar pedido
3. Verificar que tudo bate 1:1

## Recomendação Final

### Para o Óleo e produtos similares:

**SEMPRE use o peso da embalagem real que você compra**

- Se compra em 450g → Produto: 450g
- Se compra em 1kg → Produto: 1kg
- Se compra em 500g → Produto: 500g

### Regra de Ouro:

> "O peso do produto deve ser o peso da menor embalagem que você compra"

Isso garante:
- Fator sempre 1.0
- Zero conversão
- Zero erro
- Sistema simples

## Quando NÃO usar esta solução

Só use conversão (Solução 1) quando:

1. Você compra em múltiplas embalagens diferentes
2. Fornecedores mudam frequentemente
3. Não pode ajustar cardápios

Caso contrário, **SEMPRE padronize o peso!**

## Conclusão

A solução mais profissional e confiável é:

### ✅ PADRONIZAR O PESO DO PRODUTO PARA O PESO DO CONTRATO

Isso elimina:
- Conversões complexas
- Erros humanos
- Confusão na entrega
- Complexidade do sistema

**Recomendação:** Execute o script `padronizar-peso-oleo.js` e simplifique sua vida!
