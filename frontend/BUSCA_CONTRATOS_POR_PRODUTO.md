# Busca de Contratos por Produto

## Implementação Concluída

A barra de busca padrão do DataTable na tela de contratos agora busca também pelos produtos do contrato.

## Mudanças Realizadas

### Backend

**Arquivo**: `backend/src/modules/contratos/controllers/contratoController.ts`

- Modificada função `listarContratos()` para incluir lista de produtos
- Adicionado `STRING_AGG(DISTINCT p.nome, ' | ') as produtos` na query
- JOIN com tabela `produtos` através de `contrato_produtos`
- Produtos separados por ` | ` para facilitar leitura

### Frontend

**Arquivo**: `frontend/src/pages/Contratos.tsx`

1. **Interface atualizada**:
   ```typescript
   interface Contrato {
     // ... campos existentes
     produtos?: string; // Lista de produtos para busca
   }
   ```

2. **Coluna oculta adicionada**:
   ```typescript
   {
     accessorKey: 'produtos',
     header: 'Produtos',
     size: 0,
     enableSorting: false,
     enableColumnFilter: false,
     enableGlobalFilter: true, // Permite busca global
   }
   ```

3. **Visibilidade configurada**:
   ```typescript
   const initialColumnVisibility = useMemo(() => ({
     produtos: false, // Ocultar coluna de produtos
   }), []);
   ```

4. **Placeholder atualizado**:
   ```
   "Buscar por número, fornecedor ou produto..."
   ```

**Arquivo**: `frontend/src/components/DataTable.tsx`

- Adicionado suporte para `columnVisibility`
- Nova prop `initialColumnVisibility` para configurar colunas ocultas
- Estado `columnVisibility` gerenciado pela tabela

## Como Funciona

1. Backend retorna lista de produtos concatenados para cada contrato
2. Frontend adiciona coluna oculta com os produtos
3. Coluna está oculta visualmente mas disponível para busca
4. `getFilteredRowModel()` do TanStack Table busca em todas as colunas (incluindo ocultas)
5. Usuário digita nome do produto na barra de busca
6. Tabela filtra mostrando apenas contratos que contêm aquele produto

## Exemplo de Uso

**Cenário**: Buscar contratos que contêm "Arroz"

1. Digite "Arroz" na barra de busca
2. Tabela filtra automaticamente
3. Mostra apenas contratos que têm Arroz nos produtos
4. Busca também funciona para número do contrato e fornecedor

## Vantagens

- ✅ Busca integrada na barra padrão (sem UI adicional)
- ✅ Busca simultânea em número, fornecedor e produtos
- ✅ Coluna oculta não polui a interface
- ✅ Performance: produtos carregados junto com contratos (1 query)
- ✅ Busca case-insensitive e parcial (ex: "arr" encontra "Arroz")

## Dados Retornados

Exemplo de resposta do backend:

```json
{
  "id": 1,
  "numero": "CT-2026-001",
  "fornecedor_nome": "Fornecedor ABC",
  "produtos": "Arroz Branco | Feijão Preto | Óleo de Soja",
  "valor_total_contrato": 15000.00,
  ...
}
```

A coluna `produtos` contém todos os produtos do contrato separados por ` | `.

## Observações

- Busca funciona em produtos ATIVOS (`cp.ativo = true`)
- Produtos duplicados são removidos (`DISTINCT`)
- Busca é case-insensitive (padrão do TanStack Table)
- Busca é parcial (encontra "arr" em "Arroz")
