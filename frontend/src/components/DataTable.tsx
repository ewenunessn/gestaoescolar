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
  Chip,
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
            <Typography 
              variant="h6" 
              component="div"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '300px',
              }}
            >
              {title}
            </Typography>
          )}
          {onCreateClick && (
            <Button
              variant="contained"
              onClick={onCreateClick}
              startIcon={<AddIcon />}
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
              {createButtonLabel}
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
        /* View Mobile - Cards Compactos */
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            p: 1.5,
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
            rows.map((row) => {
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
              const unidadeCell = cells.find((c: any) => c.column.id === 'unidade_distribuicao');
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
                  onClick={() => onRowClick?.(row.original)}
                  elevation={0}
                  sx={{
                    mb: 1,
                    p: 1.5,
                    cursor: onRowClick ? 'pointer' : 'default',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    transition: 'all 0.15s',
                    '&:hover': {
                      backgroundColor: onRowClick ? 'action.hover' : 'inherit',
                      borderColor: onRowClick ? 'primary.main' : 'divider',
                    },
                    '&:active': {
                      transform: onRowClick ? 'scale(0.99)' : 'none',
                    },
                  }}
                >
                  {/* Linha principal: Status + Nome/Número + Ações */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, mr: 1 }}>
                      {statusCell && !numeroCell && !guiaNomeCell && (
                        <Box sx={{ flexShrink: 0, mt: 0.5 }}>
                          {flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}
                        </Box>
                      )}
                      <Box sx={{ flex: 1 }}>
                        {/* Para Contratos: mostrar número ao invés de nome */}
                        {numeroCell ? (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {numeroCell.getValue()}
                              </Typography>
                              {statusCell && (
                                <Box sx={{ 
                                  display: 'inline-flex',
                                  '& .MuiChip-root': {
                                    height: '18px',
                                    fontSize: '0.65rem',
                                    fontWeight: 500,
                                  }
                                }}>
                                  {flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}
                                </Box>
                              )}
                            </Box>
                            {/* Fornecedor */}
                            {fornecedorCell && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                                {flexRender(fornecedorCell.column.columnDef.cell, fornecedorCell.getContext())}
                              </Typography>
                            )}
                            {/* Vigência + Valor */}
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                              {row.original.data_inicio && row.original.data_fim && (
                                <>
                                  {new Date(row.original.data_inicio).toLocaleDateString('pt-BR')} a {new Date(row.original.data_fim).toLocaleDateString('pt-BR')}
                                </>
                              )}
                              {row.original.valor_total_contrato && (
                                <>
                                  {' - '}
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.original.valor_total_contrato))}
                                </>
                              )}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Box sx={{ 
                              fontSize: '0.875rem', 
                              fontWeight: 600, 
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {/* Para Guias de Demanda: mostrar guia_nome */}
                              {guiaNomeCell ? (
                                flexRender(guiaNomeCell.column.columnDef.cell, guiaNomeCell.getContext())
                              ) : (
                                nomeCell && flexRender(nomeCell.column.columnDef.cell, nomeCell.getContext())
                              )}
                            </Box>
                            {/* Subtítulo: Competência + Escolas + Itens + Status para Guias de Demanda */}
                            {guiaNomeCell && (competenciaCell || totalEscolasCell || totalItensCell || statusCell) && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                                {competenciaCell && (
                                  <>{flexRender(competenciaCell.column.columnDef.cell, competenciaCell.getContext())}</>
                                )}
                                {competenciaCell && (totalEscolasCell || totalItensCell) && ' - '}
                                {totalEscolasCell && totalEscolasCell.getValue() && (
                                  <>{totalEscolasCell.getValue()} escolas</>
                                )}
                                {totalEscolasCell && totalEscolasCell.getValue() && totalItensCell && totalItensCell.getValue() && ', '}
                                {totalItensCell && totalItensCell.getValue() && (
                                  <>{totalItensCell.getValue()} itens</>
                                )}
                                {(competenciaCell || totalEscolasCell || totalItensCell) && statusCell && ' - '}
                                {statusCell && (
                                  <>{flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}</>
                                )}
                              </Typography>
                            )}
                            {/* Subtítulo: Competência + Modalidades para Cardápios */}
                            {!guiaNomeCell && competenciaCell && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                                {row.original.mes && row.original.ano && (
                                  <>
                                    {row.original.mes}/{row.original.ano}
                                    {(row.original as any).modalidades_nomes && (
                                      <> - {(row.original as any).modalidades_nomes}</>
                                    )}
                                  </>
                                )}
                              </Typography>
                            )}
                            {/* Subtítulo para outras páginas */}
                            {!guiaNomeCell && !competenciaCell && (totalAlunosCell || modalidadesCell || valorRepasseCell || parcelasCell || totalAnualCell || unidadeCell || composicaoCell || contratoCell) && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
                                {/* Para Escolas */}
                                {totalAlunosCell && totalAlunosCell.getValue() && (
                                  <>{Number(totalAlunosCell.getValue()).toLocaleString('pt-BR')} alunos</>
                                )}
                                {totalAlunosCell && totalAlunosCell.getValue() && modalidadesCell && modalidadesCell.getValue() && ' - '}
                                {modalidadesCell && modalidadesCell.getValue() && (
                                  <>{modalidadesCell.getValue()}</>
                                )}
                                {/* Para Modalidades */}
                                {valorRepasseCell && valorRepasseCell.getValue() && (
                                  <>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valorRepasseCell.getValue()))}
                                  </>
                                )}
                                {valorRepasseCell && valorRepasseCell.getValue() && parcelasCell && ' × '}
                                {parcelasCell && parcelasCell.getValue() && (
                                  <>{parcelasCell.getValue()}x</>
                                )}
                                {(valorRepasseCell && valorRepasseCell.getValue() || parcelasCell && parcelasCell.getValue()) && totalAnualCell && ' = '}
                                {totalAnualCell && row.original.valor_repasse && (
                                  <>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                      Number(row.original.valor_repasse) * (Number(row.original.parcelas) || 1)
                                    )}
                                  </>
                                )}
                                {/* Para Produtos */}
                                {unidadeCell && unidadeCell.getValue() && (
                                  <>{unidadeCell.getValue()}</>
                                )}
                                {unidadeCell && unidadeCell.getValue() && (composicaoCell || contratoCell) && ' - '}
                                {composicaoCell && composicaoCell.getValue() && (
                                  <>Composição</>
                                )}
                                {composicaoCell && composicaoCell.getValue() && contratoCell && contratoCell.getValue() && ', '}
                                {contratoCell && contratoCell.getValue() && (
                                  <>Contrato</>
                                )}
                              </Typography>
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
                  
                  {/* Linha secundária: Tipo + Valor Calórico (para Preparações) */}
                  {(tipoCell || valorCaloricoCell) && (
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: 3, flexWrap: 'wrap' }}>
                      {tipoCell && (
                        <Box>
                          {flexRender(tipoCell.column.columnDef.cell, tipoCell.getContext())}
                        </Box>
                      )}
                      {valorCaloricoCell && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
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
