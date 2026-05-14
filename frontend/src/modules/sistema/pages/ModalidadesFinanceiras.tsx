import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { useToast } from "../../../hooks/useToast";
import {
  CategoriaFinanceiraModalidade,
  CategoriaFinanceiraModalidadeInput,
} from "../../../services/modalidades";
import {
  useCategoriasFinanceirasModalidade,
  useCreateCategoriaFinanceiraModalidade,
  useCreateOrigemRepasse,
  useDeleteCategoriaFinanceiraModalidade,
  useOrigensRepasse,
  useUpdateCategoriaFinanceiraModalidade,
} from "../../../hooks/queries/useModalidadeQueries";

const emptyForm: CategoriaFinanceiraModalidadeInput = {
  nome: "",
  codigo_financeiro: "",
  valor_repasse: 0,
  parcelas: 1,
  origem_repasse_id: null,
  ativo: true,
};

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0);

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }

  return fallback;
};

export default function ModalidadesFinanceirasPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: modalidades = [], isLoading } = useCategoriasFinanceirasModalidade();
  const { data: origens = [] } = useOrigensRepasse();
  const createMutation = useCreateCategoriaFinanceiraModalidade();
  const updateMutation = useUpdateCategoriaFinanceiraModalidade();
  const deleteMutation = useDeleteCategoriaFinanceiraModalidade();
  const createOrigemMutation = useCreateOrigemRepasse();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [origemModalOpen, setOrigemModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoriaFinanceiraModalidade | null>(null);
  const [deleting, setDeleting] = useState<CategoriaFinanceiraModalidade | null>(null);
  const [formData, setFormData] = useState<CategoriaFinanceiraModalidadeInput>(emptyForm);
  const [origemNome, setOrigemNome] = useState("");

  const sortedModalidades = useMemo(
    () => [...modalidades].sort((a, b) => a.nome.localeCompare(b.nome)),
    [modalidades],
  );

  const openModal = (modalidade?: CategoriaFinanceiraModalidade) => {
    if (modalidade) {
      setEditing(modalidade);
      setFormData({
        nome: modalidade.nome,
        codigo_financeiro: modalidade.codigo_financeiro || "",
        valor_repasse: Number(modalidade.valor_repasse) || 0,
        parcelas: Number(modalidade.parcelas) || 1,
        origem_repasse_id: modalidade.origem_repasse_id || null,
        ativo: modalidade.ativo,
      });
    } else {
      setEditing(null);
      setFormData(emptyForm);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.toast.warning("Informe o nome da modalidade financeira");
      return;
    }

    const payload = {
      ...formData,
      nome: formData.nome.trim(),
      valor_repasse: Number(formData.valor_repasse) || 0,
      parcelas: Number(formData.parcelas) || 1,
      origem_repasse_id: formData.origem_repasse_id || null,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        toast.toast.success("Modalidade financeira atualizada");
      } else {
        await createMutation.mutateAsync(payload);
        toast.toast.success("Modalidade financeira criada");
      }
      setModalOpen(false);
    } catch (error: unknown) {
      toast.toast.error(getApiErrorMessage(error, "Erro ao salvar modalidade financeira"));
    }
  };

  const handleSaveOrigem = async () => {
    if (!origemNome.trim()) {
      toast.toast.warning("Informe o nome da origem");
      return;
    }

    try {
      const origem = await createOrigemMutation.mutateAsync({ nome: origemNome.trim() });
      setFormData((prev) => ({ ...prev, origem_repasse_id: origem.id }));
      setOrigemNome("");
      setOrigemModalOpen(false);
      toast.toast.success("Origem criada");
    } catch (error: unknown) {
      toast.toast.error(getApiErrorMessage(error, "Erro ao criar origem"));
    }
  };

  const openDelete = (modalidade: CategoriaFinanceiraModalidade) => {
    setDeleting(modalidade);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;

    try {
      await deleteMutation.mutateAsync(deleting.id);
      setDeleteOpen(false);
      setDeleting(null);
      toast.toast.success("Modalidade financeira removida");
    } catch (error: unknown) {
      toast.toast.error(getApiErrorMessage(error, "Erro ao remover modalidade financeira"));
    }
  };

  return (
    <PageContainer>
      <PageHeader
        onBack={() => navigate("/modalidades")}
        backLabel="Voltar para modalidades pedagogicas"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Cadastros" },
          { label: "Modalidades Financeiras" },
        ]}
        title="Modalidades Financeiras"
        subtitle="Cadastre repasses, origem do recurso, parcelas e códigos usados no faturamento."
        action={
          <Button variant="contained" color="add" startIcon={<AddIcon />} onClick={() => openModal()}>
            Nova Modalidade Financeira
          </Button>
        }
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Use esta tela para FNDE, PAE, SEDUC Estado e outras fontes financeiras. A tela de modalidades pedagogicas fica apenas para etapas de ensino.
      </Alert>

      <Card>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Origem</TableCell>
                  <TableCell>Codigo</TableCell>
                  <TableCell align="right">Repasse</TableCell>
                  <TableCell align="center">Parcelas</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Acoes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedModalidades.map((modalidade) => (
                  <TableRow key={modalidade.id} hover>
                    <TableCell>{modalidade.nome}</TableCell>
                    <TableCell>
                      <Chip size="small" label={modalidade.origem_repasse_nome || "Nao definida"} variant="outlined" />
                    </TableCell>
                    <TableCell>{modalidade.codigo_financeiro || "-"}</TableCell>
                    <TableCell align="right">{formatCurrency(modalidade.valor_repasse)}</TableCell>
                    <TableCell align="center">{Number(modalidade.parcelas) || 1}x</TableCell>
                    <TableCell>{modalidade.ativo ? "Ativa" : "Inativa"}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton size="small" color="edit" onClick={() => openModal(modalidade)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remover">
                        <IconButton size="small" color="error" onClick={() => openDelete(modalidade)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Editar Modalidade Financeira" : "Nova Modalidade Financeira"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Nome"
                fullWidth
                required
                value={formData.nome}
                onChange={(event) => setFormData({ ...formData, nome: event.target.value })}
                placeholder="Ex: Medio Estado"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Origem do repasse</InputLabel>
                  <Select
                    label="Origem do repasse"
                    value={formData.origem_repasse_id || ""}
                    onChange={(event) => setFormData({ ...formData, origem_repasse_id: Number(event.target.value) || null })}
                  >
                    <MenuItem value="">Nao definida</MenuItem>
                    {origens.map((origem) => (
                      <MenuItem key={origem.id} value={origem.id}>
                        {origem.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="outlined" color="add" onClick={() => setOrigemModalOpen(true)} sx={{ minWidth: 130 }}>
                  Nova origem
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Codigo financeiro"
                fullWidth
                value={formData.codigo_financeiro || ""}
                onChange={(event) => setFormData({ ...formData, codigo_financeiro: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Valor do repasse"
                type="number"
                fullWidth
                value={formData.valor_repasse}
                onChange={(event) => setFormData({ ...formData, valor_repasse: Number(event.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Parcelas"
                type="number"
                fullWidth
                value={formData.parcelas || 1}
                onChange={(event) => setFormData({ ...formData, parcelas: Number(event.target.value) || 1 })}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Switch
                  checked={formData.ativo}
                  onChange={(event) => setFormData({ ...formData, ativo: event.target.checked })}
                />
                <Typography>Ativa</Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="add" startIcon={<SaveIcon />} onClick={handleSave}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={origemModalOpen} onClose={() => setOrigemModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nova Origem do Repasse</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome da origem"
            fullWidth
            required
            value={origemNome}
            onChange={(event) => setOrigemNome(event.target.value)}
            sx={{ mt: 1 }}
            placeholder="Ex: Recurso Municipal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrigemModalOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="add" onClick={handleSaveOrigem}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Remover Modalidade Financeira</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Remover "{deleting?.nome}" vai desativar esta modalidade financeira e retirar seus vinculos pedagogicos ativos. Historicos permanecem preservados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>

      <LoadingOverlay
        open={isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || createOrigemMutation.isPending}
        message="Carregando modalidades financeiras..."
      />
    </PageContainer>
  );
}
