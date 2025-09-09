import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  CheckCircle,
  Warning,
  Schedule,
  Inventory,
  AttachMoney
} from '@mui/icons-material';

interface MetricCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: number;
}

interface RecebimentoMetrics {
  totalRecebimentos: number;
  recebimentosFinalizados: number;
  recebimentosPendentes: number;
  recebimentosComDivergencia: number;
  tempoMedioRecebimento: number;
  itensRecebidosHoje: number;
  valorTotalRecebido: number;
  eficienciaRecebimento: number;
}

export const RecebimentoDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<RecebimentoMetrics | null>(null);
  const [produtosMaisRecebidos, setProdutosMaisRecebidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar métricas
      const metricsResponse = await fetch('/api/recebimentos/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Carregar produtos mais recebidos
      const produtosResponse = await fetch('/api/recebimentos/produtos-mais-recebidos', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (produtosResponse.ok) {
        const produtosData = await produtosResponse.json();
        setProdutosMaisRecebidos(produtosData);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary">
          Não foi possível carregar as métricas
        </Typography>
      </Box>
    );
  }

  const metricCards: MetricCard[] = [
    {
      title: 'Total de Recebimentos',
      value: metrics.totalRecebimentos,
      subtitle: 'Últimos 30 dias',
      icon: <Inventory />,
      color: 'primary'
    },
    {
      title: 'Taxa de Finalização',
      value: `${metrics.eficienciaRecebimento}%`,
      subtitle: `${metrics.recebimentosFinalizados} finalizados`,
      icon: <CheckCircle />,
      color: 'success'
    },
    {
      title: 'Recebimentos Pendentes',
      value: metrics.recebimentosPendentes,
      subtitle: 'Aguardando conferência',
      icon: <Schedule />,
      color: 'warning'
    },
    {
      title: 'Com Divergências',
      value: metrics.recebimentosComDivergencia,
      subtitle: 'Requerem atenção',
      icon: <Warning />,
      color: 'error'
    },
    {
      title: 'Tempo Médio',
      value: `${metrics.tempoMedioRecebimento}h`,
      subtitle: 'Para finalizar',
      icon: <TrendingUp />,
      color: 'info'
    },
    {
      title: 'Valor Recebido',
      value: `R$ ${metrics.valorTotalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: 'Últimos 30 dias',
      icon: <AttachMoney />,
      color: 'success'
    }
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        📊 Dashboard de Recebimentos
      </Typography>
      
      {/* Cards de Métricas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metricCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      bgcolor: `${card.color}.light`,
                      color: `${card.color}.main`,
                      mr: 2
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
                
                <Typography variant="h4" fontWeight="bold" color={`${card.color}.main`}>
                  {card.value}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {card.title}
                </Typography>
                
                {card.subtitle && (
                  <Typography variant="caption" color="text.secondary">
                    {card.subtitle}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Progresso de Eficiência */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Eficiência de Recebimento
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box flexGrow={1}>
              <LinearProgress 
                variant="determinate" 
                value={metrics.eficienciaRecebimento}
                sx={{ height: 10, borderRadius: 5 }}
                color={metrics.eficienciaRecebimento >= 80 ? 'success' : metrics.eficienciaRecebimento >= 60 ? 'warning' : 'error'}
              />
            </Box>
            <Typography variant="h6" fontWeight="bold">
              {metrics.eficienciaRecebimento}%
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {metrics.recebimentosFinalizados} de {metrics.totalRecebimentos} recebimentos finalizados
          </Typography>
        </CardContent>
      </Card>

      {/* Produtos Mais Recebidos */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🏆 Produtos Mais Recebidos (30 dias)
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Unidade</TableCell>
                  <TableCell align="right">Total Recebido</TableCell>
                  <TableCell align="right">Recebimentos</TableCell>
                  <TableCell align="right">Média por Recebimento</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {produtosMaisRecebidos.map((produto, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Chip 
                          label={index + 1} 
                          size="small" 
                          color={index < 3 ? 'primary' : 'default'}
                          sx={{ mr: 1, minWidth: 32 }}
                        />
                        {produto.nome}
                      </Box>
                    </TableCell>
                    <TableCell>{produto.unidade}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {produto.total_recebido.toLocaleString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{produto.recebimentos}</TableCell>
                    <TableCell align="right">
                      {produto.media_por_recebimento.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {produtosMaisRecebidos.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                Nenhum produto recebido nos últimos 30 dias
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};