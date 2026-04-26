import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
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
import SearchRounded from "@mui/icons-material/SearchRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";

import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { useToast } from "../../../hooks/useToast";
import api from "../../../services/api";
import {
  listarEstoqueEscola,
  listarHistoricoEscola,
  registrarMovimentacao,
  type EstoqueEscolarItem,
  type EstoqueEscolarMovimentacao,
} from "../../../services/estoqueEscolarService";
import StockSummaryCards from "../components/StockSummaryCards";
import { StockActionPanel } from "../components/StockActionPanel";
import { StockMovementDialog } from "../components/StockMovementDialog";
import { StockTimeline } from "../components/StockTimeline";

type MovimentoModo = "entrada" | "saida" | "ajuste";

const dialogTitleByMode: Record<MovimentoModo, string> = {
  entrada: "Registrar entrada",
  saida: "Registrar saída",
  ajuste: "Registrar ajuste",
};

const formatarQuantidade = (qtd: number | string, unidade: string) =>
  `${Number(qtd).toLocaleString("pt-BR")} ${unidade}`;

export default function EstoqueEscolaPortal() {
  const toast = useToast();
  const [escola, setEscola] = useState<any>(null);
  const [escolaId, setEscolaId] = useState<number | null>(null);
  const [itens, setItens] = useState<EstoqueEscolarItem[]>([]);
  const [historicoItens, setHistoricoItens] = useState<EstoqueEscolarMovimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [selectedItem, setSelectedItem] = useState<EstoqueEscolarItem | null>(null);
  const [movOpen, setMovOpen] = useState(false);
  const [movMode, setMovMode] = useState<MovimentoModo>("entrada");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const carregarDadosEscola = async () => {
      try {
        setLoading(true);
        const response = await api.get("/escola-portal/dashboard");
        const escolaData = response.data.data.escola;
        setEscola(escolaData);
        setEscolaId(escolaData.id);
      } catch {
        toast.errorLoad("os dados da escola");
      } finally {
        setLoading(false);
      }
    };

    void carregarDadosEscola();
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
      toast.errorLoad("o estoque da escola");
      setItens([]);
      setHistoricoItens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (escolaId) {
      void carregarDados(escolaId);
    }
  }, [escolaId]);

  const categorias = useMemo(() => {
    const values = itens.map((item) => item.categoria).filter((value): value is string => Boolean(value));
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return itens.filter((item) => {
      const matchTermo =
        !termo ||
        item.produto_nome.toLowerCase().includes(termo) ||
        (item.categoria || "").toLowerCase().includes(termo);
      const matchCategoria = !categoriaFiltro || item.categoria === categoriaFiltro;
      return matchTermo && matchCategoria;
    });
  }, [itens, searchTerm, categoriaFiltro]);

  const abrirMovimentacao = (mode: MovimentoModo) => {
    if (!selectedItem) {
      toast.infoNoData("item selecionado");
      return;
    }

    setMovMode(mode);
    setMovOpen(true);
  };

  const salvarMovimentacao = async (payload: { quantidade: number; motivo: string; observacao?: string }) => {
    if (!selectedItem || !escolaId) {
      return;
    }

    try {
      setSaving(true);
      await registrarMovimentacao(escolaId, {
        produto_id: selectedItem.produto_id,
        tipo_movimentacao: movMode,
        quantidade: payload.quantidade,
        motivo: payload.motivo,
        observacoes: payload.observacao,
        origem: "portal_escola",
      });
      toast.successSave("Movimentação registrada.");
      setMovOpen(false);
      await carregarDados(escolaId);
    } catch (error: any) {
      toast.errorSave(error?.response?.data?.error || error?.message || "Erro ao registrar movimentação.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !escolaId) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!escolaId) {
    return (
      <PageContainer>
        <Alert severity="error">Não foi possível identificar a escola. Verifique suas permissões.</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Estoque da Escola"
        subtitle={escola?.nome || ""}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Portal Escola" },
          { label: "Estoque" },
        ]}
      />

      <Card sx={{ p: 3, mb: 3, borderRadius: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Buscar produto ou categoria..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={categoriaFiltro}
                label="Categoria"
                onChange={(event) => setCategoriaFiltro(event.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {categorias.map((categoria) => (
                  <MenuItem key={categoria} value={categoria}>
                    {categoria}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      <StockSummaryCards items={itens} titlePrefix="Itens da escola" />

      <StockActionPanel
        onEntrada={() => abrirMovimentacao("entrada")}
        onSaida={() => abrirMovimentacao("saida")}
        onAjuste={() => abrirMovimentacao("ajuste")}
        onHistorico={() => void carregarDados(escolaId)}
        disabled={!selectedItem}
        selectedLabel={selectedItem ? `${selectedItem.produto_nome} (${selectedItem.unidade})` : null}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} xl={8}>
          <Card sx={{ p: 2.5, borderRadius: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <div>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Controle local por produto
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecione o item que recebeu, consumiu ou ajustou antes de confirmar a movimentação.
                </Typography>
              </div>
              <Button variant="outlined" startIcon={<HistoryRounded />} onClick={() => void carregarDados(escolaId)}>
                Histórico
              </Button>
            </Box>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Unidade</TableCell>
                      <TableCell align="right">Quantidade</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itensFiltrados.map((item) => {
                      const isSelected = selectedItem?.produto_id === item.produto_id;
                      const semEstoque = Number(item.quantidade_atual) <= 0;
                      return (
                        <TableRow
                          key={item.produto_id}
                          hover
                          selected={isSelected}
                          onClick={() => setSelectedItem(item)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>
                              {item.produto_nome}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.categoria || "Sem categoria"}
                            </Typography>
                          </TableCell>
                          <TableCell>{item.unidade}</TableCell>
                          <TableCell align="right">{formatarQuantidade(item.quantidade_atual, item.unidade)}</TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={semEstoque ? "Sem estoque" : "Com saldo"}
                              color={semEstoque ? "default" : "success"}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!itensFiltrados.length ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography textAlign="center" color="text.secondary">
                            Nenhum item encontrado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} xl={4}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
            Últimas movimentações
          </Typography>
          <StockTimeline eventos={historicoItens} />
        </Grid>
      </Grid>

      <StockMovementDialog
        open={movOpen}
        mode={movMode}
        title={dialogTitleByMode[movMode]}
        produtoNome={selectedItem?.produto_nome}
        produtoId={selectedItem?.produto_id}
        unidade={selectedItem?.unidade || "UN"}
        saldoAtual={Number(selectedItem?.quantidade_atual || 0)}
        saving={saving}
        onClose={() => setMovOpen(false)}
        onSubmit={salvarMovimentacao}
      />
    </PageContainer>
  );
}
