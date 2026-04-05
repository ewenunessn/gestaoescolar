import React, { useEffect, useState } from "react";
import PageContainer from "../../../components/PageContainer";
import {
  Box, Typography, Grid, Card, Paper,
  Button, CircularProgress, Tooltip,
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

// ── Constants ──────────────────────────────────────────────────
const NAVY = "#0f172a";
const GREEN = "#22c55e";
const GREEN_DARK = "#16a34a";

const quickActions = [
  { title: "Gerenciar Escolas",   description: "Cadastre e edite escolas",      icon: <School />,               path: "/escolas",         accent: "#3b82f6" },
  { title: "Ver Produtos",        description: "Consulte o catálogo de itens",   icon: <Inventory />,            path: "/produtos",        accent: "#22c55e" },
  { title: "Montar Cardápios",    description: "Crie e planeje os cardápios",    icon: <MenuBook />,             path: "/cardapios",       accent: "#a855f7" },
  { title: "Estoque Central",     description: "Acompanhe o estoque principal",  icon: <Storage />,              path: "/estoque-central",  accent: "#f59e0b" },
];

interface Stats {
  escolas: { total: number; ativas: number };
  alunos: number;
  solicitacoes: { total: number; atendidas: number };
}

// ── Animations ─────────────────────────────────────────────────
const AnimStyles = () => (
  <style>{`
    @keyframes qb-fade-up {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes qb-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .qb-stagger {
      animation: qb-fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .qb-stagger:nth-child(1) { animation-delay: 0.06s; }
    .qb-stagger:nth-child(2) { animation-delay: 0.12s; }
    .qb-stagger:nth-child(3) { animation-delay: 0.18s; }
    .qb-stagger:nth-child(4) { animation-delay: 0.24s; }
    .qb-section {
      animation: qb-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .qb-section:nth-child(1) { animation-delay: 0.28s; }
    .qb-section:nth-child(2) { animation-delay: 0.33s; }
    .qb-section:nth-child(3) { animation-delay: 0.38s; }
    .qb-section:nth-child(4) { animation-delay: 0.43s; }
    .qb-skeleton {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: qb-shimmer 1.5s infinite;
      border-radius: 4px;
    }
  `}</style>
);

// ── Stat Card ──────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  bg: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, accent, bg, className }) => (
  <Card
    className={className}
    sx={{
      height: '100%',
      borderRadius: '6px',
      border: '1px solid',
      borderColor: '#e5e7eb',
      bgcolor: '#fff',
      transition: 'all 0.2s ease',
      overflow: 'visible',
      '&:hover': {
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        borderColor: '#d1d5db',
      },
    }}
  >
    <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          width: 48, height: 48, flexShrink: 0,
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: bg,
          color: accent,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.68rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: GREEN,
            mb: 0.5,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Fira Code", "Roboto Mono", monospace',
            fontSize: '1.65rem',
            fontWeight: 700,
            lineHeight: 1.15,
            color: NAVY,
          }}
        >
          {value}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.3 }}>{sub}</Typography>
      </Box>
    </Box>
  </Card>
);

// ── Quick Action Card ──────────────────────────────────────────
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  onClick: () => void;
  className?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, description, icon, accent, onClick, className }) => (
  <Paper
    className={className}
    elevation={0}
    onClick={onClick}
    sx={{
      borderRadius: '4px',
      border: '1px solid #e5e7eb',
      bgcolor: '#fff',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        borderColor: accent,
        boxShadow: `0 0 0 1px ${accent}`,
      },
    }}
  >
    {/* Green accent bar on hover */}
    <Box
      sx={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        bgcolor: accent,
        opacity: 0,
        transition: 'opacity 0.2s',
        '.MuiPaper-root:hover &': { opacity: 1 },
      }}
    />

    <Box sx={{ p: 3 }}>
      <Box sx={{ color: accent, mb: 1.5 }}>{icon}</Box>

      <Typography
        sx={{
          fontSize: '0.92rem',
          fontWeight: 600,
          color: NAVY,
          mb: 0.5,
          lineHeight: 1.3,
        }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, minHeight: 40 }}>
        {description}
      </Typography>

      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          mt: 1.5,
          fontSize: '0.78rem',
          fontWeight: 600,
          color: GREEN,
          transition: 'gap 0.2s',
          '&:hover': { gap: 0.8 },
        }}
      >
        Acessar <ArrowForward sx={{ fontSize: 16 }} />
      </Box>
    </Box>
  </Paper>
);

// ── Skeleton ──────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="qb-skeleton" style={{ height: 90, borderRadius: 6 }} />
);

// ── Dashboard ──────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const { data: pnae, isLoading: loadingPnae } = useDashboardPNAE();

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  const pct = (v: string | number) => `${Number(v).toFixed(1)}%`;
  const pnaeAtende = pnae?.alertas.atende_30_porcento ?? false;
  const pnaePercent = pnae ? pct(pnae.agricultura_familiar.percentual_af) : '—';

  return (
    <PageContainer>
      <AnimStyles />

      {/* Navy header bar */}
      <Box
        sx={{
          mx: '-20px',
          mt: '-12px',
          mb: 4,
          px: '28px',
          py: 2.5,
          background: `linear-gradient(135deg, ${NAVY}, #1e293b)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle green accent line */}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GREEN}44, transparent)` }} />

        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1.55rem',
            color: '#fff',
            mb: 0.3,
            letterSpacing: '-0.5px',
          }}
        >
          Painel de Controle
        </Typography>
        <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          Visão geral do sistema de alimentação escolar
        </Typography>
      </Box>

      {/* Stats row: 5 columns (4 + PNAE) */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats ? (
          <>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                label="Escolas"
                value={`${stats.escolas.ativas} / ${stats.escolas.total}`}
                sub="ativas / total"
                icon={<School sx={{ fontSize: 22 }} />}
                accent="#3b82f6" bg="#eff6ff"
                className="qb-stagger"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                label="Alunos"
                value={stats.alunos.toLocaleString('pt-BR')}
                sub="total cadastrado"
                icon={<PeopleIcon sx={{ fontSize: 22 }} />}
                accent="#22c55e" bg="#f0fdf4"
                className="qb-stagger"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                label="Solicitações"
                value={`${stats.solicitacoes.atendidas} / ${stats.solicitacoes.total}`}
                sub="atendidas / total"
                icon={<ShoppingCartIcon sx={{ fontSize: 22 }} />}
                accent="#f59e0b" bg="#fffbeb"
                className="qb-stagger"
              />
            </Grid>

            {/* PNAE card */}
            <Grid item xs={12} sm={12} md={4.8}>
              <Card
                className="qb-stagger"
                onClick={() => navigate('/pnae/dashboard')}
                sx={{
                  height: '100%',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: pnaeAtende ? '#dcfce7' : '#fef3c7',
                  bgcolor: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    borderColor: pnaeAtende ? GREEN : '#f59e0b',
                  },
                }}
              >
                <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Status dot */}
                  <Box
                    sx={{
                      width: 10, height: 10, borderRadius: '50%',
                      bgcolor: pnaeAtende ? GREEN : '#f59e0b',
                      flexShrink: 0,
                      boxShadow: `0 0 0 4px ${pnaeAtende ? '#dcfce7' : '#fef3c7'}`,
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        color: GREEN,
                        mb: 0.3,
                      }}
                    >
                      PNAE — Agricultura Familiar
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography
                        sx={{
                          fontFamily: '"Fira Code", "Roboto Mono", monospace',
                          fontSize: '1.65rem',
                          fontWeight: 700,
                          lineHeight: 1.15,
                          color: pnaeAtende ? GREEN_DARK : '#dc2626',
                        }}
                      >
                        {pnaePercent}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.72rem',
                          color: '#94a3b8',
                          fontWeight: 500,
                        }}
                      >
                        {pnaeAtende ? 'Atende mínimo 30%' : 'Abaixo do mínimo'}
                      </Typography>
                    </Box>
                  </Box>
                  {loadingPnae
                    ? <CircularProgress size={22} />
                    : pnaeAtende
                      ? <CheckCircleIcon sx={{ fontSize: 24, color: GREEN, flexShrink: 0 }} />
                      : <AgricultureIcon sx={{ fontSize: 24, color: '#f59e0b', flexShrink: 0 }} />
                  }
                </Box>
              </Card>
            </Grid>
          </>
        ) : (
          <>
            {[0, 1, 2, 3].map(i => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <SkeletonCard />
              </Grid>
            ))}
          </>
        )}
      </Grid>

      {/* Quick Actions */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: GREEN }} />
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: GREEN,
            }}
          >
            Ações Rápidas
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {quickActions.map((action) => (
            <Grid item xs={12} sm={6} md={3} key={action.title}>
              <ActionCard
                title={action.title}
                description={action.description}
                icon={React.cloneElement(action.icon as React.ReactElement, { style: { fontSize: 22 } })}
                accent={action.accent}
                onClick={() => navigate(action.path)}
                className="qb-section"
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Dashboard;
