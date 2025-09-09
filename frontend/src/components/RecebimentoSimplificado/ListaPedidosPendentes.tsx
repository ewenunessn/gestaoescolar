import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Visibility,
  Assignment,
  Schedule,
  CheckCircle,
  Warning,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { recebimentoSimplificadoService } from '../../services/recebimentoSimplificadoService';
import { PedidoPendente } from '../../types/recebimentoSimplificado';

const ListaPedidosPendentes: React.FC = () => {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<PedidoPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    carregarPedidos();
  }, []);

  const carregarPedidos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Iniciando carregamento de pedidos pendentes...');
      const pedidos = await recebimentoSimplificadoService.listarPedidosPendentes();
      console.log('✅ Pedidos carregados:', pedidos);
      setPedidos(pedidos);
    } catch (err: any) {
      console.error('❌ Erro ao carregar pedidos:', err);
      console.error('❌ Detalhes do erro:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url
      });
      setError(err.response?.data?.message || err.message || 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const getPercentualRecebido = (pedido: PedidoPendente): number => {
    if (!pedido.quantidade_total) return 0;
    const percentual = (pedido.quantidade_recebida_total / pedido.quantidade_total) * 100;
    return Math.min(Math.round(percentual), 100) || 0;
  };

  const getStatusColor = (percentual: number) => {
    if (percentual === 0) return 'error';
    if (percentual < 100) return 'warning';
    return 'success';
  };

  const getStatusIcon = (percentual: number) => {
    if (percentual === 0) return <Warning />;
    if (percentual < 100) return <Schedule />;
    return <CheckCircle />;
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string): string => {
    if (!data) return 'N/A';
    try {
      const date = new Date(data);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const pedidosFiltrados = pedidos.filter(pedido =>
    pedido.numero_pedido.toLowerCase().includes(filtro.toLowerCase())
  );

  const visualizarDetalhes = (pedidoId: number) => {
    navigate(`/recebimento-simples/pedido/${pedidoId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Carregando pedidos...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Campo de Busca */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por número do pedido..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
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

        {/* Resumo */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {pedidos.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Pedidos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {pedidos.filter(p => getPercentualRecebido(p) === 0).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Não Iniciados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {pedidos.filter(p => getPercentualRecebido(p) > 0 && getPercentualRecebido(p) < 100).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Em Andamento
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabela de Pedidos */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pedidos Pendentes
            </Typography>

            {pedidosFiltrados.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {filtro ? 'Nenhum pedido encontrado com os filtros aplicados' : 'Nenhum pedido pendente encontrado'}
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Pedido</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Progresso</TableCell>
                      <TableCell align="center">Itens</TableCell>
                      <TableCell align="right">Valor Total</TableCell>
                      <TableCell align="center">Fornecedores</TableCell>
                      <TableCell align="center">Data Criação</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pedidosFiltrados.map((pedido) => {
                      const percentual = getPercentualRecebido(pedido);
                      return (
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
                            <Chip
                              label={pedido.status}
                              size="small"
                              color="info"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={percentual}
                                  sx={{ height: 6, borderRadius: 3 }}
                                  color={getStatusColor(percentual) as any}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ minWidth: 35 }}>
                                {percentual}%
                              </Typography>
                            </Box>
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
                              {formatarMoeda(pedido.valor_total || 0)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="bold">
                              {pedido.total_fornecedores || 0}
                            </Typography>
                            {pedido.fornecedores_faturados > 0 && (
                              <Typography variant="caption" color="success.main">
                                {pedido.fornecedores_faturados} faturados
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {formatarData(pedido.data_criacao)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {pedido.data_criacao ? (() => {
                                try {
                                  const date = new Date(pedido.data_criacao);
                                  return isNaN(date.getTime()) ? 'Hora inválida' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                } catch {
                                  return 'Hora inválida';
                                }
                              })() : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Receber Itens">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => visualizarDetalhes(pedido.id)}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ListaPedidosPendentes;