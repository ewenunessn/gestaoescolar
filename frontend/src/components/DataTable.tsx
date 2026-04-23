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
  Typography,
  CircularProgress,
  TableSortLabel,
  Stack,
  Button,
  Tooltip,
  useMediaQuery,
  useTheme,
  Chip,
  Theme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// ── Theme-derived tokens (centralized in theme.ts) ──
const getToken = (theme: Theme) => ({
  green: theme.palette.success.main,
  bg: theme.palette.background.default,
  canvas: theme.palette.background.paper,
  border: theme.palette.divider,
  borderMd: 'rgba(255,255,255,0.10)',
  text: theme.palette.text.primary,
  muted: theme.palette.text.secondary,
  sub: '#666',
  canvasSub: theme.palette.background.default,
});

type MobileRowData = {
  data_inicio?: string;
  data_fim?: string;
  valor_total_contrato?: number | string;
  mes?: number;
  ano?: number;
  valor_repasse?: number | string;
  parcelas?: number | string;
  modalidades_nomes?: string;
};

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
  autoCalculatePageSize?: boolean;
}

// ── Row (memoized) ──
const TableRowMemo = memo(function TableRowMemo<TData>({
  row,
  onRowClick,
  isMobile = false,
  t,
}: {
  row: any;
  onRowClick?: (row: TData) => void;
  isMobile?: boolean;
  t: ReturnType<typeof getToken>;
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
        transition: 'background-color 0.12s ease',
        '&:hover': {
          backgroundColor: onRowClick ? 'rgba(255,255,255,0.02)' : 'inherit',
        },
      }}
    >
      {row.getVisibleCells().map((cell: any) => (
        <TableCell
          key={cell.id}
          sx={{
            width: cell.column.cardSize?.() ?? cell.column.getSize(),
            fontSize: isMobile ? '0.75rem' : '0.8125rem',
            padding: isMobile ? '8px 4px' : '8px 12px',
            borderBottom: `1px solid ${t.border}`,
            borderColor: t.border,
            color: t.text,
            bgcolor: 'transparent',
            lineHeight: 1.5,
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
  const t = getToken(theme);
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
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <Paper
      className="data-table-paper"
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Toolbar ── */}
      <Box className="data-table-toolbar" sx={{ p: 2, pb: 1.5 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 1.5,
        }}>
          {title ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box className="data-table-title-bar" />
              <Typography className="data-table-title">
                {title}
              </Typography>
              <Typography className="data-table-count">
                {filteredCount} {filteredCount === 1 ? 'registro' : 'registros'}
              </Typography>
            </Box>
          ) : <Box />}

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {onCreateClick && (
              <Button
                variant="contained"
                color="primary"
                onClick={onCreateClick}
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  px: 2,
                  letterSpacing: '-0.01em',
                  transition: 'all 0.15s ease',
                }}
              >
                {createButtonLabel}
              </Button>
            )}

            {searchOpen ? (
              <TextField
                size="small"
                placeholder={searchPlaceholder}
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                autoFocus
                className="data-table-search"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ ml: 0.5 }}>
                      <SearchIcon sx={{ color: t.muted, fontSize: 15 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleSearchClear} sx={{ color: t.muted, p: 0.25 }}>
                        <ClearIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            ) : (
              <Tooltip title="Buscar">
                <IconButton onClick={handleSearchToggle} size="small" sx={{ color: t.muted }}>
                  <SearchIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}

            {onFilterClick && (
              <Tooltip title="Filtros">
                <IconButton size="small" onClick={onFilterClick} sx={{ color: t.muted }}>
                  <FilterListIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}

            {onImportExportClick && (
              <Tooltip title="Importar/Exportar">
                <IconButton onClick={onImportExportClick} size="small" sx={{ color: t.muted }}>
                  <MoreVertIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            )}

            {toolbarExtra}
          </Box>
        </Box>
      </Box>

      {/* ── Table ── */}
      {!isMobile ? (
        <TableContainer
          sx={{
            flex: 1,
            overflow: 'auto',
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
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      className="data-table-header-cell"
                      sx={{
                        width: header.getSize(),
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
                                '&.Mui-active': { color: t.text },
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
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                    <CircularProgress sx={{ color: t.muted }} size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ color: t.muted, fontSize: '0.8125rem' }}>
                        Nenhum registro encontrado
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRowMemo
                    key={row.id}
                    row={row}
                    onRowClick={onRowClick as ((row: unknown) => void) | undefined}
                    t={t}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* ── Mobile Cards ── */
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: t.muted }} size={24} />
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography sx={{ color: t.muted, fontSize: '0.8125rem' }}>
                Nenhum registro encontrado
              </Typography>
            </Box>
          ) : (
            rows.map((row) => {
              const original = row.original as TData & MobileRowData;
              const cells = row.getVisibleCells();
              const nomeCell = cells.find((c: any) => c.column.id === 'nome');
              const numeroCell = cells.find((c: any) => c.column.id === 'numero');
              const guiaNomeCell = cells.find((c: any) => c.column.id === 'guia_nome');
              const tipoCell = cells.find((c: any) => c.column.id === 'tipo');
              const statusCell = cells.find((c: any) => c.column.id === 'ativo' || c.column.id === 'status' || c.column.id === 'guia_status');
              const valorCaloricoCell = cells.find((c: any) => c.column.id === 'valor_calorico');
              const totalAlunosCell = cells.find((c: any) => c.column.id === 'total_alunos');
              const modalidadesCell = cells.find((c: any) => c.column.id === 'modalidades');
              const valorRepasseCell = cells.find((c: any) => c.column.id === 'valor_repasse');
              const parcelasCell = cells.find((c: any) => c.column.id === 'parcelas');
              const totalAnualCell = cells.find((c: any) => c.column.id === 'total_anual');
              const unidadeCell = cells.find((c: any) => c.column.id === 'unidade');
              const composicaoCell = cells.find((c: any) => c.column.id === 'tem_composicao_nutricional');
              const contratoCell = cells.find((c: any) => c.column.id === 'tem_contrato');
              const fornecedorCell = cells.find((c: any) => c.column.id === 'fornecedor_id');
              const vigenciaCell = cells.find((c: any) => c.column.id === 'vigencia');
              const valorTotalCell = cells.find((c: any) => c.column.id === 'valor_total_contrato');
              const competenciaCell = cells.find((c: any) => c.column.id === 'competencia');
              const totalEscolasCell = cells.find((c: any) => c.column.id === 'total_escolas');
              const totalItensCell = cells.find((c: any) => c.column.id === 'total_itens');
              const actionsCell = cells.find((c: any) => c.column.id === 'actions');

              return (
                <Paper
                  key={row.id}
                  onClick={() => onRowClick?.(row.original as TData)}
                  elevation={0}
                  sx={{
                    mb: 0.75,
                    p: 1.25,
                    cursor: onRowClick ? 'pointer' : 'default',
                    border: `1px solid ${t.border}`,
                    borderRadius: '6px',
                    backgroundColor: t.canvas,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      borderColor: t.borderMd,
                    },
                    '&:active': {
                      transform: onRowClick ? 'scale(0.99)' : 'none',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, mr: 1 }}>
                      {statusCell && !numeroCell && !guiaNomeCell && (
                        <Box sx={{ flexShrink: 0, mt: 0.25 }}>
                          {flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}
                        </Box>
                      )}
                      <Box sx={{ flex: 1 }}>
                        {numeroCell ? (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: t.text }}>
                                {String(numeroCell.getValue() ?? '')}
                              </Typography>
                              {statusCell && (
                                <Box sx={{
                                  display: 'inline-flex',
                                  '& .MuiChip-root': { height: '18px', fontSize: '0.65rem', fontWeight: 500 }
                                }}>
                                  {flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}
                                </Box>
                              )}
                            </Box>
                            {fornecedorCell && (
                              <Typography sx={{ color: t.muted, display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                                {flexRender(fornecedorCell.column.columnDef.cell, fornecedorCell.getContext())}
                              </Typography>
                            )}
                            <Typography sx={{ color: t.muted, display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                              {original.data_inicio && original.data_fim && (
                                <>
                                  {new Date(original.data_inicio).toLocaleDateString('pt-BR')} a {new Date(original.data_fim).toLocaleDateString('pt-BR')}
                                </>
                              )}
                              {original.valor_total_contrato && (
                                <>
                                  {' - '}
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(original.valor_total_contrato))}
                                </>
                              )}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Box sx={{
                              fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.3,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: t.text,
                            }}>
                              {guiaNomeCell
                                ? flexRender(guiaNomeCell.column.columnDef.cell, guiaNomeCell.getContext())
                                : nomeCell && flexRender(nomeCell.column.columnDef.cell, nomeCell.getContext())}
                            </Box>
                            {guiaNomeCell && (competenciaCell || totalEscolasCell || totalItensCell || statusCell) && (
                              <Box sx={{ color: t.muted, display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                                {competenciaCell && <>{flexRender(competenciaCell.column.columnDef.cell, competenciaCell.getContext()) as React.ReactNode}</>}
                                {competenciaCell && (totalEscolasCell || totalItensCell) && ' - '}
                                {totalEscolasCell && Boolean(totalEscolasCell.getValue()) && <>{String(totalEscolasCell.getValue())} escolas</>}
                                {totalEscolasCell && Boolean(totalEscolasCell.getValue()) && totalItensCell && Boolean(totalItensCell.getValue()) && ', '}
                                {totalItensCell && Boolean(totalItensCell.getValue()) && <>{String(totalItensCell.getValue())} itens</>}
                                {(competenciaCell || totalEscolasCell || totalItensCell) && statusCell && ' - '}
                                {statusCell && <>{flexRender(statusCell.column.columnDef.cell, statusCell.getContext()) as React.ReactNode}</>}
                              </Box>
                            )}
                            {!guiaNomeCell && competenciaCell && (
                              <Typography sx={{ color: t.muted, display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                                {original.mes && original.ano && (
                                  <>{original.mes}/{original.ano}{original.modalidades_nomes && <> - {original.modalidades_nomes}</>}</>
                                )}
                              </Typography>
                            )}
                            {!guiaNomeCell && !competenciaCell && (totalAlunosCell || modalidadesCell || valorRepasseCell || parcelasCell || totalAnualCell || unidadeCell || composicaoCell || contratoCell) && (
                              // @ts-expect-error Mobile summary mixes heterogeneous cell value types.
                              <Box sx={{ color: t.muted, display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                                {totalAlunosCell && Boolean(totalAlunosCell.getValue()) && <>{Number(totalAlunosCell.getValue()).toLocaleString('pt-BR')} alunos</>}
                                {totalAlunosCell && Boolean(totalAlunosCell.getValue()) && modalidadesCell && Boolean(modalidadesCell.getValue()) && ' - '}
                                {modalidadesCell && Boolean(modalidadesCell.getValue()) && <>{String(modalidadesCell.getValue())}</>}
                                {valorRepasseCell && Boolean(valorRepasseCell.getValue()) && <>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valorRepasseCell.getValue()))}</>}
                                {valorRepasseCell && valorRepasseCell.getValue() && parcelasCell && ' × '}
                                {parcelasCell && Boolean(parcelasCell.getValue()) && <>{String(parcelasCell.getValue())}x</>}
                                {((valorRepasseCell && Boolean(valorRepasseCell.getValue())) || (parcelasCell && Boolean(parcelasCell.getValue()))) && totalAnualCell && ' = '}
                                {totalAnualCell && original.valor_repasse && <>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(original.valor_repasse) * (Number(original.parcelas) || 1))}</>}
                                {unidadeCell && Boolean(unidadeCell.getValue()) && <>{String(unidadeCell.getValue())}</>}
                                {unidadeCell && Boolean(unidadeCell.getValue()) && (composicaoCell || contratoCell) && ' - '}
                                {composicaoCell && composicaoCell.getValue() && <>Composição</>}
                                {composicaoCell && composicaoCell.getValue() && contratoCell && contratoCell.getValue() && ', '}
                                {contratoCell && contratoCell.getValue() && <>Contrato</>}
                              </Box>
                            )}
                          </>
                        )}
                      </Box>
                    </Box>
                    {actionsCell && (
                      <Box onClick={(e) => e.stopPropagation()}>
                        {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                      </Box>
                    )}
                  </Box>
                  {(tipoCell || valorCaloricoCell) && (
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: 3, flexWrap: 'wrap' }}>
                      {tipoCell && <Box>{flexRender(tipoCell.column.columnDef.cell, tipoCell.getContext())}</Box>}
                      {valorCaloricoCell && (
                        <Typography sx={{ color: t.muted, fontSize: '0.7rem' }}>
                          {flexRender(valorCaloricoCell.column.columnDef.cell, valorCaloricoCell.getContext())}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Paper>
              );
            })
          )}
        </Box>
      )}

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
        rowsPerPageOptions={isMobile ? [10, 25] : [10, 25, 50, 100]}
        labelRowsPerPage={isMobile ? 'Linhas:' : 'Linhas:'}
        labelDisplayedRows={({ from, to, count }) =>
          isMobile ? `${from}-${to}/${count}` : `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
        sx={{
          borderTop: `1px solid ${t.border}`,
          backgroundColor: t.canvas,
          '.MuiTablePagination-toolbar': {
            minHeight: 44,
            paddingLeft: 2,
            paddingRight: 2,
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: '0.6875rem',
            color: t.muted,
            paddingTop: 0,
            paddingBottom: 0,
          },
          '.MuiSelect-select, .MuiInputBase-root': {
            fontSize: '0.6875rem',
            color: t.text,
          },
          '.MuiSvgIcon-root': {
            fontSize: '1rem',
            color: t.muted,
          },
          '.MuiIconButton-root': {
            color: t.muted,
            '&:hover': { color: t.text },
          },
        }}
      />
    </Paper>
  );
}) as <TData>(props: DataTableProps<TData>) => JSX.Element;
