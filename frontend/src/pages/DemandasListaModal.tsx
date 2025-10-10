import { useState, useEffect } from 'react';
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
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import demandasService from '../services/demandas';
import { listarEscolas } from '../services/escolas';
import { Demanda, STATUS_DEMANDA } from '../types/demanda';
import { formatarData } from '../utils/dateUtils';

export default function DemandasListaModal() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);
  
  // Filtros
  const [filtroEscola, setFiltroEscola] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // Modais
  const [modalNova, setModalNova] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalEnviar, setModalEnviar] = useState(false);
  const [modalRecusar, setModalRecusar] = useState(false);
  const [modalAtender, setModalAtender] = useState(false);
  const [modalNaoAtender, setModalNaoAtender] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);

  // Demanda selecionada
  const [demandaSelecionada, setDemandaSelecionada] = useState<Demanda | null>(null);

  // Formulário
  const [formData, setFormData] = useState({
    escola_id: '',
    numero_oficio: '',
    data_solicitacao: new Date().toISOString().split('T')[0],
    objeto: '',
    descricao_itens: '',
    observacoes: ''
  });

  // Campos de ação
  const [dataEnvio, setDataEnvio] = useState('');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [dataResposta, setDataResposta] = useState('');
  const [observacoesAcao, setObservacoesAcao] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [demandasData, escolasData] = await Promise.all([
        demandasService.listar(),
        listarEscolas()
      ]);
      setDemandas(demandasData);
      setEscolas(escolasData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setErro('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      const demandas = await demandasService.listar({
        escola_id: filtroEscola ? Number(filtroEscola) : undefined,
        status: filtroStatus || undefined,
        data_inicio: filtroDataInicio || undefined,
        data_fim: filtroDataFim || undefined
      });
      setDemandas(demandas);
    } catch (error: any) {
      console.error('Erro ao filtrar:', error);
      setErro('Erro ao aplicar filtros');
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = () => {
    setFiltroEscola('');
    setFiltroStatus('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    carregarDados();
  };

  const handleNovaDemanda = () => {
    setFormData({
      escola_id: '',
      numero_oficio: '',
      data_solicitacao: new Date().toISOString().split('T')[0],
      objeto: '',
      descricao_itens: '',
      observacoes: ''
    });
    setModalNova(true);
  };

  const handleEditarDemanda = (demanda: Demanda) => {
    setDemandaSelecionada(demanda);
    setFormData({
      escola_id: demanda.escola_id.toString(),
      numero_oficio: demanda.numero_oficio,
      data_solicitacao: demanda.data_solicitacao,
      objeto: demanda.objeto,
      descricao_itens: demanda.descricao_itens,
      observacoes: demanda.observacoes || ''
    });
    setModalEditar(true);
  };

  const handleVerDetalhes = (demanda: Demanda) => {
    setDemandaSelecionada(demanda);
    setDataEnvio(new Date().toISOString().split('T')[0]);
    setDataResposta(new Date().toISOString().split('T')[0]);
    setModalDetalhes(true);
  };

  const handleSalvarDemanda = async () => {
    try {
      setProcessando(true);
      const dados = {
        ...formData,
        escola_id: Number(formData.escola_id)
      };

      if (demandaSelecionada) {
        await demandasService.atualizar(demandaSelecionada.id, dados);
      } else {
        await demandasService.criar(dados);
      }

      setModalNova(false);
      setModalEditar(false);
      await carregarDados();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setErro(error.response?.data?.message || 'Erro ao salvar demanda');
    } finally {
      setProcessando(false);
    }
  };

  const handleEnviarSemead = async () => {
    if (!demandaSelecionada) return;
    try {
      setProcessando(true);
      await demandasService.atualizar(demandaSelecionada.id, {
        data_semead: dataEnvio,
        status: 'enviado_semead'
      });
      setModalEnviar(false);
      setModalDetalhes(false);
      await carregarDados();
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao registrar envio');
    } finally {
      setProcessando(false);
    }
  };

  const handleRecusarImediata = async () => {
    if (!demandaSelecionada) return;
    try {
      setProcessando(true);
      await demandasService.atualizar(demandaSelecionada.id, {
        status: 'nao_atendido',
        observacoes: `RECUSADO IMEDIATAMENTE: ${motivoRecusa}`
      });
      setModalRecusar(false);
      setModalDetalhes(false);
      await carregarDados();
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao registrar recusa');
    } finally {
      setProcessando(false);
    }
  };

  const handleAtender = async () => {
    if (!demandaSelecionada) return;
    try {
      setProcessando(true);
      await demandasService.atualizar(demandaSelecionada.id, {
        status: 'atendido',
        data_resposta_semead: dataResposta,
        observacoes: observacoesAcao || demandaSelecionada.observacoes
      });
      setModalAtender(false);
      setModalDetalhes(false);
      await carregarDados();
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao registrar atendimento');
    } finally {
      setProcessando(false);
    }
  };

  const handleNaoAtender = async () => {
    if (!demandaSelecionada) return;
    try {
      setProcessando(true);
      await demandasService.atualizar(demandaSelecionada.id, {
        status: 'nao_atendido',
        data_resposta_semead: dataResposta,
        observacoes: observacoesAcao || demandaSelecionada.observacoes
      });
      setModalNaoAtender(false);
      setModalDetalhes(false);
      await carregarDados();
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao registrar não atendimento');
    } finally {
      setProcessando(false);
    }
  };

  const handleExcluir = async () => {
    if (!demandaSelecionada) return;
    try {
      setProcessando(true);
      await demandasService.excluir(demandaSelecionada.id);
      setModalExcluir(false);
      setModalDetalhes(false);
      await carregarDados();
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao excluir demanda');
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
        size="small"
      />
    );
  };

  const ehPendente = demandaSelecionada?.status === 'pendente';
  const ehEnviado = demandaSelecionada?.status === 'enviado_semead';

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Demandas das Escolas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNovaDemanda}
        >
          Nova Demanda
        </Button>
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterListIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Filtros</Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Escola</InputLabel>
                <Select
                  value={filtroEscola}
                  onChange={(e) => setFiltroEscola(e.target.value)}
                  label="Escola"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {escolas.map((escola) => (
                    <MenuItem key={escola.id} value={escola.id}>
                      {escola.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="enviado_semead">Enviado à SEMEAD</MenuItem>
                  <MenuItem value="atendido">Atendido</MenuItem>
                  <MenuItem value="nao_atendido">Não Atendido</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Data Início"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Data Fim"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={aplicarFiltros}
                  fullWidth
                >
                  Filtrar
                </Button>
                <Button
                  variant="outlined"
                  onClick={limparFiltros}
                  fullWidth
                >
                  Limpar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Solicitante</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nº Ofício</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Data Solicitação à SEMED</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Data Envio à SEMEAD</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Objeto</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Descrição</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Data Resposta</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Dias</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {demandas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Nenhuma demanda encontrada
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              demandas.map((demanda) => (
                <TableRow key={demanda.id} hover>
                  <TableCell>{demanda.escola_nome}</TableCell>
                  <TableCell>{demanda.numero_oficio}</TableCell>
                  <TableCell>{formatarData(demanda.data_solicitacao)}</TableCell>
                  <TableCell>{demanda.data_semead ? formatarData(demanda.data_semead) : '-'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {demanda.objeto}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                      {demanda.descricao_itens}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {demanda.data_resposta_semead ? formatarData(demanda.data_resposta_semead) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={`${demanda.dias_solicitacao} dias`} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    {getStatusChip(demanda.status)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleVerDetalhes(demanda)}
                      title="Visualizar"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEditarDemanda(demanda)}
                      title="Editar"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setDemandaSelecionada(demanda);
                        setModalExcluir(true);
                      }}
                      title="Excluir"
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

      {/* CONTINUA... */}
    </Box>
  );
}
