import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CalendarMonth as CalendarMonthIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  Save as SaveIcon,
  Straighten as StraightenIcon,
  Tune as TuneIcon,
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import StatusIndicator from "../../../components/StatusIndicator";
import { guiaService } from "../../../services/guiaService";
import { useToast } from "../../../hooks/useToast";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import { useUnidadesMedida } from "../../../hooks/queries/useUnidadesMedidaQueries";
import { formatarQuantidade, toNum } from "../../../utils/formatters";
import {
  applyBulkQuantityAdjustment,
  buildChangedItemUpdates,
  normalizeDateKey,
  summarizeQuantityChange,
  type BulkQuantityMode,
  type GuiaProdutoAjusteRow,
} from "../utils/guiaProdutoAjuste";

type BulkDialog = "date" | "unit" | "quantity" | null;

const statusLabel = (status?: string) => ({
  pendente: "Disponivel p/ Entrega",
  programada: "Aguardando Estoque",
  parcial: "Entrega Parcial",
  entregue: "Ja Entregue",
  cancelado: "Cancelado",
}[status || ""] || status || "-");

function formatDateLabel(value?: string | null) {
  const key = normalizeDateKey(value);
  if (!key) return "Sem data";
  return new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR");
}

export default function GuiaDemandaProdutoItens() {
  const navigate = useNavigate();
  const { guiaId, produtoId } = useParams<{ guiaId: string; produtoId: string }>();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { setPageTitle, setBackPath } = usePageTitle();
  const { data: unidadesMedida } = useUnidadesMedida();

  const dataFiltro = normalizeDateKey(searchParams.get("data_entrega"));
  const backPath = `/guias-demanda/${guiaId}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [erro, setErro] = useState("");
  const [guia, setGuia] = useState<any>(null);
  const [rows, setRows] = useState<GuiaProdutoAjusteRow[]>([]);
  const [originalRows, setOriginalRows] = useState<GuiaProdutoAjusteRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<BulkDialog>(null);
  const [bulkDate, setBulkDate] = useState("");
  const [bulkUnit, setBulkUnit] = useState("");
  const [bulkQuantityMode, setBulkQuantityMode] = useState<BulkQuantityMode>("set");
  const [bulkQuantityValue, setBulkQuantityValue] = useState("");
  const [bulkRoundMultiple, setBulkRoundMultiple] = useState("");

  useEffect(() => {
    setBackPath(backPath);
    return () => setBackPath(null);
  }, [backPath, setBackPath]);

  useEffect(() => {
    setPageTitle("Ajuste por Produto");
  }, [setPageTitle]);

  useEffect(() => {
    if (guiaId && produtoId) {
      carregar();
    }
  }, [guiaId, produtoId, dataFiltro]);

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const [guiaData, itensResponse] = await Promise.all([
        guiaService.buscarGuia(Number(guiaId)),
        guiaService.listarProdutosGuia(Number(guiaId)),
      ]);
      const rawItens = itensResponse?.data ?? itensResponse ?? [];
      const filtrados = rawItens
        .filter((item: any) => Number(item.produto_id) === Number(produtoId))
        .filter((item: any) => normalizeDateKey(item.data_entrega) === dataFiltro)
        .map((item: any) => ({
          id: Number(item.id),
          produto_id: Number(item.produto_id),
          produto_nome: item.produto_nome || "Produto",
          escola_id: Number(item.escola_id),
          escola_nome: item.escola_nome || "Escola",
          quantidade: Number(item.quantidade) || 0,
          quantidade_demanda: Number(item.quantidade_demanda ?? item.quantidade) || 0,
          unidade: item.unidade || item.produto_unidade || "UN",
          data_entrega: normalizeDateKey(item.data_entrega),
          status: item.status || "pendente",
        }))
        .sort((a: GuiaProdutoAjusteRow, b: GuiaProdutoAjusteRow) => a.escola_nome.localeCompare(b.escola_nome));

      setGuia(guiaData);
      setRows(filtrados);
      setOriginalRows(filtrados.map((row: GuiaProdutoAjusteRow) => ({ ...row })));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Erro ao carregar itens do produto:", error);
      setErro("Nao foi possivel carregar os itens deste produto.");
    } finally {
      setLoading(false);
    }
  }

  const produtoNome = rows[0]?.produto_nome || "Produto";
  const unidadeFallbacks = useMemo(() => {
    const codigos = new Set(rows.map(row => row.unidade).filter(Boolean));
    return Array.from(codigos).filter(codigo => !unidadesMedida?.some(un => un.codigo === codigo));
  }, [rows, unidadesMedida]);

  const updates = useMemo(() => buildChangedItemUpdates(rows, originalRows), [rows, originalRows]);
  const selectedRows = useMemo(() => rows.filter(row => selectedIds.has(row.id)), [rows, selectedIds]);
  const quantityPreviewRows = useMemo(() => {
    if (bulkDialog !== "quantity") return rows;
    return applyBulkQuantityAdjustment(rows, selectedIds, {
      mode: bulkQuantityMode,
      value: toNum(bulkQuantityValue),
      roundMultiple: bulkRoundMultiple ? toNum(bulkRoundMultiple) : null,
    });
  }, [bulkDialog, rows, selectedIds, bulkQuantityMode, bulkQuantityValue, bulkRoundMultiple]);
  const quantityPreview = useMemo(
    () => summarizeQuantityChange(selectedRows, quantityPreviewRows.filter(row => selectedIds.has(row.id))),
    [selectedRows, quantityPreviewRows, selectedIds],
  );

  function updateRow(id: number, patch: Partial<GuiaProdutoAjusteRow>) {
    setRows(prev => prev.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function toggleSelected(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(prev => prev.size === rows.length ? new Set() : new Set(rows.map(row => row.id)));
  }

  function openBulkDialog(type: BulkDialog) {
    if (selectedIds.size === 0) return;
    setBulkDialog(type);
    setBulkDate("");
    setBulkUnit("");
    setBulkQuantityMode("set");
    setBulkQuantityValue("");
    setBulkRoundMultiple("");
  }

  function applyBulkDialog() {
    if (bulkDialog === "date") {
      setRows(prev => prev.map(row => selectedIds.has(row.id) ? { ...row, data_entrega: bulkDate || null } : row));
    }
    if (bulkDialog === "unit") {
      setRows(prev => prev.map(row => selectedIds.has(row.id) ? { ...row, unidade: bulkUnit } : row));
    }
    if (bulkDialog === "quantity") {
      setRows(quantityPreviewRows);
    }
    setBulkDialog(null);
  }

  async function salvar() {
    if (!updates.length) return;
    setSaving(true);
    try {
      await Promise.all(updates.map(update => guiaService.atualizarProdutoEscola(update.itemId, update.payload)));
      toast.success(`${updates.length} item(ns) atualizado(s) com sucesso.`);
      setOriginalRows(rows.map(row => ({ ...row })));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Erro ao salvar ajustes do produto:", error);
      toast.error("Nao foi possivel salvar os ajustes.");
    } finally {
      setSaving(false);
    }
  }

  async function excluirSelecionadas() {
    const idsParaExcluir = Array.from(selectedIds);
    if (!idsParaExcluir.length) return;

    if (!window.confirm(`Deseja realmente excluir ${idsParaExcluir.length} item(ns) selecionado(s)?`)) {
      return;
    }

    setDeleting(true);
    try {
      await Promise.all(idsParaExcluir.map(id => guiaService.removerItemGuia(id)));
      const removidos = new Set(idsParaExcluir);
      setRows(prev => prev.filter(row => !removidos.has(row.id)));
      setOriginalRows(prev => prev.filter(row => !removidos.has(row.id)));
      setSelectedIds(new Set());
      toast.success(`${idsParaExcluir.length} item(ns) excluido(s) com sucesso.`);
    } catch (error) {
      console.error("Erro ao excluir itens selecionados:", error);
      toast.error("Nao foi possivel excluir os itens selecionados.");
    } finally {
      setDeleting(false);
    }
  }

  const totalAtual = rows.reduce((sum, row) => sum + (Number(row.quantidade) || 0), 0);
  const totalDemanda = rows.reduce((sum, row) => sum + (Number(row.quantidade_demanda) || 0), 0);
  const diffTotal = totalAtual - totalDemanda;

  if (loading) {
    return <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;
  }

  return (
    <PageContainer fullHeight>
      <PageHeader
        title={`Ajuste por Produto - ${produtoNome}`}
        subtitle={`${rows.length} item(ns) - ${formatDateLabel(dataFiltro)}${guia ? ` - ${guia.mes}/${guia.ano}` : ""}`}
        onBack={() => navigate(backPath)}
        breadcrumbs={[
          { label: "Guias de Demanda", path: "/guias-demanda" },
          { label: "Guia", path: backPath },
          { label: "Ajuste por Produto" },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={salvar}
            disabled={saving || deleting || updates.length === 0}
          >
            Salvar {updates.length > 0 ? `(${updates.length})` : ""}
          </Button>
        }
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip icon={<InventoryIcon />} label={`Total: ${formatarQuantidade(totalAtual)}`} size="small" />
          <Chip label={`Demanda calculada: ${formatarQuantidade(totalDemanda)}`} size="small" variant="outlined" />
          {Math.abs(diffTotal) > 0.0005 && (
            <Chip
              label={`Diferenca: ${diffTotal > 0 ? "+" : ""}${formatarQuantidade(diffTotal)}`}
              size="small"
              color={diffTotal > 0 ? "success" : "error"}
            />
          )}
        </Box>
      </PageHeader>

      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}
      {saving && <LinearProgress sx={{ mb: 1 }} />}

      <Box sx={{
        mb: 1,
        p: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexWrap: "wrap",
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          {selectedIds.size} escola(s) selecionada(s)
        </Typography>
        <Button size="small" startIcon={<CalendarMonthIcon />} disabled={!selectedIds.size || deleting} onClick={() => openBulkDialog("date")}>
          Alterar data
        </Button>
        <Button size="small" startIcon={<StraightenIcon />} disabled={!selectedIds.size || deleting} onClick={() => openBulkDialog("unit")}>
          Alterar unidade
        </Button>
        <Button size="small" startIcon={<TuneIcon />} disabled={!selectedIds.size || deleting} onClick={() => openBulkDialog("quantity")}>
          Ajustar quantidade
        </Button>
        <Button
          size="small"
          color="error"
          startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          disabled={!selectedIds.size || saving || deleting}
          onClick={excluirSelecionadas}
        >
          {deleting ? "Excluindo..." : "Excluir selecionadas"}
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
        <Table stickyHeader size="small" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={rows.length > 0 && selectedIds.size === rows.length}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < rows.length}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell>Escola</TableCell>
              <TableCell align="right">Quantidade a Entregar</TableCell>
              <TableCell align="right">Demanda Calculada</TableCell>
              <TableCell align="center">Diferenca</TableCell>
              <TableCell>Unidade</TableCell>
              <TableCell>Data de Entrega</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => {
              const diff = (Number(row.quantidade) || 0) - (Number(row.quantidade_demanda) || 0);
              return (
                <TableRow key={row.id} hover selected={selectedIds.has(row.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedIds.has(row.id)} onChange={() => toggleSelected(row.id)} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 240, fontWeight: 600 }}>{row.escola_nome}</TableCell>
                  <TableCell align="right" sx={{ width: 180 }}>
                    <TextField
                      type="number"
                      size="small"
                      value={row.quantidade}
                      onChange={event => updateRow(row.id, { quantidade: toNum(event.target.value) })}
                      inputProps={{ min: 0, step: 0.001, style: { textAlign: "right" } }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                    {formatarQuantidade(row.quantidade_demanda)} {row.unidade}
                  </TableCell>
                  <TableCell align="center">
                    {Math.abs(diff) > 0.0005 ? (
                      <Chip
                        label={`${diff > 0 ? "+" : ""}${formatarQuantidade(diff)}`}
                        size="small"
                        color={diff > 0 ? "success" : "error"}
                      />
                    ) : (
                      <Typography variant="caption" color="text.disabled">-</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ width: 150 }}>
                    <FormControl size="small" fullWidth>
                      <Select value={row.unidade} onChange={event => updateRow(row.id, { unidade: event.target.value })}>
                        {unidadesMedida?.map(unidade => (
                          <MenuItem key={unidade.id} value={unidade.codigo}>{unidade.codigo}</MenuItem>
                        ))}
                        {unidadeFallbacks.map(codigo => (
                          <MenuItem key={codigo} value={codigo}>{codigo}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ width: 180 }}>
                    <TextField
                      type="date"
                      size="small"
                      value={normalizeDateKey(row.data_entrega) || ""}
                      onChange={event => updateRow(row.id, { data_entrega: event.target.value || null })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={row.status || ""}>
                      <StatusIndicator status={row.status || ''} text={statusLabel(row.status)} size="small" />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={!!bulkDialog} onClose={() => setBulkDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {bulkDialog === "date" && "Alterar data das escolas selecionadas"}
          {bulkDialog === "unit" && "Alterar unidade das escolas selecionadas"}
          {bulkDialog === "quantity" && "Ajustar quantidade das escolas selecionadas"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Alert severity="info">
              A alteracao sera aplicada em {selectedIds.size} escola(s) selecionada(s). Revise a tabela e clique em Salvar para gravar.
            </Alert>

            {bulkDialog === "date" && (
              <TextField
                label="Nova data de entrega"
                type="date"
                value={bulkDate}
                onChange={event => setBulkDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            )}

            {bulkDialog === "unit" && (
              <FormControl fullWidth>
                <InputLabel>Nova unidade</InputLabel>
                <Select value={bulkUnit} label="Nova unidade" onChange={event => setBulkUnit(event.target.value)}>
                  {unidadesMedida?.map(unidade => (
                    <MenuItem key={unidade.id} value={unidade.codigo}>{unidade.codigo} - {unidade.nome}</MenuItem>
                  ))}
                  {unidadeFallbacks.map(codigo => (
                    <MenuItem key={codigo} value={codigo}>{codigo}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {bulkDialog === "quantity" && (
              <>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Tipo de ajuste</InputLabel>
                    <Select value={bulkQuantityMode} label="Tipo de ajuste" onChange={event => setBulkQuantityMode(event.target.value as BulkQuantityMode)}>
                      <MenuItem value="set">Definir quantidade fixa</MenuItem>
                      <MenuItem value="add">Somar / subtrair quantidade</MenuItem>
                      <MenuItem value="percent">Aumentar / reduzir percentual</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label={bulkQuantityMode === "percent" ? "Percentual" : "Quantidade"}
                    type="number"
                    value={bulkQuantityValue}
                    onChange={event => setBulkQuantityValue(event.target.value)}
                    sx={{ width: 160 }}
                  />
                </Box>
                <TextField
                  label="Arredondar por multiplo da embalagem"
                  type="number"
                  value={bulkRoundMultiple}
                  onChange={event => setBulkRoundMultiple(event.target.value)}
                  helperText="Opcional. Ex: 5 arredonda para multiplos de 5."
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Chip label={`Antes: ${formatarQuantidade(quantityPreview.before)}`} />
                  <Chip label={`Depois: ${formatarQuantidade(quantityPreview.after)}`} color="primary" />
                  {Math.abs(quantityPreview.diff) > 0.0005 && (
                    <Chip
                      label={`Diferenca: ${quantityPreview.diff > 0 ? "+" : ""}${formatarQuantidade(quantityPreview.diff)}`}
                      color={quantityPreview.diff > 0 ? "success" : "error"}
                    />
                  )}
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialog(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={applyBulkDialog}
            disabled={
              (bulkDialog === "date" && !bulkDate) ||
              (bulkDialog === "unit" && !bulkUnit) ||
              (bulkDialog === "quantity" && bulkQuantityValue === "")
            }
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
