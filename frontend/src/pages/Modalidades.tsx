import { useEffect, useState } from "react";
import {
  listarModalidades,
  criarModalidade,
  editarModalidade,
  removerModalidade,
  Modalidade,
} from "../services/modalidades";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  Chip,
  Tooltip,
  CardContent,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const modalidadeVazia = { nome: "", valor_repasse: 0 };

export default function Modalidades() {
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Modalidade | null>(null);
  const [form, setForm] = useState<any>(modalidadeVazia);
  const [removerId, setRemoverId] = useState<number | null>(null);
  const [removerDialog, setRemoverDialog] = useState(false);

  function atualizarLista() {
    setLoading(true);
    listarModalidades()
      .then(setModalidades)
      .catch(() => setErro("Erro ao carregar modalidades"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    atualizarLista();
  }, []);

  function abrirModal(modalidade?: Modalidade) {
    setEditando(modalidade || null);
    setForm(modalidade ? { ...modalidade } : modalidadeVazia);
    setOpen(true);
  }

  function fecharModal() {
    setOpen(false);
    setEditando(null);
    setForm(modalidadeVazia);
  }

  async function salvar() {
    try {
      if (editando) {
        await editarModalidade(editando.id, form);
      } else {
        await criarModalidade(form);
      }
      fecharModal();
      atualizarLista();
    } catch {
      setErro("Erro ao salvar modalidade");
    }
  }

  function confirmarRemover(id: number) {
    setRemoverId(id);
    setRemoverDialog(true);
  }

  async function remover() {
    if (removerId) {
      try {
        await removerModalidade(removerId);
        setRemoverDialog(false);
        setRemoverId(null);
        atualizarLista();
      } catch {
        setErro("Erro ao remover modalidade");
      }
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1f2937' }}>
          Modalidades
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => abrirModal()}
          sx={{ px: 3, py: 1 }}
        >
          Nova Modalidade
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : erro ? (
            <Box sx={{ p: 3 }}>
              <Alert severity="error">{erro}</Alert>
            </Box>
          ) : modalidades.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Nenhuma modalidade encontrada
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Clique em "Nova Modalidade" para adicionar a primeira modalidade
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Nome da Modalidade</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#374151' }}>Valor Repasse</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#374151' }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: '#374151' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modalidades.map((modalidade) => (
                    <TableRow key={modalidade.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {modalidade.nome}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ID: {modalidade.id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`R$ ${(parseFloat(modalidade.valor_repasse) || 0).toFixed(2)}`}
                          sx={{
                            bgcolor: '#dcfce7',
                            color: '#166534',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={modalidade.ativo ? 'Ativo' : 'Inativo'}
                          color={modalidade.ativo ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Editar modalidade">
                            <IconButton
                              onClick={() => abrirModal(modalidade)}
                              sx={{
                                bgcolor: '#fef3c7',
                                color: '#d97706',
                                '&:hover': { bgcolor: '#fde68a' },
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir modalidade">
                            <IconButton
                              onClick={() => confirmarRemover(modalidade.id)}
                              sx={{
                                bgcolor: '#fecaca',
                                color: '#dc2626',
                                '&:hover': { bgcolor: '#fca5a5' },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Paper>

      {/* Modal de cadastro/edição */}
      <Dialog open={open} onClose={fecharModal} maxWidth="xs" fullWidth>
        <DialogTitle>
          {editando ? "Editar Modalidade" : "Adicionar Modalidade"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Valor do Repasse"
            type="number"
            value={form.valor_repasse}
            onChange={(e) => setForm({ ...form, valor_repasse: parseFloat(e.target.value) || 0 })}
            fullWidth
            margin="normal"
            inputProps={{ 
              step: "0.01", 
              min: "0" 
            }}
            helperText="Valor em reais para compra de alimentos"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharModal}>Cancelar</Button>
          <Button onClick={salvar} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmação de remoção */}
      <Dialog open={removerDialog} onClose={() => setRemoverDialog(false)}>
        <DialogTitle>Remover Modalidade</DialogTitle>
        <DialogContent>
          Tem certeza que deseja remover esta modalidade?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoverDialog(false)}>Cancelar</Button>
          <Button onClick={remover} color="error" variant="contained">
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
