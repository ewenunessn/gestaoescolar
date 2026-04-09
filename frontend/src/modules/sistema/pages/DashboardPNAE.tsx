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
  LinearProgressProps,
} from "@mui/material";
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Agriculture,
  AttachMoney,
  AccountBalance,
  TrendingDown,
  Gavel,
  BarChart as BarChartIcon,
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

// ── Design tokens ──────────────────────────────────────────────
const NAVY = "#0f172a";
const GREEN = "#22c55e";
const GREEN_DARK = "#16a34a";

// ── Animations ─────────────────────────────────────────────────
const AnimStyles = () => (
  <style>{`
    @keyframes pnae-qb-fade {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pnae-qb-skel {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .pnae-qb-card {
      animation: pnae-qb-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .pnae-qb-card:nth-child(1) { animation-delay: 0.06s; }
    .pnae-qb-card:nth-child(2) { animation-delay: 0.12s; }
    .pnae-qb-card:nth-child(3) { animation-delay: 0.18s; }
    .pnae-qb-card:nth-child(4) { animation-delay: 0.24s; }
    .pnae-qb-sec {
      animation: pnae-qb-fade 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .pnae-qb-sec:nth-child(1) { animation-delay: 0.28s; }
    .pnae-qb-sec:nth-child(2) { animation-delay: 0.34s; }
    .pnae-qb-sec:nth-child(3) { animation-delay: 0.40s; }
    .pnae-qb-skel {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: pnae-qb-skel 1.5s infinite;
      border-radius: 4px;
    }
  `}</style>
);

// ── Metric Card ────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  caption?: string;
  icon: React.ReactNode;
  accent: string;
  bg: string;
  progressProps?: LinearProgressProps;
  progressCaption?: React.ReactNode;
  mono?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, caption, icon, accent, bg, progressProps, progressCaption, mono = true }) => (
  <Card
    className="pnae-qb-card"
    sx={{
      height: '100%',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      transition: 'all 0.2s',
      overflow: 'visible',
      '&:hover': { boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderColor: 'action.selected' },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      {/* Icon + label row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: accent,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ width: 36, height: 36, borderRadius: '4px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          {icon}
        </Box>
      </Box>

      {/* Value */}
      <Typography
        sx={{
          fontFamily: mono ? '"Fira Code", "Roboto Mono", monospace' : 'inherit',
          fontSize: '1.55rem',
          fontWeight: 700,
          lineHeight: 1.15,
          color: accent,
          mb: caption ? 0.5 : 0,
        }}
      >
        {value}
      </Typography>

      {caption && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{caption}</Typography>
      )}

      {progressProps && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant={progressProps.variant}
            value={progressProps.value}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: accent, borderRadius: 2 },
            }}
          />
          {progressCaption}
        </Box>
      )}
    </CardContent>
  </Card>
);

// ── Skeleton ──────────────────────────────────────────────────
const Skeletal = () => <div className="pnae-qb-skel" style={{ height: 130 }} />;

// ── DashboardPNAE ─────────────────────────────────────────────
const DashboardPNAE = () => {
  const { data: dashboard, isLoading, error } = useDashboardPNAE();

  if (isLoading) {
    return (
      <PageContainer>
        <AnimStyles />
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[0, 1, 2, 3].map(i => <Grid item xs={12} sm={6} md={3} key={i}><Skeletal /></Grid>)}
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}><div className="pnae-qb-skel" style={{ height: 220 }} /></Grid>
          <Grid item xs={12} md={4}><div className="pnae-qb-skel" style={{ height: 220 }} /></Grid>
        </Grid>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" sx={{ borderRadius: '6px', mt: 2 }}>Erro ao carregar dashboard PNAE</Alert>
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
    percentual_minimo_obrigatorio,
  } = dashboard;

  const percentualAF = parseFloat(String(agricultura_familiar.percentual_af)) || 0;
  const atendeRequisito = alertas.atende_30_porcento;
  const valorRecebidoFNDE = parseFloat(String(valor_recebido_fnde)) || 0;
  const valorMinimoObrigatorio = parseFloat(String(agricultura_familiar.valor_minimo_obrigatorio)) || 0;
  const valorFaltante = parseFloat(String(agricultura_familiar.valor_faltante)) || 0;
  const valorAF = parseFloat(String(agricultura_familiar.valor_af)) || 0;

  const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
  const num = (v: string | number) => Number(v);

  // Chart data
  const chartData = {
    labels: evolucao_mensal.map((m) => m.mes_nome),
    datasets: [
      {
        label: 'Percentual AF Acumulado (%)',
        data: evolucao_mensal.map((m) => num(m.percentual_af) || 0),
        borderColor: atendeRequisito ? GREEN : '#dc2626',
        backgroundColor: atendeRequisito ? 'rgba(34, 197, 94, 0.06)' : 'rgba(220, 38, 38, 0.06)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: atendeRequisito ? GREEN : '#dc2626',
        borderWidth: 2,
      },
      {
        label: `Meta ${percentual_minimo_obrigatorio}%`,
        data: evolucao_mensal.map(() => percentual_minimo_obrigatorio),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11, weight: '500' as const } },
      },
      tooltip: {
        backgroundColor: NAVY,
        titleFont: { size: 12, weight: '600' as const },
        bodyFont: { size: 11 },
        padding: 12,
        cornerRadius: 6,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              return ` Acumulado: ${context.parsed.y.toFixed(2)}%`;
            }
            return ` Meta: ${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: Math.max(100, percentual_minimo_obrigatorio + 10),
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        ticks: { callback: (value: any) => `${value}%`, font: { size: 10 }, color: '#94a3b8', padding: 6 },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: '500' as const }, color: '#64748b', padding: 6 },
        border: { display: false },
      },
    },
  };

  return (
    <PageContainer>
      <AnimStyles />
      {/* Alert Banner */}
      {!atendeRequisito ? (
        <Alert
          severity="error"
          icon={<Warning />}
          className="pnae-qb-sec"
          sx={{
            mb: 3, borderRadius: '6px',
            boxShadow: '0 0 0 1px #fecaca',
            background: '#fff7f7',
            '& .MuiAlert-icon': { color: '#dc2626' },
            '& .MuiAlert-message': { fontSize: '0.82rem' },
          }}
        >
          <Typography sx={{ fontWeight: 700, mb: 0.3, color: '#991b1b', fontSize: '0.85rem' }}>
            Percentual de Agricultura Familiar abaixo do mínimo obrigatório
          </Typography>
          <Typography sx={{ color: '#b91c1c', fontSize: '0.78rem' }}>
            Atual: {percentualAF.toFixed(2)}% · Meta: {percentual_minimo_obrigatorio}% · Faltam: {brl(valorFaltante)}
          </Typography>
        </Alert>
      ) : (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          className="pnae-qb-sec"
          sx={{
            mb: 3, borderRadius: '6px',
            boxShadow: '0 0 0 1px #dcfce7',
            background: '#f7fef9',
            '& .MuiAlert-icon': { color: GREEN_DARK },
            '& .MuiAlert-message': { fontSize: '0.82rem' },
          }}
        >
          <Typography sx={{ fontWeight: 700, mb: 0.3, color: '#166534', fontSize: '0.85rem' }}>
            Requisito de {percentual_minimo_obrigatorio}% de Agricultura Familiar atendido
          </Typography>
          <Typography sx={{ color: '#15803d', fontSize: '0.78rem' }}>
            Percentual atual: {percentualAF.toFixed(2)}% · Valor gasto: {brl(valorAF)}
          </Typography>
        </Alert>
      )}

      {/* Section label */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: 'success.main' }} />
        <Typography
          sx={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'success.main',
          }}
        >
          Métricas Financeiras
        </Typography>
      </Box>

      {/* 4 Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Valor Recebido FNDE"
            value={brl(valorRecebidoFNDE)}
            caption="Base de cálculo PNAE"
            icon={<AccountBalance sx={{ fontSize: 18 }} />}
            accent="#2563eb" bg="#eff6ff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Agricultura Familiar"
            value={`${percentualAF.toFixed(1)}%`}
            icon={<Agriculture sx={{ fontSize: 18 }} />}
            accent={atendeRequisito ? GREEN_DARK : '#dc2626'}
            bg={atendeRequisito ? '#f0fdf4' : '#fef2f2'}
            progressProps={{
              variant: 'determinate',
              value: Math.min((percentualAF / percentual_minimo_obrigatorio) * 100, 100),
            }}
            progressCaption={
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.6, fontSize: '0.72rem' }}>
                <Typography sx={{ color: 'text.secondary' }}>Meta: {percentual_minimo_obrigatorio}%</Typography>
                <Typography sx={{ color: atendeRequisito ? GREEN_DARK : '#dc2626', fontWeight: 600 }}>{atendeRequisito ? 'Atende' : 'Não atende'}</Typography>
              </Box>
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Mínimo Obrigatório"
            value={brl(valorMinimoObrigatorio)}
            caption={`${percentual_minimo_obrigatorio}% do valor FNDE`}
            icon={<TrendingUp sx={{ fontSize: 18 }} />}
            accent="#d97706" bg="#fffbeb"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label={valorFaltante > 0 ? 'Falta Gastar' : 'Excedente'}
            value={brl(Math.abs(valorFaltante))}
            caption={valorFaltante > 0 ? 'Para atingir meta' : 'Acima do mínimo'}
            icon={valorFaltante > 0
              ? <TrendingDown sx={{ fontSize: 18 }} />
              : <CheckCircle sx={{ fontSize: 18 }} />
            }
            accent={valorFaltante > 0 ? '#dc2626' : GREEN_DARK}
            bg={valorFaltante > 0 ? '#fef2f2' : '#f0fdf4'}
          />
        </Grid>
      </Grid>

      {/* Secondary cards: Resumo Financeiro + Legislação */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Resumo Financeiro */}
        <Grid item xs={12} md={8}>
          <Card className="pnae-qb-sec" sx={{ height: '100%', borderRadius: '6px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 3 }}>
              {/* Section bar */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: 'info.main' }} />
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'info.main' }}>
                  Resumo Financeiro
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {/* Total de Pedidos */}
                <Grid item xs={12} sm={4}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2.5,
                      bgcolor: 'action.hover',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'border-color 0.15s',
                      '&:hover': { borderColor: '#d1d5db' },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        color: 'text.secondary',
                        mb: 0.8,
                      }}
                    >
                      Total de Pedidos
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"Fira Code", "Roboto Mono", monospace',
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        color: 'text.primary',
                        lineHeight: 1.15,
                      }}
                    >
                      {brl(num(agricultura_familiar.valor_total) || 0)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3 }}>
                      {String(parseInt(String(agricultura_familiar.total_pedidos)) || 0)} pedidos
                    </Typography>
                  </Box>
                </Grid>
                {/* Agricultura Familiar */}
                <Grid item xs={12} sm={4}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2.5,
                      bgcolor: 'success.light',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: 'success.main',
                      transition: 'border-color 0.15s',
                      '&:hover': { borderColor: '#86efac' },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        color: 'success.dark',
                        mb: 0.8,
                      }}
                    >
                      Agricultura Familiar
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"Fira Code", "Roboto Mono", monospace',
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        color: 'success.dark',
                        lineHeight: 1.15,
                      }}
                    >
                      {brl(valorAF)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'success.dark', fontWeight: 500, mt: 0.3 }}>
                      {percentualAF.toFixed(1)}% do FNDE
                    </Typography>
                  </Box>
                </Grid>
                {/* Fornecedores AF */}
                <Grid item xs={12} sm={4}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      p: 2.5,
                      bgcolor: 'info.light',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: 'info.main',
                      transition: 'border-color 0.15s',
                      '&:hover': { borderColor: '#93c5fd' },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        color: 'info.dark',
                        mb: 0.8,
                      }}
                    >
                      Fornecedores AF
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: '"Fira Code", "Roboto Mono", monospace',
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        color: 'info.dark',
                        lineHeight: 1.15,
                      }}
                    >
                      {String(parseInt(String(fornecedores.total)) || 0)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 0.8 }}>
                      {parseInt(String(fornecedores.vencidos)) > 0 && (
                        <Chip label={`${String(fornecedores.vencidos)} vencido(s)`} size="small" color="error" sx={{ height: 20, fontSize: '0.68rem', borderRadius: '3px', fontWeight: 500 }} />
                      )}
                      {parseInt(String(fornecedores.vencendo)) > 0 && (
                        <Chip label={`${String(fornecedores.vencendo)} vencendo`} size="small" color="warning" sx={{ height: 20, fontSize: '0.68rem', borderRadius: '3px', fontWeight: 500 }} />
                      )}
                      {parseInt(String(fornecedores.vencidos)) === 0 && parseInt(String(fornecedores.vencendo)) === 0 && (
                        <Chip label="Todos em dia" size="small" color="success" sx={{ height: 20, fontSize: '0.68rem', borderRadius: '3px', fontWeight: 500 }} />
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Legislação */}
        <Grid item xs={12} md={4}>
          <Card className="pnae-qb-sec" sx={{ height: '100%', borderRadius: '6px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: 'text.secondary' }} />
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'text.secondary' }}>
                  Legislação
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: '4px 4px 0 0', border: '1px solid', borderColor: 'divider', borderBottom: 'none' }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Lei 11.947/2009
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.primary', mt: 0.2 }}>Institui o PNAE</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderBottom: 'none' }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Lei 15.226/2025
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.primary', mt: 0.2 }}>Aumenta para 45% (vigente 2026)</Typography>
                </Box>
                <Box
                  sx={{
                    p: 2, bgcolor: 'background.paper', borderRadius: '0 0 4px 4px', border: '1px solid', borderColor: 'divider',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Obrigatório
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"Fira Code", "Roboto Mono", monospace',
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: 'info.main',
                    }}
                  >
                    {percentual_minimo_obrigatorio}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chart */}
      <Card className="pnae-qb-sec" sx={{ borderRadius: '6px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: 'success.dark' }} />
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'success.dark' }}>
              Evolução Acumulada — Agricultura Familiar
            </Typography>
          </Box>

          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 2 }}>
            Percentual acumulado no ano sobre o valor total recebido do FNDE
          </Typography>
          <Box sx={{ height: 320 }}>
            <Line data={chartData} options={chartOptions} />
          </Box>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default DashboardPNAE;
