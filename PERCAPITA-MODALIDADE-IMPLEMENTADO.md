# Per Capita por Modalidade - Implementação Completa

## Status: ✅ IMPLEMENTADO

## Funcionalidade

Permite definir per capita específico para cada modalidade de ensino ao adicionar ingredientes em uma refeição.

## Fluxo de Uso

### 1. Modo Simples (Padrão)
- Usuário clica em "Adicionar" ingrediente
- Diálogo abre com campo "Per Capita Geral"
- Define um valor único (ex: 100g)
- Ao salvar, esse valor é aplicado para TODAS as modalidades

### 2. Modo Avançado (Por Modalidade)
- Usuário clica no ícone de ajustes (⚙️) no diálogo
- Campos individuais aparecem para cada modalidade:
  - Creche: 80g
  - Pré-escola: 100g
  - Fundamental: 120g
- Ao salvar, cada modalidade recebe seu valor específico

## Arquivos Implementados

### Backend

#### 1. Controller Modificado
**Arquivo:** `backend/src/modules/cardapios/controllers/refeicaoProdutoController.ts`

```typescript
// Aceita per_capita_por_modalidade no body
const { produto_id, per_capita, tipo_medida, per_capita_por_modalidade } = req.body;
```

#### 2. Model Modificado
**Arquivo:** `backend/src/modules/cardapios/models/RefeicaoProduto.ts`

- Interface atualizada com `per_capita_por_modalidade`
- `addRefeicaoProduto` usa transação para salvar produto + ajustes
- `getRefeicaoProdutos` retorna ajustes por modalidade via JSON aggregation

### Frontend

#### 1. Serviço Criado
**Arquivo:** `frontend/src/services/refeicaoProdutoModalidade.ts`

Funções disponíveis:
- `listarAjustes(refeicaoProdutoId)`
- `salvarAjustes(refeicaoProdutoId, ajustes)`
- `obterPerCapitaEfetivo(refeicaoProdutoId, modalidadeId)`
- `listarProdutosComModalidades(refeicaoId)`
- `deletarAjuste(ajusteId)`

#### 2. Componente de Diálogo Criado
**Arquivo:** `frontend/src/components/AdicionarIngredienteDialog.tsx`

Características:
- Autocomplete para selecionar produto
- Select para tipo de medida (gramas/unidades)
- Botão toggle para alternar entre modo simples/avançado
- Campos dinâmicos por modalidade no modo avançado
- Validação de valores
- Alert se não houver modalidades ativas

## Estrutura de Dados

### Request Body (Adicionar Produto)

```json
{
  "produto_id": 1,
  "per_capita": 100,
  "tipo_medida": "gramas",
  "per_capita_por_modalidade": [
    { "modalidade_id": 1, "per_capita": 80 },
    { "modalidade_id": 2, "per_capita": 100 },
    { "modalidade_id": 3, "per_capita": 120 }
  ]
}
```

### Response (Listar Produtos)

```json
{
  "id": 1,
  "refeicao_id": 5,
  "produto_id": 10,
  "per_capita": 100,
  "tipo_medida": "gramas",
  "produto": {
    "id": 10,
    "nome": "Arroz",
    "unidade": "kg",
    "ativo": true
  },
  "per_capita_por_modalidade": [
    {
      "modalidade_id": 1,
      "modalidade_nome": "Creche",
      "per_capita": 80
    },
    {
      "modalidade_id": 2,
      "modalidade_nome": "Pré-escola",
      "per_capita": 100
    }
  ]
}
```

## Próximos Passos

### Integração com RefeicaoDetalhe.tsx

1. [ ] Importar `AdicionarIngredienteDialog`
2. [ ] Substituir lógica de adicionar produto para usar o diálogo
3. [ ] Modificar tabela para mostrar colunas por modalidade
4. [ ] Adicionar indicador visual quando há ajustes específicos
5. [ ] Atualizar função de edição para suportar modalidades

### Exemplo de Integração

```typescript
import AdicionarIngredienteDialog from '../components/AdicionarIngredienteDialog';

// Estado
const [dialogOpen, setDialogOpen] = useState(false);

// Função de adicionar
async function handleAdicionarProduto(
  produtoId: number,
  perCapitaGeral: number | null,
  tipoMedida: 'gramas' | 'unidades',
  perCapitaPorModalidade: Array<{modalidade_id: number, per_capita: number}>
) {
  try {
    await adicionarProdutoNaRefeicao(Number(id), {
      produto_id: produtoId,
      per_capita: perCapitaGeral || 0,
      tipo_medida: tipoMedida,
      per_capita_por_modalidade: perCapitaPorModalidade
    });
    
    // Recarregar lista
    const novasAssociacoes = await listarProdutosDaRefeicao(Number(id));
    setAssociacoes(novasAssociacoes);
    
    toast.success('Produto adicionado!');
  } catch (error) {
    toast.error('Erro ao adicionar produto');
  }
}

// Render
<Button onClick={() => setDialogOpen(true)}>
  Adicionar Ingrediente
</Button>

<AdicionarIngredienteDialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  onConfirm={handleAdicionarProduto}
  produtos={produtosDisponiveis}
/>
```

### Tabela com Modalidades

```typescript
<TableHead>
  <TableRow>
    <TableCell>Produto</TableCell>
    <TableCell>Tipo</TableCell>
    {modalidades.map(mod => (
      <TableCell key={mod.id} align="center">
        {mod.nome}
      </TableCell>
    ))}
    <TableCell>Ações</TableCell>
  </TableRow>
</TableHead>
<TableBody>
  {associacoes.map(assoc => (
    <TableRow key={assoc.id}>
      <TableCell>{assoc.produto?.nome}</TableCell>
      <TableCell>{assoc.tipo_medida}</TableCell>
      {modalidades.map(mod => {
        const ajuste = assoc.per_capita_por_modalidade?.find(
          a => a.modalidade_id === mod.id
        );
        return (
          <TableCell key={mod.id} align="center">
            {ajuste ? `${ajuste.per_capita}${assoc.tipo_medida === 'gramas' ? 'g' : 'un'}` : '-'}
          </TableCell>
        );
      })}
      <TableCell>
        <IconButton onClick={() => removerProduto(assoc.id)}>
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

## Benefícios

1. **UX Simplificada**: Modo simples para casos comuns, avançado quando necessário
2. **Flexibilidade**: Suporta tanto per capita único quanto específico por modalidade
3. **Validação**: Limites apropriados por tipo de medida
4. **Transacional**: Salva produto e ajustes em uma única transação
5. **Retrocompatível**: Produtos sem ajustes usam per capita padrão

## Observações

- Se `per_capita_por_modalidade` for enviado, ele tem prioridade
- Se não houver ajustes, usa `per_capita` padrão
- Tabela `refeicao_produto_modalidade` tem constraint UNIQUE para evitar duplicatas
- ON CONFLICT permite atualizar ajustes existentes
