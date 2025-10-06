import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import pedidosService from '../services/pedidos';
import { Pedido, STATUS_PEDIDO, PedidoFiltros } from '../types/pedido';
import { formatarMoeda, formatarData } from '../utils/dateUtils';

export default function Pedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  const [filtros, setFiltros] = useState<PedidoFiltros>({
    status: '',
    data_inicio: '',
    data_fim: ''
  });

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState<Pedido | null>(null);
  const [processandoExclusao, setProcessandoExclusao] = useState(false);

  useEffect(() => {
    carregarPedidos();
  }, [page, rowsPerPage]);

  const carregarPedidos = async () => {
    try {
      setLoading(true);
      const response = await pedidosService.listar({
        ...filtros,
        page: page + 1,
        limit: rowsPerPage
      });
      
      setPedidos(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    setPage(0);
    carregarPedidos();
  };

  const limparFiltros = () => {
    setFiltros({
      status: '',
      data_inicio: '',
      data_fim: ''
    });
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusChip = (status: string) => {
    const statusInfo = STATUS_PEDIDO[status as keyof typeof STATUS_PEDIDO];
    return (
      <Chip
        label={statusInfo?.label || status}
        color={statusInfo?.color as any || 'default'}
        size="small"
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
      setDialogExcluir(false);
      setPedidoParaExcluir(null);
      await carregarPedidos(); // Recarregar a lista
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      // Aqui você pode adicionar um toast ou alert de erro
    } finally {
      setProcessandoExclusao(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Pedidos de Compra
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar">
            <IconButton onClick={carregarPedidos} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filtros">
            <IconButton onClick={() => setMostrarFiltros(!mostrarFiltros)} color="primary">
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/pedidos/novo')}
          >
            Novo Pedido
          </Button>
        </Box>
      </Box>

      {mostrarFiltros && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filtros.status}
                    label="Status"
                    onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
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
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Data Início"
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Data Fim"
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button variant="contained" onClick={aplicarFiltros} fullWidth>
                  Aplicar
                </Button>
                <Button variant="outlined" onClick={limparFiltros} fullWidth>
                  Limpar
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Paper}>
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : pedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhum pedido encontrado
                </TableCell>
              </TableRow>
            ) : (
              pedidos.map((pedido) => (
                <TableRow key={pedido.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {pedido.numero}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatarData(pedido.data_pedido)}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>{getStatusChip(pedido.status)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {formatarMoeda(pedido.valor_total)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={pedido.total_itens || 0} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="Ver detalhes">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/pedidos/${pedido.id}`)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir pedido">
                        <IconButton
                          size="small"
                          onClick={() => abrirDialogoExclusao(pedido)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      {/* Diálogo de Exclusão */}
      <Dialog open={dialogExcluir} onClose={() => setDialogExcluir(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Excluir Pedido
        </DialogTitle>
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
          <Button onClick={() => setDialogExcluir(false)} disabled={processandoExclusao}>
            Cancelar
          </Button>
          <Button
            onClick={handleExcluir}
            color="error"
            variant="contained"
            disabled={processandoExclusao}
          >
            {processandoExclusao ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
