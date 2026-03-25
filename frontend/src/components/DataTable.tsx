import React, { useState, useCallback, memo } from 'react';
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
  useMediaQuery,
  useTheme,
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
  initialPageSize?: number;
  autoCalculatePageSize?: boolean; // Mantido para compatibilidade
}

// Componente de linha memoizado para evitar re-renders desnecessários
const TableRowMemo = memo(function TableRowMemo<TData>({ 
  row, 
  onRowClick,
  isMobile = false,
}: { 
  row: any; 
  onRowClick?: (row: TData) => void;
  isMobile?: boolean;
}) {
  const handleClick = useCallback(() => {
    onRowClick?.(row.original);
  }, [row.original, onRowClick]);

  return (
    <TableRow
      hover
      onClick={handleClick}
      sx={{
        cursor: onRowClick ? 'pointer' : 'default',
        '&:hover': {
          backgroundColor: onRowClick ? 'action.hover' : 'inherit',
        },
      }}
    >
      {row.getVisibleCells().map((cell: any) => (
        <TableCell 
          key={cell.id}
          sx={{ 
            width: cell.column.getSize(),
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            padding: isMobile ? '8px 4px' : '16px',
          }}
        >
          {flexRender(
            cell.column.columnDef.cell,
            cell.getContext()
          )}
        </TableCell>
      ))}
    </TableRow>
  );
});

export const DataTable = memo(function DataTable<TData>({
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
  initialPageSize = 50,
}: DataTableProps<TData>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: isMobile ? 10 : initialPageSize,
  });
  const [searchOpen, setSearchOpen] = useState(false);

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

  const handleSearchToggle = useCallback(() => {
    setSearchOpen(prev => !prev);
    if (searchOpen) {
      setGlobalFilter('');
    }
  }, [searchOpen]);

  const handleSearchClear = useCallback(() => {
    setGlobalFilter('');
    setSearchOpen(false);
  }, []);

  const rows = table.getRowModel().rows;

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
        // Otimização: usar will-change para preparar o browser
        willChange: 'transform',
      }}
    >
      {/* Toolbar */}
      <Toolbar sx={{ 
        gap: 1, 
        minHeight: isMobile ? '56px !important' : '64px !important',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '1px solid',
        borderBottomColor: 'divider',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        py: isMobile ? 1 : 0,
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          justifyContent: isMobile ? 'space-between' : 'flex-start',
          width: isMobile ? '100%' : 'auto',
        }}>
          {title && !isMobile && (
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          )}
          {onCreateClick && (
            <Button
              variant="contained"
              onClick={onCreateClick}
              startIcon={!isMobile && <AddIcon />}
              size={isMobile ? 'small' : 'medium'}
              fullWidth={isMobile}
              sx={{
                backgroundColor: '#000',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#333',
                },
              }}
            >
              {isMobile ? <AddIcon /> : createButtonLabel}
            </Button>
          )}
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          justifyContent: isMobile ? 'space-between' : 'flex-end',
          width: isMobile ? '100%' : 'auto',
        }}>
          {onImportExportClick && (
            <Tooltip title="Importar/Exportar">
              <IconButton onClick={onImportExportClick}>
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {toolbarExtra}

          {onFilterClick && (
            <Tooltip title="Filtros">
              <IconButton onClick={onFilterClick}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {searchOpen ? (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              autoFocus
              fullWidth={isMobile}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearchClear}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ width: isMobile ? '100%' : 250 }}
            />
          ) : (
            <Tooltip title="Buscar">
              <IconButton onClick={handleSearchToggle}>
                <SearchIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Toolbar>

      {/* Tabela com scroll otimizado - Desktop */}
      {!isMobile ? (
        <TableContainer 
          sx={{ 
            flex: 1, 
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            transform: 'translateZ(0)',
            willChange: 'scroll-position',
          }}
        >
          <Table 
            stickyHeader
            sx={{ 
              minWidth: 650,
              tableLayout: 'auto',
            }}
          >
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
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
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
              ) : rows.length === 0 ? (
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
                rows.map((row) => (
                  <TableRowMemo 
                    key={row.id} 
                    row={row} 
                    onRowClick={onRowClick}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* View Mobile - Cards */
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            p: 2,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">
                Nenhum registro encontrado
              </Typography>
            </Box>
          ) : (
            rows.map((row) => (
              <Paper
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                sx={{
                  mb: 2,
                  p: 2,
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: onRowClick ? 'action.hover' : 'inherit',
                  },
                }}
              >
                {row.getVisibleCells().map((cell: any, index: number) => {
                  const header = table.getHeaderGroups()[0].headers[index];
                  return (
                    <Box
                      key={cell.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 0.5,
                        borderBottom: index < row.getVisibleCells().length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: 'text.secondary', mr: 2 }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Box>
                    </Box>
                  );
                })}
              </Paper>
            ))
          )}
        </Box>
      )}

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
        rowsPerPageOptions={isMobile ? [10, 25] : [10, 25, 50, 100]}
        labelRowsPerPage={isMobile ? 'Linhas:' : 'Linhas por página:'}
        labelDisplayedRows={({ from, to, count }) =>
          isMobile ? `${from}-${to}/${count}` : `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
        sx={{
          '.MuiTablePagination-toolbar': {
            minHeight: isMobile ? '48px' : '52px',
            paddingLeft: isMobile ? 1 : 2,
            paddingRight: isMobile ? 0.5 : 2,
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: isMobile ? '0.75rem' : '0.875rem',
          },
        }}
      />
    </Paper>
  );
}) as <TData>(props: DataTableProps<TData>) => JSX.Element;
