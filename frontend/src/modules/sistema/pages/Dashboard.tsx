import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  IconButton,
  Button,
  Divider,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import {
  ArrowForward as ArrowIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  ShoppingCart as CartIcon,
  Route as RouteIcon,
  Inventory as InventoryIcon,
  MenuBook as MenuBookIcon,
  Storage as StorageIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  TrendingUp,
  People,
  Assignment,
  ShoppingCart,
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import api from "../../../services/api";
import { useDashboardPNAE } from "../../../hooks/queries/usePnaeQueries";

// ── GitHub Dark Tokens ────────────────────────────────────────
const GH = {
  bg:       "#0d1117",
  canvas:   "#161b22",
  border:   "#21262d",
  borderMd: "#30363d",
  text:     "#e6edf3",
  muted:    "#8b949e",
  sub:      "#6e7681",
  green:    "#238636",
  greenLt:  "#2ea043",
  greenDim: "rgba(35,134,54,0.15)",
  blue:     "#58a6ff",
  blueDim:  "rgba(56,139,253,0.15)",
  red:      "#f85149",
  redDim:   "rgba(248,81,73,0.15)",
  orange:   "#d29922",
  orangeDim:"rgba(210,153,34,0.15)",
};

interface Stats {
  escolas: { total: number; ativas: number };
  alunos: number;
  solicitacoes: { total: number; atendidas: number };
}

const quickLinks = [
  { label: "Escolas", path: "/escolas", icon: <SchoolIcon sx={{ fontSize: 16 }} /> },
  { label: "Produtos", path: "/produtos", icon: <InventoryIcon sx={{ fontSize: 16 }} /> },
  { label: "Cardápios", path: "/cardapios", icon: <MenuBookIcon sx={{ fontSize: 16 }} /> },
  { label: "Estoque Central", path: "/estoque-central", icon: <StorageIcon sx={{ fontSize: 16 }} /> },
  { label: "Pedidos", path: "/compras", icon: <ReceiptIcon sx={{ fontSize: 16 }} /> },
  { label: "Rotas", path: "/rotas", icon: <RouteIcon sx={{ fontSize: 16 }} /> },
];

// ── Stat Card ───────────────────────────────────────────────────
interface StatItemProps {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  accent?: string;
  accentBg?: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, detail, icon, accent = GH.greenLt, accentBg = GH.greenDim }) => (
  <Box
    sx={{
      p: 3,
      border: `1px solid ${GH.border}`,
      borderRadius: "6px",
      bgcolor: GH.canvas,
      transition: "border-color 0.2s ease",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      "&:hover": {
        borderColor: GH.borderMd,
      },
    }}
  >
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
      <Typography
        sx={{
          fontSize: "0.75rem",
          fontWeight: 400,
          color: GH.muted,
          lineHeight: 1.4,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: accentBg,
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </Box>
    <Typography
      sx={{
        fontSize: "1.85rem",
        fontWeight: 600,
        color: GH.text,
        letterSpacing: "-0.5px",
        lineHeight: 1,
        mb: 0.5,
      }}
    >
      {value}
    </Typography>
    {detail && (
      <Typography
        sx={{
          fontSize: "0.75rem",
          color: GH.sub,
          fontWeight: 400,
          mt: "auto",
        }}
      >
        {detail}
      </Typography>
    )}
  </Box>
);

// ── Quick Link ──────────────────────────────────────────────────
interface QuickLinkProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const QuickLinkItem: React.FC<QuickLinkProps> = ({ label, icon, onClick }) => (
  <Button
    fullWidth
    onClick={onClick}
    startIcon={icon}
    endIcon={<ArrowIcon sx={{ fontSize: 14, opacity: 0, transition: "opacity 0.15s" }} />}
    sx={{
      justifyContent: "flex-start",
      px: 2,
      py: 1,
      color: GH.muted,
      fontSize: "0.82rem",
      fontWeight: 400,
      textTransform: "none",
      borderRadius: "6px",
      transition: "all 0.15s ease",
      "&:hover": {
        bgcolor: "rgba(255,255,255,0.04)",
        color: GH.text,
        "& .ql-arrow": { opacity: 1 },
      },
      "&:active": {
        bgcolor: "rgba(255,255,255,0.06)",
      },
      "& .MuiButton-startIcon": {
        color: GH.sub,
        transition: "color 0.15s",
      },
      "&:hover .MuiButton-startIcon": {
        color: GH.greenLt,
      },
    }}
  >
    {label}
  </Button>
);

// ── Dashboard ───────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [greeting, setGreeting] = useState("");
  const { data: pnae, isLoading: loadingPnae } = useDashboardPNAE();

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite");
    
    // Verificar se há token antes de fazer requisições
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      console.log('📊 [Dashboard] Token encontrado, carregando stats...');
      api.get("/dashboard/stats")
        .then((r) => {
          console.log('✅ [Dashboard] Stats carregadas com sucesso');
          setStats(r.data.data);
        })
        .catch((err) => {
          console.error('❌ [Dashboard] Erro ao carregar stats:', err);
        });
    } else {
      console.log('⚠️ [Dashboard] Sem token, não carregar stats');
    }
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pct = (v: string | number) => `${Number(v).toFixed(1)}%`;
  const pnaeAtende = pnae?.alertas?.atende_45_porcento ?? (parseFloat(pnae?.agricultura_familiar?.percentual_af ?? 0) >= 45);
  const pnaePercent = pnae ? pct(pnae.agricultura_familiar?.percentual_af ?? 0) : "—";
  const solicitacoesAtendidas = stats?.solicitacoes.atendidas ?? 0;
  const solicitacoesTotal = stats?.solicitacoes.total ?? 0;
  const solicitacoesPct = solicitacoesTotal > 0 ? ((solicitacoesAtendidas / solicitacoesTotal) * 100).toFixed(0) : "0";

  return (
    <PageContainer sx={{ pb: 4 }}>
      {/* ── Greeting ─────────────────────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 400,
            color: GH.sub,
            letterSpacing: "0.5px",
            mb: 0.5,
            textTransform: "capitalize",
          }}
        >
          {today}
        </Typography>
        <Typography
          sx={{
            fontSize: "1.75rem",
            fontWeight: 600,
            color: GH.text,
            letterSpacing: "-0.5px",
            lineHeight: 1.2,
          }}
        >
          {stats ? `${greeting}.` : "Carregando.."}
        </Typography>
      </Box>

      {/* ── Stats ────────────────────────────────────────── */}
      {stats ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatItem
              label="Escolas"
              value={stats.escolas.total}
              detail={`${stats.escolas.ativas} ativas`}
              icon={<SchoolIcon sx={{ fontSize: 18 }} />}
              accent={GH.blue}
              accentBg={GH.blueDim}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatItem
              label="Alunos"
              value={stats.alunos.toLocaleString("pt-BR")}
              detail="total cadastrado"
              icon={<People sx={{ fontSize: 18 }} />}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatItem
              label="Solicitações"
              value={`${solicitacoesPct}%`}
              detail={`${solicitacoesAtendidas} de ${solicitacoesTotal} atendidas`}
              icon={<Assignment sx={{ fontSize: 18 }} />}
              accent={GH.orange}
              accentBg={GH.orangeDim}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            {/* PNAE */}
            <Box
              sx={{
                p: 3,
                border: `1px solid ${GH.border}`,
                borderRadius: "6px",
                bgcolor: GH.canvas,
                transition: "border-color 0.2s ease",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                "&:hover": { borderColor: GH.borderMd },
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 400, color: GH.muted, lineHeight: 1.4 }}>
                  PNAE — Af.
                </Typography>
                <Box
                  sx={{
                    width: 32, height: 32, borderRadius: "6px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    bgcolor: pnaeAtende ? GH.greenDim : GH.orangeDim,
                    color: pnaeAtende ? GH.greenLt : GH.orange,
                    flexShrink: 0,
                  }}
                >
                  {loadingPnae ? (
                    <CircularProgress size={18} sx={{ color: GH.sub }} />
                  ) : pnaeAtende ? (
                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <WarningIcon sx={{ fontSize: 18 }} />
                  )}
                </Box>
              </Box>

              <Typography
                sx={{
                  fontSize: "1.85rem",
                  fontWeight: 600,
                  color: pnaeAtende ? GH.greenLt : GH.red,
                  letterSpacing: "-0.5px",
                  lineHeight: 1,
                  mb: 0.5,
                }}
              >
                {pnaePercent}
              </Typography>

              <Box sx={{ mt: 1.5 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(parseFloat(pnaePercent) / 45 * 100, 100)}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: GH.bg,
                    "& .MuiLinearProgress-bar": {
                      bgcolor: pnaeAtende ? GH.greenLt : GH.orange,
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: "0.65rem", color: GH.sub, mt: "auto" }}>
                Mínimo requerido: 45%
              </Typography>
            </Box>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Box
                sx={{
                  p: 3,
                  border: `1px solid ${GH.border}`,
                  borderRadius: "6px",
                  bgcolor: GH.canvas,
                  height: 120,
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Bottom Section ───────────────────────────────── */}
      <Grid container spacing={4}>
        {/* Quick Links */}
        <Grid item xs={12} md={6}>
          <Typography
            sx={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: GH.text,
              mb: 2,
              letterSpacing: "-0.01em",
            }}
          >
            Acesso rápido
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              p: 2,
              border: `1px solid ${GH.border}`,
              borderRadius: "6px",
              bgcolor: GH.canvas,
            }}
          >
            {quickLinks.map((link) => (
              <QuickLinkItem
                key={link.label}
                label={link.label}
                icon={link.icon}
                onClick={() => navigate(link.path)}
              />
            ))}
          </Box>
        </Grid>

        {/* PNAE Panel (expanded) */}
        <Grid item xs={12} md={6}>
          {pnae && (
            <>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: GH.text,
                  mb: 2,
                  letterSpacing: "-0.01em",
                }}
              >
                Conformidade PNAE
              </Typography>
              <Box
                sx={{
                  p: 3,
                  border: `1px solid ${GH.border}`,
                  borderRadius: "6px",
                  bgcolor: GH.canvas,
                }}
              >
                {/* Main metric */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 3 }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", color: GH.muted, mb: 0.5 }}>
                      Percentual de compras da agricultura familiar
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "2.25rem",
                        fontWeight: 600,
                        color: pnaeAtende ? GH.greenLt : GH.red,
                        letterSpacing: "-1px",
                        lineHeight: 1.1,
                      }}
                    >
                      {pnaePercent}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: pnaeAtende ? GH.greenLt : GH.red }} />
                      <Typography sx={{ fontSize: "0.75rem", color: GH.muted }}>
                        Mín: 45%
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        color: pnaeAtende ? GH.greenLt : GH.red,
                      }}
                    >
                      {pnaeAtende ? "Conforme" : "Não conforme"}
                    </Typography>
                  </Box>
                </Box>

                {/* Progress bar */}
                <LinearProgress
                  variant="determinate"
                  value={Math.min(parseFloat(pnaePercent) / 45 * 100, 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: GH.bg,
                    mb: 2,
                    "& .MuiLinearProgress-bar": {
                      bgcolor: pnaeAtende ? GH.greenLt : GH.red,
                      borderRadius: 4,
                      transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                    },
                  }}
                />

                <Divider sx={{ borderColor: GH.border, my: 2.5 }} />

                {/* Alertas */}
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: "0.68rem", color: GH.sub, textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.5 }}>
                      Total de contratos
                    </Typography>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: GH.text }}>
                      {pnae?.contratos?.total ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: "0.68rem", color: GH.sub, textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.5 }}>
                      Com agricultura familiar
                    </Typography>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: GH.greenLt }}>
                      {pnae?.contratos?.com_af ?? 0}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: "0.68rem", color: GH.sub, textTransform: "uppercase", letterSpacing: "0.5px", mb: 0.5 }}>
                      Alertas
                    </Typography>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 600, color: GH.orange }}>
                      {pnae?.alertas?.total_alertas ?? "—"}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  onClick={() => navigate("/pnae/dashboard")}
                  endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    mt: 2.5,
                    color: GH.muted,
                    borderColor: GH.borderMd,
                    fontSize: "0.78rem",
                    fontWeight: 400,
                    "&:hover": {
                      borderColor: GH.border,
                      bgcolor: "rgba(255,255,255,0.04)",
                      color: GH.text,
                    },
                  }}
                >
                  Ver detalhes do PNAE
                </Button>
              </Box>
            </>
          )}
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Dashboard;
