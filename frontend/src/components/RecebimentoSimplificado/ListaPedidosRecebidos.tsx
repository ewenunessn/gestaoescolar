import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Grid,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  MoreVert as MoreVertIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { recebimentoSimplificadoService } from '../../services/recebimentoSimplificadoService';
import { PedidoPendente } from '../../types/recebimentoSimplificado';

// Interface estendida para pedidos recebidos
interface PedidoRecebido extends PedidoPendente {
  fornecedor_nome?: string;
  data_ultimo_recebimento?: string;
  total_recebimentos?: number;
  valor_total_pedido?: number;
  valor_total_recebido?: number;
  percentual_recebido?: number;
}

const ListaPedidosRecebidos: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoRecebido[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoRecebido | null>(null);

  useEffect(() => {
    carregarPedidosRecebidos();
  }, []);

  const carregarPedidosRecebidos = async () => {
    try {
      setLoading(true);
      const pedidos = await recebimentoSimplificadoService.listarPedidosRecebidos();
      setPedidos(pedidos);
    } catch (error: any) {
      console.error('Erro ao carregar pedidos recebidos:', error);
      setErro(error.message || 'Erro ao carregar pedidos recebidos');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, pedido: PedidoRecebido) => {
    setMenuAnchor(event.currentTarget);
    setPedidoSelecionado(pedido);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setPedidoSelecionado(null);
  };

  const handleMenuAction = (action: string) => {
    if (!pedidoSelecionado) return;
    
    switch (action) {
      case 'editar':
        navigate(`/pedidos-modernos/${pedidoSelecionado.id}/editar`);
        break;
      case 'historico':
        navigate(`/recebimento-simplificado/${pedidoSelecionado.id}/historico`);
        break;
      case 'imprimir':
        window.print();
        break;
      case 'exportar':
        // Implementar exportação
        console.log('Exportar pedido:', pedidoSelecionado.numero_pedido);
        break;
    }
    handleMenuClose();
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };



  const getStatusLabel = (pedido: PedidoRecebido) => {
    const percentual = pedido.percentual_recebido || 0;
    
    if (percentual >= 100) {
      return 'Recebido Completo';
    } else if (percentual > 0) {
      return 'Recebido Parcial';
    } else {
      return pedido.status || 'Pendente';
    }
  };

  const getStatusColor = (pedido: PedidoRecebido): 'success' | 'warning' | 'info' | 'default' => {
    const percentual = pedido.percentual_recebido || 0;
    
    if (percentual >= 100) {
      return 'success';
    } else if (percentual > 0) {
      return 'warning';
    } else {
      return 'default';
    }
  };

  const pedidosFiltrados = pedidos.filter(pedido =>
    pedido.numero_pedido.toLowerCase().includes(filtro.toLowerCase()) ||
    (pedido.fornecedor_nome && pedido.fornecedor_nome.toLowerCase().includes(filtro.toLowerCase()))
  );

  const visualizarDetalhes = (pedidoId: number) => {
    navigate(`/recebimento-simplificado/${pedidoId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Alertas */}
      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por número do pedido ou fornecedor..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                {pedidosFiltrados.length} pedido(s) encontrado(s)
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>



      {/* Tabela de Pedidos */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pedidos Recebidos
          </Typography>

          {pedidosFiltrados.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                {filtro ? 'Nenhum pedido encontrado com os filtros aplicados' : 'Nenhum pedido recebido encontrado'}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Pedido</TableCell>
                    <TableCell>Fornecedor</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Itens</TableCell>
                    <TableCell align="right">Valor Total</TableCell>
                    <TableCell align="right">Valor Recebido</TableCell>
                    <TableCell align="center">% Recebido</TableCell>
                    <TableCell align="center">Data Criação</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidosFiltrados.map((pedido) => (
                    <TableRow key={pedido.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {pedido.numero_pedido}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {pedido.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {pedido.fornecedor_nome || 'Múltiplos fornecedores'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {pedido.total_fornecedores || 0} fornecedor(es)
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getStatusLabel(pedido)}
                          size="small"
                          color={getStatusColor(pedido)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold">
                          {pedido.total_itens || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          itens
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2">
                          {formatarMoeda(pedido.valor_total_pedido || pedido.valor_total || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2" color="primary">
                          {formatarMoeda(pedido.valor_total_recebido || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${(pedido.percentual_recebido || 0).toFixed(1)}%`}
                          size="small"
                          color={(pedido.percentual_recebido || 0) >= 100 ? 'success' : (pedido.percentual_recebido || 0) > 0 ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {formatarData(pedido.data_criacao)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(pedido.data_criacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Ver Detalhes">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => visualizarDetalhes(pedido.id)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Mais Ações">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuClick(e, pedido)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Menu de Ações */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleMenuAction('editar')}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar Pedido</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('historico')}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ver Histórico</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('imprimir')}>
          <ListItemIcon>
            <PrintIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Imprimir</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('exportar')}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exportar</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ListaPedidosRecebidos;