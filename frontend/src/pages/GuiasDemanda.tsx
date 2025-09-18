import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { guiaService, Guia, CreateGuiaData } from '../services/guiaService';
import GuiaDetalhes from '../components/GuiaDetalhes';

const GuiasDemanda: React.FC = () => {
  const [guias, setGuias] = useState<Guia[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGuia, setSelectedGuia] = useState<Guia | null>(null);
  const [openDetalhes, setOpenDetalhes] = useState(false);
  const [filters, setFilters] = useState({
    mes: '',
    ano: '',
    status: ''
  });
  const [formData, setFormData] = useState<CreateGuiaData>({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    observacao: ''
  });

  const { success, error } = useNotification();

  useEffect(() => {
    carregarGuias();
  }, [filters]);

  const carregarGuias = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.mes) params.mes = parseInt(filters.mes);
      if (filters.ano) params.ano = parseInt(filters.ano);
      if (filters.status) params.status = filters.status;

      const response = await guiaService.listarGuias(params);
      setGuias(response.data);
    } catch (error: any) {
      error('Erro ao carregar guias');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuia = async () => {
    try {
      await guiaService.criarGuia(formData);
      success('Guia criada com sucesso!');
      setOpenDialog(false);
      setFormData({
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        observacao: ''
      });
      carregarGuias();
    } catch (errorCatch: any) {
      error(errorCatch.response?.data?.error || 'Erro ao criar guia');
    }
  };

  const handleDeleteGuia = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta guia?')) {
      try {
        await guiaService.deletarGuia(id);
        success('Guia excluída com sucesso!');
        carregarGuias();
      } catch (errorCatch: any) {
        error('Erro ao excluir guia');
      }
    }
  };

  const handleViewDetalhes = async (guia: Guia) => {
    try {
      const response = await guiaService.buscarGuia(guia.id);
      setSelectedGuia(response.data);
      setOpenDetalhes(true);
    } catch (errorCatch: any) {
      error('Erro ao carregar detalhes da guia');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'success';
      case 'fechada':
        return 'default';
      case 'cancelada':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'Aberta';
      case 'fechada':
        return 'Fechada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Guias de Demanda
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Mês</InputLabel>
              <Select
                value={filters.mes}
                onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
                label="Mês"
              >
                <MenuItem value="">Todos</MenuItem>
                {[...Array(12)].map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {i + 1}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Ano"
              type="number"
              value={filters.ano}
              onChange={(e) => setFilters({ ...filters, ano: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="aberta">Aberta</MenuItem>
                <MenuItem value="fechada">Fechada</MenuItem>
                <MenuItem value="cancelada">Cancelada</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Nova Guia
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mês/Ano</TableCell>
              <TableCell>Observação</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Produtos</TableCell>
              <TableCell>Criado em</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {guias.map((guia) => (
              <TableRow key={guia.id}>
                <TableCell>
                  {guia.mes}/{guia.ano}
                </TableCell>
                <TableCell>{guia.observacao || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(guia.status)}
                    color={getStatusColor(guia.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{guia.produtosEscola?.length || 0}</TableCell>
                <TableCell>
                  {new Date(guia.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleViewDetalhes(guia)}
                    color="primary"
                  >
                    <ViewIcon />
                  </IconButton>
                  {guia.status === 'aberta' && (
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteGuia(guia.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para criar nova guia */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Guia de Demanda</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Mês</InputLabel>
                <Select
                  value={formData.mes}
                  onChange={(e) => setFormData({ ...formData, mes: e.target.value as number })}
                  label="Mês"
                >
                  {[...Array(12)].map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {i + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Ano"
                type="number"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Observação"
                multiline
                rows={3}
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreateGuia} variant="contained">
            Criar Guia
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de detalhes da guia */}
      <GuiaDetalhes
        open={openDetalhes}
        onClose={() => {
          setOpenDetalhes(false);
          setSelectedGuia(null);
        }}
        guia={selectedGuia}
        onUpdate={carregarGuias}
      />
    </Box>
  );
};

export default GuiasDemanda;