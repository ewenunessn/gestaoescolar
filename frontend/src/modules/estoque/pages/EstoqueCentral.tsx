import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineRounded from "@mui/icons-material/AddCircleOutlineRounded";
import CompareArrowsRounded from "@mui/icons-material/CompareArrowsRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import RemoveCircleOutlineRounded from "@mui/icons-material/RemoveCircleOutlineRounded";
import RuleFolderRounded from "@mui/icons-material/RuleFolderRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";

import PageContainer from "../../../components/PageContainer";
import { useRealtimeRefresh } from "../../../hooks/useRealtimeRefresh";
import { useToast } from "../../../hooks/useToast";
import { listarEscolas } from "../../../services/escolas";
import {
  getAlertas,
  listarMovimentacoesCentral,
  listarPosicaoCentral,
  registrarAjusteCentral,
  registrarEntradaCentral,
  registrarSaidaCentral,
  registrarTransferencia,
  type AlertaEstoque,
  type EstoquePosicao,
  type TimelineEventoEstoque,
} from "../../../services/estoqueCentralService";
import {
  CompactActionButton,
  CompactMetricsStrip,
  DotStatus,
  type CompactMetric,
} from "../components/CompactStockLayout";
import { StockMovementDialog } from "../components/StockMovementDialog";

type MovimentoModo = "entrada" | "saida" | "ajuste" | "transferencia";

const dialogTitleByMode: Record<Exclude<MovimentoModo, "transferencia">, string> = {
  entrada: "Registrar entrada",
  saida: "Registrar saida",
  ajuste: "Ajuste de estoque",
};

const actionStyles = {
  entrada: {
    borderColor: "#B5D4F4",
    color: "#185FA5",
    "&:hover": { borderColor: "#B5D4F4", backgroundColor: "#E6F1FB" },
  },
  saida: {
    borderColor: "#F7C1C1",
    color: "#A32D2D",
    "&:hover": { borderColor: "#F7C1C1", backgroundColor: "#FCEBEB" },
  },
  ajuste: {
    borderColor: "#FAC775",
    color: "#854F0B",
    "&:hover": { borderColor: "#FAC775", backgroundColor: "#FAEEDA" },
  },
  transferir: {
    borderColor: "#C9D2DC",
    color: "text.primary",
    "&:hover": { borderColor: "#C9D2DC", backgroundColor: "action.hover" },
  },
};

const toolbarControlSx = {
  flex: 1,
  minWidth: 160,
  backgroundColor: "background.default",
  borderRadius: "6px",
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: 13,
    "& fieldset": {
      border: "0.5px solid",
      borderColor: "action.selected",
    },
    "&.Mui-focused": {
      backgroundColor: "background.paper",
    },
    "&.Mui-focused fieldset": {
      borderColor: "primary.main",
    },
  },
  "& .MuiInputBase-input": {
    py: "7px",
  },
};

const formatarQuantidade = (qtd: number | string, unidade: string) =>
  `${Number(qtd).toLocaleString("pt-BR")} ${unidade}`;

const obterStatusCentral = (item: EstoquePosicao) => {
  if (Number(item.quantidade_disponivel) <= 0) {
    return { label: "Sem saldo", tone: "error" as const };
  }

  if (Number(item.quantidade_vencida) > 0) {
    return { label: "Vencido", tone: "error" as const };
  }

  if (Number(item.quantidade_reservada) > 0) {
    return { label: "Reservado", tone: "warning" as const };
  }

  return { label: "Normal", tone: "success" as const };
};

const EstoqueCentralPage: React.FC = () => {
  const toast = useToast();
  const [posicoes, setPosicoes] = useState<EstoquePosicao[]>([]);
  const [, setMovimentacoes] = useState<TimelineEventoEstoque[]>([]);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [escolas, setEscolas] = useState<Array<{ id: number; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<EstoquePosicao | null>(null);
  const [movOpen, setMovOpen] = useState(false);
  const [movMode, setMovMode] = useState<Exclude<MovimentoModo, "transferencia">>("entrada");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    escola_id: "",
    quantidade: "",
    motivo: "",
    observacao: "",
  });

  const carregarDados = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [posicoesResult, movimentacoesResult, alertasResult, escolasResult] =
        await Promise.allSettled([
          listarPosicaoCentral(true),
          listarMovimentacoesCentral(10),
          getAlertas(true),
          listarEscolas(),
        ]);

      if (posicoesResult.status === "fulfilled") {
        setPosicoes(posicoesResult.value);
      } else {
        setPosicoes([]);
        toast.errorLoad("a posicao do estoque central");
      }

      setMovimentacoes(
        movimentacoesResult.status === "fulfilled" ? movimentacoesResult.value : [],
      );
      setAlertas(alertasResult.status === "fulfilled" ? alertasResult.value : []);
      setEscolas(escolasResult.status === "fulfilled" ? escolasResult.value ?? [] : []);
    } catch {
      toast.errorLoad("o estoque central");
      setPosicoes([]);
      setMovimentacoes([]);
      setAlertas([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void carregarDados();
  }, []);

  useRealtimeRefresh({
    domains: ["estoque_central"],
    onRefresh: () => void carregarDados(false),
  });

  const posicoesFiltradas = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return posicoes.filter((item) => {
      if (!termo) {
        return true;
      }

      return (
        item.produto_nome.toLowerCase().includes(termo) ||
        item.produto_unidade.toLowerCase().includes(termo)
      );
    });
  }, [posicoes, searchTerm]);

  const metricas = useMemo<CompactMetric[]>(() => {
    const disponiveis = posicoes.filter((item) => Number(item.quantidade_disponivel) > 0).length;
    const semSaldo = posicoes.filter((item) => Number(item.quantidade_disponivel) <= 0).length;
    const reservados = posicoes.filter((item) => Number(item.quantidade_reservada) > 0).length;

    return [
      { label: "Total de itens", value: posicoes.length },
      { label: "Disponiveis", value: disponiveis },
      { label: "Reservados", value: reservados, tone: "warning" },
      { label: "Alertas", value: alertas.length + semSaldo, tone: "error" },
    ];
  }, [alertas.length, posicoes]);

  const selecionarLinha = (item: EstoquePosicao) => {
    setSelectedItem((current) =>
      current?.produto_id === item.produto_id ? null : item,
    );
  };

  const abrirMovimentacao = (mode: Exclude<MovimentoModo, "transferencia">) => {
    if (!selectedItem) {
      return;
    }

    setMovMode(mode);
    setMovOpen(true);
  };

  const abrirTransferencia = () => {
    if (!selectedItem) {
      return;
    }

    setTransferForm({
      escola_id: "",
      quantidade: "",
      motivo: "",
      observacao: "",
    });
    setTransferOpen(true);
  };

  const salvarMovimentacao = async (payload: {
    quantidade: number;
    motivo: string;
    observacao?: string;
  }) => {
    if (!selectedItem) {
      return;
    }

    try {
      setSaving(true);

      if (movMode === "entrada") {
        await registrarEntradaCentral({
          produto_id: selectedItem.produto_id,
          quantidade: payload.quantidade,
          motivo: payload.motivo,
          observacao: payload.observacao,
        });
      } else if (movMode === "saida") {
        await registrarSaidaCentral({
          produto_id: selectedItem.produto_id,
          quantidade: payload.quantidade,
          motivo: payload.motivo,
          observacao: payload.observacao,
        });
      } else {
        await registrarAjusteCentral({
          produto_id: selectedItem.produto_id,
          quantidade_nova: payload.quantidade,
          motivo: payload.motivo,
          observacao: payload.observacao,
        });
      }

      toast.successSave("Movimentacao registrada.");
      setMovOpen(false);
      await carregarDados();
    } catch (error: any) {
      toast.errorSave(
        error?.response?.data?.error ||
          error?.message ||
          "Erro ao registrar movimentacao.",
      );
    } finally {
      setSaving(false);
    }
  };

  const salvarTransferencia = async () => {
    if (!selectedItem) {
      return;
    }

    if (!transferForm.escola_id || !transferForm.quantidade || !transferForm.motivo.trim()) {
      toast.warningRequired("Escola, quantidade e motivo");
      return;
    }

    try {
      setSaving(true);
      await registrarTransferencia({
        escola_id: Number(transferForm.escola_id),
        produto_id: selectedItem.produto_id,
        quantidade: Number(transferForm.quantidade),
        motivo: transferForm.motivo.trim(),
        observacao: transferForm.observacao.trim() || undefined,
      });
      toast.successSave("Transferencia registrada.");
      setTransferOpen(false);
      await carregarDados();
    } catch (error: any) {
      toast.errorSave(
        error?.response?.data?.error ||
          error?.message ||
          "Erro ao registrar transferencia.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saldoProjetadoTransferencia =
    Number(selectedItem?.quantidade_disponivel || 0) - Number(transferForm.quantidade || 0);

  return (
    <PageContainer>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: "28px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 500, fontSize: 20, color: "text.primary" }}
          >
            Estoque Central
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: "2px" }}>
            Recebimento, saida, ajuste e transferencia
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshRounded />}
          onClick={() => void carregarDados()}
          sx={{
            borderRadius: "6px",
            fontSize: 13,
            fontWeight: 500,
            px: "13px",
            py: "6px",
            textTransform: "none",
          }}
        >
          Atualizar
        </Button>
      </Box>

      <CompactMetricsStrip metrics={metricas} />

      <Paper
        sx={{
          position: "sticky",
          top: "calc(var(--app-top-offset, 68px) + 8px)",
          zIndex: (theme) => theme.zIndex.appBar + 2,
          mb: 1.5,
          border: "0.5px solid",
          borderColor: "divider",
          borderRadius: "10px",
          overflow: "visible",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 10px 24px rgba(0, 0, 0, 0.36)"
              : "0 10px 24px rgba(15, 23, 42, 0.08)",
          backgroundColor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: "10px 14px",
            backgroundColor: "background.paper",
            borderRadius: "10px",
            flexWrap: "wrap",
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar produto ou unidade..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            sx={toolbarControlSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ fontSize: 14, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
          />

          <CompactActionButton
            startIcon={<AddCircleOutlineRounded />}
            disabled={!selectedItem}
            onClick={() => abrirMovimentacao("entrada")}
            sx={actionStyles.entrada}
          >
            + Entrada
          </CompactActionButton>
          <CompactActionButton
            startIcon={<RemoveCircleOutlineRounded />}
            disabled={!selectedItem || Number(selectedItem.quantidade_disponivel) <= 0}
            onClick={() => abrirMovimentacao("saida")}
            sx={actionStyles.saida}
          >
            - Saida
          </CompactActionButton>
          <CompactActionButton
            startIcon={<RuleFolderRounded />}
            disabled={!selectedItem}
            onClick={() => abrirMovimentacao("ajuste")}
            sx={actionStyles.ajuste}
          >
            Ajuste
          </CompactActionButton>
          <CompactActionButton
            startIcon={<CompareArrowsRounded />}
            disabled={!selectedItem || Number(selectedItem.quantidade_disponivel) <= 0}
            onClick={abrirTransferencia}
            sx={actionStyles.transferir}
          >
            Transferir
          </CompactActionButton>
        </Box>
      </Paper>

      <Paper
        sx={{
          border: "0.5px solid",
          borderColor: "divider",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "none",
          backgroundColor: "background.paper",
        }}
      >
        <Box sx={{ overflowX: "auto", borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Box}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["Item", "Disponivel", "Reservado", "Total", "Status"].map((column) => (
                      <TableCell
                        key={column}
                        align={column === "Item" || column === "Status" ? "left" : "right"}
                        sx={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "text.secondary",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          p: "9px 16px",
                          backgroundColor: "background.default",
                          borderBottom: "0.5px solid",
                          borderColor: "divider",
                        }}
                      >
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {posicoesFiltradas.map((item, index) => {
                    const isSelected = selectedItem?.produto_id === item.produto_id;
                    const status = obterStatusCentral(item);
                    const isLast = index === posicoesFiltradas.length - 1;

                    return (
                      <TableRow
                        key={item.produto_id}
                        hover
                        selected={isSelected}
                        onClick={() => selecionarLinha(item)}
                        sx={(theme) => {
                          const selectedBg =
                            theme.palette.mode === "dark"
                              ? "rgba(24, 95, 165, 0.32)"
                              : "#E6F1FB";
                          const hoverBg =
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.06)"
                              : theme.palette.background.default;

                          return {
                            cursor: "pointer",
                            backgroundColor: isSelected ? selectedBg : "inherit",
                            "&:hover": {
                              backgroundColor: isSelected ? selectedBg : hoverBg,
                            },
                            "&.Mui-selected, &.Mui-selected:hover": {
                              backgroundColor: selectedBg,
                            },
                            "& td": {
                              p: "10px 16px",
                              borderBottom: isLast ? 0 : "0.5px solid",
                              borderColor: "divider",
                            },
                          };
                        }}
                      >
                        <TableCell>
                          <Typography sx={{ fontWeight: 500, fontSize: 13 }}>
                            {item.produto_nome}
                          </Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: 11 }}>
                            Unidade: {item.produto_unidade}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
                          {formatarQuantidade(item.quantidade_disponivel, item.produto_unidade)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "text.secondary", fontSize: 13 }}>
                          {formatarQuantidade(item.quantidade_reservada, item.produto_unidade)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "text.secondary", fontSize: 13 }}>
                          {formatarQuantidade(item.quantidade_total, item.produto_unidade)}
                        </TableCell>
                        <TableCell>
                          <DotStatus label={status.label} tone={status.tone} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!posicoesFiltradas.length ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ borderBottom: 0 }}>
                        <Typography textAlign="center" color="text.secondary" sx={{ py: 4, fontSize: 13 }}>
                          Nenhum item encontrado.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      <StockMovementDialog
        open={movOpen}
        mode={movMode}
        title={dialogTitleByMode[movMode]}
        produtoNome={selectedItem?.produto_nome}
        produtoId={selectedItem?.produto_id}
        unidade={selectedItem?.produto_unidade || "UN"}
        saldoAtual={Number(selectedItem?.quantidade_disponivel || 0)}
        saving={saving}
        confirmColor={
          movMode === "entrada" ? "#185FA5" : movMode === "saida" ? "#A32D2D" : "#854F0B"
        }
        onClose={() => setMovOpen(false)}
        onSubmit={salvarMovimentacao}
      />

      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transferir para escola</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gap: 2, pt: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {selectedItem?.produto_nome || "Produto selecionado"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Saldo atual:{" "}
                {formatarQuantidade(
                  selectedItem?.quantidade_disponivel || 0,
                  selectedItem?.produto_unidade || "UN",
                )}
              </Typography>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Escola destino</InputLabel>
              <Select
                value={transferForm.escola_id}
                label="Escola destino"
                onChange={(event) =>
                  setTransferForm((current) => ({
                    ...current,
                    escola_id: String(event.target.value),
                  }))
                }
              >
                {escolas.map((escola) => (
                  <MenuItem key={escola.id} value={String(escola.id)}>
                    {escola.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Quantidade"
              type="number"
              value={transferForm.quantidade}
              onChange={(event) =>
                setTransferForm((current) => ({ ...current, quantidade: event.target.value }))
              }
              inputProps={{ min: 0, step: 0.001 }}
            />
            <TextField
              label="Motivo"
              value={transferForm.motivo}
              onChange={(event) =>
                setTransferForm((current) => ({ ...current, motivo: event.target.value }))
              }
            />
            <TextField
              label="Observacao"
              value={transferForm.observacao}
              onChange={(event) =>
                setTransferForm((current) => ({ ...current, observacao: event.target.value }))
              }
              multiline
              minRows={2}
            />
            <Box
              sx={{
                borderRadius: 3,
                p: 2,
                border: "1px solid rgba(15,76,129,0.12)",
                background:
                  "linear-gradient(135deg, rgba(15,76,129,0.08) 0%, rgba(255,255,255,0.96) 100%)",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Saldo antes:{" "}
                {formatarQuantidade(
                  selectedItem?.quantidade_disponivel || 0,
                  selectedItem?.produto_unidade || "UN",
                )}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
                Saldo depois:{" "}
                {formatarQuantidade(
                  saldoProjetadoTransferencia,
                  selectedItem?.produto_unidade || "UN",
                )}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void salvarTransferencia()} disabled={saving}>
            {saving ? "Gravando..." : "Confirmar transferencia"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EstoqueCentralPage;
