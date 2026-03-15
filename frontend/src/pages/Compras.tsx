import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusIndicator from '../components/StatusIndicator';
import PageContainer from '../components/PageContainer';
import TableFilter, { FilterField } from '../components/TableFilter';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Chip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Menu,
  Collapse,
  Divider,
  Grid,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  Download,
  MoreVert,
  FilterList as FilterIcon,
  ShoppingCart,
} from '@mui/icons-material';
import CompactPagination from '../components/CompactPagination';
import pedidosService from '../services/pedidos';
import { Pedido, STATUS_PEDIDO, PedidoFiltros } from '../types/pedido';
import { formatarMoeda, formatarData } from '../utils/dateUtils';

const PedidosPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  // Estados principais
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [loadingExport, setLoadingExport] = useState(false);

  // Estados de filtros - NOVO SISTEMA
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  // Estados do modal
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState<Pedido | null>(null);
  const [processandoExclusao, setProcessandoExclusao] = useState(false);

  const loadPedidos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pedidosService.listar({
        status: filters.status,
        data_inicio: filters.data_from,
        data_fim: filters.data_to,
        page: page + 1,
        limit: rowsPerPage
      });
      
      setPedidos(Array.isArray(response.data) ? response.data : []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError('Erro ao carregar pedidos. Tente novamente.');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.data_from, filters.data_to, page, rowsPerPage]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  // Definir campos de filtro
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'rascunho', label: 'Rascunho' },
        { value: 'enviado', label: 'Enviado' },
        { value: 'confirmado', label: 'Confirmado' },
        { value: 'cancelado', label: 'Cancelado' },
      ],
    },
    {
      type: 'dateRange',
      label: 'Período',
      key: 'data',
    },
  ], []);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(pedido => {
      // Busca por palavra-chave
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!(pedido.numero?.toLowerCase().includes(searchLower) || 
              pedido.fornecedores_nomes?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Ordenar por data (mais recente primeiro)
      return new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime();
    });
  }, [pedidos, filters]);

  // Legenda de status
  const statusLegend = useMemo(() => {
    const statusCounts = filteredPedidos.reduce((acc, pedido) => {
      const status = pedido.status || 'rascunho';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { status: 'rascunho', label: 'RASCUNHO', count: statusCounts.rascunho || 0 },
      { status: 'enviado', label: 'ENVIADO', count: statusCounts.enviado || 0 },
      { status: 'confirmado', label: 'CONFIRMADO', count: statusCounts.confirmado || 0 },
      { status: 'cancelado', label: 'CANCELADO', count: statusCounts.cancelado || 0 }
    ];
  }, [filteredPedidos]);

  const paginatedPedidos = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredPedidos.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredPedidos, page, rowsPerPage]);

  const handleChangePage = useCallback((event: unknown, newPage: number) => setPage(newPage), []);
  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  
  useEffect(() => { setPage(0); }, [filters]);

  const getStatusChip = (status: string) => {
    const statusInfo = STATUS_PEDIDO[status as keyof typeof STATUS_PEDIDO];
    return (
      <Chip
        label={statusInfo?.label || status}
        color={statusInfo?.color as any || 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

  const abrirDialogoExclusao = (pedido: Pedido) => {
    setPedidoParaExcluir(pedido);
    setDialogExcluir(true);
  };

  const handleExcluir = async () => {
    if (!pedidoParaExcluir) return;

    try {
      setProcessandoExclusao(true);
      await pedidosService.excluirPedido(pedidoParaExcluir.id);
      setSuccessMessage('Pedido excluído com sucesso!');
      setDialogExcluir(false);
      setPedidoParaExcluir(null);
      await loadPedidos();
    } catch (error: any) {
      setError('Erro ao excluir pedido. Tente novamente.');
    } finally {
      setProcessandoExclusao(false);
    }
  };

  const handleViewDetails = (pedido: Pedido) => navigate(`/compras/${pedido.id}`);

  const FiltersContent = () => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: '12px', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneRounded sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Filtros Avançados
          </Typography>
        </Box>
        {hasActiveFilters && (
          <Button size="small" onClick={clearFilters} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            Limpar Tudo
          </Button>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e: SelectChangeEvent<string>) => setSelectedStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="pendente">Pendente</MenuItem>
              <MenuItem value="aprovado">Aprovado</MenuItem>
              <MenuItem value="em_separacao">Em Separação</MenuItem>
              <MenuItem value="enviado">Enviado</MenuItem>
              <MenuItem value="entregue">Entregue</MenuItem>
              <MenuItem value="cancelado">Cancelado</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            label="Data Início"
            type="date"
            value={selectedDataInicio}
            onChange={(e) => setSelectedDataInicio(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            label="Data Fim"
            type="date"
            value={selectedDataFim}
            onChange={(e) => setSelectedDataFim(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Ordenar por</InputLabel>
            <Select
              value={sortBy}
              onChange={(e: SelectChangeEvent<string>) => setSortBy(e.target.value)}
              label="Ordenar por"
            >
              <MenuItem value="data">Data</MenuItem>
              <MenuItem value="numero">Número</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="valor">Valor</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      {successMessage && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </Box>
      )}
      {error && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      <PageContainer fullHeight>
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar pedidos..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={(e) => { setFilterAnchorEl(e.currentTarget); setFilterOpen(true); }}
                size="small"
              >
                Filtros
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={() => navigate('/compras/novo')}
                variant="contained"
                color="add"
                size="small"
              >
                Novo Pedido
              </Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small">
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
        </Card>

        <TableFilter
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={setFilters}
          fields={filterFields}
          initialValues={filters}
          showSearch={false}
          anchorEl={filterAnchorEl}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredPedidos.length} {filteredPedidos.length === 1 ? 'resultado' : 'resultados'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {statusLegend.map((item) => (
              <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StatusIndicator status={item.status} size="small" />
                <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
                  {item.count}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

        {loading ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={60} />
            </CardContent>
          </Card>
        ) : error && pedidos.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              <Button variant="contained" onClick={loadPedidos}>Tentar Novamente</Button>
            </CardContent>
          </Card>
        ) : filteredPedidos.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <ShoppingCart sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                Nenhum pedido encontrado
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ flex: 1, minHeight: 0 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell align="center">Data</TableCell>
                    <TableCell align="center">Fornecedores</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Valor Total</TableCell>
                    <TableCell align="center">Itens</TableCell>
                    <TableCell align="center" width="100">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedPedidos.map((pedido) => (
                    <TableRow key={pedido.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={pedido.status} size="small" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {pedido.numero}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">
                          {formatarData(pedido.data_pedido)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">
                          {pedido.total_fornecedores && pedido.total_fornecedores > 1 ? (
                            <Tooltip title={pedido.fornecedores_nomes || ''}>
                              <Chip 
                                label={`${pedido.total_fornecedores} fornecedores`} 
                                size="small" 
                                color="primary"
                                variant="outlined"
                              />
                            </Tooltip>
                          ) : (
                            pedido.fornecedores_nomes || '-'
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getStatusChip(pedido.status)}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatarMoeda(pedido.valor_total)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={pedido.total_itens || 0} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Ver Detalhes">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(pedido)}
                              color="primary"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir Pedido">
                            <IconButton
                              size="small"
                              onClick={() => abrirDialogoExclusao(pedido)}
                              color="delete"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <CompactPagination
              count={filteredPedidos.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Box>
        )}
        </Box>
      </PageContainer>

      {/* Dialog de Exclusão */}
      <Dialog open={dialogExcluir} onClose={() => setDialogExcluir(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Excluir Pedido</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {pedidoParaExcluir && (
              <>
                Tem certeza que deseja excluir o pedido <strong>{pedidoParaExcluir.numero}</strong>?
                <br />
                <br />
                {pedidoParaExcluir.status === 'rascunho' 
                  ? 'Este rascunho será removido permanentemente.'
                  : pedidoParaExcluir.status === 'cancelado'
                  ? 'Este pedido cancelado será removido permanentemente.'
                  : pedidoParaExcluir.status === 'entregue'
                  ? 'Este pedido entregue será removido permanentemente, incluindo o histórico de entrega.'
                  : 'Este pedido em andamento será removido permanentemente. Esta ação pode impactar fornecedores e processos em curso.'
                }
              </>
            )}
          </Typography>
          {pedidoParaExcluir && !['rascunho', 'cancelado', 'entregue'].includes(pedidoParaExcluir.status) && (
            <Typography variant="body2" color="warning.main" sx={{ mb: 2, fontWeight: 'bold' }}>
              ⚠️ Atenção: Este pedido está em andamento. A exclusão pode impactar fornecedores e processos em curso.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogExcluir(false)} variant="outlined" disabled={processandoExclusao}>
            Cancelar
          </Button>
          <Button
            onClick={handleExcluir}
            color="delete" variant="contained"
            disabled={processandoExclusao}
          >
            {processandoExclusao ? <CircularProgress size={24} /> : 'Confirmar Exclusão'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        <MenuItem onClick={() => { setActionsMenuAnchor(null); /* handleExportarPedidos(); */ }} disabled={loadingExport}>
          <Download sx={{ mr: 1 }} /> {loadingExport ? 'Exportando...' : 'Exportar Excel'}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default PedidosPage;
