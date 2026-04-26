import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import {
  AssignmentTurnedIn,
  CalendarMonth,
  Description,
  LocalShipping,
  RequestPage,
  Route,
} from "@mui/icons-material";

import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import { guiaService } from "../../../services/guiaService";
import pedidosService from "../../../services/pedidos";
import { entregaService } from "../../entregas/services/entregaService";
import {
  ABASTECIMENTO_FLOW_STEPS,
  getAbastecimentoStatus,
} from "../status";

type GuiaResumo = {
  guia_id: number;
  mes: number;
  ano: number;
  guia_nome?: string;
  guia_status?: string;
  total_itens?: number;
  total_escolas?: number;
  qtd_pendente?: number;
  qtd_entregue?: number;
};

type PedidoResumo = {
  id: number;
  numero: string;
  status?: string;
  valor_total?: number;
  total_itens?: number;
  data_pedido?: string;
};

type EntregaResumo = {
  total_escolas: number;
  total_itens: number;
  itens_entregues: number;
  itens_pendentes: number;
  percentual_entregue: number;
};

const initialEntregaResumo: EntregaResumo = {
  total_escolas: 0,
  total_itens: 0,
  itens_entregues: 0,
  itens_pendentes: 0,
  percentual_entregue: 0,
};

const metricIcons = [
  <AssignmentTurnedIn fontSize="small" />,
  <RequestPage fontSize="small" />,
  <LocalShipping fontSize="small" />,
  <Description fontSize="small" />,
];

function formatCurrency(value: number | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string | undefined) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function Abastecimento() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { setPageTitle } = usePageTitle();

  const [guias, setGuias] = useState<GuiaResumo[]>([]);
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [entregas, setEntregas] = useState<EntregaResumo>(initialEntregaResumo);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setPageTitle("Abastecimento");
  }, [setPageTitle]);

  useEffect(() => {
    let active = true;

    async function carregarResumo() {
      setLoading(true);
      const nextErrors: string[] = [];

      const [guiasResult, pedidosResult, entregasResult] = await Promise.allSettled([
        guiaService.listarCompetencias(),
        pedidosService.listar({ limit: 5 }),
        entregaService.obterEstatisticas(),
      ]);

      if (!active) return;

      if (guiasResult.status === "fulfilled") {
        setGuias(Array.isArray(guiasResult.value) ? guiasResult.value.slice(0, 5) : []);
      } else {
        nextErrors.push("Nao foi possivel carregar guias.");
        setGuias([]);
      }

      if (pedidosResult.status === "fulfilled") {
        const data = (pedidosResult.value as any)?.data || pedidosResult.value;
        setPedidos(Array.isArray(data) ? data.slice(0, 5) : []);
      } else {
        nextErrors.push("Nao foi possivel carregar pedidos.");
        setPedidos([]);
      }

      if (entregasResult.status === "fulfilled") {
        setEntregas({ ...initialEntregaResumo, ...entregasResult.value });
      } else {
        nextErrors.push("Nao foi possivel carregar entregas.");
        setEntregas(initialEntregaResumo);
      }

      setErrors(nextErrors);
      setLoading(false);
    }

    carregarResumo();

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(
    () => [
      {
        label: "Guias recentes",
        value: guias.length,
        detail: `${guias.reduce((sum, guia) => sum + Number(guia.total_itens || 0), 0)} itens`,
      },
      {
        label: "Pedidos recentes",
        value: pedidos.length,
        detail: formatCurrency(pedidos.reduce((sum, pedido) => sum + Number(pedido.valor_total || 0), 0)),
      },
      {
        label: "Itens pendentes",
        value: entregas.itens_pendentes,
        detail: `${entregas.itens_entregues} entregues`,
      },
      {
        label: "Progresso entrega",
        value: `${Math.round(Number(entregas.percentual_entregue || 0))}%`,
        detail: `${entregas.total_escolas} escolas`,
      },
    ],
    [entregas, guias, pedidos],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Abastecimento"
        subtitle="Ciclo operacional de demanda, guia, compra, programacao e entrega"
        action={
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate("/guias-demanda")}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Gerar guia de demanda
          </Button>
        }
      />

      <Paper
        sx={{
          mb: 2,
          border: `0.5px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: { xs: "wrap", lg: "nowrap" } }}>
          {metrics.map((metric, index) => (
            <Box
              key={metric.label}
              sx={{
                flex: "1 1 190px",
                p: 2,
                borderRight: {
                  xs: "none",
                  lg: index === metrics.length - 1 ? "none" : `0.5px solid ${theme.palette.divider}`,
                },
                borderBottom: {
                  xs: index < metrics.length - 1 ? `0.5px solid ${theme.palette.divider}` : "none",
                  lg: "none",
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ color: "text.secondary", mb: 0.75 }}>
                <Box sx={{ display: "flex", color: "primary.main" }}>{metricIcons[index]}</Box>
                <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {metric.label}
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 25, fontWeight: 600, lineHeight: 1.1 }}>
                {metric.value}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>
                {metric.detail}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {errors.length > 0 && (
        <Paper
          sx={{
            mb: 2,
            p: 1.5,
            border: `0.5px solid ${alpha(theme.palette.warning.main, 0.35)}`,
            bgcolor: alpha(theme.palette.warning.main, 0.08),
          }}
        >
          <Typography sx={{ fontSize: 13, color: "warning.dark" }}>
            Dados parciais: {errors.join(" ")}
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1.25fr 0.75fr" }, gap: 2 }}>
        <Stack spacing={2}>
          <Paper
            sx={{
              border: `0.5px solid ${theme.palette.divider}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2, borderBottom: `0.5px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>Fluxo operacional</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                Use os atalhos na ordem do processo ou volte para uma etapa anterior quando precisar ajustar.
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
              {ABASTECIMENTO_FLOW_STEPS.map((step, index) => (
                <Box
                  key={step.id}
                  sx={{
                    p: 2,
                    borderRight: {
                      md: index % 2 === 0 ? `0.5px solid ${theme.palette.divider}` : "none",
                    },
                    borderBottom:
                      index < ABASTECIMENTO_FLOW_STEPS.length - 2
                        ? `0.5px solid ${theme.palette.divider}`
                        : { xs: `0.5px solid ${theme.palette.divider}`, md: "none" },
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={1.25}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: "primary.main",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{step.title}</Typography>
                      <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.4, minHeight: 36 }}>
                        {step.description}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(step.path)}
                        sx={{ mt: 1.25, textTransform: "none", fontSize: 12.5 }}
                      >
                        Abrir etapa
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Box>
          </Paper>

          <Paper
            sx={{
              border: `0.5px solid ${theme.palette.divider}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <ListHeader
              title="Guias recentes"
              actionLabel="Ver guias"
              onAction={() => navigate("/guias-demanda")}
            />
            {loading ? (
              <LoadingRow />
            ) : guias.length === 0 ? (
              <EmptyRow text="Nenhuma guia encontrada." />
            ) : (
              guias.map((guia, index) => {
                const status = getAbastecimentoStatus("guia", guia.guia_status);
                return (
                  <Box key={`${guia.guia_id}-${index}`}>
                    {index > 0 && <Divider />}
                    <ListRow
                      title={guia.guia_nome || `Guia ${String(guia.mes).padStart(2, "0")}/${guia.ano}`}
                      subtitle={`${Number(guia.total_escolas || 0)} escolas | ${Number(guia.total_itens || 0)} itens`}
                      chip={<Chip label={status.label} color={status.color as any} size="small" variant="outlined" />}
                      onClick={() => navigate(`/guias-demanda/${guia.guia_id}`)}
                    />
                  </Box>
                );
              })
            )}
          </Paper>
        </Stack>

        <Stack spacing={2}>
          <Paper
            sx={{
              border: `0.5px solid ${theme.palette.divider}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <ListHeader
              title="Pedidos recentes"
              actionLabel="Ver pedidos"
              onAction={() => navigate("/compras")}
            />
            {loading ? (
              <LoadingRow />
            ) : pedidos.length === 0 ? (
              <EmptyRow text="Nenhum pedido encontrado." />
            ) : (
              pedidos.map((pedido, index) => {
                const status = getAbastecimentoStatus("pedido", pedido.status);
                return (
                  <Box key={pedido.id}>
                    {index > 0 && <Divider />}
                    <ListRow
                      title={pedido.numero}
                      subtitle={`${formatDate(pedido.data_pedido)} | ${formatCurrency(pedido.valor_total)}`}
                      chip={<Chip label={status.label} color={status.color as any} size="small" variant="outlined" />}
                      onClick={() => navigate(`/compras/${pedido.id}`)}
                    />
                  </Box>
                );
              })
            )}
          </Paper>

          <Paper
            sx={{
              border: `0.5px solid ${theme.palette.divider}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2, borderBottom: `0.5px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>Atalhos operacionais</Typography>
            </Box>
            <Stack spacing={1} sx={{ p: 1.5 }}>
              <ShortcutButton icon={<CalendarMonth />} label="Gerar guia de demanda" onClick={() => navigate("/guias-demanda")} />
              <ShortcutButton icon={<RequestPage />} label="Gerar compra da guia" onClick={() => navigate("/compras")} />
              <ShortcutButton icon={<LocalShipping />} label="Executar entregas" onClick={() => navigate("/entregas")} />
              <ShortcutButton icon={<Route />} label="Organizar rotas" onClick={() => navigate("/gestao-rotas")} />
              <ShortcutButton icon={<Description />} label="Consultar comprovantes" onClick={() => navigate("/comprovantes-entrega")} />
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </PageContainer>
  );
}

function ListHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "0.5px solid",
        borderColor: "divider",
        gap: 1,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{title}</Typography>
      <Button size="small" onClick={onAction} sx={{ textTransform: "none", fontSize: 12.5 }}>
        {actionLabel}
      </Button>
    </Box>
  );
}

function ListRow({
  title,
  subtitle,
  chip,
  onClick,
}: {
  title: string;
  subtitle: string;
  chip: ReactNode;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        cursor: "pointer",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
          {subtitle}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0 }}>{chip}</Box>
    </Box>
  );
}

function LoadingRow() {
  return (
    <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
      <CircularProgress size={16} />
      <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Carregando...</Typography>
    </Box>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Box sx={{ p: 2 }}>
      <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{text}</Typography>
    </Box>
  );
}

function ShortcutButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      fullWidth
      variant="outlined"
      startIcon={icon}
      onClick={onClick}
      sx={{
        justifyContent: "flex-start",
        textTransform: "none",
        borderColor: "divider",
        color: "text.primary",
        py: 1,
      }}
    >
      {label}
    </Button>
  );
}
