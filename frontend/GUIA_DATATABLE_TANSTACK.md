# Guia DataTable com TanStack Table + Material UI

## 📋 Visão Geral

Implementação de tabelas de dados usando **TanStack Table v8** (React Table) com **Material UI**, substituindo o DataGrid Pro/Premium pago.

## ✅ Vantagens

- **100% Grátis** - Sem limitações de licença
- **Headless** - Total controle sobre UI
- **Performance** - Virtualização e otimizações
- **Flexível** - Customização completa
- **TypeScript** - Tipagem forte
- **Material UI** - Design consistente

## 📦 Componentes Disponíveis

### 1. DataTable (Básico)

Tabela simples com recursos essenciais.

**Recursos:**
- ✅ Ordenação por coluna
- ✅ Busca global
- ✅ Paginação
- ✅ Loading state
- ✅ Click em linha
- ✅ Sticky header

**Uso:**

```tsx
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';

interface Produto {
  id: number;
  nome: string;
  preco: number;
}

const columns: ColumnDef<Produto>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 80,
  },
  {
    accessorKey: 'nome',
    header: 'Nome',
    size: 200,
  },
  {
    accessorKey: 'preco',
    header: 'Preço',
    size: 120,
    cell: ({ getValue }) => {
      const valor = getValue() as number;
      return `R$ ${valor.toFixed(2)}`;
    },
  },
];

function ProdutosPage() {
  const { data, isLoading } = useProdutos();

  return (
    <DataTable
      data={data || []}
      columns={columns}
      loading={isLoading}
      onRowClick={(produto) => navigate(`/produtos/${produto.id}`)}
      searchPlaceholder="Buscar produtos..."
    />
  );
}
```

### 2. DataTableAdvanced (Avançado)

Tabela com recursos extras.

**Recursos Adicionais:**
- ✅ Seleção de linhas (checkbox)
- ✅ Mostrar/ocultar colunas
- ✅ Exportação de dados
- ✅ Contador de selecionados
- ✅ Ações em lote

**Uso:**

```tsx
import { DataTableAdvanced } from '../components/DataTableAdvanced';
import * as XLSX from 'xlsx';

function ProdutosPage() {
  const { data, isLoading } = useProdutos();
  const [selectedRows, setSelectedRows] = useState<Produto[]>([]);

  const handleExport = (data: Produto[]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    XLSX.writeFile(workbook, 'produtos.xlsx');
  };

  return (
    <DataTableAdvanced
      data={data || []}
      columns={columns}
      loading={isLoading}
      enableRowSelection
      enableColumnVisibility
      enableExport
      onExport={handleExport}
      onSelectionChange={setSelectedRows}
      searchPlaceholder="Buscar produtos..."
    />
  );
}
```

## 🎨 Definindo Colunas

### Coluna Simples

```tsx
{
  accessorKey: 'nome',
  header: 'Nome',
  size: 200,
  enableSorting: true,
}
```

### Coluna com Formatação

```tsx
{
  accessorKey: 'preco',
  header: 'Preço',
  size: 120,
  cell: ({ getValue }) => {
    const valor = getValue() as number;
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  },
}
```

### Coluna com Componente

```tsx
{
  accessorKey: 'ativo',
  header: 'Status',
  size: 100,
  cell: ({ getValue }) => (
    <Chip
      label={getValue() ? 'Ativo' : 'Inativo'}
      color={getValue() ? 'success' : 'error'}
      size="small"
    />
  ),
}
```

### Coluna de Ações

```tsx
{
  id: 'actions',
  header: 'Ações',
  size: 120,
  enableSorting: false,
  cell: ({ row }) => (
    <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
      <IconButton
        size="small"
        onClick={() => handleEdit(row.original)}
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => handleDelete(row.original)}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  ),
}
```

### Coluna com Tooltip

```tsx
{
  accessorKey: 'descricao',
  header: 'Descrição',
  size: 300,
  cell: ({ getValue }) => {
    const texto = getValue() as string;
    return (
      <Tooltip title={texto}>
        <Typography
          noWrap
          sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {texto}
        </Typography>
      </Tooltip>
    );
  },
}
```

## 🔧 Recursos Avançados

### Filtro por Coluna

```tsx
const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

// Adicionar filtro
setColumnFilters([
  { id: 'categoria', value: 'Alimentos' },
  { id: 'ativo', value: true },
]);

// No table config
const table = useReactTable({
  // ...
  state: {
    columnFilters,
  },
  onColumnFiltersChange: setColumnFilters,
});
```

### Ordenação Inicial

```tsx
const [sorting, setSorting] = useState<SortingState>([
  { id: 'nome', desc: false }, // Ordenar por nome ASC
]);
```

### Paginação Customizada

```tsx
const [pagination, setPagination] = useState({
  pageIndex: 0,
  pageSize: 25, // 25 itens por página
});
```

### Busca em Colunas Específicas

```tsx
const columns: ColumnDef<Produto>[] = [
  {
    accessorKey: 'nome',
    header: 'Nome',
    // Habilitar filtro nesta coluna
    enableColumnFilter: true,
    filterFn: 'includesString', // Função de filtro
  },
];
```

## 📊 Exportação de Dados

### Excel (XLSX)

```tsx
import * as XLSX from 'xlsx';

const exportToExcel = (data: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  XLSX.writeFile(workbook, `relatorio_${Date.now()}.xlsx`);
};
```

### CSV

```tsx
const exportToCSV = (data: any[]) => {
  const csv = data.map(row => 
    Object.values(row).join(',')
  ).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dados.csv';
  link.click();
};
```

## 🎯 Exemplos Práticos

### Tabela com React Query

```tsx
function ProdutosPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['produtos'],
    queryFn: fetchProdutos,
  });

  return (
    <Box>
      <Button onClick={() => refetch()}>
        Atualizar
      </Button>
      <DataTable
        data={data || []}
        columns={columns}
        loading={isLoading}
      />
    </Box>
  );
}
```

### Tabela com Ações em Lote

```tsx
function ProdutosPage() {
  const [selected, setSelected] = useState<Produto[]>([]);
  const deleteMutation = useDeleteProdutos();

  const handleDeleteSelected = () => {
    const ids = selected.map(p => p.id);
    deleteMutation.mutate(ids);
  };

  return (
    <Box>
      {selected.length > 0 && (
        <Button
          color="error"
          onClick={handleDeleteSelected}
        >
          Excluir {selected.length} selecionado(s)
        </Button>
      )}
      <DataTableAdvanced
        data={data || []}
        columns={columns}
        enableRowSelection
        onSelectionChange={setSelected}
      />
    </Box>
  );
}
```

## 🚀 Performance

### Virtualização (para muitos dados)

Para tabelas com milhares de linhas, use `@tanstack/react-virtual`:

```bash
npm install @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// Dentro do componente
const parentRef = React.useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: table.getRowModel().rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50, // altura estimada da linha
  overscan: 10,
});
```

## 📝 Comparação com DataGrid Pro

| Recurso | DataGrid Pro | TanStack Table |
|---------|--------------|----------------|
| Preço | $495/dev/ano | Grátis |
| Ordenação | ✅ | ✅ |
| Filtros | ✅ | ✅ |
| Paginação | ✅ | ✅ |
| Seleção | ✅ | ✅ |
| Exportação | ✅ | ✅ (manual) |
| Colunas fixas | ✅ | ✅ (CSS) |
| Agrupamento | ✅ | ✅ |
| Virtualização | ✅ | ✅ (plugin) |
| Customização | Limitada | Total |

## 🔗 Recursos

- [TanStack Table Docs](https://tanstack.com/table/v8)
- [Material UI Tables](https://mui.com/material-ui/react-table/)
- [Exemplos TanStack](https://tanstack.com/table/v8/docs/examples/react/basic)

## ✨ Próximos Passos

1. ✅ Componente DataTable básico
2. ✅ Componente DataTableAdvanced
3. ⏳ Adicionar virtualização
4. ⏳ Criar mais exemplos
5. ⏳ Migrar todas as páginas

---

**Criado em:** 19/03/2026  
**Última atualização:** 19/03/2026
