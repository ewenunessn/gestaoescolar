import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  TextField,
  Typography,
  Alert,
  Box
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import demandasService from '../services/demandas';
import { Demanda, STATUS_DEMANDA } from '../types/demanda';
import { formatarData } from '../utils/dateUtils';
import DemandaFormModal from './DemandaFormModal';
import { FormDialog, ConfirmDialog } from './BaseDialog';

interface DemandaDetalhesModalProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  demandaId?: number;
}

export default function DemandaDetalhesModal({
  open,
  onClose,
  onRefresh,
  demandaId
}: DemandaDetalhesModalProps) {
  const [demanda, setDemanda] = useState<Demanda | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);

  // Diálogos
  const [dialogEnviar, setDialogEnviar] = useState(false);
  const [dialogRecusar, setDialogRecusar] = useState(false);
  const [dialogAtender, setDialogAtender] = useState(false);
  const [dialogNaoAtender, setDialogNaoAtender] = useState(false);
  const [dialogExcluir, setDialogExcluir] = useState(false);

  // Modal de edição
  const [modalEdicao, setModalEdicao] = useState(false);

  // Campos dos diálogos
  const [dataEnvio, setDataEnvio] = useState('');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [dataResposta, setDataResposta] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (open && demandaId) {
      carregarDemanda();
    }
  }, [open, demandaId]);

  // Atalhos de teclado para o modal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em um campo
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl + E: Enviar para SEMAD (apenas se pendente)
      if (e.ctrlKey && e.key === 'e' && demanda?.status === 'pendente' && !processando) {
        e.preventDefault();
        setDialogEnviar(true);
        return;
      }

      // Ctrl + R: Contexto dependente do status
      if (e.ctrlKey && e.key === 'r' && !processando) {
        e.preventDefault();
        if (demanda?.status === 'pendente') {
          // Recusar se pendente
          setDialogRecusar(true);
        } else if (demanda?.status === 'enviado_semead') {
          // Registrar Atendimento se enviado
          setDialogAtender(true);
        }
        return;
      }

      // Ctrl + N: Registrar Não Atendimento (apenas se enviado)
      if (e.ctrlKey && e.key === 'n' && demanda?.status === 'enviado_semead' && !processando) {
        e.preventDefault();
        setDialogNaoAtender(true);
        return;
      }

      // Ctrl + Delete: Excluir demanda
      if (e.ctrlKey && e.key === 'Delete' && !processando) {
        e.preventDefault();
        setDialogExcluir(true);
        return;
      }

      // ESC: Fechar modal
      if (e.key === 'Escape' && !processando) {
        // Fechar diálogos primeiro, depois o modal principal
        if (dialogEnviar) {
          setDialogEnviar(false);
        } else if (dialogRecusar) {
          setDialogRecusar(false);
        } else if (dialogAtender) {
          setDialogAtender(false);
        } else if (dialogNaoAtender) {
          setDialogNaoAtender(false);
        } else if (dialogExcluir) {
          setDialogExcluir(false);
        } else if (modalEdicao) {
          setModalEdicao(false);
        } else {
          onClose();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, demanda?.status, processando, dialogEnviar, dialogRecusar, dialogAtender, dialogNaoAtender, dialogExcluir, modalEdicao, onClose]);

  const carregarDemanda = async () => {
    try {
      setLoading(true);
      setErro('');
      const dados = await demandasService.buscarPorId(demandaId!);
      setDemanda(dados);
      setDataEnvio(new Date().toISOString().split('T')[0]);
      setDataResposta(new Date().toISOString().split('T')[0]);
    } catch (error: any) {
      console.error('Erro ao carregar demanda:', error);
      setErro('Erro ao carregar demanda');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarSemead = async () => {
    try {
      setProcessando(true);
      await demandasService.atualizar(demandaId!, {
        data_semead: dataEnvio,
        status: 'enviado_semead'
      });
      setDialogEnviar(false);
      await carregarDemanda();
      onRefresh();
    } catch (error: any) {
      console.error('Erro ao enviar:', error);
      setErro(error.response?.data?.message || 'Erro ao registrar envio');
    } finally {
      setProcessando(false);
    }
  };

  const handleRecusarImediata = async () => {
    try {
      setProcessando(true);
      await demandasService.atualizar(demandaId!, {
        status: 'nao_atendido',
        observacoes: `RECUSADO IMEDIATAMENTE: ${motivoRecusa}`
      });
      setDialogRecusar(false);
      await carregarDemanda();
      onRefresh();
    } catch (error: any) {
      console.error('Erro ao recusar:', error);
      setErro(error.response?.data?.message || 'Erro ao registrar recusa');
    } finally {
      setProcessando(false);
    }
  };

  const handleAtender = async () => {
    try {
      setProcessando(true);
      await demandasService.atualizar(demandaId!, {
        status: 'atendido',
        data_resposta_semead: dataResposta,
        observacoes: observacoes || demanda?.observacoes
      });
      setDialogAtender(false);
      await carregarDemanda();
      onRefresh();
    } catch (error: any) {
      console.error('Erro ao atender:', error);
      setErro(error.response?.data?.message || 'Erro ao registrar atendimento');
    } finally {
      setProcessando(false);
    }
  };

  const handleNaoAtender = async () => {
    try {
      setProcessando(true);
      await demandasService.atualizar(demandaId!, {
        status: 'nao_atendido',
        data_resposta_semead: dataResposta,
        observacoes: observacoes || demanda?.observacoes
      });
      setDialogNaoAtender(false);
      await carregarDemanda();
      onRefresh();
    } catch (error: any) {
      console.error('Erro ao registrar:', error);
      setErro(error.response?.data?.message || 'Erro ao registrar não atendimento');
    } finally {
      setProcessando(false);
    }
  };

  const getStatusChip = (status: string) => {
    const statusInfo = STATUS_DEMANDA[status as keyof typeof STATUS_DEMANDA];
    return (
      <Chip
        label={statusInfo?.label || status}
        color={statusInfo?.color as any || 'default'}
        size="medium"
      />
    );
  };

  const handleEditar = () => {
    setModalEdicao(true);
  };

  const handleExcluir = async () => {
    if (!demandaId) return;

    try {
      setProcessando(true);
      await demandasService.excluir(demandaId);
      setDialogExcluir(false);
      onRefresh();
      onClose();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      setErro(error.response?.data?.message || 'Erro ao excluir demanda');
    } finally {
      setProcessando(false);
    }
  };

  const handleSuccessEdicao = () => {
    carregarDemanda();
    onRefresh();
  };

  const handleClose = () => {
    if (!processando) {
      onClose();
    }
  };

  if (!demanda && !loading) {
    return null;
  }

  const ehPendente = demanda?.status === 'pendente';
  const ehEnviado = demanda?.status === 'enviado_semead';

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            maxHeight: '90vh',
            height: 'auto',
            m: 2
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            {demanda && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                <Typography variant="h6">
                  Demanda {demanda.numero_oficio}
                </Typography>
                {getStatusChip(demanda.status)}
              </Box>
            )}
            {demanda?.status === 'pendente' && (
              <Typography variant="caption" color="text.secondary">
                Atalhos: Ctrl+E (Enviar), Ctrl+R (Recusar), Ctrl+Del (Excluir), Esc (Fechar)
              </Typography>
            )}
            {demanda?.status === 'enviado_semead' && (
              <Typography variant="caption" color="text.secondary">
                Atalhos: Ctrl+R (Registrar Atendimento), Ctrl+N (Não Atender), Ctrl+Del (Excluir), Esc (Fechar)
              </Typography>
            )}
            {demanda && !['pendente', 'enviado_semead'].includes(demanda.status) && (
              <Typography variant="caption" color="text.secondary">
                Atalhos: Ctrl+Del (Excluir), Esc (Fechar)
              </Typography>
            )}
          </Box>
          <IconButton onClick={handleClose} disabled={processando}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ 
          maxHeight: 'calc(90vh - 120px)', 
          overflowY: 'auto',
          p: 2
        }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography>Carregando...</Typography>
            </Box>
          ) : erro ? (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
              {erro}
            </Alert>
          ) : demanda ? (
            <Grid container spacing={2}>
              {/* Informações Básicas */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: 'fit-content' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                      Informações da Solicitação
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                          <Typography variant="caption" color="primary.main" fontWeight="bold">ESCOLA SOLICITANTE</Typography>
                          <Typography variant="h6" sx={{ mt: 0.5, color: 'primary.dark' }}>{demanda.escola_nome}</Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">OFÍCIO Nº</Typography>
                        <Typography variant="body1" fontWeight="600">{demanda.numero_oficio}</Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">DATA SOLICITAÇÃO</Typography>
                        <Typography variant="body1" fontWeight="600">{formatarData(demanda.data_solicitacao)}</Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">OBJETO DA DEMANDA</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                          {demanda.objeto}
                        </Typography>
                      </Grid>

                      {demanda.descricao_itens && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold">DESCRIÇÃO DETALHADA</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200', whiteSpace: 'pre-wrap' }}>
                            {demanda.descricao_itens}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Acompanhamento */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: 'fit-content' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                      Acompanhamento
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                          <Typography variant="caption" color="success.main" fontWeight="bold">STATUS ATUAL</Typography>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              mt: 0.5, 
                              color: `${STATUS_DEMANDA[demanda.status as keyof typeof STATUS_DEMANDA]?.color || 'default'}.dark` 
                            }}
                          >
                            {STATUS_DEMANDA[demanda.status as keyof typeof STATUS_DEMANDA]?.label || demanda.status}
                          </Typography>
                        </Box>
                      </Grid>

                      {demanda.data_semead ? (
                        <>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">ENVIADO EM</Typography>
                            <Typography variant="body1" fontWeight="600">{formatarData(demanda.data_semead)}</Typography>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                              {demanda.data_resposta_semead ? 'RESPONDIDO EM' : 'AGUARDANDO HÁ'}
                            </Typography>
                            {demanda.data_resposta_semead ? (
                              <Box>
                                <Typography variant="body1" fontWeight="600">{formatarData(demanda.data_resposta_semead)}</Typography>
                                {demanda.dias_solicitacao !== null && (
                                  <Typography variant="body2" color="info.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                                    TEMPO DE RESPOSTA: {demanda.dias_solicitacao} {demanda.dias_solicitacao === 1 ? 'dia' : 'dias'}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Chip label={`${demanda.dias_solicitacao || 0} dias`} color="warning" size="small" />
                            )}
                          </Grid>
                        </>
                      ) : (
                        <Grid item xs={12}>
                          <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1, border: '1px solid', borderColor: 'warning.200', textAlign: 'center' }}>
                            <Typography variant="caption" color="warning.main" fontWeight="bold">PENDENTE DE ENVIO</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: 'warning.dark' }}>
                              Ainda não foi enviado à SEMAD
                            </Typography>
                          </Box>
                        </Grid>
                      )}

                      {demanda.observacoes && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold">OBSERVAÇÕES</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200', whiteSpace: 'pre-wrap' }}>
                            {demanda.observacoes}
                          </Typography>
                        </Grid>
                      )}

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">Criado por:</Typography>
                          <Typography variant="body2" fontWeight="600">{demanda.usuario_criacao_nome}</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Botões de Ação */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Ações
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {/* Botões para status PENDENTE */}
                      {ehPendente && (
                        <>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SendIcon />}
                            onClick={() => setDialogEnviar(true)}
                            disabled={processando}
                          >
                            Registrar Envio à SEMAD (Ctrl+E)
                          </Button>
                          <Button
                            variant="contained" color="delete"
                            startIcon={<CancelIcon />}
                            onClick={() => setDialogRecusar(true)}
                            disabled={processando}
                          >
                            Recusar Imediatamente (Ctrl+R)
                          </Button>
                        </>
                      )}

                      {/* Botões para status ENVIADO */}
                      {ehEnviado && (
                        <>
                          <Button
                            variant="contained" color="add"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => setDialogAtender(true)}
                            disabled={processando}
                          >
                            Registrar Atendimento (Ctrl+R)
                          </Button>
                          <Button
                            variant="contained" color="delete"
                            startIcon={<CancelIcon />}
                            onClick={() => setDialogNaoAtender(true)}
                            disabled={processando}
                          >
                            Registrar Não Atendimento (Ctrl+N)
                          </Button>
                        </>
                      )}

                      {/* Botões sempre disponíveis */}
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={handleEditar}
                        disabled={processando}
                      >
                        Editar
                      </Button>

                      <Button
                        variant="contained" color="delete"
                        startIcon={<DeleteIcon />}
                        onClick={() => setDialogExcluir(true)}
                        disabled={processando}
                      >
                        Excluir (Ctrl+Del)
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={processando}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Registrar Envio à SEMAD */}
      <FormDialog
        open={dialogEnviar}
        onClose={() => setDialogEnviar(false)}
        title="Registrar Envio à SEMAD"
        onSave={handleEnviarSemead}
        loading={processando}
        disableSave={!dataEnvio}
        saveLabel={processando ? 'Registrando...' : 'Confirmar Envio (Enter)'}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Informe a data em que a demanda foi enviada à SEMEAD:
        </Typography>
        <TextField
          fullWidth
          type="date"
          label="Data de Envio"
          value={dataEnvio}
          onChange={(e) => setDataEnvio(e.target.value)}
          InputLabelProps={{ shrink: true }}
          autoFocus
        />
      </FormDialog>

      {/* Diálogo: Recusar Imediatamente */}
      <FormDialog
        open={dialogRecusar}
        onClose={() => setDialogRecusar(false)}
        title="Recusar Demanda"
        onSave={handleRecusarImediata}
        loading={processando}
        disableSave={!motivoRecusa.trim()}
        saveLabel={processando ? 'Registrando...' : 'Confirmar Recusa (Ctrl+Enter)'}
        saveColor="error"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Informe o motivo da recusa imediata:
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Motivo da Recusa"
          value={motivoRecusa}
          onChange={(e) => setMotivoRecusa(e.target.value)}
          placeholder="Ex: Fora do escopo, sem orçamento disponível, etc."
          autoFocus
        />
      </FormDialog>

      {/* Diálogo: Registrar Atendimento */}
      <FormDialog
        open={dialogAtender}
        onClose={() => setDialogAtender(false)}
        title="Registrar Atendimento"
        onSave={handleAtender}
        loading={processando}
        disableSave={!dataResposta}
        saveLabel={processando ? 'Registrando...' : 'Confirmar Atendimento (Ctrl+Enter)'}
        saveColor="primary"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A SEMAD atendeu a demanda. Informe os detalhes:
        </Typography>
        <TextField
          fullWidth
          type="date"
          label="Data da Resposta"
          value={dataResposta}
          onChange={(e) => setDataResposta(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
          autoFocus
        />
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Observações (opcional)"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex: Itens entregues conforme solicitado"
        />
      </FormDialog>

      {/* Diálogo: Registrar Não Atendimento */}
      <FormDialog
        open={dialogNaoAtender}
        onClose={() => setDialogNaoAtender(false)}
        title="Registrar Não Atendimento"
        onSave={handleNaoAtender}
        loading={processando}
        disableSave={!dataResposta}
        saveLabel={processando ? 'Registrando...' : 'Confirmar Não Atendimento (Ctrl+Enter)'}
        saveColor="error"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A SEMAD não atendeu a demanda. Informe os detalhes:
        </Typography>
        <TextField
          fullWidth
          type="date"
          label="Data da Resposta"
          value={dataResposta}
          onChange={(e) => setDataResposta(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
          autoFocus
        />
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Motivo (opcional)"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex: Sem disponibilidade orçamentária"
        />
      </FormDialog>

      {/* Modal de Edição */}
      <DemandaFormModal
        open={modalEdicao}
        onClose={() => setModalEdicao(false)}
        onSuccess={handleSuccessEdicao}
        demandaId={demandaId}
      />

      {/* Diálogo: Excluir */}
      <ConfirmDialog
        open={dialogExcluir}
        onClose={() => setDialogExcluir(false)}
        onConfirm={handleExcluir}
        title="Excluir Demanda"
        message="Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita."
        loading={processando}
        severity="error"
        confirmLabel={processando ? 'Excluindo...' : 'Confirmar Exclusão (Enter)'}
      />
    </>
  );
}