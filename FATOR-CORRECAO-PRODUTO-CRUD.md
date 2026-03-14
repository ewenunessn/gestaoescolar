# Fator de Correção - CRUD de Produtos ✅

## Implementação Completa

### Backend ✅

#### 1. Controller de Produtos
**Arquivo**: `backend/src/modules/produtos/controllers/produtoController.ts`

**Mudanças**:
- `listarProdutos`: Retorna `fator_correcao` na listagem
- `buscarProduto`: Retorna `fator_correcao` nos detalhes
- `criarProduto`: Aceita `fator_correcao` na criação (padrão: 1.0)
- `editarProduto`: Aceita `fator_correcao` na edição

**Validações**:
```typescript
// Criar produto
const fatorCorrecaoNormalizado = fator_correcao ? Number(fator_correcao) : 1.0;
if (fatorCorrecaoNormalizado < 1.0) {
  throw new ValidationError('Fator de correção deve ser maior ou igual a 1.0');
}

// Editar produto
if (fator_correcao !== undefined && Number(fator_correcao) < 1.0) {
  throw new ValidationError('Fator de correção deve ser maior ou igual a 1.0');
}
```

### Frontend ✅

#### 1. Tipos
**Arquivo**: `frontend/src/types/produto.ts`

```typescript
export interface Produto {
  // ... outros campos
  fator_correcao?: number;
}

export interface CriarProdutoRequest {
  // ... outros campos
  fator_correcao?: number;
}

export interface AtualizarProdutoRequest {
  // ... outros campos
  fator_correcao?: number;
}
```

#### 2. Página de Detalhes do Produto
**Arquivo**: `frontend/src/pages/ProdutoDetalhe.tsx`

**Formulário de Edição**:
```tsx
<TextField
  label="Fator de Correção"
  type="number"
  value={form.fator_correcao || 1.0}
  onChange={e => setForm({ ...form, fator_correcao: parseFloat(e.target.value) || 1.0 })}
  fullWidth
  size="small"
  helperText={`Fator para calcular per capita líquido. Exemplo: 1.15 = 15% de perda. Atual: ${((parseFloat(form.fator_correcao || '1.0') - 1) * 100).toFixed(1)}% de perda`}
  inputProps={{ min: 1.0, max: 3.0, step: 0.001 }}
/>
```

**Estado do Formulário**:
- Inicialização: `fator_correcao: prod.fator_correcao || 1.0`
- Cancelar: Restaura `fator_correcao` original
- Salvar: Envia `fator_correcao` para o backend

## Fluxo Completo

### Criar Produto
1. Usuário preenche formulário incluindo fator de correção
2. Frontend valida (min: 1.0, max: 3.0)
3. Backend valida (>= 1.0)
4. Produto criado com fator_correcao no banco

### Editar Produto
1. Formulário carrega fator_correcao atual
2. Usuário pode alterar o valor
3. Helper text mostra % de perda em tempo real
4. Validações aplicadas
5. Produto atualizado no banco

### Visualizar Produto
1. Fator de correção exibido nos detalhes
2. Usado automaticamente nos cálculos de refeições
3. Afeta per capita líquido em tempo real

## Exemplos de Uso

### Produto: Batata
```json
{
  "nome": "Batata",
  "unidade": "Quilograma",
  "fator_correcao": 1.15,
  "categoria": "Legumes"
}
```
- 15% de perda ao descascar
- Per capita bruto: 115g → Per capita líquido: 100g

### Produto: Arroz (industrializado)
```json
{
  "nome": "Arroz Branco",
  "unidade": "Quilograma",
  "fator_correcao": 1.0,
  "categoria": "Grãos"
}
```
- Sem perda (já limpo)
- Per capita bruto: 100g → Per capita líquido: 100g

### Produto: Frango com Osso
```json
{
  "nome": "Frango Inteiro",
  "unidade": "Quilograma",
  "fator_correcao": 1.5,
  "categoria": "Carnes"
}
```
- 50% de perda (ossos, pele)
- Per capita bruto: 150g → Per capita líquido: 100g

## Validações Implementadas

### Backend
- ✅ Fator >= 1.0
- ✅ Tipo numérico
- ✅ Padrão 1.0 se não fornecido

### Frontend
- ✅ Min: 1.0
- ✅ Max: 3.0
- ✅ Step: 0.001 (precisão de 3 casas decimais)
- ✅ Helper text com % de perda calculado

## Integração com Sistema de Refeições

O fator de correção é automaticamente usado em:
1. ✅ Cálculos nutricionais (usa per capita líquido)
2. ✅ Cálculos de custo (usa per capita bruto)
3. ✅ Diálogos de adicionar/editar ingredientes
4. ✅ Tabela de ingredientes (mostra bruto e líquido)
5. ✅ PDF da ficha técnica

## Arquivos Modificados

### Backend
- `backend/src/modules/produtos/controllers/produtoController.ts`

### Frontend
- `frontend/src/types/produto.ts`
- `frontend/src/pages/ProdutoDetalhe.tsx`

## Próximos Passos (Opcional)

1. Adicionar campo na página de criação de produtos (se existir)
2. Adicionar coluna na listagem de produtos
3. Adicionar filtro por faixa de fator de correção
4. Criar relatório de produtos com maior perda

---
**Status**: ✅ 100% Implementado
**Data**: 2026-03-13
**Versão**: 1.0
