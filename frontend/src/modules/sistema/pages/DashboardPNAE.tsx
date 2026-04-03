import React from "react";
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
  Paper,
  Divider,
} from "@mui/material";
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Agriculture,
  AttachMoney,
  AccountBalance,
  TrendingDown,
} from "@mui/icons-material";
import { useDashboardPNAE } from "../../../hooks/queries/usePnaeQueries";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { Line } from "react-chartjs-2";
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
} from "chart.js";

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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: "50vh" }}>
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

  const { 
    agricultura_familiar, 
    fornecedores, 
    evolucao_mensal, 
    alertas, 
    ano,
    valor_recebido_fnde,
    percentual_minimo_obrigatorio 
  } = dashboard;

  // Calcular variáveis
  const percentualAF = parseFloat(String(agricultura_familiar.percentual_af)) || 0;
  const atendeRequisito = alertas.atende_30_porcento;
  const valorRecebidoFNDE = parseFloat(String(valor_recebido_fnde)) || 0;
  const valorMinimoObrigatorio = parseFloat(String(agricultura_familiar.valor_minimo_obrigatorio)) || 0;
  const valorFaltante = parseFloat(String(agricultura_familiar.valor_faltante)) || 0;
  const valorAF = parseFloat(String(agricultura_familiar.valor_af)) || 0;

  // Dados para o gráfico
  const chartData = {
    labels: evolucao_mensal.map((m) => m.mes_nome),
    datasets: [
      {
        label: 'Percentual AF Acumulado (%)',
        data: evolucao_mensal.map((m) => parseFloat(String(m.percentual_af)) || 0),
        borderColor: atendeRequisito ? '#2e7d32' : '#d32f2f',
        backgroundColor: atendeRequisito ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: `Meta ${percentual_minimo_obrigatorio}%`,
        data: evolucao_mensal.map(() => percentual_minimo_obrigatorio),
        borderColor: '#ed6c02',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              return `Acumulado: ${context.parsed.y.toFixed(2)}%`;
            }
            return `Meta: ${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: Math.max(100, percentual_minimo_obrigatorio + 10),
        ticks: {
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return (
    <PageContainer>
      <PageHeader title="Dashboard PNAE" subtitle={`Conformidade Lei 11.947/2009 - Ano ${ano}`} />

      {/* Alert Principal */}
      {!atendeRequisito ? (
        <Alert 
          severity="error" 
          icon={<Warning />} 
          sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(211, 47, 47, 0.15)' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Atenção! Percentual de Agricultura Familiar abaixo do mínimo obrigatório
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Atual: {percentualAF.toFixed(2)}% • Meta: {percentual_minimo_obrigatorio}% • 
            Faltam: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFaltante)}
          </Typography>
        </Alert>
      ) : (
        <Alert 
          severity="success" 
          icon={<CheckCircle />} 
          sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(46, 125, 50, 0.15)' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Parabéns! Requisito de {percentual_minimo_obrigatorio}% de Agricultura Familiar atendido
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Percentual atual: {percentualAF.toFixed(2)}% • 
            Valor gasto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorAF)}
          </Typography>
        </Alert>
      )}

      {/* Cards Principais - 4 colunas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Valor Recebido FNDE */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Valor Recebido FNDE
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: '#1976d2' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(valorRecebidoFNDE)}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: '#e3f2fd', borderRadius: '8px', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AccountBalance sx={{ fontSize: 24, color: '#1976d2' }} />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Base de cálculo PNAE
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Percentual Agricultura Familiar */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Agricultura Familiar
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: atendeRequisito ? '#2e7d32' : '#d32f2f' }}>
                    {percentualAF.toFixed(1)}%
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: atendeRequisito ? '#e8f5e9' : '#ffebee', borderRadius: '8px', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Agriculture sx={{ fontSize: 24, color: atendeRequisito ? '#2e7d32' : '#d32f2f' }} />
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min((percentualAF / percentual_minimo_obrigatorio) * 100, 100)}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: atendeRequisito ? '#2e7d32' : '#d32f2f',
                    borderRadius: 3,
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Meta: {percentual_minimo_obrigatorio}%
                </Typography>
                <Typography variant="caption" sx={{ color: atendeRequisito ? '#2e7d32' : '#d32f2f', fontWeight: 600 }}>
                  {atendeRequisito ? 'Atende' : 'Não atende'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Valor Mínimo Obrigatório */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Mínimo Obrigatório
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: '#ed6c02' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(valorMinimoObrigatorio)}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: '#fff3e0', borderRadius: '8px', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp sx={{ fontSize: 24, color: '#ed6c02' }} />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {percentual_minimo_obrigatorio}% do valor FNDE
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Valor Faltante ou Excedente */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {valorFaltante > 0 ? 'Falta Gastar' : 'Excedente'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: valorFaltante > 0 ? '#d32f2f' : '#2e7d32' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(Math.abs(valorFaltante))}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: valorFaltante > 0 ? '#ffebee' : '#e8f5e9', borderRadius: '8px', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {valorFaltante > 0 ? (
                    <TrendingDown sx={{ fontSize: 24, color: '#d32f2f' }} />
                  ) : (
                    <CheckCircle sx={{ fontSize: 24, color: '#2e7d32' }} />
                  )}
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {valorFaltante > 0 ? 'Para atingir meta' : 'Acima do mínimo'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cards Secundários - 2 colunas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Resumo Financeiro */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney sx={{ color: '#1976d2' }} />
                Resumo Financeiro
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: '8px' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Total de Pedidos
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(parseFloat(String(agricultura_familiar.valor_total)) || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {String(parseInt(String(agricultura_familiar.total_pedidos)) || 0)} pedidos
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#e8f5e9', borderRadius: '8px' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Agricultura Familiar
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: '#2e7d32' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(valorAF)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                      {percentualAF.toFixed(1)}% do FNDE
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#e3f2fd', borderRadius: '8px' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Fornecedores AF
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, color: '#1976d2' }}>
                      {String(parseInt(String(fornecedores.total)) || 0)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 0.5 }}>
                      {parseInt(String(fornecedores.vencidos)) > 0 && (
                        <Chip label={`${String(fornecedores.vencidos)} vencido(s)`} size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {parseInt(String(fornecedores.vencendo)) > 0 && (
                        <Chip label={`${String(fornecedores.vencendo)} vencendo`} size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {parseInt(String(fornecedores.vencidos)) === 0 && parseInt(String(fornecedores.vencendo)) === 0 && (
                        <Chip label="Todos em dia" size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Informações Legais */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', bgcolor: '#fafafa' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Legislação
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Lei 11.947/2009
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    Institui o PNAE
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Lei 15.226/2025
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    Aumenta para 45% (vigente 2026)
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Percentual Obrigatório
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                    {percentual_minimo_obrigatorio}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráfico de Evolução */}
      <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Evolução Acumulada - Percentual Agricultura Familiar
            </Typography>
            <Chip 
              label={`Meta: ${percentual_minimo_obrigatorio}%`} 
              size="small" 
              sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 600 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Percentual acumulado no ano sobre o valor total recebido do FNDE
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
