import React, { useEffect, useState } from "react";
import PageContainer from "../../../components/PageContainer";
import {
  Box, Typography, Grid, Card, Paper,
  ListItemIcon, Button, CircularProgress, Tooltip,
} from "@mui/material";
import {
  School, Inventory, MenuBook, Storage,
  ArrowForward, People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Agriculture as AgricultureIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useDashboardPNAE } from "../../../hooks/queries/usePnaeQueries";

const quickActions = [
  { title: "Gerenciar Escolas",   description: "Cadastre e edite escolas",         icon: <School />,   path: "/escolas",         color: "primary.main"   },
  { title: "Ver Produtos",        description: "Consulte o catálogo de itens",      icon: <Inventory />, path: "/produtos",        color: "success.main"   },
  { title: "Montar Cardápios",    description: "Crie e planeje os cardápios",       icon: <MenuBook />, path: "/cardapios",        color: "secondary.main" },
  { title: "Estoque Central",     description: "Acompanhe o estoque principal",     icon: <Storage />,  path: "/estoque-central",  color: "warning.main"   },
];

interface Stats {
  escolas: { total: number; ativas: number };
  alunos: number;
  solicitacoes: { total: number; atendidas: number };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const { data: pnae, isLoading: loadingPnae } = useDashboardPNAE();

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  const fmt = (v: string | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  const pct = (v: string | number) => `${Number(v).toFixed(1)}%`;

  const statCards = stats ? [
    {
      label: 'Escolas',
      value: `${stats.escolas.ativas} / ${stats.escolas.total}`,
      sub: 'ativas / total',
      icon: <School sx={{ fontSize: 32 }} />,
      color: '#1976d2',
      bg: '#e3f2fd',
    },
    {
      label: 'Alunos cadastrados',
      value: stats.alunos.toLocaleString('pt-BR'),
      sub: 'total de alunos',
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      color: '#388e3c',
      bg: '#e8f5e9',
    },
    {
      label: 'Solicitações',
      value: `${stats.solicitacoes.atendidas} / ${stats.solicitacoes.total}`,
      sub: 'atendidas / total',
      icon: <ShoppingCartIcon sx={{ fontSize: 32 }} />,
      color: '#f57c00',
      bg: '#fff3e0',
    },
  ] : null;

  return (
    <PageContainer>
      {/* Cards de estatísticas + PNAE */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards ? statCards.map(c => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <Card sx={{ p: 2.5, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 2, border: `1px solid ${c.bg}` }}>
              <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: c.bg, color: c.color, display: 'flex' }}>
                {c.icon}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                <Typography variant="h5" fontWeight={700} lineHeight={1.2}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.sub}</Typography>
              </Box>
            </Card>
          </Grid>
        )) : [0,1,2].map(i => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ p: 2.5, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 90 }}>
              <CircularProgress size={24} />
            </Card>
          </Grid>
        ))}

        {/* Card PNAE compacto */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => navigate('/pnae/dashboard')}
            sx={{ p: 2.5, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 2, border: '1px solid #e8f5e9', cursor: 'pointer', '&:hover': { boxShadow: 3 }, transition: 'box-shadow 0.2s' }}
          >
            <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#e8f5e9', color: '#2e7d32', display: 'flex', flexShrink: 0 }}>
              {loadingPnae ? <CircularProgress size={32} sx={{ color: '#2e7d32' }} /> : (
                pnae?.alertas.atende_30_porcento
                  ? <CheckCircleIcon sx={{ fontSize: 32 }} />
                  : <AgricultureIcon sx={{ fontSize: 32 }} />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">PNAE — Agric. Familiar</Typography>
              <Typography variant="h5" fontWeight={700} lineHeight={1.2} color={pnae?.alertas.atende_30_porcento ? 'success.main' : 'warning.main'}>
                {pnae ? pct(pnae.agricultura_familiar.percentual_af) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pnae?.alertas.atende_30_porcento ? 'Atende o mínimo de 30%' : 'Abaixo do mínimo de 30%'}
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Ações Rápidas */}
      <Box>
        <Typography variant="h5" fontWeight={600} color="text.primary" sx={{ mb: 3 }}>
          Ações Rápidas
        </Typography>
        <Grid container spacing={3}>
          {quickActions.map((action) => (
            <Grid item xs={12} sm={6} md={3} key={action.title}>
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' },
                }}
              >
                <Box sx={{ p: 3, borderLeft: `4px solid ${action.color}`, borderRadius: '12px 0 0 12px' }}>
                  <ListItemIcon sx={{ color: action.color, mb: 1 }}>
                    {React.cloneElement(action.icon, { style: { fontSize: 32 } })}
                  </ListItemIcon>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>{action.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: '40px' }}>{action.description}</Typography>
                  <Button endIcon={<ArrowForward />} onClick={() => navigate(action.path)} sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}>
                    Acessar
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Dashboard;
