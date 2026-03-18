# Funcionalidade de Duplicar Refeições - Implementação Completa

## Resumo
Implementada funcionalidade para duplicar refeições, copiando todos os dados (produtos, ingredientes, configurações por modalidade) e permitindo apenas alterar o nome da nova refeição.

## Motivação
Refeições que mudam pouco podem ser usadas como base para criar novas, evitando cadastrar tudo novamente. Por exemplo: "Arroz com Feijão" pode ser duplicado para "Arroz com Feijão e Salada" mantendo todos os produtos base.

## O Que Foi Implementado

### 1. Backend - Controller
**Arquivo**: `backend/src/modules/cardapios/controllers/refeicaoController.ts`

Nova função `duplicarRefeicao`:
- Usa transação para garantir consistência
- Copia todos os dados da refeição original
- Copia produtos da refeição (`refeicao_produtos`)
- Copia ingredientes (`refeicao_ingredientes`)
- Copia configurações por modalidade (`refeicao_produto_modalidade`)
- Nova refeição sempre começa ativa
- Apenas o nome é alterado

```typescript
export async function duplicarRefeicao(req: Request, res: Response) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Busca refeição original
    // 2. Cria nova refeição com novo nome
    // 3. Copia produtos
    // 4. Copia ingredientes
    // 5. Copia configurações por modalidade
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
  }
}
```

### 2. Backend - Rota
**Arquivo**: `backend/src/modules/cardapios/routes/refeicaoRoutes.ts`

Nova rota POST:
```typescript
router.post("/:id/duplicar", requireEscrita('refeicoes'), duplicarRefeicao);
```

### 3. Frontend - Service
**Arquivo**: `frontend/src/services/refeicoes.ts`

Nova função:
```typescript
export async function duplicarRefeicao(id: number, nome: string): Promise<Refeicao> {
  const { data } = await apiWithRetry.post(`/refeicoes/${id}/duplicar`, { nome });
  return data.data || data;
}
```

### 4. Frontend - Hook
**Arquivo**: `frontend/src/hooks/queries/useRefeicaoQueries.ts`

Novo hook React Query:
```typescript
export const useDuplicarRefeicao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, nome }: { id: number; nome: string }) => 
      duplicarRefeicao(id, nome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFEICOES_QUERY_KEY });
    },
  });
};
```

### 5. Frontend - UI
**Arquivo**: `frontend/src/pages/Refeicoes.tsx`

#### Botão de Duplicar
Adicionado nas ações da tabela, entre "Ver Detalhes" e "Editar":
- Ícone: `ContentCopy`
- Cor: primary
- Tooltip: "Duplicar"

#### Modal de Duplicar
Modal simples e direto:
- Título: "Duplicar Refeição"
- Alert informativo explicando o que será copiado
- Campo de texto para o novo nome (pré-preenchido com "{nome original} (Cópia)")
- Botões: Cancelar e Duplicar

```
┌─────────────────────────────────────────┐
│  Duplicar Refeição                      │
├─────────────────────────────────────────┤
│  ℹ️ Todos os dados da refeição "Arroz  │
│     com Feijão" serão copiados,        │
│     incluindo produtos e ingredientes.  │
│     Apenas altere o nome da nova        │
│     refeição.                           │
│                                         │
│  Nome da Nova Refeição                  │
│  ┌───────────────────────────────────┐ │
│  │ Arroz com Feijão (Cópia)          │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  [Cancelar]              [📋 Duplicar] │
└─────────────────────────────────────────┘
```

## Dados Copiados

A duplicação copia:

1. **Dados Básicos da Refeição**:
   - Descrição
   - Tipo (café da manhã, almoço, etc.)
   - Categoria
   - Modo de preparo
   - Tempo de preparo
   - Rendimento de porções
   - Utensílios
   - Informações nutricionais (calorias, proteínas, carboidratos, lipídios, fibras, sódio)
   - Custo por porção
   - Observações técnicas

2. **Produtos da Refeição** (`refeicao_produtos`):
   - Produto
   - Quantidade
   - Unidade de medida
   - Per capita
   - Tipo de medida
   - Ordem
   - Observações

3. **Ingredientes** (`refeicao_ingredientes`):
   - Ingrediente
   - Quantidade bruta e líquida
   - Unidade de medida
   - Per capita bruto e líquido
   - Fator de correção
   - Ordem
   - Observações

4. **Configurações por Modalidade** (`refeicao_produto_modalidade`):
   - Produto
   - Modalidade
   - Per capita específico
   - Tipo de medida

## Dados NÃO Copiados

- **Nome**: Deve ser fornecido pelo usuário
- **ID**: Novo ID é gerado automaticamente
- **Datas**: `created_at` e `updated_at` são novas
- **Status**: Nova refeição sempre começa ativa (independente do status da original)

## Fluxo de Uso

1. Usuário acessa a página de Refeições
2. Clica no botão "Duplicar" (ícone de cópia) na linha da refeição desejada
3. Modal abre com nome pré-preenchido: "{Nome Original} (Cópia)"
4. Usuário altera o nome conforme necessário
5. Clica em "Duplicar"
6. Sistema copia todos os dados em uma transação
7. Nova refeição aparece na lista
8. Usuário pode editar a nova refeição para fazer ajustes finos

## Benefícios

1. **Economia de Tempo**: Não precisa recadastrar produtos e ingredientes
2. **Consistência**: Mantém configurações e proporções da refeição original
3. **Facilidade**: Apenas um campo para preencher (nome)
4. **Segurança**: Usa transação para garantir que tudo seja copiado ou nada
5. **Flexibilidade**: Após duplicar, pode editar normalmente

## Casos de Uso

### Exemplo 1: Variações de Refeições
- Original: "Arroz com Feijão"
- Duplicar para: "Arroz com Feijão e Salada"
- Depois adicionar apenas a salada

### Exemplo 2: Refeições Sazonais
- Original: "Sopa de Legumes"
- Duplicar para: "Sopa de Legumes de Inverno"
- Ajustar ingredientes sazonais

### Exemplo 3: Adaptações por Modalidade
- Original: "Lanche Padrão"
- Duplicar para: "Lanche Integral"
- Trocar alguns produtos por versões integrais

## Arquivos Modificados

### Backend
1. `backend/src/modules/cardapios/controllers/refeicaoController.ts` - Nova função
2. `backend/src/modules/cardapios/routes/refeicaoRoutes.ts` - Nova rota

### Frontend
1. `frontend/src/services/refeicoes.ts` - Nova função
2. `frontend/src/hooks/queries/useRefeicaoQueries.ts` - Novo hook
3. `frontend/src/pages/Refeicoes.tsx` - UI e modal

## Status
✅ Backend implementado com transação
✅ Rota criada e protegida
✅ Service e hook do frontend
✅ UI com botão e modal
✅ Copia todos os dados relacionados
✅ Validação de nome obrigatório
✅ Loading states e feedback
