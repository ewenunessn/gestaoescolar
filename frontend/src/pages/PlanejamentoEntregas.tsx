import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Route as RouteIcon,
  Assignment as GuiaIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { guiaService } from '../services/guiaService';
import { rotaService } from '../modules/entregas/services/rotaService';
import { PlanejamentoEntrega, RotaEntrega, CreatePlanejamentoData } from '../modules/entregas/types/rota';

const PlanejamentoEntregas: React.FC = () => {
  const [planejamentos, setPlanejamentos] = useState<PlanejamentoEntrega[]>([]);
  const [guias, setGuias] = useState<any[]>([]);
  const [rotas, setRotas] = useState<RotaEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false);
  const [planejamentoEditando, setPlanejamentoEditando] = useState<PlanejamentoEntrega | null>(null);
  const [formData, setFormData] = useState<CreatePlanejamentoData>({
    guiaId: 0,
    rotaId: 0,
    dataPlanejada: '',
    responsavel: '',
    observacao: ''
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [planejamentosData, guiasData, rotasData] = await Promise.all([
        rotaService.listarPlanejamentos(),
        guiaService.listarGuias(),
        rotaService.listarRotas()
      ]);
      
      setPlanejamentos(planejamentosData);
      
      const guiasResponse = guiasData?.data || guiasData;
      const guiasAbertas = Array.isArray(guiasResponse) 
        ? guiasResponse.filter(g => g.status === 'aberta')
        : [];
      setGuias(guiasAbertas);
      
      setRotas(rotasData);
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados do planejamento');
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (planejamento?: PlanejamentoEntrega) => {
    if (planejamento) {
      setPlanejamentoEditando(planejamento);
      setFormData({
        guiaId: planejamento.guia_id,
        rotaId: planejamento.rota_id,
        dataPlanejada: planejamento.data_planejada || '',
        responsavel: planejamento.responsavel || '',
        observacao: planejamento.observacao || ''
      });
    } else {
      setPlanejamentoEditando(null);
      setFormData({
        guiaId: 0,
        rotaId: 0,
        dataPlanejada: '',
        responsavel: '',
        observacao: ''
      });
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setPlanejamentoEditando(null);
    setSalvando(false);
  };

  const salvarPlanejamento = async () => {
    if (!formData.guiaId || !formData.rotaId) {
      setError('Guia e Rota são obrigatórios');
      return;
    }

    try {
      setSalvando(true);
      
      if (planejamentoEditando) {
        await rotaService.atualizarPlanejamento(planejamentoEditando.id, formData);
      } else {
        await rotaService.criarPlanejamento(formData);
      }
      
      await carregarDados();
      fecharModal();
      
    } catch (err) {
      console.error('Erro ao salvar planejamento:', err);
      setError('Erro ao salvar planejamento');
    } finally {
      setSalvando(false);
    }
  };

  const deletarPlanejamento = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este planejamento?')) return;

    try {
      await rotaService.deletarPlanejamento(id);
      await carregarDados();
    } catch (err) {
      console.error('Erro ao deletar planejamento:', err);
      setError('Erro ao remover planejamento');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planejado': return 'info';
      case 'em_andamento': return 'warning';
      case 'concluido': return 'success';
      case 'cancelado': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planejado': return 'Planejado';
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Planejamento de Entregas
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Organize as entregas por guias e rotas para suas equipes
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => abrirModal()}
          >
            Novo Planejamento
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Guia</TableCell>
                    <TableCell>Rota</TableCell>
                    <TableCell>Data Planejada</TableCell>
                    <TableCell>Responsável</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Observação</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {planejamentos.map((planejamento) => (
                    <TableRow key={planejamento.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <GuiaIcon fontSize="small" color="primary" />
                          {planejamento.guia_mes}/{planejamento.guia_ano}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: planejamento.rota_cor
                            }}
                          />
                          <RouteIcon fontSize="small" />
                          {planejamento.rota_nome}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {planejamento.data_planejada ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <CalendarIcon fontSize="small" />
                            {new Date(planejamento.data_planejada).toLocaleDateString('pt-BR')}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {planejamento.responsavel ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <PersonIcon fontSize="small" />
                            {planejamento.responsavel}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(planejamento.status)}
                          color={getStatusColor(planejamento.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {planejamento.observacao || '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => abrirModal(planejamento)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remover">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deletarPlanejamento(planejamento.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {planejamentos.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="text.secondary">
                  Nenhum planejamento criado ainda
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Clique em "Novo Planejamento" para começar
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Modal de Planejamento */}
        <Dialog open={modalAberto} onClose={fecharModal} maxWidth="sm" fullWidth>
          <DialogTitle>
            {planejamentoEditando ? 'Editar Planejamento' : 'Novo Planejamento'}
          </DialogTitle>
          
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Guia de Demanda</InputLabel>
                  <Select
                    value={formData.guiaId}
                    onChange={(e) => setFormData(prev => ({ ...prev, guiaId: Number(e.target.value) }))}
                    label="Guia de Demanda"
                  >
                    {guias.map((guia) => (
                      <MenuItem key={guia.id} value={guia.id}>
                        {guia.mes}/{guia.ano}
                        {guia.observacao && ` - ${guia.observacao}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Rota de Entrega</InputLabel>
                  <Select
                    value={formData.rotaId}
                    onChange={(e) => setFormData(prev => ({ ...prev, rotaId: Number(e.target.value) }))}
                    label="Rota de Entrega"
                  >
                    {rotas.map((rota) => (
                      <MenuItem key={rota.id} value={rota.id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: rota.cor
                            }}
                          />
                          {rota.nome}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Data Planejada"
                  type="date"
                  fullWidth
                  value={formData.dataPlanejada}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataPlanejada: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Responsável"
                  fullWidth
                  value={formData.responsavel}
                  onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
                  placeholder="Nome do responsável pela rota"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Observação"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Observações sobre o planejamento"
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={fecharModal} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              onClick={salvarPlanejamento}
              variant="contained"
              disabled={salvando || !formData.guiaId || !formData.rotaId}
            >
              {salvando ? <CircularProgress size={20} /> : 'Salvar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default PlanejamentoEntregas;