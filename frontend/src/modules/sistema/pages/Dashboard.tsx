import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ArrowForward as ArrowIcon,
  Assignment,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
  MenuBook as MenuBookIcon,
  People,
  Receipt as ReceiptIcon,
  Route as RouteIcon,
  School as SchoolIcon,
  Storage as StorageIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

import PageContainer from "../../../components/PageContainer";
import { useDashboardPNAE } from "../../../hooks/queries/usePnaeQueries";
import api from "../../../services/api";

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
  { label: "Rotas", path: "/gestao-rotas", icon: <RouteIcon sx={{ fontSize: 16 }} /> },
];

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [greeting, setGreeting] = useState("");
  const { data: pnae, isLoading: loadingPnae } = useDashboardPNAE();

  const tone = useMemo(() => ({
    panel: theme.palette.background.paper,
    panelAlt: alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.03 : 0.05),
    border: theme.palette.divider,
    borderStrong: alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.12 : 0.18),
    primaryTint: alpha(theme.palette.primary.main, 0.14),
    successTint: alpha(theme.palette.success.main, 0.16),
    warningTint: alpha(theme.palette.warning.main, 0.18),
    dangerTint: alpha(theme.palette.error.main, 0.16),
    shadow: theme.palette.mode === "light" ? "0 18px 40px rgba(31,36,48,0.08)" : "0 20px 48px rgba(0,0,0,0.22)",
  }), [theme]);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite");

    const token = localStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") return;

    api.get("/dashboard/stats")
      .then((response) => setStats(response.data.data))
      .catch((error) => console.error("[Dashboard] Erro ao carregar stats:", error));
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pnaePercentNumber = Number(pnae?.agricultura_familiar?.percentual_af ?? 0);
  const pnaePercent = pnae ? `${pnaePercentNumber.toFixed(1)}%` : "—";
  const pnaeAtende = pnae?.alertas?.atende_45_porcento ?? (pnaePercentNumber >= 45);
  const solicitacoesAtendidas = stats?.solicitacoes.atendidas ?? 0;
  const solicitacoesTotal = stats?.solicitacoes.total ?? 0;
  const solicitacoesPct = solicitacoesTotal > 0 ? ((solicitacoesAtendidas / solicitacoesTotal) * 100).toFixed(0) : "0";

  const StatCard = ({
    label,
    value,
    detail,
    icon,
    color,
    tint,
  }: {
    label: string;
    value: string | number;
    detail: string;
    icon: React.ReactNode;
    color: string;
    tint: string;
  }) => (
    <Box
      sx={{
        height: "100%",
        p: 3,
        borderRadius: "12px",
        border: `1px solid ${tone.border}`,
        backgroundColor: tone.panel,
        boxShadow: tone.shadow,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2.5 }}>
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </Typography>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tint,
            color,
          }}
        >
          {icon}
        </Box>
      </Box>
      <Typography sx={{ fontSize: "2.1rem", lineHeight: 1, letterSpacing: "-0.05em", fontWeight: 700, color: "text.primary", mb: 0.75 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{detail}</Typography>
    </Box>
  );

  return (
    <PageContainer sx={{ py: 3, px: { xs: 2, md: 3 }, display: "grid", gap: 3 }}>
      <Box
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: "18px",
          border: `1px solid ${tone.border}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${tone.panel} 42%, ${tone.panelAlt} 100%)`,
          boxShadow: tone.shadow,
        }}
      >
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1 }}>
          {today}
        </Typography>
        <Typography sx={{ fontSize: { xs: "1.8rem", md: "2.35rem" }, lineHeight: 1.05, letterSpacing: "-0.05em", fontWeight: 700, color: "text.primary", mb: 1 }}>
          {stats ? `${greeting}` : "Carregando..."}
        </Typography>
        <Typography sx={{ maxWidth: 620, color: "text.secondary", fontSize: "0.92rem", lineHeight: 1.6 }}>
          Visão rápida da operação escolar, compras e conformidade. O painel foi reorganizado para leitura mais direta e melhor contraste entre indicadores e ações.
        </Typography>
      </Box>

      {stats ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} xl={3}>
            <StatCard
              label="Escolas"
              value={`${stats.escolas.ativas}/${stats.escolas.total}`}
              detail="ativas"
              icon={<SchoolIcon sx={{ fontSize: 18 }} />}
              color={theme.palette.primary.main}
              tint={tone.primaryTint}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <StatCard
              label="Alunos"
              value={stats.alunos.toLocaleString("pt-BR")}
              detail="total cadastrado"
              icon={<People sx={{ fontSize: 18 }} />}
              color={theme.palette.info.main}
              tint={alpha(theme.palette.info.main, 0.16)}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <StatCard
              label="Solicitações"
              value={`${solicitacoesPct}%`}
              detail={`${solicitacoesAtendidas} de ${solicitacoesTotal} atendidas`}
              icon={<Assignment sx={{ fontSize: 18 }} />}
              color={theme.palette.warning.main}
              tint={tone.warningTint}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <Box
              sx={{
                height: "100%",
                p: 3,
                borderRadius: "12px",
                border: `1px solid ${tone.border}`,
                backgroundColor: tone.panel,
                boxShadow: tone.shadow,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5 }}>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  PNAE
                </Typography>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pnaeAtende ? tone.successTint : tone.warningTint,
                    color: pnaeAtende ? theme.palette.success.main : theme.palette.warning.main,
                  }}
                >
                  {loadingPnae ? <CircularProgress size={18} /> : pnaeAtende ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : <WarningIcon sx={{ fontSize: 18 }} />}
                </Box>
              </Box>
              <Typography sx={{ fontSize: "2.1rem", lineHeight: 1, letterSpacing: "-0.05em", fontWeight: 700, color: pnaeAtende ? "success.main" : "warning.main", mb: 1 }}>
                {pnaePercent}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min((pnaePercentNumber / 45) * 100, 100)}
                sx={{
                  height: 7,
                  borderRadius: 999,
                  mb: 1.5,
                  backgroundColor: alpha(theme.palette.text.primary, 0.08),
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    backgroundColor: pnaeAtende ? theme.palette.success.main : theme.palette.warning.main,
                  },
                }}
              />
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>Mínimo requerido: 45%</Typography>
            </Box>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((item) => (
            <Grid item xs={12} sm={6} xl={3} key={item}>
              <Box sx={{ height: 140, borderRadius: "12px", border: `1px solid ${tone.border}`, backgroundColor: tone.panel, boxShadow: tone.shadow }} />
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={5}>
          <Box
            sx={{
              p: 3,
              borderRadius: "14px",
              border: `1px solid ${tone.border}`,
              backgroundColor: tone.panel,
              boxShadow: tone.shadow,
              height: "100%",
            }}
          >
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", mb: 2 }}>
              Acesso rápido
            </Typography>
            <Box sx={{ display: "grid", gap: 1 }}>
              {quickLinks.map((link) => (
                <Button
                  key={link.label}
                  fullWidth
                  startIcon={link.icon}
                  endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                  onClick={() => navigate(link.path)}
                  sx={{
                    justifyContent: "space-between",
                    px: 1.6,
                    py: 1.2,
                    borderRadius: "8px",
                    color: "text.primary",
                    backgroundColor: tone.panelAlt,
                    border: `1px solid ${tone.border}`,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      borderColor: tone.borderStrong,
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} lg={7}>
          {pnae && (
            <Box
              sx={{
                p: 3,
                borderRadius: "14px",
                border: `1px solid ${tone.border}`,
                backgroundColor: tone.panel,
                boxShadow: tone.shadow,
                height: "100%",
              }}
            >
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", mb: 2 }}>
                Conformidade PNAE
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2, mb: 2.5 }}>
                <Box>
                  <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 0.5 }}>
                    Percentual de compras da agricultura familiar
                  </Typography>
                  <Typography sx={{ fontSize: { xs: "2.1rem", md: "2.5rem" }, lineHeight: 1, letterSpacing: "-0.05em", fontWeight: 700, color: pnaeAtende ? "success.main" : "error.main" }}>
                    {pnaePercent}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                  <Typography sx={{ fontSize: "0.76rem", color: "text.secondary", mb: 0.5 }}>Meta mínima: 45%</Typography>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: pnaeAtende ? "success.main" : "error.main" }}>
                    {pnaeAtende ? "Conforme" : "Não conforme"}
                  </Typography>
                </Box>
              </Box>

              <LinearProgress
                variant="determinate"
                value={Math.min((pnaePercentNumber / 45) * 100, 100)}
                sx={{
                  height: 9,
                  borderRadius: 999,
                  mb: 3,
                  backgroundColor: alpha(theme.palette.text.primary, 0.08),
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    backgroundColor: pnaeAtende ? theme.palette.success.main : theme.palette.error.main,
                  },
                }}
              />

              <Divider sx={{ borderColor: tone.border, my: 2.5 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>
                    Total de contratos
                  </Typography>
                  <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, color: "text.primary" }}>
                    {pnae?.contratos?.total ?? 0}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>
                    Com agricultura familiar
                  </Typography>
                  <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, color: "success.main" }}>
                    {pnae?.contratos?.com_af ?? 0}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>
                    Alertas
                  </Typography>
                  <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, color: "warning.main" }}>
                    {pnae?.alertas?.total_alertas ?? "—"}
                  </Typography>
                </Grid>
              </Grid>

              <Button
                variant="outlined"
                onClick={() => navigate("/pnae/dashboard")}
                endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                sx={{ mt: 3 }}
              >
                Ver detalhes do PNAE
              </Button>
            </Box>
          )}
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Dashboard;
