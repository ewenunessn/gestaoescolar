import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    TextField,
    Typography,
    Alert
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Send as SendIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import demandasService from '../services/demandas';
import { Demanda, STATUS_DEMANDA } from '../types/demanda';
import { formatarData } from '../utils/dateUtils';

export default function DemandaDetalhe() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
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

    // Campos dos diálogos
    const [dataEnvio, setDataEnvio] = useState('');
    const [motivoRecusa, setMotivoRecusa] = useState('');
    const [dataResposta, setDataResposta] = useState('');
    const [observacoes, setObservacoes] = useState('');

    useEffect(() => {
        carregarDemanda();
    }, [id]);

    const carregarDemanda = async () => {
        try {
            setLoading(true);
            const dados = await demandasService.buscarPorId(Number(id));
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
            await demandasService.atualizar(Number(id), {
                data_semead: dataEnvio,
                status: 'enviado_semead'
            });
            setDialogEnviar(false);
            queryClient.invalidateQueries({ queryKey: ['demandas'] });
            await carregarDemanda();
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
            await demandasService.atualizar(Number(id), {
                status: 'nao_atendido',
                observacoes: `RECUSADO IMEDIATAMENTE: ${motivoRecusa}`
            });
            setDialogRecusar(false);
            queryClient.invalidateQueries({ queryKey: ['demandas'] });
            await carregarDemanda();
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
            await demandasService.atualizar(Number(id), {
                status: 'atendido',
                data_resposta_semead: dataResposta,
                observacoes: observacoes || demanda?.observacoes
            });
            setDialogAtender(false);
            queryClient.invalidateQueries({ queryKey: ['demandas'] });
            await carregarDemanda();
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
            await demandasService.atualizar(Number(id), {
                status: 'nao_atendido',
                data_resposta_semead: dataResposta,
                observacoes: observacoes || demanda?.observacoes
            });
            setDialogNaoAtender(false);
            queryClient.invalidateQueries({ queryKey: ['demandas'] });
            await carregarDemanda();
        } catch (error: any) {
            console.error('Erro ao registrar:', error);
            setErro(error.response?.data?.message || 'Erro ao registrar não atendimento');
        } finally {
            setProcessando(false);
        }
    };

    const handleExcluir = async () => {
        try {
            setProcessando(true);
            await demandasService.excluir(Number(id));
            navigate('/demandas');
        } catch (error: any) {
            console.error('Erro ao excluir:', error);
            setErro(error.response?.data?.message || 'Erro ao excluir demanda');
            setDialogExcluir(false);
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

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Carregando...</Typography>
            </Box>
        );
    }

    if (!demanda) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Demanda não encontrada</Alert>
            </Box>
        );
    }

    const ehPendente = demanda.status === 'pendente';
    const ehEnviado = demanda.status === 'enviado_semead';
    const ehFinalizado = demanda.status === 'atendido' || demanda.status === 'nao_atendido';

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={() => navigate('/demandas')} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                    Demanda {demanda.numero_oficio}
                </Typography>
                {getStatusChip(demanda.status)}
            </Box>

            {erro && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
                    {erro}
                </Alert>
            )}

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
                                <Typography variant="body2" color="text.secondary">Dias desde a Solicitação</Typography>
                                <Chip label={`${demanda.dias_solicitacao} dias`} color="primary" />
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
                                            Registrar Envio à SEMAD
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={<CancelIcon />}
                                            onClick={() => setDialogRecusar(true)}
                                            disabled={processando}
                                        >
                                            Recusar Imediatamente
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
                                            Registrar Atendimento
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={<CancelIcon />}
                                            onClick={() => setDialogNaoAtender(true)}
                                            disabled={processando}
                                        >
                                            Registrar Não Atendimento
                                        </Button>
                                    </>
                                )}

                                {/* Botões sempre disponíveis */}
                                <Button
                                    variant="outlined"
                                    startIcon={<EditIcon />}
                                    onClick={() => navigate(`/demandas/${id}/editar`)}
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
                                    Excluir
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Diálogo: Registrar Envio à SEMAD */}
            <Dialog open={dialogEnviar} onClose={() => setDialogEnviar(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Registrar Envio à SEMAD</DialogTitle>
                <DialogContent>
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
                        sx={{ mt: 2 }}
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
                        {processando ? 'Registrando...' : 'Confirmar Envio'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo: Recusar Imediatamente */}
            <Dialog open={dialogRecusar} onClose={() => setDialogRecusar(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Recusar Demanda</DialogTitle>
                <DialogContent>
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
                        sx={{ mt: 2 }}
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
                        {processando ? 'Registrando...' : 'Confirmar Recusa'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo: Registrar Atendimento */}
            <Dialog open={dialogAtender} onClose={() => setDialogAtender(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Registrar Atendimento</DialogTitle>
                <DialogContent>
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
                        sx={{ mt: 2, mb: 2 }}
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
                        {processando ? 'Registrando...' : 'Confirmar Atendimento'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo: Registrar Não Atendimento */}
            <Dialog open={dialogNaoAtender} onClose={() => setDialogNaoAtender(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Registrar Não Atendimento</DialogTitle>
                <DialogContent>
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
                        sx={{ mt: 2, mb: 2 }}
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
                        {processando ? 'Registrando...' : 'Confirmar Não Atendimento'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo: Excluir */}
            <Dialog open={dialogExcluir} onClose={() => setDialogExcluir(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Excluir Demanda</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita.
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
                        {processando ? 'Excluindo...' : 'Confirmar Exclusão'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
