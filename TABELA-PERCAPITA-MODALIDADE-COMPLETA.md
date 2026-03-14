# Tabela de Ingredientes com Per Capita por Modalidade - COMPLETO ✅

## Implementação Final

A tabela de ingredientes agora exibe per capita por modalidade com visualização inteligente e edição via modal.

## Funcionalidades Implementadas

### 1. Visualização na Tabela

#### Coluna "Per Capita"
- **Valor único**: Mostra apenas o valor (ex: `100g`)
- **Valores diferentes**: Mostra range `menor - maior` (ex: `80 - 120g`)

#### Tooltip Interativo
Ao passar o mouse sobre o per capita, mostra:
```
Per Capita por Modalidade:
Creche: 80g
Pré-escola: 100g
Fundamental: 120g
```

### 2. Edição Removida da Tabela

- ❌ Campos inline de edição removidos
- ❌ Select de tipo de medida removido
- ✅ Valores são apenas visualização
- ✅ Chip mostra tipo de medida (Gramas/Unidades)

### 3. Botões de Ação

Cada linha tem 2 botões:
- **Editar** (ícone lápis azul): Abre modal de edição
- **Remover** (ícone lixeira vermelho): Remove ingrediente

### 4. Modal de Edição

**Componente:** `EditarIngredienteDialog.tsx`

Características:
- Mostra nome do produto no título
- Carrega valores atuais automaticamente
- Se já tem ajustes por modalidade, abre em modo avançado
- Botão toggle (⚙️) para alternar entre modos
- Validação de valores
- Salva e atualiza a lista

## Estrutura de Dados

### Interface RefeicaoProduto Atualizada

```typescript
interface RefeicaoProduto {
  id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'unidades';
  ordem?: number;
  produto?: Produto;
  per_capita_por_modalidade?: Array<{
    modalidade_id: number;
    modalidade_nome: string;
    per_capita: number;
  }>;
}
```

### SortableRow Props Simplificadas

```typescript
interface SortableRowProps {
  assoc: RefeicaoProduto;
  onRemove: () => void;
  onEdit: () => void;  // Nova prop
}
```

## Componentes Modificados

### 1. SortableRow (RefeicaoDetalhe.tsx)

**Antes:**
- Campos editáveis inline
- TextField para per capita
- Select para tipo de medida

**Depois:**
- Apenas visualização
- Tooltip com detalhes
- Chip para tipo de medida
- Botões Editar e Remover

**Lógica de Exibição:**
```typescript
const perCapitas = assoc.per_capita_por_modalidade?.map(m => m.per_capita) || [assoc.per_capita];
const minPerCapita = Math.min(...perCapitas);
const maxPerCapita = Math.max(...perCapitas);

const perCapitaTexto = minPerCapita === maxPerCapita 
  ? `${minPerCapita}${unidade}`
  : `${minPerCapita} - ${maxPerCapita}${unidade}`;
```

### 2. EditarIngredienteDialog.tsx (NOVO)

Similar ao AdicionarIngredienteDialog, mas:
- Recebe valores atuais como props
- Carrega automaticamente em modo avançado se já tem ajustes
- Título mostra nome do produto
- Função `onConfirm` atualiza ao invés de adicionar

### 3. Funções no RefeicaoDetalhe

**Removidas:**
- `atualizarPerCapita()`
- `atualizarTipoMedida()`

**Adicionadas:**
- `handleEditarProduto(assoc)` - Abre modal com dados do produto
- `confirmarEdicaoProduto(perCapitaGeral, tipoMedida, perCapitaPorModalidade)` - Salva edição

## Backend Atualizado

### Controller (refeicaoProdutoController.ts)

```typescript
export async function editarRefeicaoProduto(req: Request, res: Response) {
  const { per_capita, tipo_medida, per_capita_por_modalidade } = req.body;
  // Aceita per_capita_por_modalidade
  const atualizado = await updateRefeicaoProduto(
    id, 
    per_capita, 
    tipo_medida, 
    per_capita_por_modalidade
  );
}
```

### Model (RefeicaoProduto.ts)

```typescript
export async function updateRefeicaoProduto(
  id: number,
  per_capita: number,
  tipo_medida?: 'gramas' | 'unidades',
  per_capita_por_modalidade?: Array<{modalidade_id: number, per_capita: number}>
): Promise<RefeicaoProduto | null> {
  // Usa transação
  // Atualiza refeicao_produtos
  // Deleta ajustes antigos
  // Insere novos ajustes
}
```

## Serviço Frontend Atualizado

```typescript
export async function editarProdutoNaRefeicao(
  id: number, 
  perCapita: number, 
  tipoMedida?: 'gramas' | 'unidades',
  perCapitaPorModalidade?: Array<{modalidade_id: number, per_capita: number}>
): Promise<RefeicaoProduto>
```

## Fluxo de Edição

```
1. Usuário clica em "Editar" na linha do ingrediente
   ↓
2. handleEditarProduto(assoc) é chamado
   ↓
3. setProdutoEditando(assoc)
   ↓
4. setDialogEditarOpen(true)
   ↓
5. EditarIngredienteDialog abre com dados atuais
   ↓
6. Se tem ajustes por modalidade → modo avançado ativado
   ↓
7. Usuário modifica valores
   ↓
8. Clica "Salvar"
   ↓
9. confirmarEdicaoProduto() é chamado
   ↓
10. editarProdutoNaRefeicao() envia para backend
    ↓
11. Backend atualiza em transação
    ↓
12. Frontend recarrega lista
    ↓
13. Invalida queries de cálculos
    ↓
14. Toast de sucesso
```

## Exemplo Visual

### Tabela

```
┌────┬──────────────┬─────────────┬──────────┬─────────┐
│ ⋮⋮ │ Produto      │ Per Capita  │ Unidade  │ Ações   │
├────┼──────────────┼─────────────┼──────────┼─────────┤
│ ⋮⋮ │ Arroz        │ 80 - 120g   │ Gramas   │ ✏️ 🗑️  │
│ ⋮⋮ │ Feijão       │ 100g        │ Gramas   │ ✏️ 🗑️  │
│ ⋮⋮ │ Frango       │ 100 - 180g  │ Gramas   │ ✏️ 🗑️  │
└────┴──────────────┴─────────────┴──────────┴─────────┘
```

### Tooltip (ao passar mouse em "80 - 120g")

```
┌─────────────────────────────────┐
│ Per Capita por Modalidade:      │
│ Creche: 80g                     │
│ Pré-escola: 100g                │
│ Fundamental: 120g               │
└─────────────────────────────────┘
```

## Cabeçalho da Tabela

O cabeçalho "Per Capita" tem um tooltip explicativo:
```
"Passe o mouse sobre os valores para ver detalhes por modalidade"
```

## Benefícios

1. **UX Limpa**: Tabela mais limpa sem campos editáveis
2. **Visualização Clara**: Range mostra variação de forma intuitiva
3. **Detalhes sob Demanda**: Tooltip mostra informações completas
4. **Edição Controlada**: Modal garante validação e consistência
5. **Modo Inteligente**: Detecta automaticamente se deve abrir em modo avançado
6. **Transacional**: Backend garante consistência dos dados

## Arquivos Modificados

### Frontend
- ✅ `frontend/src/pages/RefeicaoDetalhe.tsx`
  - Interface RefeicaoProduto atualizada
  - SortableRow reescrito
  - Funções de edição inline removidas
  - handleEditarProduto e confirmarEdicaoProduto adicionados
  - Estados para modal de edição
  - Cabeçalho da tabela com tooltip

- ✅ `frontend/src/components/EditarIngredienteDialog.tsx` (NOVO)
  - Similar ao AdicionarIngredienteDialog
  - Carrega valores atuais
  - Detecta modo automaticamente

- ✅ `frontend/src/services/refeicoes.ts`
  - editarProdutoNaRefeicao aceita per_capita_por_modalidade

### Backend
- ✅ `backend/src/modules/cardapios/controllers/refeicaoProdutoController.ts`
  - editarRefeicaoProduto aceita per_capita_por_modalidade

- ✅ `backend/src/modules/cardapios/models/RefeicaoProduto.ts`
  - updateRefeicaoProduto usa transação
  - Deleta e recria ajustes por modalidade

## Status

✅ **IMPLEMENTAÇÃO COMPLETA E FUNCIONAL**

Todos os componentes estão integrados e testados. A funcionalidade está pronta para uso!
