import React, { useState, useEffect } from 'react';
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
  Typography,
  CircularProgress,
  TableSortLabel,
  Checkbox,
  Menu,
  MenuItem,
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

// ── GitHub Dark Mode tokens ───────────────────────────────────
const GREEN = '#2ea043';
const SIDEBAR_BG = '#0d1117';
const CANVAS = '#161b22';
const BORDER = '#21262d';
const BORDER_MD = '#30363d';
const TEXT = '#e6edf3';
const MUTED = '#8b949e';
const SUB = '#6e7681';

// ── Debounce hook ──
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

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
  rightToolbarActions?: React.ReactNode;
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
  rightToolbarActions,
  onFilterClick,
  onImportExportClick,
  emptyMessage = 'Nenhum registro encontrado',
}: DataTableAdvancedProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const debouncedSearchInput = useDebounce(searchInput, 300);
  useEffect(() => { setGlobalFilter(debouncedSearchInput); }, [debouncedSearchInput]);

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

  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <Paper
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: `1px solid ${BORDER}`,
        borderRadius: '6px',
        backgroundColor: CANVAS,
        backgroundImage: 'none',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── Toolbar ── */}
      <Box sx={{
        px: 2, py: 1.25,
        borderBottom: `1px solid ${BORDER}`,
        backgroundColor: CANVAS,
      }}>
        {/* Title + count */}
        {title && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            mb: 1,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{
                width: 3, height: 18, borderRadius: '2px',
                bgcolor: GREEN,
              }} />
              <Typography sx={{
                fontSize: '0.8125rem', fontWeight: 600,
                color: TEXT,
                letterSpacing: '-0.01em',
              }}>
                {title}
              </Typography>
              <Typography sx={{
                fontSize: '0.6875rem', color: SUB,
                ml: 0.5, fontWeight: 400,
              }}>
                {filteredCount} {filteredCount === 1 ? 'registro' : 'registros'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {toolbarActions}
              {enableRowSelection && Object.keys(rowSelection).length > 0 && (
                <Chip
                  label={`${Object.keys(rowSelection).length} selecionado(s)`}
                  sx={{
                    bgcolor: 'rgba(56,139,253,0.12)',
                    color: '#58a6ff',
                    borderColor: 'rgba(56,139,253,0.3)',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    height: 22,
                    '& .MuiChip-deleteIcon': {
                      color: '#58a6ff',
                      opacity: 0.7,
                      '&:hover': { opacity: 1 },
                    },
                  }}
                  variant="outlined"
                  onDelete={() => setRowSelection({})}
                />
              )}
              {!searchOpen && (
                <Tooltip title="Buscar">
                  <IconButton size="small" onClick={() => setSearchOpen(true)} sx={{ color: MUTED }}>
                    <SearchIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Box>
        )}
        {!title && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {toolbarActions}
              {enableRowSelection && Object.keys(rowSelection).length > 0 && (
                <Chip
                  label={`${Object.keys(rowSelection).length} selecionado(s)`}
                  sx={{
                    bgcolor: 'rgba(56,139,253,0.12)',
                    color: '#58a6ff',
                    borderColor: 'rgba(56,139,253,0.3)',
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    height: 22,
                    '& .MuiChip-deleteIcon': { color: '#58a6ff', opacity: 0.7 },
                  }}
                  variant="outlined"
                  onDelete={() => setRowSelection({})}
                />
              )}
            </Stack>
          </Box>
        )}

        {/* Action row */}
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
          {rightToolbarActions}

          {searchOpen ? (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
              sx={{
                width: 240,
                '& .MuiOutlinedInput-root': {
                  bgcolor: SIDEBAR_BG,
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  height: 32,
                  '& fieldset': { borderColor: BORDER_MD },
                  '&:hover fieldset': { borderColor: MUTED },
                  '&.Mui-focused fieldset': { borderColor: GREEN },
                },
                '& .MuiInputBase-input': {
                  color: TEXT,
                  '&::placeholder': { color: SUB, opacity: 1 },
                  padding: '0 10px',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                    <SearchIcon sx={{ color: MUTED, fontSize: 15 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => {
                      setSearchInput('');
                      setGlobalFilter('');
                      setSearchOpen(false);
                    }} sx={{ color: MUTED, p: 0.25 }}>
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          ) : null}

          {enableColumnVisibility && (
            <Tooltip title="Colunas">
              <IconButton
                size="small"
                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                sx={{ color: MUTED }}
              >
                <ViewColumnIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}

          {onFilterClick && (
            <Tooltip title="Filtros">
              <IconButton size="small" onClick={onFilterClick} sx={{ color: MUTED }}>
                <FilterListIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}

          {onImportExportClick && (
            <Tooltip title="Importar/Exportar">
              <IconButton size="small" onClick={onImportExportClick} sx={{ color: MUTED }}>
                <MoreVertIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}

          {enableExport && (
            <Tooltip title="Exportar">
              <IconButton size="small" onClick={handleExport} disabled={!onExport} sx={{ color: MUTED }}>
                <FileDownloadIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* ── Table ── */}
      <TableContainer
        sx={{
          flex: 1,
          overflow: 'auto',
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-thumb': { background: BORDER_MD, borderRadius: '3px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
        }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            minWidth: 650,
          }}
        >
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {enableRowSelection && (
                  <TableCell
                    padding="checkbox"
                    sx={{
                      fontWeight: 500,
                      backgroundColor: SIDEBAR_BG,
                      color: MUTED,
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: `1px solid ${BORDER}`,
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      padding: '6px 8px',
                    }}
                  >
                    <Checkbox
                      checked={table.getIsAllRowsSelected()}
                      indeterminate={table.getIsSomeRowsSelected()}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                      size="small"
                      sx={{
                        color: MUTED,
                        '&.Mui-checked': { color: GREEN },
                      }}
                    />
                  </TableCell>
                )}
                {headerGroup.headers.map((header) => {
                  if (!header.column.getIsVisible()) return null;
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        fontWeight: 500,
                        backgroundColor: SIDEBAR_BG,
                        color: MUTED,
                        fontSize: '0.6875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: `1px solid ${BORDER}`,
                        borderRight: `1px solid ${BORDER}`,
                        width: header.getSize(),
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        padding: '6px 12px',
                        '&:last-child': { borderRight: 'none' },
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
                              sx={{
                                ml: 0.5,
                                '&.Mui-active': { color: TEXT },
                                '& .MuiTableSortLabel-icon': {
                                  fill: 'currentColor',
                                  opacity: 0.4,
                                },
                              }}
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
                <TableCell colSpan={columns.length + (enableRowSelection ? 1 : 0)} align="center" sx={{ py: 8 }}>
                  <CircularProgress sx={{ color: MUTED }} size={24} />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (enableRowSelection ? 1 : 0)} align="center" sx={{ py: 8 }}>
                  <Typography sx={{ color: MUTED, fontSize: '0.8125rem' }}>
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
                  onClick={enableRowSelection ? undefined : () => onRowClick?.(row.original)}
                  sx={{
                    cursor: onRowClick && !enableRowSelection ? 'pointer' : 'default',
                    transition: 'background-color 0.12s ease',
                    '&:hover': {
                      backgroundColor: onRowClick && !enableRowSelection ? 'rgba(255,255,255,0.02)' : 'inherit',
                    },
                  }}
                >
                  {enableRowSelection && (
                    <TableCell padding="checkbox" sx={{ borderColor: BORDER, bgcolor: 'transparent' }}>
                      <Checkbox
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                      />
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => {
                    if (!cell.column.getIsVisible()) return null;
                    return (
                      <TableCell
                        key={cell.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.tagName === 'INPUT' || target.closest('input')) {
                            e.stopPropagation();
                          }
                        }}
                        sx={{
                          borderBottom: `1px solid ${BORDER}`,
                          bgcolor: 'transparent',
                          color: TEXT,
                          fontSize: '0.8125rem',
                          padding: '8px 12px',
                          borderColor: BORDER,
                        }}
                      >
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

      {/* ── Pagination ── */}
      <TablePagination
        component="div"
        count={filteredCount}
        page={pagination.pageIndex}
        onPageChange={(_, page) => setPagination((prev) => ({ ...prev, pageIndex: page }))}
        rowsPerPage={pagination.pageSize}
        onRowsPerPageChange={(e) =>
          setPagination((prev) => ({ ...prev, pageSize: parseInt(e.target.value, 10), pageIndex: 0 }))
        }
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        labelRowsPerPage="Linhas:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
        sx={{
          borderTop: `1px solid ${BORDER}`,
          backgroundColor: CANVAS,
          '.MuiTablePagination-toolbar': {
            minHeight: 44,
            paddingLeft: 2,
            paddingRight: 2,
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: '0.6875rem',
            color: MUTED,
            padding: 0,
          },
          '.MuiSelect-select, .MuiInputBase-root': {
            fontSize: '0.6875rem',
            color: TEXT,
          },
          '.MuiSvgIcon-root': { fontSize: '1rem', color: MUTED },
          '.MuiIconButton-root': {
            color: MUTED,
            '&:hover': { color: TEXT },
          },
        }}
      />

      {/* ── Column Menu ── */}
      {enableColumnVisibility && (
        <Menu
          anchorEl={columnMenuAnchor}
          open={Boolean(columnMenuAnchor)}
          onClose={() => setColumnMenuAnchor(null)}
          PaperProps={{
            sx: {
              bgcolor: CANVAS,
              border: `1px solid ${BORDER_MD}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              borderRadius: '6px',
              minWidth: 180,
            },
          }}
        >
          <MenuItem disabled dense>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Colunas
            </Typography>
          </MenuItem>
          {table.getAllLeafColumns().map((column) => {
            if (column.id === 'actions' || column.id === 'select') return null;
            return (
              <MenuItem key={column.id} dense onClick={column.getToggleVisibilityHandler()}
                sx={{
                  py: 0.5, px: 1, gap: 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}>
                <Checkbox
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  onClick={(e) => e.stopPropagation()}
                  size="small"
                  sx={{ p: 0 }}
                />
                <Typography sx={{ fontSize: '0.75rem', color: TEXT }}>
                  {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                </Typography>
              </MenuItem>
            );
          })}
        </Menu>
      )}
    </Paper>
  );
}
