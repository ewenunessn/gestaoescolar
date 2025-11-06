import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '700px' }
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

        <DialogContent>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography>Carregando...</Typography>
            </Box>
          ) : erro ? (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
              {erro}
            </Alert>
          ) : demanda ? (
            <Grid container spacing={3}>
              {/* Informações Básicas */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Informações da Solicitação
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Escola Solicitante</Typography>
                      <Typography variant="body1" fontWeight="bold">{demanda.escola_nome}</Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Número do Ofício</Typography>
                      <Typography variant="body1">{demanda.numero_oficio}</Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Data Solicitação à SEMED</Typography>
                      <Typography variant="body1">{formatarData(demanda.data_solicitacao)}</Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Objeto</Typography>
                      <Typography variant="body1">{demanda.objeto}</Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Descrição dos Itens</Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {demanda.descricao_itens}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Acompanhamento */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Acompanhamento
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Status</Typography>
                      {getStatusChip(demanda.status)}
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {demanda.data_resposta_semead ? 'Tempo de Resposta da SEMAD' : 'Aguardando Resposta da SEMAD'}
                      </Typography>
                      {demanda.dias_solicitacao !== null ? (
                        <Chip
                          label={`${demanda.dias_solicitacao} dias`}
                          color={demanda.data_resposta_semead ? 'success' : 'primary'}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">Ainda não enviado à SEMAD</Typography>
                      )}
                    </Box>

                    {demanda.data_semead && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Data de Envio à SEMAD</Typography>
                        <Typography variant="body1">{formatarData(demanda.data_semead)}</Typography>
                      </Box>
                    )}

                    {demanda.data_resposta_semead && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Data da Resposta SEMAD</Typography>
                        <Typography variant="body1">{formatarData(demanda.data_resposta_semead)}</Typography>
                      </Box>
                    )}

                    {demanda.observacoes && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">Observações</Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {demanda.observacoes}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Criado por</Typography>
                      <Typography variant="body1">{demanda.usuario_criacao_nome}</Typography>
                    </Box>
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
                            variant="outlined"
                            color="error"
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
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => setDialogAtender(true)}
                            disabled={processando}
                          >
                            Registrar Atendimento (Ctrl+R)
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
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
                        variant="outlined"
                        color="error"
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
      <Dialog
        open={dialogEnviar}
        onClose={() => setDialogEnviar(false)}
        maxWidth="sm"
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !processando && dataEnvio) {
            e.preventDefault();
            handleEnviarSemead();
          }
        }}
      >
        <DialogTitle>Registrar Envio à SEMAD</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Informe a data em que a demanda foi enviada à SEMEAD:
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Pressione Enter para confirmar
          </Typography>
          <TextField
            fullWidth
            type="date"
            label="Data de Envio"
            value={dataEnvio}
            onChange={(e) => setDataEnvio(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !processando && dataEnvio) {
                e.preventDefault();
                handleEnviarSemead();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEnviar(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnviarSemead}
            variant="contained"
            disabled={processando || !dataEnvio}
          >
            {processando ? 'Registrando...' : 'Confirmar Envio (Enter)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Recusar Imediatamente */}
      <Dialog
        open={dialogRecusar}
        onClose={() => setDialogRecusar(false)}
        maxWidth="sm"
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey && !processando && motivoRecusa.trim()) {
            e.preventDefault();
            handleRecusarImediata();
          }
        }}
      >
        <DialogTitle>Recusar Demanda</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Informe o motivo da recusa imediata:
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Pressione Ctrl+Enter para confirmar
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Motivo da Recusa"
            value={motivoRecusa}
            onChange={(e) => setMotivoRecusa(e.target.value)}
            placeholder="Ex: Fora do escopo, sem orçamento disponível, etc."
            sx={{ mt: 2 }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !processando && motivoRecusa.trim()) {
                e.preventDefault();
                handleRecusarImediata();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogRecusar(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleRecusarImediata}
            variant="contained"
            color="error"
            disabled={processando || !motivoRecusa.trim()}
          >
            {processando ? 'Registrando...' : 'Confirmar Recusa (Ctrl+Enter)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Registrar Atendimento */}
      <Dialog
        open={dialogAtender}
        onClose={() => setDialogAtender(false)}
        maxWidth="sm"
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey && !processando && dataResposta) {
            e.preventDefault();
            handleAtender();
          }
        }}
      >
        <DialogTitle>Registrar Atendimento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A SEMAD atendeu a demanda. Informe os detalhes:
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Pressione Ctrl+Enter para confirmar
          </Typography>
          <TextField
            fullWidth
            type="date"
            label="Data da Resposta"
            value={dataResposta}
            onChange={(e) => setDataResposta(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2, mb: 2 }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !processando && dataResposta) {
                e.preventDefault();
                handleAtender();
              }
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Observações (opcional)"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Itens entregues conforme solicitado"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !processando && dataResposta) {
                e.preventDefault();
                handleAtender();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAtender(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleAtender}
            variant="contained"
            color="success"
            disabled={processando || !dataResposta}
          >
            {processando ? 'Registrando...' : 'Confirmar Atendimento (Ctrl+Enter)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Registrar Não Atendimento */}
      <Dialog
        open={dialogNaoAtender}
        onClose={() => setDialogNaoAtender(false)}
        maxWidth="sm"
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey && !processando && dataResposta) {
            e.preventDefault();
            handleNaoAtender();
          }
        }}
      >
        <DialogTitle>Registrar Não Atendimento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A SEMAD não atendeu a demanda. Informe os detalhes:
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Pressione Ctrl+Enter para confirmar
          </Typography>
          <TextField
            fullWidth
            type="date"
            label="Data da Resposta"
            value={dataResposta}
            onChange={(e) => setDataResposta(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2, mb: 2 }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !processando && dataResposta) {
                e.preventDefault();
                handleNaoAtender();
              }
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Motivo (opcional)"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Sem disponibilidade orçamentária"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !processando && dataResposta) {
                e.preventDefault();
                handleNaoAtender();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNaoAtender(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleNaoAtender}
            variant="contained"
            color="error"
            disabled={processando || !dataResposta}
          >
            {processando ? 'Registrando...' : 'Confirmar Não Atendimento (Ctrl+Enter)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Edição */}
      <DemandaFormModal
        open={modalEdicao}
        onClose={() => setModalEdicao(false)}
        onSuccess={handleSuccessEdicao}
        demandaId={demandaId}
      />

      {/* Diálogo: Excluir */}
      <Dialog 
        open={dialogExcluir} 
        onClose={() => setDialogExcluir(false)} 
        maxWidth="sm" 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !processando) {
            e.preventDefault();
            e.stopPropagation();
            handleExcluir();
          }
        }}
      >
        <DialogTitle>Excluir Demanda</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Pressione Enter para confirmar ou Esc para cancelar
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogExcluir(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleExcluir}
            variant="contained"
            color="error"
            disabled={processando}
          >
            {processando ? 'Excluindo...' : 'Confirmar Exclusão (Enter)'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}