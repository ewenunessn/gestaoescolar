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
  TextField,
  MenuItem,
  Grid,
  Button,
  TablePagination,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import saldoContratosService, {
  SaldoContratoItem,
  FornecedorOption,
  SaldoContratosFilters
} from '../services/saldoContratosService';

const SaldoContratos: React.FC = () => {
  const [dados, setDados] = useState<SaldoContratoItem[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([]);
  const [loading, setLoading] = useState(true);
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Saldos de Contratos
      </Typography>
      
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
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filtros
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
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
                label="Número do Contrato"
                value={filtrosTemp.contrato_numero || ''}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, contrato_numero: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
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
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                select
                label="Fornecedor"
                value={filtrosTemp.fornecedor_id || ''}
                onChange={(e) => setFiltrosTemp({ ...filtrosTemp, fornecedor_id: Number(e.target.value) || undefined })}
              >
                <MenuItem value="">Todos</MenuItem>
                {fornecedores.map((fornecedor) => (
                  <MenuItem key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={12} md={2}>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  onClick={aplicarFiltros}
                  disabled={loading}
                >
                  Filtrar
                </Button>
                <Button
                  variant="outlined"
                  onClick={limparFiltros}
                  disabled={loading}
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
        <Typography variant="h6">
          Resultados ({total} itens)
        </Typography>
        
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
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Contrato</TableCell>
              <TableCell>Fornecedor</TableCell>
              <TableCell>Produto</TableCell>
              <TableCell>Unidade</TableCell>
              <TableCell align="right">Qtd Total</TableCell>
              <TableCell align="right">Qtd Utilizada</TableCell>
              <TableCell align="right">Qtd Reservada</TableCell>
              <TableCell align="right">Qtd Disponível</TableCell>
              <TableCell align="right">Valor Unit.</TableCell>
              <TableCell align="right">Valor Total Disp.</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="right">% Utilizado</TableCell>
              <TableCell>Período</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : dados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  Nenhum resultado encontrado
                </TableCell>
              </TableRow>
            ) : (
              dados.map((item) => (
                <TableRow key={item.contrato_produto_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.contrato_numero}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.fornecedor_nome}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.produto_nome}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.produto_unidade}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatarNumero(item.quantidade_total)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatarNumero(item.quantidade_utilizada)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatarNumero(item.quantidade_reservada)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatarNumero(item.quantidade_disponivel_real)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatarMoeda(item.valor_unitario)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatarMoeda(item.valor_total_disponivel)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={item.status}
                      color={getStatusColor(item.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {typeof item.percentual_utilizado === 'number' 
                        ? item.percentual_utilizado.toFixed(1) 
                        : '0.0'}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatarData(item.data_inicio)} - {formatarData(item.data_fim)}
                    </Typography>
                  </TableCell>
                </TableRow>
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
    </Box>
  );
};

export default SaldoContratos;