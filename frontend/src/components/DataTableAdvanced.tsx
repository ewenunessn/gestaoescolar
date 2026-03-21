import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Toolbar,
  Typography,
  CircularProgress,
  TableSortLabel,
  Checkbox,
  Menu,
  MenuItem,
  Button,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface DataTableAdvancedProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  title?: string;
  searchPlaceholder?: string;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enableExport?: boolean;
  onExport?: (data: TData[]) => void;
  onSelectionChange?: (selectedRows: TData[]) => void;
  toolbarActions?: React.ReactNode;
  onFilterClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onImportExportClick?: (event: React.MouseEvent<HTMLElement>) => void;
  emptyMessage?: string;
}

export function DataTableAdvanced<TData>({
  data,
  columns,
  loading = false,
  onRowClick,
  title,
  searchPlaceholder = 'Buscar...',
  enableRowSelection = false,
  enableColumnVisibility = false,
  enableExport = false,
  onExport,
  onSelectionChange,
  toolbarActions,
  onFilterClick,
  onImportExportClick,
  emptyMessage = 'Nenhum registro encontrado',
}: DataTableAdvancedProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      rowSelection,
      columnVisibility,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Notificar mudanças na seleção
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, table]);

  const handleExport = () => {
    if (onExport) {
      const selectedRows = table.getSelectedRowModel().rows;
      const dataToExport = selectedRows.length > 0
        ? selectedRows.map(row => row.original)
        : table.getFilteredRowModel().rows.map(row => row.original);
      onExport(dataToExport);
    }
  };

  return (
    <Paper 
      sx={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {/* Toolbar */}
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {toolbarActions}
          {title && (
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          )}
          {enableRowSelection && Object.keys(rowSelection).length > 0 && (
            <Chip
              label={`${Object.keys(rowSelection).length} selecionado(s)`}
              color="primary"
              size="small"
              onDelete={() => setRowSelection({})}
            />
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          {searchOpen ? (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setGlobalFilter('');
                        setSearchOpen(false);
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ width: 250 }}
            />
          ) : (
            <IconButton size="small" onClick={() => setSearchOpen(true)} title="Buscar">
              <SearchIcon />
            </IconButton>
          )}

          {enableColumnVisibility && (
            <IconButton
              size="small"
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              title="Colunas"
            >
              <ViewColumnIcon />
            </IconButton>
          )}

          {onFilterClick && (
            <IconButton size="small" onClick={onFilterClick} title="Filtros">
              <FilterListIcon />
            </IconButton>
          )}

          {onImportExportClick && (
            <Tooltip title="Importar/Exportar">
              <IconButton size="small" onClick={onImportExportClick}>
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
          )}

          {enableExport && (
            <IconButton
              size="small"
              onClick={handleExport}
              title="Exportar"
              disabled={!onExport}
            >
              <FileDownloadIcon />
            </IconButton>
          )}
        </Stack>
      </Toolbar>

      {/* Tabela */}
      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small" sx={{ borderCollapse: 'separate' }}>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {enableRowSelection && (
                  <TableCell
                    padding="checkbox"
                    sx={{ 
                      fontWeight: 600, 
                      backgroundColor: 'grey.100',
                    }}
                  >
                    <Checkbox
                      checked={table.getIsAllRowsSelected()}
                      indeterminate={table.getIsSomeRowsSelected()}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                  </TableCell>
                )}
                {headerGroup.headers.map((header) => {
                  if (!header.column.getIsVisible()) return null;
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        fontWeight: 600,
                        backgroundColor: 'grey.100',
                        width: header.getSize(),
                      }}
                    >
                      {header.isPlaceholder ? null : (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <TableSortLabel
                              active={!!header.column.getIsSorted()}
                              direction={
                                header.column.getIsSorted() === 'asc' ? 'asc' : 'desc'
                              }
                              sx={{ ml: 0.5 }}
                            />
                          )}
                        </Box>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  align="center"
                  sx={{ py: 8 }}
                >
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  align="center"
                  sx={{ py: 8 }}
                >
                  <Typography color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  selected={row.getIsSelected()}
                  onClick={() => !enableRowSelection && onRowClick?.(row.original)}
                  sx={{
                    cursor: onRowClick && !enableRowSelection ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: onRowClick && !enableRowSelection ? 'action.hover' : 'inherit',
                    },
                  }}
                >
                  {enableRowSelection && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => {
                    if (!cell.column.getIsVisible()) return null;
                    return (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginação */}
      <TablePagination
        component="div"
        count={table.getFilteredRowModel().rows.length}
        page={pagination.pageIndex}
        onPageChange={(_, page) => setPagination((prev) => ({ ...prev, pageIndex: page }))}
        rowsPerPage={pagination.pageSize}
        onRowsPerPageChange={(e) =>
          setPagination((prev) => ({
            ...prev,
            pageSize: parseInt(e.target.value, 10),
            pageIndex: 0,
          }))
        }
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        labelRowsPerPage="Linhas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
      />

      {/* Menu de Colunas */}
      {enableColumnVisibility && (
        <Menu
          anchorEl={columnMenuAnchor}
          open={Boolean(columnMenuAnchor)}
          onClose={() => setColumnMenuAnchor(null)}
        >
          <MenuItem disabled>
            <Typography variant="subtitle2">Mostrar/Ocultar Colunas</Typography>
          </MenuItem>
          {table.getAllLeafColumns().map((column) => {
            if (column.id === 'actions' || column.id === 'select') return null;
            return (
              <MenuItem key={column.id} dense>
                <Checkbox
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  size="small"
                />
                <Typography variant="body2">
                  {typeof column.columnDef.header === 'string'
                    ? column.columnDef.header
                    : column.id}
                </Typography>
              </MenuItem>
            );
          })}
        </Menu>
      )}
    </Paper>
  );
}
