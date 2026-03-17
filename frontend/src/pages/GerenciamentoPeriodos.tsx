import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  CheckCircle as CheckCircleIcon,
  VisibilityOff as VisibilityOffIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import {
  usePeriodos,
  useCriarPeriodo,
  useAtualizarPeriodo,
  useAtivarPeriodo,
  useFecharPeriodo,
  useReabrirPeriodo,
  useDeletarPeriodo,
} from '../hooks/queries/usePeriodosQueries';
import { Periodo } from '../services/periodos';

const GerenciamentoPeriodos = () => {
  const { data: periodos, isLoading, error } = usePeriodos();
  const criarPeriodoMutation = useCriarPeriodo();
  const atualizarPeriodoMutation = useAtualizarPeriodo();
  const ativarPeriodoMutation = useAtivarPeriodo();
  const fecharPeriodoMutation = useFecharPeriodo();
  const reabrirPeriodoMutation = useReabrirPeriodo();
  const deletarPeriodoMutation = useDeletarPeriodo();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Periodo | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [ocultarInativos, setOcultarInativos] = useState(false);
  const [formData, setFormData] = useState({
    ano: new Date().getFullYear() + 1,
    descricao: '',
    data_inicio: '',
    data_fim: '',
  });

  const handleOpenDialog = (periodo?: Periodo) => {
    if (periodo) {
      setEditando(periodo);
      setFormData({
        ano: periodo.ano,
        descricao: periodo.descricao,
        data_inicio: periodo.data_inicio.split('T')[0],
        data_fim: periodo.data_fim.split('T')[0],
      });
    } else {
      setEditando(null);
      const proximoAno = new Date().getFullYear() + 1;
      setFormData({
        ano: proximoAno,
        descricao: `Ano Letivo ${proximoAno}`,
        data_inicio: `${proximoAno}-01-01`,
        data_fim: `${proximoAno}-12-31`,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditando(null);
  };

  const handleSubmit = async () => {
    try {
      if (editando) {
        await atualizarPeriodoMutation.mutateAsync({
          id: editando.id,
          data: {
            descricao: formData.descricao,
            data_inicio: formData.data_inicio,
            data_fim: formData.data_fim,
          },
        });
        setSuccessMessage('Período atualizado com sucesso!');
      } else {
        await criarPeriodoMutation.mutateAsync(formData);
        setSuccessMessage('Período criado com sucesso!');
      }
      handleCloseDialog();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao salvar período');
    }
  };

  const handleAtivar = async (id: number) => {
    try {
      const periodo = await ativarPeriodoMutation.mutateAsync(id);
      setSuccessMessage(`Período ${periodo.ano} ativado com sucesso!`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao ativar período');
    }
  };

  const handleFechar = async (id: number) => {
    try {
      const periodo = await fecharPeriodoMutation.mutateAsync(id);
      setSuccessMessage(`Período ${periodo.ano} fechado com sucesso!`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao fechar período');
    }
  };

  const handleReabrir = async (id: number) => {
    try {
      const periodo = await reabrirPeriodoMutation.mutateAsync(id);
      setSuccessMessage(`Período ${periodo.ano} reaberto com sucesso!`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao reabrir período');
    }
  };

  const handleDeletar = async (id: number, ano: number) => {
    if (window.confirm(`Tem certeza que deseja deletar o período ${ano}?`)) {
      try {
        await deletarPeriodoMutation.mutateAsync(id);
        setSuccessMessage('Período deletado com sucesso!');
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'Erro ao deletar período');
      }
    }
  };

  const handleToggleOcultarDados = async (id: number, ocultar: boolean) => {
    try {
      await atualizarPeriodoMutation.mutateAsync({
        id,
        data: { ocultar_dados: !ocultar }
      });
      setSuccessMessage(`Dados ${!ocultar ? 'ocultados' : 'exibidos'} com sucesso!`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao atualizar período');
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress size={60} />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error">Erro ao carregar períodos</Alert>
      </PageContainer>
    );
  }

  const periodoAtivo = periodos?.find(p => p.ativo);
  const periodosFiltrados = ocultarInativos 
    ? periodos?.filter(p => p.ativo || p.fechado)
    : periodos;

  return (
    <PageContainer>
      <PageHeader
        title="Gerenciamento de Períodos"
        subtitle="Controle os anos letivos do sistema"
      />

      {periodoAtivo && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Período ativo: <strong>{periodoAtivo.ano} - {periodoAtivo.descricao}</strong>
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
          {errorMessage}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Períodos Cadastrados</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ocultarInativos}
                    onChange={(e) => setOcultarInativos(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Ocultar inativos
                  </Typography>
                }
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Novo Período
              </Button>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ano</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Data Início</TableCell>
                  <TableCell>Data Fim</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Registros</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periodosFiltrados?.map((periodo) => (
                  <TableRow key={periodo.id}>
                    <TableCell>
                      <Typography variant="body1" fontWeight={periodo.ativo ? 700 : 400}>
                        {periodo.ano}
                      </Typography>
                    </TableCell>
                    <TableCell>{periodo.descricao}</TableCell>
                    <TableCell>
                      {new Date(periodo.data_inicio).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {new Date(periodo.data_fim).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {periodo.ativo && (
                        <Chip label="Ativo" color="success" size="small" icon={<CheckCircleIcon />} />
                      )}
                      {periodo.fechado && (
                        <Chip label="Fechado" color="error" size="small" icon={<LockIcon />} />
                      )}
                      {!periodo.ativo && !periodo.fechado && (
                        <Chip label="Inativo" color="default" size="small" />
                      )}
                      {periodo.ocultar_dados && !periodo.ativo && (
                        <Chip 
                          label="Dados ocultos" 
                          size="small" 
                          sx={{ ml: 0.5, bgcolor: 'warning.light', color: 'warning.contrastText' }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">
                        {periodo.total_pedidos || 0} pedidos
                      </Typography>
                      <Typography variant="caption" display="block">
                        {periodo.total_guias || 0} guias
                      </Typography>
                      <Typography variant="caption" display="block">
                        {periodo.total_cardapios || 0} cardápios
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {!periodo.ativo && !periodo.fechado && (
                          <Tooltip title={periodo.ocultar_dados ? "Exibir dados nas listagens" : "Ocultar dados nas listagens"}>
                            <IconButton
                              size="small"
                              color={periodo.ocultar_dados ? "warning" : "default"}
                              onClick={() => handleToggleOcultarDados(periodo.id, periodo.ocultar_dados)}
                            >
                              {periodo.ocultar_dados ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {!periodo.ativo && !periodo.fechado && (
                          <Tooltip title="Ativar período">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleAtivar(periodo.id)}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {!periodo.ativo && !periodo.fechado && (
                          <Tooltip title="Fechar período">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleFechar(periodo.id)}
                            >
                              <LockIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {periodo.fechado && (
                          <Tooltip title="Reabrir período">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleReabrir(periodo.id)}
                            >
                              <LockOpenIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(periodo)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        
                        {!periodo.ativo && (
                          <Tooltip title="Deletar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeletar(periodo.id, periodo.ano)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog para criar/editar período */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editando ? 'Editar Período' : 'Novo Período'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Ano"
              type="number"
              value={formData.ano}
              onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
              disabled={!!editando}
              fullWidth
            />
            <TextField
              label="Descrição"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              fullWidth
            />
            <TextField
              label="Data Início"
              type="date"
              value={formData.data_inicio}
              onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Data Fim"
              type="date"
              value={formData.data_fim}
              onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={criarPeriodoMutation.isPending || atualizarPeriodoMutation.isPending}
          >
            {editando ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default GerenciamentoPeriodos;
