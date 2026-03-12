import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Agriculture,
  School,
  AttachMoney,
} from '@mui/icons-material';
import { useDashboardPNAE } from '../hooks/queries/usePnaeQueries';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DashboardPNAE = () => {
  const { data: dashboard, isLoading, error } = useDashboardPNAE();

  if (isLoading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress size={60} />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error">Erro ao carregar dashboard PNAE</Alert>
      </PageContainer>
    );
  }

  if (!dashboard) return null;

  const { agricultura_familiar, fornecedores, evolucao_mensal, alertas, ano } = dashboard;

  // Dados para o gráfico
  const chartData = {
    labels: evolucao_mensal.map((m) => m.mes_nome),
    datasets: [
      {
        label: 'Percentual Agricultura Familiar (%)',
        data: evolucao_mensal.map((m) => m.percentual_af),
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.parsed.y.toFixed(2)}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  const percentualAF = agricultura_familiar.percentual_af || 0;
  const atendeRequisito = alertas.atende_30_porcento;

  return (
    <PageContainer>
      <PageHeader title={`Dashboard PNAE ${ano}`} />

      {/* Alertas */}
      <Box sx={{ mb: 3 }}>
        {!atendeRequisito && (
          <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
            Atenção! O percentual de agricultura familiar está abaixo dos 30% obrigatórios.
            Atual: {percentualAF.toFixed(2)}%
          </Alert>
        )}

        {atendeRequisito && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
            Parabéns! O percentual de agricultura familiar atende o requisito de 30%.
            Atual: {percentualAF.toFixed(2)}%
          </Alert>
        )}

        {alertas.fornecedores_vencidos && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
            Existem {fornecedores.vencidos} fornecedor(es) com DAP/CAF vencida. Atualize os cadastros!
          </Alert>
        )}

        {alertas.fornecedores_vencendo && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {fornecedores.vencendo} fornecedor(es) com DAP/CAF vencendo nos próximos 30 dias.
          </Alert>
        )}
      </Box>

      {/* Cards de Resumo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Percentual Agricultura Familiar */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Agriculture sx={{ fontSize: 40, color: atendeRequisito ? '#2e7d32' : '#d32f2f', mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Agricultura Familiar
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: atendeRequisito ? '#2e7d32' : '#d32f2f' }}>
                    {percentualAF.toFixed(2)}%
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(percentualAF, 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: atendeRequisito ? '#2e7d32' : '#d32f2f',
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Meta: 30%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {atendeRequisito ? 'Atende' : 'Não atende'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Valor Total */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Valor Total PNAE
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(agricultura_familiar.valor_total)}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Agricultura Familiar:{' '}
                <strong>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(agricultura_familiar.valor_af)}
                </strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Total de pedidos: <strong>{agricultura_familiar.total_pedidos}</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Fornecedores */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <School sx={{ fontSize: 40, color: '#ed6c02', mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Fornecedores AF
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {fornecedores.total}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {fornecedores.vencidos > 0 && (
                  <Chip
                    label={`${fornecedores.vencidos} vencido(s)`}
                    size="small"
                    color="error"
                  />
                )}
                {fornecedores.vencendo > 0 && (
                  <Chip
                    label={`${fornecedores.vencendo} vencendo`}
                    size="small"
                    color="warning"
                  />
                )}
                {fornecedores.vencidos === 0 && fornecedores.vencendo === 0 && (
                  <Chip label="Todos em dia" size="small" color="success" />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráfico de Evolução */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Evolução Mensal - Percentual Agricultura Familiar
          </Typography>
          <Box sx={{ height: 300 }}>
            <Line data={chartData} options={chartOptions} />
          </Box>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default DashboardPNAE;
