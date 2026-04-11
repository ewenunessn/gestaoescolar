import React, { useState } from "react";
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
  TextField,
  Alert,
  Tooltip,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  CheckCircle as CheckCircleIcon,
  VisibilityOff as VisibilityOffIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import { SafeButtonWithOverlay } from "../../../components/SafeButtonWithOverlay";
import { LoadingOverlay } from "../../../components/LoadingOverlay";
import { FormDialog } from "../../../components/BaseDialog";
import {
  usePeriodos,
  useCriarPeriodo,
  useAtualizarPeriodo,
  useAtivarPeriodo,
  useFecharPeriodo,
  useReabrirPeriodo,
  useDeletarPeriodo,
} from "../../../hooks/queries/usePeriodosQueries";
import { Periodo } from "../../../services/periodos";

// ── Design tokens ──────────────────────────────────────────────
const GREEN = "#22c55e";
const NAVY = "#0f172a";

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

  const handleCloseDialog = () => { setDialogOpen(false); setEditando(null); };

  const handleSubmit = async () => {
    try {
      if (editando) {
        await atualizarPeriodoMutation.mutateAsync({
          id: editando.id,
          data: { descricao: formData.descricao, data_inicio: formData.data_inicio, data_fim: formData.data_fim },
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
      await atualizarPeriodoMutation.mutateAsync({ id, data: { ocultar_dados: !ocultar } });
      setSuccessMessage(`Dados ${!ocultar ? 'ocultados' : 'exibidos'} com sucesso!`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Erro ao atualizar período');
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: "50vh" }}>
          <CircularProgress size={60} />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" sx={{ borderRadius: '6px' }}>Erro ao carregar períodos</Alert>
      </PageContainer>
    );
  }

  const periodoAtivo = periodos?.find(p => p.ativo);
  const periodosFiltrados = ocultarInativos ? periodos?.filter(p => p.ativo || p.fechado) : periodos;

  return (
    <PageContainer>
      <PageBreadcrumbs
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Sistema', path: '/sistema' },
          { label: 'Gerenciamento de Períodos' },
        ]}
      />
      {/* Navy header bar */}
      <Box
        sx={{
          mx: '-20px',
          mt: '-12px',
          mb: 4,
          px: '28px',
          py: 2.5,
          background: `linear-gradient(135deg, ${NAVY}, #1e293b)`,
          position: 'relative',
        }}
      >
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GREEN}44, transparent)` }} />
        <Typography sx={{ fontWeight: 800, fontSize: '1.55rem', color: '#fff', mb: 0.3, letterSpacing: '-0.5px' }}>
          Gerenciamento de Períodos
        </Typography>
        <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          Controle dos anos letivos do sistema
        </Typography>
      </Box>

      {/* Alerts */}
      {periodoAtivo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '6px' }}>
          Período ativo: <strong>{periodoAtivo.ano} — {periodoAtivo.descricao}</strong>
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: '6px' }} onClose={() => setSuccessMessage('')}>{successMessage}</Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '6px' }} onClose={() => setErrorMessage('')}>{errorMessage}</Alert>
      )}

      {/* Table card */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            {/* Section bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 16, height: 3, borderRadius: 2, bgcolor: GREEN }} />
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: GREEN }}>
                Períodos Cadastrados
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={ocultarInativos} onChange={(e) => setOcultarInativos(e.target.checked)} size="small" />}
                label={<Typography variant="body2" color="text.secondary">Ocultar inativos</Typography>}
              />
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
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
                  <TableCell>Início</TableCell>
                  <TableCell>Fim</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Registros</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periodosFiltrados?.map((periodo) => (
                  <TableRow key={periodo.id}>
                    <TableCell>
                      <Typography
                        sx={{
                          fontFamily: '"Fira Code", "Roboto Mono", monospace',
                          fontWeight: periodo.ativo ? 700 : 400,
                          fontSize: periodo.ativo ? '1.05rem' : '0.85rem',
                          color: periodo.ativo ? GREEN : '#64748b',
                        }}
                      >
                        {periodo.ano}
                      </Typography>
                    </TableCell>
                    <TableCell>{periodo.descricao}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', fontSize: '0.8rem' }}>
                        {new Date(periodo.data_inicio).toLocaleDateString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace', fontSize: '0.8rem' }}>
                        {new Date(periodo.data_fim).toLocaleDateString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {periodo.ativo && (
                          <Chip label="Ativo" color="success" size="small" icon={<CheckCircleIcon />} sx={{ borderRadius: '3px', fontWeight: 500 }} />
                        )}
                        {periodo.fechado && (
                          <Chip label="Fechado" color="error" size="small" icon={<LockIcon />} sx={{ borderRadius: '3px', fontWeight: 500 }} />
                        )}
                        {!periodo.ativo && !periodo.fechado && (
                          <Chip label="Inativo" size="small" sx={{ borderRadius: '3px', fontWeight: 500 }} />
                        )}
                        {periodo.ocultar_dados && !periodo.ativo && (
                          <Chip label="Dados ocultos" size="small" sx={{ borderRadius: '3px', bgcolor: '#fffbeb', color: '#92400e', fontWeight: 500, ml: 0.5 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block" sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace' }}>
                        {periodo.total_pedidos || 0} pedidos
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace' }}>
                        {periodo.total_guias || 0} guias
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ fontFamily: '"Fira Code", "Roboto Mono", monospace' }}>
                        {periodo.total_cardapios || 0} cardápios
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {!periodo.ativo && !periodo.fechado && (
                          <Tooltip title={periodo.ocultar_dados ? "Exibir dados nas listagens" : "Ocultar dados nas listagens"}>
                            <span>
                              <IconButton
                                size="small"
                                color={periodo.ocultar_dados ? "warning" : "default"}
                                onClick={() => handleToggleOcultarDados(periodo.id, periodo.ocultar_dados)}
                                disabled={atualizarPeriodoMutation.isPending}
                              >
                                {periodo.ocultar_dados ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {!periodo.ativo && !periodo.fechado && (
                          <Tooltip title="Ativar período">
                            <span>
                              <IconButton size="small" color="success" onClick={() => handleAtivar(periodo.id)} disabled={ativarPeriodoMutation.isPending}>
                                <CheckCircleIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {!periodo.ativo && !periodo.fechado && (
                          <Tooltip title="Fechar período">
                            <span>
                              <IconButton size="small" color="warning" onClick={() => handleFechar(periodo.id)} disabled={fecharPeriodoMutation.isPending}>
                                <LockIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {periodo.fechado && (
                          <Tooltip title="Reabrir período">
                            <span>
                              <IconButton size="small" color="info" onClick={() => handleReabrir(periodo.id)} disabled={reabrirPeriodoMutation.isPending}>
                                <LockOpenIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => handleOpenDialog(periodo)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        {!periodo.ativo && (
                          <Tooltip title="Deletar">
                            <span>
                              <IconButton size="small" color="error" onClick={() => handleDeletar(periodo.id, periodo.ano)} disabled={deletarPeriodoMutation.isPending}>
                                <DeleteIcon />
                              </IconButton>
                            </span>
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

      {/* Dialog */}
      <FormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        title={editando ? 'Editar Período' : 'Novo Período'}
        onSave={handleSubmit}
        loading={criarPeriodoMutation.isPending || atualizarPeriodoMutation.isPending}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Ano" type="number" value={formData.ano} onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })} disabled={!!editando} fullWidth />
          <TextField label="Descrição" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} fullWidth />
          <TextField label="Data Início" type="date" value={formData.data_inicio} onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="Data Fim" type="date" value={formData.data_fim} onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
        </Box>
      </FormDialog>

      <LoadingOverlay
        open={
          ativarPeriodoMutation.isPending || fecharPeriodoMutation.isPending || reabrirPeriodoMutation.isPending ||
          deletarPeriodoMutation.isPending || atualizarPeriodoMutation.isPending || criarPeriodoMutation.isPending
        }
        message={
          ativarPeriodoMutation.isPending ? 'Ativando período...' :
          fecharPeriodoMutation.isPending ? 'Fechando período...' :
          reabrirPeriodoMutation.isPending ? 'Reabrindo período...' :
          deletarPeriodoMutation.isPending ? 'Excluindo período...' :
          atualizarPeriodoMutation.isPending ? 'Atualizando período...' :
          criarPeriodoMutation.isPending ? 'Criando período...' : 'Processando...'
        }
      />
    </PageContainer>
  );
};

export default GerenciamentoPeriodos;
