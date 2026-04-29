import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  FormControl,
  InputAdornment,
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
import RemoveCircleOutlineRounded from "@mui/icons-material/RemoveCircleOutlineRounded";
import RuleFolderRounded from "@mui/icons-material/RuleFolderRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";

import PageContainer from "../../../components/PageContainer";
import { useToast } from "../../../hooks/useToast";
import { listarEscolas } from "../../../services/escolas";
import {
  listarEstoqueEscola,
  listarHistoricoEscola,
  registrarMovimentacao,
  type EstoqueEscolarItem,
  type EstoqueEscolarMovimentacao,
} from "../../../services/estoqueEscolarService";
import {
  REALTIME_BROWSER_EVENT,
  RealtimeEvent,
  shouldRefreshForRealtimeEvent,
} from "../../../services/realtime";
import {
  CategoryPill,
  CompactActionButton,
  CompactMetricsStrip,
  DotStatus,
  type CompactMetric,
} from "../components/CompactStockLayout";
import { StockMovementDialog } from "../components/StockMovementDialog";

type MovimentoModo = "entrada" | "saida" | "ajuste";

const dialogTitleByMode: Record<MovimentoModo, string> = {
  entrada: "Registrar entrada",
  saida: "Registrar saida",
  ajuste: "Ajuste de estoque",
};

const actionStyles: Record<MovimentoModo, object> = {
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
};

const compactSelectSx = {
  minWidth: 210,
  fontSize: 13,
  backgroundColor: "background.paper",
  borderRadius: "6px",
  "& .MuiSelect-select": {
    py: "6px",
    px: "10px",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    border: "0.5px solid",
    borderColor: "divider",
  },
};

const toolbarControlSx = {
  fontSize: 13,
  backgroundColor: "background.default",
  borderRadius: "6px",
  "& .MuiSelect-select": {
    py: "6px",
    px: "10px",
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    "& fieldset": {
      border: "0.5px solid",
      borderColor: "action.selected",
    },
    "&.Mui-focused fieldset": {
      borderColor: "primary.main",
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    border: "0.5px solid",
    borderColor: "action.selected",
  },
};

const formatarQuantidade = (qtd: number | string, unidade: string) =>
  `${Number(qtd).toLocaleString("pt-BR")} ${unidade}`;

const obterStatusEscolar = (item: EstoqueEscolarItem) => {
  const quantidade = Number(item.quantidade_atual);
  const minimo = Number(item.quantidade_minima || 0);

  if (quantidade <= minimo * 0.5) {
    return { label: "Critico", tone: "error" as const };
  }

  if (quantidade < minimo) {
    return { label: "Baixo", tone: "warning" as const };
  }

  return { label: "Normal", tone: "success" as const };
};

const EstoqueEscolar: React.FC = () => {
  const toast = useToast();
  const [escolas, setEscolas] = useState<Array<{ id: number; nome: string }>>([]);
  const [escolaId, setEscolaId] = useState<number | "">("");
  const [itens, setItens] = useState<EstoqueEscolarItem[]>([]);
  const [, setHistoricoItens] = useState<EstoqueEscolarMovimentacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [selectedItem, setSelectedItem] = useState<EstoqueEscolarItem | null>(null);
  const [movOpen, setMovOpen] = useState(false);
  const [movMode, setMovMode] = useState<MovimentoModo>("entrada");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listarEscolas()
      .then((data) => setEscolas(data ?? []))
      .catch(() => toast.errorLoad("as escolas"));
  }, []);

  const carregarDados = async (id: number) => {
    try {
      setLoading(true);
      const [estoque, historico] = await Promise.all([
        listarEstoqueEscola(id),
        listarHistoricoEscola(id, 8),
      ]);
      setItens(estoque);
      setHistoricoItens(historico);
    } catch {
      toast.errorLoad("o estoque escolar");
      setItens([]);
      setHistoricoItens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!escolaId) {
      setItens([]);
      setHistoricoItens([]);
      setSelectedItem(null);
      return;
    }

    void carregarDados(Number(escolaId));
  }, [escolaId]);

  useEffect(() => {
    if (!escolaId) {
      return;
    }

    const handleRealtime = (event: Event) => {
      const realtimeEvent = (event as CustomEvent<RealtimeEvent>).detail;
      if (shouldRefreshForRealtimeEvent(realtimeEvent, {
        domains: ["estoque_escolar"],
        escolaId: Number(escolaId),
      })) {
        void carregarDados(Number(escolaId));
      }
    };

    window.addEventListener(REALTIME_BROWSER_EVENT, handleRealtime);
    return () => window.removeEventListener(REALTIME_BROWSER_EVENT, handleRealtime);
  }, [escolaId]);

  const categorias = useMemo(() => {
    const base = ["Alimentos", "Higiene", "Limpeza"];
    const values = itens
      .map((item) => item.categoria)
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...base, ...values])).sort((a, b) => a.localeCompare(b));
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return itens.filter((item) => {
      const matchTermo = !termo || item.produto_nome.toLowerCase().includes(termo);
      const matchCategoria = !categoriaFiltro || item.categoria === categoriaFiltro;
      return matchTermo && matchCategoria;
    });
  }, [itens, searchTerm, categoriaFiltro]);

  const metricas = useMemo<CompactMetric[]>(() => {
    const baixos = itens.filter((item) => obterStatusEscolar(item).label === "Baixo").length;
    const criticos = itens.filter((item) => obterStatusEscolar(item).label === "Critico").length;
    const disponiveis = itens.filter((item) => Number(item.quantidade_atual) > 0).length;

    return [
      { label: "Total de itens", value: itens.length },
      { label: "Disponiveis", value: disponiveis },
      { label: "Estoque baixo", value: baixos, tone: "warning" },
      { label: "Critico", value: criticos, tone: "error" },
    ];
  }, [itens]);

  const selecionarLinha = (item: EstoqueEscolarItem) => {
    setSelectedItem((current) =>
      current?.produto_id === item.produto_id ? null : item,
    );
  };

  const abrirMovimentacao = (mode: MovimentoModo) => {
    if (!selectedItem) {
      return;
    }

    setMovMode(mode);
    setMovOpen(true);
  };

  const salvarMovimentacao = async (payload: {
    quantidade: number;
    motivo: string;
    observacao?: string;
  }) => {
    if (!selectedItem || !escolaId) {
      return;
    }

    try {
      setSaving(true);
      await registrarMovimentacao(Number(escolaId), {
        produto_id: selectedItem.produto_id,
        tipo_movimentacao: movMode,
        quantidade: payload.quantidade,
        motivo: payload.motivo,
        observacoes: payload.observacao,
        origem: "central_operador",
      });
      toast.successSave("Movimentacao registrada.");
      setMovOpen(false);
      await carregarDados(Number(escolaId));
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
            Estoque Escolar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: "2px" }}>
            Movimentacao e controle por unidade
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            Unidade
          </Typography>
          <FormControl size="small">
            <Select
              value={escolaId}
              displayEmpty
              onChange={(event) => setEscolaId(event.target.value as number)}
              sx={compactSelectSx}
            >
              <MenuItem value="">Selecione</MenuItem>
              {escolas.map((escola) => (
                <MenuItem key={escola.id} value={escola.id}>
                  {escola.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
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
          flexShrink: 0,
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
            placeholder="Buscar item..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            sx={{
              flex: 1,
              minWidth: 140,
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
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ fontSize: 14, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={categoriaFiltro}
              displayEmpty
              onChange={(event) => setCategoriaFiltro(event.target.value)}
              sx={toolbarControlSx}
            >
              <MenuItem value="">Todas as categorias</MenuItem>
              {categorias.map((categoria) => (
                <MenuItem key={categoria} value={categoria}>
                  {categoria}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
            disabled={!selectedItem}
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
            ⇄ Ajuste
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

        <Box
          sx={{
            overflowX: "auto",
            borderBottomLeftRadius: "10px",
            borderBottomRightRadius: "10px",
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Box}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["Item", "Categoria", "Quantidade", "Minimo", "Status"].map(
                      (column) => (
                        <TableCell
                          key={column}
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
                      ),
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itensFiltrados.map((item, index) => {
                    const isSelected = selectedItem?.produto_id === item.produto_id;
                    const status = obterStatusEscolar(item);
                    const isLast = index === itensFiltrados.length - 1;

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
                        </TableCell>
                        <TableCell>
                          <CategoryPill label={item.categoria || "Sem categoria"} />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontVariantNumeric: "tabular-nums",
                            fontSize: 13,
                          }}
                        >
                          {formatarQuantidade(item.quantidade_atual, item.unidade)}
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", fontSize: 13 }}>
                          {formatarQuantidade(item.quantidade_minima || 0, item.unidade)}
                        </TableCell>
                        <TableCell>
                          <DotStatus label={status.label} tone={status.tone} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!itensFiltrados.length ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ borderBottom: 0 }}>
                        <Typography
                          textAlign="center"
                          color="text.secondary"
                          sx={{ py: 4, fontSize: 13 }}
                        >
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
        unidade={selectedItem?.unidade || "UN"}
        saldoAtual={Number(selectedItem?.quantidade_atual || 0)}
        saving={saving}
        requireMotivo={false}
        confirmColor={
          movMode === "entrada" ? "#185FA5" : movMode === "saida" ? "#A32D2D" : "#854F0B"
        }
        onClose={() => setMovOpen(false)}
        onSubmit={salvarMovimentacao}
      />
    </PageContainer>
  );
};

export default EstoqueEscolar;
