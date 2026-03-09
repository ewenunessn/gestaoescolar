# Guia de Implementação do Filtro Padronizado

## Visão Geral

O componente `TableFilter` fornece um filtro padronizado e reutilizável para todas as tabelas do sistema, seguindo o design da imagem de referência.

## Características

- ✅ Dialog modal com design limpo
- ✅ Busca por palavra-chave (opcional)
- ✅ Campos de filtro customizáveis
- ✅ Suporte a múltiplos tipos de campo (select, text, dateRange, custom)
- ✅ Botões "Limpar" individuais por campo
- ✅ Botão "Limpar tudo"
- ✅ Botão "Aplicar filtros"
- ✅ Totalmente tipado com TypeScript

## Tipos de Campo Suportados

### 1. Select (Dropdown)
```typescript
{
  type: 'select',
  label: 'Status',
  key: 'status',
  options: [
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' },
  ],
}
```

### 2. Text (Campo de texto)
```typescript
{
  type: 'text',
  label: 'Código',
  key: 'codigo',
  placeholder: 'Digite o código...',
}
```

### 3. Date Range (Período)
```typescript
{
  type: 'dateRange',
  label: 'Período',
  key: 'data',
  // Gera automaticamente dois campos: data_from e data_to
}
```

### 4. Custom (Componente personalizado)
```typescript
{
  type: 'custom',
  label: 'Filtro Especial',
  key: 'especial',
  customRender: (value, onChange) => (
    <YourCustomComponent value={value} onChange={onChange} />
  ),
}
```

## Passo a Passo para Implementação

### 1. Importar o componente

```typescript
import TableFilter, { FilterField } from '../components/TableFilter';
import { FilterList as FilterIcon } from '@mui/icons-material';
```

### 2. Adicionar estados

```typescript
const [filterOpen, setFilterOpen] = useState(false);
const [filters, setFilters] = useState<Record<string, any>>({});
```

### 3. Definir campos de filtro

```typescript
const filterFields: FilterField[] = [
  {
    type: 'select',
    label: 'Status',
    key: 'status',
    options: [
      { value: 'ativo', label: 'Ativo' },
      { value: 'inativo', label: 'Inativo' },
    ],
  },
  {
    type: 'select',
    label: 'Categoria',
    key: 'categoria',
    options: categorias.map(c => ({ value: c, label: c })),
  },
  // Adicione mais campos conforme necessário
];
```

### 4. Substituir botão de filtros

**ANTES:**
```typescript
<Button
  variant="outlined"
  startIcon={<TuneRounded />}
  onClick={toggleFilters}
>
  Filtros
</Button>
```

**DEPOIS:**
```typescript
<Button
  variant="outlined"
  startIcon={<FilterIcon />}
  onClick={() => setFilterOpen(true)}
>
  Filtros
</Button>
```

### 5. Adicionar o componente TableFilter

```typescript
<TableFilter
  open={filterOpen}
  onClose={() => setFilterOpen(false)}
  onApply={(newFilters) => {
    setFilters(newFilters);
    // Os filtros serão aplicados automaticamente via useMemo
  }}
  fields={filterFields}
  initialValues={filters}
  showSearch={true}
  searchPlaceholder="Buscar produtos..."
/>
```

### 6. Aplicar filtros na lista

```typescript
const filteredData = useMemo(() => {
  return data.filter(item => {
    // Busca por palavra-chave
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!item.nome.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Filtro de status
    if (filters.status) {
      if (filters.status === 'ativo' && !item.ativo) return false;
      if (filters.status === 'inativo' && item.ativo) return false;
    }

    // Filtro de categoria
    if (filters.categoria && item.categoria !== filters.categoria) {
      return false;
    }

    // Filtro de data (se usar dateRange)
    if (filters.data_from) {
      const itemDate = new Date(item.data);
      const fromDate = new Date(filters.data_from);
      if (itemDate < fromDate) return false;
    }
    if (filters.data_to) {
      const itemDate = new Date(item.data);
      const toDate = new Date(filters.data_to);
      if (itemDate > toDate) return false;
    }

    return true;
  });
}, [data, filters]);
```

### 7. Remover código antigo de filtros

Você pode remover:
- Estados antigos: `searchTerm`, `selectedCategoria`, `selectedStatus`, `filtersExpanded`
- Componente `FiltersContent`
- Função `toggleFilters`
- Componente `Collapse` com filtros antigos

## Exemplos por Tipo de Página

### Produtos
```typescript
const filterFields: FilterField[] = [
  {
    type: 'select',
    label: 'Categoria',
    key: 'categoria',
    options: categorias.map(c => ({ value: c, label: c })),
  },
  {
    type: 'select',
    label: 'Status',
    key: 'status',
    options: [
      { value: 'ativo', label: 'Ativo' },
      { value: 'inativo', label: 'Inativo' },
    ],
  },
];
```

### Escolas
```typescript
const filterFields: FilterField[] = [
  {
    type: 'select',
    label: 'Município',
    key: 'municipio',
    options: municipios.map(m => ({ value: m, label: m })),
  },
  {
    type: 'select',
    label: 'Administração',
    key: 'administracao',
    options: [
      { value: 'municipal', label: 'Municipal' },
      { value: 'estadual', label: 'Estadual' },
      { value: 'federal', label: 'Federal' },
      { value: 'particular', label: 'Particular' },
    ],
  },
  {
    type: 'select',
    label: 'Status',
    key: 'status',
    options: [
      { value: 'ativo', label: 'Ativa' },
      { value: 'inativo', label: 'Inativa' },
    ],
  },
];
```

### Compras/Pedidos
```typescript
const filterFields: FilterField[] = [
  {
    type: 'dateRange',
    label: 'Período',
    key: 'data',
  },
  {
    type: 'select',
    label: 'Status',
    key: 'status',
    options: [
      { value: 'pendente', label: 'Pendente' },
      { value: 'aprovado', label: 'Aprovado' },
      { value: 'concluido', label: 'Concluído' },
      { value: 'cancelado', label: 'Cancelado' },
    ],
  },
];
```

### Contratos
```typescript
const filterFields: FilterField[] = [
  {
    type: 'select',
    label: 'Fornecedor',
    key: 'fornecedor_id',
    options: fornecedores.map(f => ({ value: f.id.toString(), label: f.nome })),
  },
  {
    type: 'select',
    label: 'Status',
    key: 'status',
    options: [
      { value: 'ativo', label: 'Ativo' },
      { value: 'vencido', label: 'Vencido' },
      { value: 'cancelado', label: 'Cancelado' },
    ],
  },
  {
    type: 'dateRange',
    label: 'Vigência',
    key: 'vigencia',
  },
];
```

## Benefícios

1. **Consistência**: Todas as tabelas terão o mesmo padrão de filtro
2. **Manutenibilidade**: Mudanças no design afetam todas as páginas automaticamente
3. **Reutilização**: Menos código duplicado
4. **Flexibilidade**: Fácil adicionar novos tipos de filtro
5. **UX Melhorada**: Interface limpa e intuitiva

## Próximos Passos

1. Implementar em Produtos (exemplo completo)
2. Replicar para Escolas
3. Aplicar em todas as outras páginas com tabelas
4. Remover código antigo de filtros

## Suporte

Para dúvidas ou problemas, consulte o arquivo `TableFilter.example.tsx` que contém exemplos práticos de uso.
