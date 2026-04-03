import React, { useState, useEffect } from "react";
import {
  Box, Button, Card, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Switch, FormControlLabel
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon
} from "@mui/icons-material";
import { useToast } from "../../../hooks/useToast";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import PageContainer from "../../../components/PageContainer";
import {
  listarTiposRefeicao,
  criarTipoRefeicao,
  atualizarTipoRefeicao,
  deletarTipoRefeicao,
  TipoRefeicao,
  formatarHorario
} from "../../../services/tiposRefeicao";

const TiposRefeicaoPage: React.FC = () => {
  const toast = useToast();
  const { setPageTitle } = usePageTitle();

  const [tipos, setTipos] = useState<TipoRefeicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState<TipoRefeicao | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    chave: '',
    horario: '',
    ordem: 0,
    ativo: true
  });

  useEffect(() => {
    setPageTitle('Tipos de Refeição');
    loadTipos();
  }, []);

  const loadTipos = async () => {
    try {
      setLoading(true);
      const data = await listarTiposRefeicao();
      setTipos(data);
    } catch (err) {
      toast.error('Erro ao carregar tipos de refeição');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tipo?: TipoRefeicao) => {
    if (tipo) {
      setEditando(tipo);
      setFormData({
        nome: tipo.nome,
        chave: tipo.chave,
        horario: tipo.horario.substring(0, 5), // HH:MM
        ordem: tipo.ordem,
        ativo: tipo.ativo
      });
    } else {
      setEditando(null);
      setFormData({
        nome: '',
        chave: '',
        horario: '',
        ordem: tipos.length + 1,
        ativo: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditando(null);
    setFormData({
      nome: '',
      chave: '',
      horario: '',
      ordem: 0,
      ativo: true
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.nome || !formData.chave || !formData.horario) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      // Validar formato do horário
      if (!/^\d{2}:\d{2}$/.test(formData.horario)) {
        toast.error('Horário inválido. Use o formato HH:MM');
        return;
      }

      const horarioCompleto = `${formData.horario}:00`;

      if (editando) {
        await atualizarTipoRefeicao(editando.id, {
          ...formData,
          horario: horarioCompleto
        });
        toast.success('Tipo de refeição atualizado!');
      } else {
        await criarTipoRefeicao({
          nome: formData.nome,
          chave: formData.chave,
          horario: horarioCompleto,
          ordem: formData.ordem
        });
        toast.success('Tipo de refeição criado!');
      }

      handleCloseDialog();
      loadTipos();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar tipo de refeição');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir este tipo de refeição?')) {
      return;
    }

    try {
      await deletarTipoRefeicao(id);
      toast.success('Tipo de refeição excluído!');
      loadTipos();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir tipo de refeição');
    }
  };

  const handleToggleAtivo = async (tipo: TipoRefeicao) => {
    try {
      await atualizarTipoRefeicao(tipo.id, { ativo: !tipo.ativo });
      toast.success(`Tipo de refeição ${!tipo.ativo ? 'ativado' : 'desativado'}!`);
      loadTipos();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const gerarChave = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  return (
    <PageContainer>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Tipos de Refeição</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Novo Tipo
        </Button>
      </Box>

      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Chave</TableCell>
                <TableCell>Horário</TableCell>
                <TableCell align="center">Ordem</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tipos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary">
                      Nenhum tipo de refeição cadastrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon fontSize="small" color="action" />
                        {tipo.nome}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={tipo.chave} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{formatarHorario(tipo.horario)}</TableCell>
                    <TableCell align="center">{tipo.ordem}</TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={tipo.ativo}
                        onChange={() => handleToggleAtivo(tipo)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(tipo)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(tipo.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editando ? 'Editar Tipo de Refeição' : 'Novo Tipo de Refeição'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome"
              fullWidth
              required
              value={formData.nome}
              onChange={(e) => {
                const nome = e.target.value;
                setFormData({ 
                  ...formData, 
                  nome,
                  chave: formData.chave || gerarChave(nome)
                });
              }}
              placeholder="Ex: Desjejum"
            />

            <TextField
              label="Chave"
              fullWidth
              required
              value={formData.chave}
              onChange={(e) => setFormData({ ...formData, chave: e.target.value })}
              placeholder="Ex: desjejum"
              helperText="Identificador único (sem espaços ou caracteres especiais)"
            />

            <TextField
              label="Horário"
              type="time"
              fullWidth
              required
              value={formData.horario}
              onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
            />

            <TextField
              label="Ordem"
              type="number"
              fullWidth
              value={formData.ordem}
              onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
              helperText="Define a ordem de exibição"
            />

            {editando && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  />
                }
                label="Ativo"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editando ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default TiposRefeicaoPage;
