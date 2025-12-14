import React, { useState, useEffect } from 'react';
import StatusIndicator from '../components/StatusIndicator';
import PageHeader from '../components/PageHeader';
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
  Chip,
  TextField,
  MenuItem,
  Grid,
  Button,
  TablePagination,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Restaurant as RestaurantIcon,
  History as HistoryIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import BusinessIcon from '@mui/icons-material/Business';
import { useToast } from '../hooks/useToast';
import saldoContratosService, {
  SaldoContratoItem,
  FornecedorOption,
  SaldoContratosFilters
} from '../services/saldoContratosService';




const SaldoContratos: React.FC = () => {
  const [dados, setDados] = useState<SaldoContratoItem[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError } = useToast();
  
  // Estado para diálogo de consumo
  const [dialogConsumoAberto, setDialogConsumoAberto] = useState(false);
  const [dialogHistoricoOpen, setDialogHistoricoOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<SaldoContratoItem | null>(null);
  const [quantidadeConsumo, setQuantidadeConsumo] = useState('');
  const [observacaoConsumo, setObservacaoConsumo] = useState('');
  const [historicoConsumo, setHistoricoConsumo] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [registrandoConsumo, setRegistrandoConsumo] = useState(false);
  const [deletandoConsumo, setDeletandoConsumo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [estatisticas, setEstatisticas] = useState<any>(null);
  
  // Filtros
  const [filtros, setFiltros] = useState<SaldoContratosFilters>({
    page: 1,
    limit: 25
  });
  const [filtrosTemp, setFiltrosTemp] = useState<SaldoContratosFilters>({});

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
    carregarFornecedores();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    carregarDados();
  }, [filtros]);

  

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await saldoContratosService.listarSaldos({
        ...filtros,
        page: page + 1,
        limit: rowsPerPage
      });
      
      setDados(response.data);
      setTotal(response.pagination.total);
      setEstatisticas(response.estatisticas);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Funções para registro de consumo
  const abrirDialogConsumo = (item: SaldoContratoItem) => {
    setItemSelecionado(item);
    setQuantidadeConsumo('');
    setObservacaoConsumo('');
    setError(null);
    setDialogConsumoAberto(true);
  };

  const abrirDialogHistorico = async (item: SaldoContratoItem) => {
    setItemSelecionado(item);
    setError(null);
    setDialogHistoricoOpen(true);
    setCarregandoHistorico(true);
    
    try {
      const result = await saldoContratosService.buscarHistoricoConsumos(item.id);
      setHistoricoConsumo(result.data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de consumo:', error);
      setHistoricoConsumo([]);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const fecharDialogHistorico = () => {
    setDialogHistoricoOpen(false);
    setItemSelecionado(null);
    setHistoricoConsumo([]);
  };

  const deletarConsumo = async (consumoId: number) => {
    if (!confirm('Tem certeza que deseja deletar este consumo? O saldo será estornado.')) {
      return;
    }

    try {
      setDeletandoConsumo(consumoId);
      
      // Obter ID do usuário logado (você pode ajustar isso conforme sua autenticação)
      const usuarioId = 1; // TODO: Ajustar para pegar o ID do usuário logado
      
      const resultado = await saldoContratosService.deletarConsumo(consumoId, usuarioId);
      
      if (resultado.success) {
        success('Consumo deletado com sucesso!');
        
        // Atualizar a lista de histórico removendo o item deletado
        setHistoricoConsumo(prev => prev.filter(consumo => consumo.id !== consumoId));
        
        // Recarregar os dados da tabela principal para atualizar os saldos
        carregarDados();
      } else {
        toastError('Erro ao deletar consumo: ' + resultado.message);
      }
    } catch (error: any) {
      console.error('Erro ao deletar consumo:', error);
      toastError('Erro ao deletar consumo: ' + error.message);
    } finally {
      setDeletandoConsumo(null);
    }
  };

  const fecharDialogConsumo = () => {
    setDialogConsumoAberto(false);
    setItemSelecionado(null);
    setQuantidadeConsumo('');
    setObservacaoConsumo('');
  };

  const registrarConsumo = async () => {
    if (!itemSelecionado || !quantidadeConsumo || parseFloat(quantidadeConsumo) <= 0) {
      return;
    }

    const quantidade = parseFloat(quantidadeConsumo);
    if (quantidade > itemSelecionado.quantidade_disponivel_real) {
      alert(`Quantidade indisponível. Saldo atual: ${itemSelecionado.quantidade_disponivel_real}`);
      return;
    }

    setRegistrandoConsumo(true);
    
    try {
      await saldoContratosService.registrarConsumo(
        itemSelecionado.id,
        quantidade,
        observacaoConsumo || undefined
      );
      
      alert('Consumo registrado com sucesso!');
      fecharDialogConsumo();
      carregarDados(); // Recarregar dados para atualizar saldos
    } catch (error: any) {
      console.error('Erro ao registrar consumo:', error);
      alert(error.response?.data?.message || 'Erro ao registrar consumo');
    } finally {
      setRegistrandoConsumo(false);
    }
  };

  // Agrupar dados por fornecedor e contrato
  const agruparPorFornecedorEContrato = (itens: SaldoContratoItem[]) => {
    const grupos: { [key: string]: SaldoContratoItem[] } = {};
    
    itens.forEach(item => {
      const chave = `${item.fornecedor_id}-${item.contrato_id}`;
      if (!grupos[chave]) {
        grupos[chave] = [];
      }
      grupos[chave].push(item);
    });

    return Object.entries(grupos).map(([chave, itens]) => ({
      fornecedor: itens[0].fornecedor_nome,
      contrato: itens[0].contrato_numero,
      fornecedor_id: itens[0].fornecedor_id,
      contrato_id: itens[0].contrato_id,
      itens: itens
    }));
  };

  const carregarFornecedores = async () => {
    try {
      const fornecedoresList = await saldoContratosService.listarFornecedores();
      setFornecedores(fornecedoresList);
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err);
    }
  };

  const aplicarFiltros = () => {
    setFiltros({ ...filtrosTemp, page: 1, limit: rowsPerPage });
    setPage(0);
  };

  const limparFiltros = () => {
    setFiltrosTemp({});
    setFiltros({ page: 1, limit: rowsPerPage });
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    setFiltros({ ...filtros, page: newPage + 1 });
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    setFiltros({ ...filtros, page: 1, limit: newRowsPerPage });
  };

  const exportarCSV = async () => {
    try {
      const blob = await saldoContratosService.exportarCSV(filtros);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `saldos_contratos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPONIVEL':
        return 'success';
      case 'BAIXO_ESTOQUE':
        return 'warning';
      case 'ESGOTADO':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatarNumero = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  if (loading && dados.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <PageHeader 
          title="Saldo de Contratos"
          totalCount={dados.length}
          statusLegend={estatisticas ? [
            { status: 'success', label: 'DISPONÍVEIS', count: estatisticas.itens_disponiveis },
            { status: 'warning', label: 'BAIXO ESTOQUE', count: estatisticas.itens_baixo_estoque },
            { status: 'error', label: 'ESGOTADOS', count: estatisticas.itens_esgotados }
          ] : []}
        />
        
        {/* Estatísticas */}
        {estatisticas && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {estatisticas.total_itens}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total de Itens
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="success.main">
                    {estatisticas.itens_disponiveis}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Disponíveis
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="warning.main">
                    {estatisticas.itens_baixo_estoque}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Baixo Estoque
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="error.main">
                    {estatisticas.itens_esgotados}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Esgotados
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {formatarMoeda(estatisticas.valor_total_disponivel)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Valor Disponível
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filtros */}
        <Card sx={{ 
          mb: 3,
          p: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <CardContent>
            <Typography 
              variant="h6" 
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                color: '#1a1a1a',
                mb: 2
              }}
            >
              <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Filtros
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={5}>
                <TextField
                  fullWidth
                  label="Produto"
                  value={filtrosTemp.produto_nome || ''}
                  onChange={(e) => setFiltrosTemp({ ...filtrosTemp, produto_nome: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  select
                  label="Status"
                  value={filtrosTemp.status || ''}
                  onChange={(e) => setFiltrosTemp({ ...filtrosTemp, status: e.target.value as any })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="DISPONIVEL">Disponível</MenuItem>
                  <MenuItem value="BAIXO_ESTOQUE">Baixo Estoque</MenuItem>
                  <MenuItem value="ESGOTADO">Esgotado</MenuItem>
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={12} md={4}>
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    onClick={aplicarFiltros}
                    disabled={loading}
                    sx={{
                      fontFamily: 'Inter, sans-serif',
                      borderRadius: 2,
                    }}
                  >
                    Filtrar
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={limparFiltros}
                    disabled={loading}
                    sx={{
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Limpar
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Ações */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Box display="flex" gap={1}>
            <Tooltip title="Atualizar">
              <IconButton onClick={carregarDados} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportarCSV}
              disabled={loading}
              sx={{
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Exportar CSV
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Tabela */}
        <TableContainer 
          component={Card}
          sx={{
            mt: 2,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0',
            overflow: 'auto',
            bgcolor: 'background.paper'
          }}
        >
          <Table sx={{ borderCollapse: 'separate' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '20%' }}>Produto</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: '8%' }}>Unidade</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: '12%' }}>Qtd Total</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: '12%' }}>Qtd Utilizada</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: '12%' }}>Qtd Disponível</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: '12%' }}>Valor Unit.</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: '12%' }}>Valor Total Disp.</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, width: '12%' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && dados.length > 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : dados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Nenhum resultado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                agruparPorFornecedorEContrato(dados).map((grupo) => (
                  <React.Fragment key={`${grupo.fornecedor_id}-${grupo.contrato_id}`}>
                    {/* Cabeçalho do Grupo */}
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell colSpan={8}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <BusinessIcon sx={{ color: '#666' }} />
                          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                            {grupo.fornecedor}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Contrato: {grupo.contrato}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Itens do Grupo */}
                    {grupo.itens.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StatusIndicator status={item.status === 'ESGOTADO' ? 'error' : item.status === 'BAIXO_ESTOQUE' ? 'warning' : 'success'} size="small" />
                            <Typography variant="body2">
                              {item.produto_nome}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{item.unidade}</TableCell>
                        <TableCell align="center">{formatarNumero(item.quantidade_total)}</TableCell>
                        <TableCell align="center">{formatarNumero(item.quantidade_utilizada)}</TableCell>
                        <TableCell align="center">{formatarNumero(item.quantidade_disponivel_real)}</TableCell>
                        <TableCell align="center">{formatarMoeda(item.preco_unitario)}</TableCell>
                        <TableCell align="center">{formatarMoeda(item.valor_total_disponivel)}</TableCell>
                        <TableCell align="center">
                          <Box display="flex" justifyContent="center" gap={1}>
                            <Tooltip title="Registrar Consumo">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => abrirDialogConsumo(item)}
                                  disabled={item.status === 'ESGOTADO'}
                                  sx={{
                                    color: '#1976d2',
                                    '&:hover': {
                                      backgroundColor: 'rgba(25, 118, 210, 0.04)'
                                    }
                                  }}
                                >
                                  <RestaurantIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Ver Histórico de Consumos">
                              <IconButton
                                size="small"
                                onClick={() => abrirDialogHistorico(item)}
                                sx={{
                                  color: '#666',
                                  '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                                  }
                                }}
                              >
                                <HistoryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginação */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Itens por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />

        {/* Modal de Registro de Consumo */}
        <Dialog 
          open={dialogConsumoAberto} 
          onClose={fecharDialogConsumo}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Registrar Consumo
          </DialogTitle>
          <DialogContent>
            {itemSelecionado && (
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Contrato:</strong> {itemSelecionado.contrato_numero}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Produto:</strong> {itemSelecionado.produto_nome}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Fornecedor:</strong> {itemSelecionado.fornecedor_nome}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                  <strong>Saldo Disponível:</strong> {formatarNumero(itemSelecionado.quantidade_disponivel_real)} {itemSelecionado.unidade}
                </Typography>
                
                <TextField
                  fullWidth
                  label="Quantidade a Consumir"
                  type="number"
                  value={quantidadeConsumo}
                  onChange={(e) => setQuantidadeConsumo(e.target.value)}
                  inputProps={{ 
                    min: 0, 
                    max: itemSelecionado.quantidade_disponivel_real,
                    step: 0.01
                  }}
                  sx={{ mb: 2 }}
                  helperText={`Máximo: ${formatarNumero(itemSelecionado.quantidade_disponivel_real)} ${itemSelecionado.unidade}`}
                />
                
                <TextField
                  fullWidth
                  label="Observação (opcional)"
                  multiline
                  rows={2}
                  value={observacaoConsumo}
                  onChange={(e) => setObservacaoConsumo(e.target.value)}
                  placeholder="Descreva o motivo do consumo..."
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialogConsumo} disabled={registrandoConsumo}>
              Cancelar
            </Button>
            <Button 
              onClick={registrarConsumo} 
              variant="contained"
              disabled={registrandoConsumo || !quantidadeConsumo || parseFloat(quantidadeConsumo) <= 0}
              startIcon={registrandoConsumo ? <CircularProgress size={16} /> : <RestaurantIcon />}
            >
              {registrandoConsumo ? 'Registrando...' : 'Registrar Consumo'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Histórico de Consumos */}
        <Dialog 
          open={dialogHistoricoOpen} 
          onClose={fecharDialogHistorico}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <HistoryIcon color="primary" />
              Histórico de Consumos - {itemSelecionado?.produto_nome}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {historicoConsumo.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  Nenhum consumo registrado para este item.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>Data</TableCell>
                        <TableCell align="right">Quantidade</TableCell>
                        <TableCell>Responsável</TableCell>
                        <TableCell>Observação</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historicoConsumo.map((consumo, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatarData(consumo.data_consumo)}</TableCell>
                          <TableCell align="right">{formatarNumero(consumo.quantidade)}</TableCell>
                          <TableCell>{consumo.responsavel_nome || 'Não informado'}</TableCell>
                          <TableCell>{consumo.observacao || '-'}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Deletar consumo">
                              <IconButton
                                size="small"
                                onClick={() => deletarConsumo(consumo.id)}
                                disabled={deletandoConsumo === consumo.id}
                                sx={{
                                  color: '#d32f2f',
                                  '&:hover': {
                                    backgroundColor: 'rgba(211, 47, 47, 0.04)'
                                  }
                                }}
                              >
                                {deletandoConsumo === consumo.id ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <DeleteIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialogHistorico}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default SaldoContratos;