import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusIndicator from '../components/StatusIndicator';
import PageHeader from '../components/PageHeader';
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
  TablePagination,
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
  TuneRounded,
  ExpandMore,
  ExpandLess,
  ShoppingCart,
} from '@mui/icons-material';
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

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDataInicio, setSelectedDataInicio] = useState('');
  const [selectedDataFim, setSelectedDataFim] = useState('');
  const [sortBy, setSortBy] = useState('data');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
        status: selectedStatus,
        data_inicio: selectedDataInicio,
        data_fim: selectedDataFim,
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
  }, [selectedStatus, selectedDataInicio, selectedDataFim, page, rowsPerPage]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  useEffect(() => {
    const hasFilters = !!(selectedStatus || selectedDataInicio || selectedDataFim || searchTerm);
    setHasActiveFilters(hasFilters);
  }, [selectedStatus, selectedDataInicio, selectedDataFim, searchTerm]);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(pedido => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = pedido.numero?.toLowerCase().includes(searchLower) || 
                          pedido.fornecedores_nomes?.toLowerCase().includes(searchLower);
      return matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'numero') return (a.numero || '').localeCompare(b.numero || '');
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
      if (sortBy === 'valor') return (b.valor_total || 0) - (a.valor_total || 0);
      // Default: ordenar por data (mais recente primeiro)
      return new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime();
    });
  }, [pedidos, searchTerm, sortBy]);

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
  
  useEffect(() => { setPage(0); }, [searchTerm, selectedStatus, selectedDataInicio, selectedDataFim, sortBy]);
  
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedDataInicio('');
    setSelectedDataFim('');
    setSortBy('data');
  }, []);
  
  const toggleFilters = useCallback(() => setFiltersExpanded(!filtersExpanded), [filtersExpanded]);

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

  const handleViewDetails = (pedido: Pedido) => navigate(`/pedidos/${pedido.id}`);

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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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

      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <PageHeader 
          title="Pedidos de Compra" 
          totalCount={filteredPedidos.length}
          statusLegend={statusLegend}
        />
        
        <Card sx={{ borderRadius: '12px', p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              placeholder="Buscar pedidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={filtersExpanded || hasActiveFilters ? 'contained' : 'outlined'}
                startIcon={filtersExpanded ? <ExpandLess /> : <TuneRounded />}
                onClick={toggleFilters}
              >
                Filtros
                {hasActiveFilters && !filtersExpanded && (
                  <Box sx={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                )}
              </Button>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => navigate('/pedidos/novo')}
                variant="contained"
                color="success"
              >
                Novo Pedido
              </Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)}>
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
          
          <Collapse in={filtersExpanded} timeout={400}>
            <Box sx={{ mb: 3 }}>
              <FiltersContent />
            </Box>
          </Collapse>
          
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {`Mostrando ${Math.min((page * rowsPerPage) + 1, filteredPedidos.length)}-${Math.min((page + 1) * rowsPerPage, filteredPedidos.length)} de ${filteredPedidos.length} pedidos`}
          </Typography>
        </Card>

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
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Número</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Fornecedores</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Valor Total</TableCell>
                    <TableCell align="center">Itens</TableCell>
                    <TableCell align="center">Ações</TableCell>
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
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatarData(pedido.data_pedido)}
                        </Typography>
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        {getStatusChip(pedido.status)}
                      </TableCell>
                      <TableCell align="right">
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
                              color="error"
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
            <TablePagination
              component="div"
              count={filteredPedidos.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Itens por página:"
            />
          </Paper>
        )}
      </Box>

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
            color="error"
            variant="contained"
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
