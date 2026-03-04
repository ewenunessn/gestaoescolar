import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { relatorioTipoFornecedorModalidade } from '../services/faturamentos';
import { formatarMoeda } from '../utils/dateUtils';

interface RelatorioItem {
  faturamento_id: number;
  pedido_id: number;
  pedido_numero: string;
  tipo_fornecedor: string;
  modalidade_id: number;
  modalidade_nome: string;
  total_itens: number;
  total_fornecedores: number;
  quantidade_total: number;
  valor_total: number;
}

const TIPO_FORNECEDOR_LABELS: Record<string, string> = {
  empresa: 'Empresa',
  cooperativa: 'Cooperativa',
  individual: 'Individual'
};

const TIPO_FORNECEDOR_COLORS: Record<string, 'primary' | 'secondary' | 'success'> = {
  empresa: 'primary',
  cooperativa: 'secondary',
  individual: 'success'
};

export default function RelatorioFaturamentoTipoFornecedor() {
  const { id, faturamentoId } = useParams<{ id: string; faturamentoId: string }>();
  const navigate = useNavigate();
  
  const [dados, setDados] = useState<RelatorioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarDados();
  }, [faturamentoId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const resultado = await relatorioTipoFornecedorModalidade(Number(faturamentoId));
      setDados(resultado);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      setErro('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar dados por tipo de fornecedor
  const dadosAgrupados = dados.reduce((acc, item) => {
    if (!acc[item.tipo_fornecedor]) {
      acc[item.tipo_fornecedor] = [];
    }
    acc[item.tipo_fornecedor].push(item);
    return acc;
  }, {} as Record<string, RelatorioItem[]>);

  // Calcular totais por tipo
  const totaisPorTipo = Object.entries(dadosAgrupados).map(([tipo, itens]) => ({
    tipo,
    total_itens: itens.reduce((sum, item) => sum + Number(item.total_itens), 0),
    total_fornecedores: Math.max(...itens.map(item => Number(item.total_fornecedores))),
    quantidade_total: itens.reduce((sum, item) => sum + Number(item.quantidade_total), 0),
    valor_total: itens.reduce((sum, item) => sum + Number(item.valor_total), 0)
  }));

  // Total geral
  const totalGeral = {
    total_itens: totaisPorTipo.reduce((sum, t) => sum + t.total_itens, 0),
    quantidade_total: totaisPorTipo.reduce((sum, t) => sum + t.quantidade_total, 0),
    valor_total: totaisPorTipo.reduce((sum, t) => sum + t.valor_total, 0)
  };

  if (loading) {
    return <Box sx={{ p: 3 }}><Typography>Carregando...</Typography></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs 
        items={[
          { label: 'Pedidos', path: '/pedidos', icon: <ShoppingCartIcon fontSize="small" /> },
          { label: `Pedido ${dados[0]?.pedido_numero || ''}`, path: `/pedidos/${id}` },
          { label: 'Faturamentos', path: `/pedidos/${id}/faturamentos` },
          { label: `Faturamento #${faturamentoId}`, path: `/pedidos/${id}/faturamento/${faturamentoId}` },
          { label: 'Relatório por Tipo' }
        ]}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Relatório por Tipo de Fornecedor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Distribuição do faturamento por tipo de fornecedor e modalidade
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/pedidos/${id}/faturamento/${faturamentoId}`)}
        >
          Voltar
        </Button>
      </Box>

      {erro && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>{erro}</Alert>}

      {dados.length === 0 ? (
        <Alert severity="info">Nenhum dado disponível para este faturamento</Alert>
      ) : (
        <>
          {/* Resumo Geral */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Resumo Geral</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                    <Typography variant="h4" color="primary.contrastText">{totalGeral.total_itens}</Typography>
                    <Typography variant="body2" color="primary.contrastText">Total de Itens</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.light', borderRadius: 2 }}>
                    <Typography variant="h4" color="secondary.contrastText">{totalGeral.quantidade_total.toFixed(0)}</Typography>
                    <Typography variant="body2" color="secondary.contrastText">Quantidade Total</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                    <Typography variant="h4" color="success.contrastText">{formatarMoeda(totalGeral.valor_total)}</Typography>
                    <Typography variant="body2" color="success.contrastText">Valor Total</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Detalhamento por Tipo de Fornecedor */}
          {Object.entries(dadosAgrupados).map(([tipo, itens]) => {
            const totalTipo = totaisPorTipo.find(t => t.tipo === tipo)!;
            
            return (
              <Card key={tipo} sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip 
                        label={TIPO_FORNECEDOR_LABELS[tipo] || tipo} 
                        color={TIPO_FORNECEDOR_COLORS[tipo] || 'default'}
                        size="medium"
                      />
                      <Typography variant="body2" color="text.secondary">
                        {totalTipo.total_fornecedores} fornecedor(es)
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="success.main" fontWeight="bold">
                        {formatarMoeda(totalTipo.valor_total)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {totalTipo.total_itens} itens • {totalTipo.quantidade_total.toFixed(0)} unidades
                      </Typography>
                    </Box>
                  </Box>

                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Modalidade</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Itens</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Quantidade</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Valor Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>% do Tipo</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {itens.map((item) => {
                          const percentual = (Number(item.valor_total) / totalTipo.valor_total) * 100;
                          
                          return (
                            <TableRow key={`${item.tipo_fornecedor}-${item.modalidade_id}`} hover>
                              <TableCell>{item.modalidade_nome}</TableCell>
                              <TableCell align="center">{item.total_itens}</TableCell>
                              <TableCell align="center">{Number(item.quantidade_total).toFixed(0)}</TableCell>
                              <TableCell align="right">
                                <Typography fontWeight="bold" color="success.main">
                                  {formatarMoeda(item.valor_total)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={`${percentual.toFixed(1)}%`} 
                                  size="small"
                                  color={percentual > 50 ? 'success' : percentual > 25 ? 'primary' : 'default'}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>TOTAL {TIPO_FORNECEDOR_LABELS[tipo]?.toUpperCase()}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>{totalTipo.total_itens}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>{totalTipo.quantidade_total.toFixed(0)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            {formatarMoeda(totalTipo.valor_total)}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                            <Chip 
                              label={`${((totalTipo.valor_total / totalGeral.valor_total) * 100).toFixed(1)}%`}
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </Box>
  );
}
