import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import faturamentoInterfaceService from '../services/faturamentoInterfaceService';
import {
  FornecedorAgrupado,
  ContratoDisponivel,
  ModalidadeFaturamento,
  FiltrosFaturamento,
  NovoFaturamentoRequest
} from '../types/faturamentoInterface';
import NovoFaturamentoModal from './NovoFaturamentoModal';

const FaturamentoInterface: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<FornecedorAgrupado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosFaturamento>({
    page: 1,
    limit: 10
  });
  const [totalPages, setTotalPages] = useState(1);
  const [novoFaturamentoOpen, setNovoFaturamentoOpen] = useState(false);
  const [expandedFornecedor, setExpandedFornecedor] = useState<string | false>(false);

  // Função para formatar quantidades removendo zeros desnecessários
  const formatarQuantidade = (quantidade: number | string): string => {
    const num = typeof quantidade === 'string' ? parseFloat(quantidade) : quantidade;
    if (isNaN(num)) return '0';
    
    // Remove zeros desnecessários após o ponto decimal
    return num % 1 === 0 ? num.toString() : num.toFixed(3).replace(/\.?0+$/, '');
  };

  useEffect(() => {
    carregarDados();
  }, [filtros]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await faturamentoInterfaceService.listarItensAgrupados(filtros);
      setFornecedores(response.data);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError('Erro ao carregar dados de faturamento');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (campo: keyof FiltrosFaturamento, valor: any) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor,
      page: 1 // Reset para primeira página ao filtrar
    }));
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setFiltros(prev => ({ ...prev, page: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completo': return 'success';
      case 'parcial': return 'warning';
      case 'pendente': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedFornecedor(isExpanded ? panel : false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Interface de Faturamento
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setNovoFaturamentoOpen(true)}
            sx={{ mr: 1 }}
          >
            Novo Faturamento
          </Button>
          <IconButton onClick={carregarDados} title="Atualizar">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filtros
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status de Recebimento</InputLabel>
                <Select
                  value={filtros.status_recebimento || ''}
                  label="Status de Recebimento"
                  onChange={(e) => handleFiltroChange('status_recebimento', e.target.value || undefined)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="parcial">Parcial</MenuItem>
                  <MenuItem value="completo">Completo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={filtros.data_inicio || ''}
                onChange={(e) => handleFiltroChange('data_inicio', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={filtros.data_fim || ''}
                onChange={(e) => handleFiltroChange('data_fim', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Itens por Página</InputLabel>
                <Select
                  value={filtros.limit || 10}
                  label="Itens por Página"
                  onChange={(e) => handleFiltroChange('limit', Number(e.target.value))}
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Fornecedores */}
      {fornecedores.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Nenhum item de faturamento encontrado com os filtros aplicados.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        fornecedores.map((fornecedor) => (
          <Accordion
            key={`fornecedor-${fornecedor.fornecedor_id}`}
            expanded={expandedFornecedor === `fornecedor-${fornecedor.fornecedor_id}`}
            onChange={handleAccordionChange(`fornecedor-${fornecedor.fornecedor_id}`)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" width="100%">
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {fornecedor.fornecedor_nome}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                  {fornecedor.contratos.length} contrato(s)
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {fornecedor.contratos.map((contrato) => (
                <Card key={`contrato-${contrato.contrato_id}`} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Contrato: {contrato.contrato_numero}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip
                          label={`${formatPercentage(contrato.percentual_recebido_medio)} recebido`}
                          color={getStatusColor(
                            contrato.percentual_recebido_medio === 100 ? 'completo' :
                            contrato.percentual_recebido_medio > 0 ? 'parcial' : 'pendente'
                          )}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(contrato.valor_total_contrato)}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Produto</TableCell>
                            <TableCell align="right">Qtd. Pedida</TableCell>
                            <TableCell align="right">Qtd. Recebida</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="right">Valor Unit.</TableCell>
                            <TableCell align="right">Valor Total</TableCell>
                            <TableCell align="center">% Recebido</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {contrato.itens.map((item) => (
                            <TableRow key={`item-${item.id}`}>
                              <TableCell>
                                <Tooltip title={`Pedido #${item.pedido_id}`}>
                                  <Typography variant="body2">
                                    {item.produto_nome}
                                  </Typography>
                                </Tooltip>
                              </TableCell>
                              <TableCell align="right">{formatarQuantidade(item.quantidade_pedida)}</TableCell>
                              <TableCell align="right">{formatarQuantidade(item.quantidade_recebida)}</TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={item.status_recebimento}
                                  color={getStatusColor(item.status_recebimento)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="right">{formatCurrency(item.valor_unitario)}</TableCell>
                              <TableCell align="right">{formatCurrency(item.valor_total)}</TableCell>
                              <TableCell align="center">{formatPercentage(item.percentual_recebido)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ))}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={filtros.page || 1}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Modal de Novo Faturamento */}
      <NovoFaturamentoModal
        open={novoFaturamentoOpen}
        onClose={() => setNovoFaturamentoOpen(false)}
        onSuccess={() => {
          setNovoFaturamentoOpen(false);
          carregarDados();
        }}
      />
    </Box>
  );
};

export default FaturamentoInterface;