import React, { useState, useEffect, useRef } from 'react';
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
  Button,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  title?: string;
  searchPlaceholder?: string;
  onCreateClick?: () => void;
  createButtonLabel?: string;
  onFilterClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onImportExportClick?: (event: React.MouseEvent<HTMLElement>) => void;
  toolbarExtra?: React.ReactNode;
  initialColumnVisibility?: Record<string, boolean>;
  initialPageSize?: number; // Tamanho inicial da página
  autoCalculatePageSize?: boolean; // Calcular automaticamente baseado na altura
}

export function DataTable<TData>({
  data,
  columns,
  loading = false,
  onRowClick,
  title,
  searchPlaceholder = 'Buscar...',
  onCreateClick,
  createButtonLabel = 'Criar',
  onFilterClick,
  onImportExportClick,
  toolbarExtra,
  initialColumnVisibility = {},
  initialPageSize = 10,
  autoCalculatePageSize = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Calcular pageSize baseado na altura disponível
  useEffect(() => {
    if (!autoCalculatePageSize) return;

    const calculatePageSize = () => {
      if (!tableContainerRef.current) return;

      const container = tableContainerRef.current;
      const availableHeight = container.clientHeight;
      
      // Altura aproximada de cada linha (ajuste conforme necessário)
      const rowHeight = 53; // altura padrão de uma TableRow do MUI
      
      // Calcular quantas linhas cabem
      const calculatedPageSize = Math.floor(availableHeight / rowHeight);
      
      // Mínimo de 5 linhas, máximo de 100
      const newPageSize = Math.max(5, Math.min(100, calculatedPageSize));
      
      setPagination((prev) => ({
        ...prev,
        pageSize: newPageSize,
      }));
    };

    // Calcular inicialmente
    calculatePageSize();

    // Recalcular quando a janela for redimensionada
    const handleResize = () => {
      calculatePageSize();
    };

    window.addEventListener('resize', handleResize);
    
    // Usar ResizeObserver para detectar mudanças no container
    const resizeObserver = new ResizeObserver(() => {
      calculatePageSize();
    });

    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [autoCalculatePageSize]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Paper 
      sx={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 'none',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Toolbar com ícones */}
      <Toolbar sx={{ 
        gap: 1, 
        minHeight: '64px !important', 
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '1px solid',
        borderBottomColor: 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {title && (
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          )}
          {onCreateClick && (
            <Button
              variant="contained"
              onClick={onCreateClick}
              startIcon={<AddIcon />}
              sx={{
                backgroundColor: '#000',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#333',
                },
              }}
            >
              {createButtonLabel}
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Ícone de importar/exportar */}
          {onImportExportClick && (
            <Tooltip title="Importar/Exportar">
              <IconButton onClick={onImportExportClick}>
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Ações extras da toolbar */}
          {toolbarExtra}

          {/* Ícone de filtro */}
          {onFilterClick && (
            <Tooltip title="Filtros">
              <IconButton onClick={onFilterClick}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Campo de busca expansível */}
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
            <Tooltip title="Buscar">
              <IconButton onClick={() => setSearchOpen(true)}>
                <SearchIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Toolbar>

      {/* Tabela com header fixo fora do scroll */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0,
      }}>
        {/* Header da tabela - fixo */}
        <TableContainer sx={{ flexShrink: 0 }}>
          <Table sx={{ borderCollapse: 'separate' }}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{
                        fontWeight: 600,
                        backgroundColor: 'grey.100',
                        width: header.getSize(),
                        borderBottom: '2px solid',
                        borderBottomColor: 'divider',
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
                  ))}
                </TableRow>
              ))}
            </TableHead>
          </Table>
        </TableContainer>

        {/* Body da tabela - com scroll */}
        <TableContainer 
          ref={tableContainerRef}
          sx={{ flex: 1, overflow: 'auto' }}
        >
          <Table sx={{ borderCollapse: 'separate' }}>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    align="center"
                    sx={{ py: 8 }}
                  >
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    align="center"
                    sx={{ py: 8 }}
                  >
                    <Typography color="text.secondary">
                      Nenhum registro encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => onRowClick?.(row.original)}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&:hover': {
                        backgroundColor: onRowClick ? 'action.hover' : 'inherit',
                      },
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id}
                        sx={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

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
    </Paper>
  );
}
