import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, Grid, IconButton, InputLabel, MenuItem, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Chip, Paper
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CalendarMonth as CalendarIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import PageHeader from '../components/PageHeader';
import { useNotification } from '../context/NotificationContext';
import {
  listarCardapiosModalidade, criarCardapioModalidade, editarCardapioModalidade,
  removerCardapioModalidade, CardapioModalidade, MESES
} from '../services/cardapiosModalidade';
import { listarModalidades } from '../services/modalidadeService';
import { useNavigate } from 'react-router-dom';

const CardapiosModalidadePage: React.FC = () => {
  const [cardapios, setCardapios] = useState<CardapioModalidade[]>([]);
  const [modalidades, setModalidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    modalidade_id: '',
    nome: '',
    mes: '',
    ano: new Date().getFullYear().toString(),
    observacao: '',
    ativo: true
  });
  
  const { success, error } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardapiosData, modalidadesData] = await Promise.all([
        listarCardapiosModalidade(),
        listarModalidades()
      ]);
      setCardapios(cardapiosData);
      setModalidades(modalidadesData);
    } catch (err) {
      error('Erro ao carregar cardápios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (cardapio?: CardapioModalidade) => {
    if (cardapio) {
      setEditMode(true);
      setSelectedId(cardapio.id);
      setFormData({
        modalidade_id: cardapio.modalidade_id.toString(),
        nome: cardapio.nome,
        mes: cardapio.mes.toString(),
        ano: cardapio.ano.toString(),
        observacao: cardapio.observacao || '',
        ativo: cardapio.ativo
      });
    } else {
      setEditMode(false);
      setSelectedId(null);
      setFormData({
        modalidade_id: '',
        nome: '',
        mes: '',
        ano: new Date().getFullYear().toString(),
        observacao: '',
        ativo: true
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.modalidade_id || !formData.nome || !formData.mes || !formData.ano) {
        error('Preencha todos os campos obrigatórios');
        return;
      }

      const data = {
        modalidade_id: parseInt(formData.modalidade_id),
        nome: formData.nome,
        mes: parseInt(formData.mes),
        ano: parseInt(formData.ano),
        observacao: formData.observacao || undefined,
        ativo: formData.ativo
      };

      if (editMode && selectedId) {
        await editarCardapioModalidade(selectedId, data);
        success('Cardápio atualizado!');
      } else {
        await criarCardapioModalidade(data);
        success('Cardápio criado!');
      }

      setOpenDialog(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Erro ao salvar cardápio');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Remover este cardápio?')) {
      try {
        await removerCardapioModalidade(id);
        success('Cardápio removido!');
        loadData();
      } catch (err) {
        error('Erro ao remover cardápio');
      }
    }
  };

  return (
    <Box>
      <PageHeader title="Cardápios Mensais" subtitle="Gerencie os cardápios por modalidade e mês" />

      <Box mb={3}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Novo Cardápio
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Modalidade</TableCell>
              <TableCell>Competência</TableCell>
              <TableCell align="center">Refeições</TableCell>
              <TableCell align="center">Dias</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center">Carregando...</TableCell></TableRow>
            ) : cardapios.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">Nenhum cardápio encontrado</TableCell></TableRow>
            ) : (
              cardapios.map((cardapio) => (
                <TableRow key={cardapio.id}>
                  <TableCell>{cardapio.nome}</TableCell>
                  <TableCell>{cardapio.modalidade_nome}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body2">{MESES[cardapio.mes]} / {cardapio.ano}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={cardapio.total_refeicoes || 0} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={cardapio.total_dias || 0} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={cardapio.ativo ? 'Ativo' : 'Inativo'} color={cardapio.ativo ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => navigate(`/cardapios/${cardapio.id}/calendario`)} title="Ver calendário">
                      <ViewIcon />
                    </IconButton>
                    <IconButton size="small" color="primary" onClick={() => handleOpenDialog(cardapio)} title="Editar">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(cardapio.id)} title="Remover">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Editar Cardápio' : 'Novo Cardápio'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Modalidade</InputLabel>
              <Select value={formData.modalidade_id} onChange={(e) => setFormData({ ...formData, modalidade_id: e.target.value })} label="Modalidade">
                {modalidades.map((m) => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField label="Nome do Cardápio" fullWidth required value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Mês</InputLabel>
                  <Select value={formData.mes} onChange={(e) => setFormData({ ...formData, mes: e.target.value })} label="Mês">
                    {Object.entries(MESES).map(([num, nome]) => <MenuItem key={num} value={num}>{nome}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Ano" type="number" fullWidth required value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })} />
              </Grid>
            </Grid>

            <TextField label="Observação" fullWidth multiline rows={3} value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={formData.ativo ? 'ativo' : 'inativo'}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'ativo' })} label="Status">
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">{editMode ? 'Salvar' : 'Criar'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CardapiosModalidadePage;
