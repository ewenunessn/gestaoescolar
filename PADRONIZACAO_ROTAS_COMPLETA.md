# Padronização Completa: Gestão de Rotas de Entrega

## Resumo da Padronização

Página de Gestão de Rotas de Entrega padronizada seguindo o padrão estabelecido com DataTableAdvanced e TanStack Table v8.

## Mudanças Implementadas

### 1. Substituição da Tabela Manual por DataTableAdvanced

**ANTES:**
- Table manual do Material UI
- TableContainer + Table + TableHead + TableBody
- Paginação manual com CompactPagination
- Busca implementada manualmente com TextField

**DEPOIS:**
- DataTableAdvanced com TanStack Table v8
- Busca integrada no componente
- Paginação automática
- Ordenação automática por colunas

### 2. Substituição do TableFilter por Popover

**ANTES:**
```tsx
<TableFilter
    open={filterOpen}
    onClose={() => setFilterOpen(false)}
    onApply={setFilters}
    fields={filterFields}
    initialValues={filters}
    showSearch={false}
    anchorEl={filterAnchorEl}
/>
```

**DEPOIS:**
```tsx
<Popover
    open={Boolean(filterAnchorEl)}
    anchorEl={filterAnchorEl}
    onClose={() => setFilterAnchorEl(null)}
>
    <Box sx={{ p: 2, minWidth: 250 }}>
        <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select>...</Select>
        </FormControl>
        <FormControl fullWidth size="small">
            <InputLabel>Ordenar por</InputLabel>
            <Select>...</Select>
        </FormControl>
    </Box>
</Popover>
```

### 3. Definição de Colunas com TanStack Table

```tsx
const columns = useMemo<ColumnDef<RotaEntrega>[]>(() => [
    {
        accessorKey: 'cor',
        header: '',
        size: 40,
        enableSorting: false,
        cell: ({ row }) => (
            <Box sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                bgcolor: row.original.cor 
            }} />
        )
    },
    {
        accessorKey: 'nome',
        header: 'Nome',
        size: 200,
        cell: ({ row }) => (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {row.original.nome}
            </Typography>
        )
    },
    {
        accessorKey: 'descricao',
        header: 'Descrição',
        size: 300
    },
    {
        accessorKey: 'total_escolas',
        header: 'Escolas',
        size: 100,
        align: 'center',
        cell: ({ row }) => (
            <Chip label={row.original.total_escolas || 0} size="small" color="primary" />
        )
    },
    {
        accessorKey: 'ativo',
        header: 'Status',
        size: 120,
        align: 'center',
        cell: ({ row }) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusIndicator status={row.original.ativo ? 'ativo' : 'inativo'} />
                <Typography>{row.original.ativo ? 'Ativa' : 'Inativa'}</Typography>
            </Box>
        )
    },
    {
        id: 'actions',
        header: 'Ações',
        size: 200,
        align: 'center',
        enableSorting: false,
        cell: ({ row }) => (
            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                <Tooltip title="Gerenciar Escolas">
                    <IconButton onClick={() => navigate(`/gestao-rotas/${row.original.id}/escolas`)}>
                        <RouteIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Editar">
                    <IconButton onClick={() => abrirModalRota(row.original)}>
                        <EditIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                    <IconButton onClick={() => deletarRota(row.original.id)}>
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        )
    }
], [navigate]);
```

### 4. Estrutura de Layout Padronizada

```tsx
<Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    <PageContainer fullHeight>
        <PageBreadcrumbs items={[...]} />
        <PageHeader title="Gestão de Rotas de Entrega" />
        
        {/* Legenda de Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
            <Typography>Exibindo {filteredRotas.length} rotas</Typography>
            <StatusIndicator /> ATIVAS / INATIVAS
        </Box>

        <DataTableAdvanced
            data={filteredRotas}
            columns={columns}
            searchPlaceholder="Buscar rotas..."
            emptyMessage="Nenhuma rota encontrada"
            actions={<>Botões de ação</>}
        />
    </PageContainer>
</Box>
```

### 5. Funcionalidades Mantidas

✅ Modal de criação/edição de rota
✅ Seletor de cor com paleta de cores sugeridas
✅ Switch para ativar/desativar rota
✅ Navegação para gerenciar escolas da rota
✅ Exclusão de rota com confirmação
✅ Filtros por status e ordenação
✅ Legenda de status (Ativas/Inativas)
✅ Indicador visual de cor da rota
✅ Contador de escolas por rota

### 6. Melhorias de UX

- Busca integrada e mais rápida
- Ordenação por colunas clicáveis
- Interface mais limpa e consistente
- Filtros em popover compacto
- Feedback visual melhorado

## Estrutura de Arquivos

```
frontend/src/pages/GestaoRotas.tsx (padronizado)
├── Imports
├── Estados
├── loadRotas()
├── filteredRotas (useMemo)
├── abrirModalRota()
├── salvarRota()
├── deletarRota()
├── columns (ColumnDef[])
└── JSX
    ├── PageContainer
    ├── PageHeader
    ├── Legenda de Status
    ├── DataTableAdvanced
    ├── Popover de Filtros
    └── Dialog de Rota
```

## Colunas da Tabela

1. **Cor** (40px) - Indicador visual circular
2. **Nome** (200px) - Nome da rota em negrito
3. **Descrição** (300px) - Descrição ou "Sem descrição"
4. **Escolas** (100px) - Chip com contador
5. **Status** (120px) - StatusIndicator + texto
6. **Ações** (200px) - 3 botões (Gerenciar, Editar, Excluir)

## Filtros Disponíveis

- **Status**: Todos / Ativas / Inativas
- **Ordenar por**: Nome (A-Z) / Mais Escolas / Status

## Estados de Exibição

1. **Loading**: CircularProgress centralizado
2. **Erro**: Mensagem de erro + botão "Tentar Novamente"
3. **Vazio**: Ícone de rota + "Nenhuma rota encontrada"
4. **Com dados**: DataTableAdvanced com rotas

## Componentes Utilizados

- `DataTableAdvanced` - Tabela principal
- `PageContainer` - Container da página
- `PageHeader` - Cabeçalho
- `PageBreadcrumbs` - Breadcrumbs
- `StatusIndicator` - Indicador de status
- `Popover` - Filtros
- `Dialog` - Modal de rota

## Resultado

✅ Página padronizada com DataTableAdvanced
✅ Busca e ordenação integradas
✅ Filtros em Popover
✅ Layout consistente com outras páginas
✅ Todas as funcionalidades mantidas
✅ Código mais limpo e manutenível
✅ UX melhorada

## Próximas Páginas para Padronizar

Conforme RESUMO_PADRONIZACAO_PENDENTE.md:
- Guias de Demanda
- Estoque Escola
- Outras páginas pendentes
