import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Receipt,
  Visibility,
  Settings,
  CheckCircle,
  Warning,
  Refresh,
  FilterList,
  Search,
} from '@mui/icons-material';
import {
  listarPedidosProntosParaFaturamento,
  verificarProntoParaFaturamento,
  processarFaturamentoAutomatico,
  PedidoProntoFaturamento,
  VerificarProntoResponse,
} from '../../services/faturamentoModalidades';
import { listarFornecedores } from '../../services/fornecedores';
import { useToast } from '../../hooks/useToast';
import SelecaoModalidades from './SelecaoModalidades';

interface PedidosProntosFaturamentoProps {
  onPedidoSelecionado?: (pedido: PedidoProntoFaturamento) => void;
}

const PedidosProntosFaturamento: React.FC<PedidosProntosFaturamentoProps> = ({
  onPedidoSelecionado,
}) => {
  const [pedidos, setPedidos] = useState<PedidoProntoFaturamento[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState<number | null>(null);
  const [filtros, setFiltros] = useState({
    fornecedor_id: '',
    busca: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [pedidoSelecionado, setPedidoSelecionado] = useState<number | null>(null);
  const [modalidadesOpen, setModalidadesOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [detalhesPedido, setDetalhesPedido] = useState<VerificarProntoResponse | null>(null);
  const toast = useToast();

  // Carregar fornecedores na montagem
  useEffect(() => {
    carregarFornecedores();
  }, []);

  // Carregar dados iniciais na montagem
  useEffect(() => {
    carregarDados();
  }, []);

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    carregarDados();
  }, [filtros]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const fornecedor_id = filtros.fornecedor_id ? Number(filtros.fornecedor_id) : undefined;
      
      const response = await listarPedidosProntosParaFaturamento(
        fornecedor_id,
        pagination?.page || 1,
        pagination?.limit || 10
      );
      
      setPedidos(response.pedidos || []);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos prontos para faturamento');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarFornecedores = async () => {
    try {
      const response = await listarFornecedores();
      setFornecedores(response);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const visualizarDetalhes = async (pedido: PedidoProntoFaturamento) => {
    try {
      setLoading(true);
      const detalhes = await verificarProntoParaFaturamento(pedido.id);
      setDetalhesPedido(detalhes);
      setDetalhesOpen(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      toast.error('Erro ao carregar detalhes do pedido');
    } finally {
      setLoading(false);
    }
  };

  const configurarModalidades = (pedido: PedidoProntoFaturamento) => {
    setPedidoSelecionado(pedido.id);
    setModalidadesOpen(true);
  };

  const processarFaturamento = async (pedido: PedidoProntoFaturamento) => {
    if (!window.confirm(`Confirma o processamento do faturamento para o pedido ${pedido.numero_pedido}?`)) {
      return;
    }

    setProcessando(pedido.id);
    try {
      // Aqui você precisaria obter o contrato_id do pedido
      // Por enquanto, vamos usar um valor padrão ou solicitar ao usuário
      const contrato_id = 1; // Isso deveria vir do pedido ou ser selecionado pelo usuário
      
      await processarFaturamentoAutomatico({
        pedido_id: pedido.id,
        fornecedor_id: pedido.fornecedor_id,
        contrato_id,
        observacoes: `Faturamento automático processado para pedido ${pedido.numero_pedido}`,
      });
      
      toast.success(`Faturamento processado com sucesso para o pedido ${pedido.numero_pedido}`);
      carregarDados(); // Recarregar a lista
    } catch (error) {
      console.error('Erro ao processar faturamento:', error);
      toast.error('Erro ao processar faturamento');
    } finally {
      setProcessando(null);
    }
  };

  const getStatusChip = (percentual: number) => {
    if (percentual >= 100) {
      return (
        <Chip
          icon={<CheckCircle />}
          label="Completo"
          color="success"
          size="small"
        />
      );
    } else if (percentual >= 80) {
      return (
        <Chip
          icon={<Warning />}
          label="Quase Completo"
          color="warning"
          size="small"
        />
      );
    } else {
      return (
        <Chip
          icon={<Warning />}
          label="Parcial"
          color="error"
          size="small"
        />
      );
    }
  };

  const pedidosFiltrados = useMemo(() => {
    if (!pedidos) {
      return [];
    }
    
    return pedidos.filter(pedido => {
      const matchBusca = !filtros.busca || 
        pedido.numero_pedido.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        pedido.nome_fornecedor.toLowerCase().includes(filtros.busca.toLowerCase());
      
      return matchBusca;
    });
  }, [pedidos, filtros]);

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pedidos Prontos para Faturamento
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Buscar pedido ou fornecedor"
                value={filtros.busca}
                onChange={(e) => handleFiltroChange('busca', e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Fornecedor</InputLabel>
                <Select
                  value={filtros.fornecedor_id}
                  onChange={(e) => handleFiltroChange('fornecedor_id', e.target.value)}
                  label="Fornecedor"
                >
                  <MenuItem value="">Todos os fornecedores</MenuItem>
                  {(fornecedores || []).map((fornecedor) => (
                    <MenuItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={carregarDados}
                disabled={loading}
              >
                Atualizar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {pedidosFiltrados.length === 0 ? (
            <Alert severity="info">
              Nenhum pedido pronto para faturamento encontrado.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Pedido</TableCell>
                    <TableCell>Fornecedor</TableCell>
                    <TableCell align="right">Valor Total</TableCell>
                    <TableCell align="center">Status Entrega</TableCell>
                    <TableCell align="center">Progresso</TableCell>
                    <TableCell align="center">Data Pedido</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pedidosFiltrados.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {pedido.numero_pedido}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {pedido.id}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {pedido.nome_fornecedor}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          R$ {Number(pedido.valor_total || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        {getStatusChip(pedido.percentual_entregue)}
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ minWidth: 120 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(pedido.percentual_entregue, 100)}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="caption">
                            {pedido.itens_entregues}/{pedido.total_itens} itens
                            ({pedido.percentual_entregue.toFixed(1)}%)
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography variant="body2">
                          {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box display="flex" gap={1} justifyContent="center">
                          <Tooltip title="Ver detalhes">
                            <IconButton
                              size="small"
                              onClick={() => visualizarDetalhes(pedido)}
                              color="primary"
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Configurar modalidades">
                            <IconButton
                              size="small"
                              onClick={() => configurarModalidades(pedido)}
                              color="secondary"
                            >
                              <Settings />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Processar faturamento">
                            <IconButton
                              size="small"
                              onClick={() => processarFaturamento(pedido)}
                              color="success"
                              disabled={processando === pedido.id || pedido.percentual_entregue < 100}
                            >
                              {processando === pedido.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Receipt />
                              )}
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
          
          {/* Paginação */}
          {pagination?.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                disabled={!pagination?.hasPrev}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Anterior
              </Button>
              <Typography sx={{ mx: 2, alignSelf: 'center' }}>
                Página {pagination?.page || 1} de {pagination?.totalPages || 1}
              </Typography>
              <Button
                disabled={!pagination?.hasNext}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Próxima
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Dialog de Configuração de Modalidades */}
      {pedidoSelecionado && (
        <SelecaoModalidades
          pedido_id={pedidoSelecionado}
          open={modalidadesOpen}
          onClose={() => {
            setModalidadesOpen(false);
            setPedidoSelecionado(null);
          }}
          onSave={() => {
            toast.success('Modalidades configuradas com sucesso!');
            carregarDados();
          }}
        />
      )}

      {/* Dialog de Detalhes do Pedido */}
      <Dialog open={detalhesOpen} onClose={() => setDetalhesOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalhes da Entrega - {detalhesPedido?.numero_pedido}
        </DialogTitle>
        <DialogContent>
          {detalhesPedido && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fornecedor
                  </Typography>
                  <Typography variant="body1">
                    {detalhesPedido.fornecedor}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Pronto para Faturamento
                  </Typography>
                  <Chip
                    label={detalhesPedido.pronto_para_faturamento ? 'Sim' : 'Não'}
                    color={detalhesPedido.pronto_para_faturamento ? 'success' : 'warning'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Progresso
                  </Typography>
                  <Typography variant="body1">
                    {detalhesPedido.status_entrega.percentual_entregue.toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                Estatísticas de Entrega
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total de Itens
                  </Typography>
                  <Typography variant="h6">
                    {detalhesPedido.status_entrega.total_itens}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Itens Completos
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {detalhesPedido.status_entrega.itens_completos}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Itens Parciais
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {detalhesPedido.status_entrega.itens_parciais}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Itens Pendentes
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {detalhesPedido.status_entrega.itens_pendentes}
                  </Typography>
                </Grid>
              </Grid>

              <LinearProgress
                variant="determinate"
                value={detalhesPedido.status_entrega.percentual_entregue}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalhesOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PedidosProntosFaturamento;