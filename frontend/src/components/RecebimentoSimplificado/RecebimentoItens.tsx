import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  Add,
  History,
  CheckCircle,
  Schedule,
  Warning,
  Assignment,
  LocalShipping,
  HourglassEmpty,
  Done,
  Error as ErrorIcon,
  ArrowBack,
  CloudUpload,
  Inventory,
  CalendarToday,
  Save
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

interface RecebimentoItem {
  id: number;
  pedido_item_id: number;
  produto_id: number;
  fornecedor_id: number;
  quantidade_esperada: number;
  quantidade_recebida: number;
  data_ultimo_recebimento?: string;
  usuario_ultimo_recebimento?: number;
  observacoes?: string;
  status: 'PENDENTE' | 'PARCIAL' | 'RECEBIDO' | 'EXCEDENTE';
  nome_produto?: string;
  unidade?: string;
  nome_fornecedor?: string;
  nome_usuario?: string;
}

interface Estatisticas {
  total_itens: number;
  itens_pendentes: number;
  itens_parciais: number;
  itens_recebidos: number; // Backend usa itens_recebidos, não itens_completos
  itens_excedentes: number;
  percentual_recebido: number; // Backend usa percentual_recebido, não percentual_completo
  quantidade_total: number;
  quantidade_recebida: number;
  total_fornecedores: number;
  fornecedores_faturados: number;
}

interface HistoricoRegistro {
  data: string; // Backend usa 'data', não 'data_recebimento'
  acao: string;
  descricao: string;
  quantidade: number | string; // Pode ser number (do backend) ou string
  usuario: string;
}

const RecebimentoItens: React.FC = () => {
  const { pedido_id } = useParams();
  const navigate = useNavigate();

  const [itens, setItens] = useState<RecebimentoItem[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para formatar quantidades removendo zeros desnecessários
  const formatarQuantidade = (quantidade: number | string): string => {
    const num = typeof quantidade === 'string' ? parseFloat(quantidade) : quantidade;
    if (isNaN(num)) return '0';
    
    // Remove zeros desnecessários após o ponto decimal
    return num % 1 === 0 ? num.toString() : num.toFixed(3).replace(/\.?0+$/, '');
  };

  // Estados do modal de recebimento
  const [modalAberto, setModalAberto] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<RecebimentoItem | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Estados do stepper
  const [activeStep, setActiveStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<{ [key: number]: string }>({});

  // Estados do modal de histórico
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [historico, setHistorico] = useState<HistoricoRegistro[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  useEffect(() => {
    if (!pedido_id || pedido_id === 'undefined') {
      setError('ID do pedido não fornecido. Redirecionando...');
      setTimeout(() => {
        navigate('/recebimento-simples');
      }, 2000);
      return;
    }

    carregarItens();
  }, [pedido_id, navigate]);

  const carregarItens = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      console.log('🔍 Debug - Carregando itens para pedido:', pedido_id);
      console.log('🔍 Debug - Token existe:', !!token);

      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.');
      }

      const url = `/api/recebimento-simples/pedido/${pedido_id}/itens`;
      console.log('🔍 Debug - URL da requisição:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Debug - Status da resposta:', response.status);
      console.log('🔍 Debug - Headers da resposta:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        let errorMessage = 'Erro ao carregar itens';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const textResponse = await response.text();
          if (textResponse.includes('<!DOCTYPE')) {
            errorMessage = 'Erro de servidor. Verifique se o backend está rodando.';
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('🔍 Debug - Dados recebidos:', data);
      console.log('🔍 Debug - Estrutura data.data:', data.data);
      console.log('🔍 Debug - Itens encontrados:', data.data?.itens?.length || 0);
      console.log('🔍 Debug - Estatísticas:', data.data?.estatisticas);

      setItens(data.data.itens || []);
      setEstatisticas(data.data.estatisticas || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalRecebimento = (item: RecebimentoItem) => {
    setItemSelecionado(item);
    setQuantidade('');
    setDataValidade('');
    setObservacoes('');
    setComprovante(null);
    setActiveStep(0);
    setStepErrors({});
    setModalAberto(true);
  };

  const fecharModalRecebimento = () => {
    setModalAberto(false);
    setItemSelecionado(null);
    setActiveStep(0);
    setStepErrors({});
  };

  // Funções do stepper
  const validarStep = (step: number): boolean => {
    const errors: { [key: number]: string } = {};

    switch (step) {
      case 0: // Quantidade
        if (!quantidade || parseFloat(quantidade) <= 0) {
          errors[0] = 'Informe uma quantidade válida';
        } else if (itemSelecionado && parseFloat(quantidade) > (itemSelecionado.quantidade_esperada - itemSelecionado.quantidade_recebida)) {
          errors[0] = `Quantidade excede o saldo pendente (${itemSelecionado.quantidade_esperada - itemSelecionado.quantidade_recebida})`;
        }
        break;

      case 1: // Data de validade (obrigatória)
        if (!dataValidade) {
          errors[1] = 'Data de validade é obrigatória';
        } else {
          const hoje = new Date();
          const validade = new Date(dataValidade);
          if (validade <= hoje) {
            errors[1] = 'Data de validade deve ser futura';
          }
        }
        break;
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validarStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setStepErrors({});
  };

  const handleStepClick = (step: number) => {
    // Permitir navegar apenas para steps anteriores ou se o atual for válido
    if (step < activeStep || validarStep(activeStep)) {
      setActiveStep(step);
    }
  };

  const registrarRecebimento = async () => {
    console.log('🔍 Validando dados para recebimento:', {
      itemSelecionado: !!itemSelecionado,
      quantidade,
      quantidadeNum: Number(quantidade),
      dataValidade,
      observacoes
    });

    if (!itemSelecionado || !quantidade || Number(quantidade) <= 0 || !dataValidade) {
      console.log('❌ Validação básica falhou');
      return;
    }

    // Validar todos os steps antes de salvar
    const step0Valid = validarStep(0);
    const step1Valid = validarStep(1);
    console.log('🔍 Validação dos steps:', { step0Valid, step1Valid });

    if (!step0Valid || !step1Valid) {
      console.log('❌ Validação dos steps falhou');
      return;
    }

    try {
      setSalvando(true);

      const dados = {
        quantidade: parseFloat(quantidade),
        numero_lote: `LOTE-${Date.now()}`, // Gerar número do lote automaticamente
        data_validade: dataValidade || null,
        observacoes: observacoes || null
      };

      console.log('📦 Enviando dados para recebimento:', dados);

      const response = await fetch(`/api/recebimento-simples/item/${itemSelecionado.pedido_item_id}/receber`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Recebimento registrado:', result);

      fecharModalRecebimento();
      await carregarItens(); // Recarregar dados

    } catch (err) {
      console.error('❌ Erro ao registrar recebimento:', err);
      setError(err instanceof Error ? err.message : 'Erro ao registrar recebimento');
    } finally {
      setSalvando(false);
    }
  };

  const abrirHistorico = async (item: RecebimentoItem) => {
    try {
      setCarregandoHistorico(true);
      setHistoricoAberto(true);
      setItemSelecionado(item);

      const response = await fetch(`/api/recebimento-simples/item/${item.pedido_item_id}/historico`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico');
      }

      const data = await response.json();
      console.log('📋 Dados do histórico recebidos:', data);

      // O backend retorna { success: true, data: { item: {...}, historico: [...] } }
      const historicoData = data.data?.historico || data.historico || [];
      const historicoArray = Array.isArray(historicoData) ? historicoData : [];

      console.log('📋 Histórico processado:', historicoArray);
      setHistorico(historicoArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const getStatusColor = (status: string): 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'PENDENTE': return 'error';
      case 'PARCIAL': return 'warning';
      case 'RECEBIDO': return 'success';
      case 'EXCEDENTE': return 'info';
      default: return 'primary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDENTE': return <Schedule />;
      case 'PARCIAL': return <Warning />;
      case 'RECEBIDO': return <CheckCircle />;
      case 'EXCEDENTE': return <ErrorIcon />;
      default: return <Schedule />;
    }
  };

  const getTimelineIcon = (acao: string) => {
    switch (acao) {
      case 'PEDIDO_CRIADO':
        return <Assignment />;
      case 'RECEBIMENTO_COMPLETO':
        return <Done />;
      case 'RECEBIMENTO_PARCIAL':
        return <LocalShipping />;
      case 'STATUS_ATUAL':
        return <HourglassEmpty />;
      default:
        return <CheckCircle />;
    }
  };

  const getTimelineColor = (acao: string): 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' => {
    switch (acao) {
      case 'PEDIDO_CRIADO':
        return 'primary';
      case 'RECEBIMENTO_COMPLETO':
        return 'success';
      case 'RECEBIMENTO_PARCIAL':
        return 'warning';
      case 'STATUS_ATUAL':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'Pendente';
      case 'PARCIAL': return 'Parcial';
      case 'RECEBIDO': return 'Completo';
      case 'EXCEDENTE': return 'Excedente';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando itens...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={carregarItens} sx={{ ml: 2 }}>
          Tentar Novamente
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/recebimento-simples')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" fontWeight="bold">
          📦 Receber Itens - Pedido #{pedido_id}
        </Typography>
      </Box>



      {/* Lista de Itens */}
      <Grid container spacing={2}>
        {itens.map((item) => (
          <Grid item xs={12} key={item.id}>
            <Card
              variant="outlined"
              sx={{
                transition: 'all 0.2s',
                '&:hover': { boxShadow: 2 }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {item.nome_produto}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fornecedor: {item.nome_fornecedor}
                    </Typography>
                  </Box>
                  <Chip
                    icon={getStatusIcon(item.status)}
                    label={getStatusLabel(item.status)}
                    color={getStatusColor(item.status)}
                    size="small"
                  />
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Esperado</Typography>
                    <Typography variant="h6">{formatarQuantidade(item.quantidade_esperada)} {item.unidade}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Recebido</Typography>
                    <Typography variant="h6" color="primary.main">
                      {formatarQuantidade(item.quantidade_recebida)} {item.unidade}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">Pendente</Typography>
                    <Typography variant="h6" color="warning.main">
                      {formatarQuantidade(Math.max(0, item.quantidade_esperada - item.quantidade_recebida))} {item.unidade}
                    </Typography>
                  </Grid>
                </Grid>

                {item.data_ultimo_recebimento && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Último recebimento: {new Date(item.data_ultimo_recebimento).toLocaleString()}
                    {item.nome_usuario && ` por ${item.nome_usuario}`}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => abrirModalRecebimento(item)}
                    disabled={item.status === 'RECEBIDO'}
                  >
                    {item.status === 'PENDENTE' ? 'Receber' : 'Receber Mais'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<History />}
                    onClick={() => abrirHistorico(item)}
                    disabled={item.quantidade_recebida === 0}
                  >
                    Histórico
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Modal de Recebimento com Stepper */}
      <Dialog open={modalAberto} onClose={fecharModalRecebimento} maxWidth="md" fullWidth>
        <DialogTitle>
          📦 Registrar Recebimento
        </DialogTitle>
        <DialogContent>
          {itemSelecionado && (
            <Box sx={{ pt: 1 }}>
              {/* Informações do Produto */}
              <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {itemSelecionado.nome_produto}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Fornecedor: {itemSelecionado.nome_fornecedor}
                  </Typography>

                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Esperado</Typography>
                      <Typography variant="h6">{formatarQuantidade(itemSelecionado.quantidade_esperada)} {itemSelecionado.unidade}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Já Recebido</Typography>
                      <Typography variant="h6" color="success.main">{formatarQuantidade(itemSelecionado.quantidade_recebida)} {itemSelecionado.unidade}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Pendente</Typography>
                      <Typography variant="h6" color="warning.main">
                        {formatarQuantidade(Math.max(0, itemSelecionado.quantidade_esperada - itemSelecionado.quantidade_recebida))} {itemSelecionado.unidade}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Stepper */}
              <Stepper activeStep={activeStep} orientation="vertical">
                {/* Step 1: Quantidade */}
                <Step>
                  <StepLabel
                    onClick={() => handleStepClick(0)}
                    sx={{ cursor: 'pointer' }}
                    error={!!stepErrors[0]}
                  >
                    <Box display="flex" alignItems="center">
                      <Inventory sx={{ mr: 1 }} />
                      Quantidade a Receber
                    </Box>
                  </StepLabel>
                  <StepContent>
                    <TextField
                      label={`Quantidade (${itemSelecionado.unidade})`}
                      type="number"
                      value={quantidade}
                      onChange={(e) => {
                        setQuantidade(e.target.value);
                        if (stepErrors[0]) {
                          const newErrors = { ...stepErrors };
                          delete newErrors[0];
                          setStepErrors(newErrors);
                        }
                      }}
                      fullWidth
                      required
                      error={!!stepErrors[0]}
                      helperText={stepErrors[0] || `Máximo: ${formatarQuantidade(Math.max(0, itemSelecionado.quantidade_esperada - itemSelecionado.quantidade_recebida))} ${itemSelecionado.unidade}`}
                      inputProps={{ min: 0.01, step: 0.01 }}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ mb: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Continuar
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                {/* Step 2: Data de Validade (Obrigatória) */}
                <Step>
                  <StepLabel
                    onClick={() => handleStepClick(1)}
                    sx={{ cursor: activeStep >= 1 ? 'pointer' : 'default' }}
                    error={!!stepErrors[1]}
                  >
                    <Box display="flex" alignItems="center">
                      <CalendarToday sx={{ mr: 1 }} />
                      Data de Validade *
                    </Box>
                  </StepLabel>
                  <StepContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      A data de validade é obrigatória para controle de estoque e segurança alimentar.
                    </Alert>
                    <TextField
                      label="Data de Validade"
                      type="date"
                      value={dataValidade}
                      onChange={(e) => {
                        setDataValidade(e.target.value);
                        if (stepErrors[1]) {
                          const newErrors = { ...stepErrors };
                          delete newErrors[1];
                          setStepErrors(newErrors);
                        }
                      }}
                      fullWidth
                      required
                      error={!!stepErrors[1]}
                      helperText={stepErrors[1] || 'Informe a data de validade do produto'}
                      InputLabelProps={{ shrink: true }}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ mb: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Continuar
                      </Button>
                      <Button
                        onClick={handleBack}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Voltar
                      </Button>
                    </Box>
                  </StepContent>
                </Step>

                {/* Step 3: Informações Adicionais */}
                <Step>
                  <StepLabel
                    onClick={() => handleStepClick(2)}
                    sx={{ cursor: activeStep >= 2 ? 'pointer' : 'default' }}
                  >
                    <Box display="flex" alignItems="center">
                      <Save sx={{ mr: 1 }} />
                      Informações Adicionais
                    </Box>
                  </StepLabel>
                  <StepContent>
                    <TextField
                      label="Observações (opcional)"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Ex: Produto em boas condições, embalagem íntegra..."
                      sx={{ mb: 2 }}
                    />

                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<CloudUpload />}
                        fullWidth
                      >
                        {comprovante ? `📄 ${comprovante.name}` : '📄 Anexar Comprovante (opcional)'}
                        <input
                          type="file"
                          hidden
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => setComprovante(e.target.files?.[0] || null)}
                        />
                      </Button>
                      {comprovante && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Arquivo selecionado: {comprovante.name}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ mb: 1 }}>
                      <Button
                        variant="contained"
                        onClick={registrarRecebimento}
                        disabled={salvando}
                        startIcon={salvando ? <CircularProgress size={16} /> : <Save />}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        {salvando ? 'Salvando...' : 'Finalizar Recebimento'}
                      </Button>
                      <Button
                        onClick={handleBack}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Voltar
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharModalRecebimento} disabled={salvando}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Histórico */}
      <Dialog open={historicoAberto} onClose={() => setHistoricoAberto(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History color="primary" />
            <Typography variant="h6">
              Histórico de Recebimentos
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {itemSelecionado && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {itemSelecionado.nome_produto}
              </Typography>

              {carregandoHistorico ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : !Array.isArray(historico) || historico.length === 0 ? (
                <Alert severity="info">
                  Nenhum recebimento registrado ainda.
                </Alert>
              ) : (
                <Timeline position="right">
                  {historico.map((registro, index) => (
                    <TimelineItem key={index}>
                      <TimelineOppositeContent
                        sx={{ m: 'auto 0' }}
                        align="right"
                        variant="body2"
                        color="text.secondary"
                      >
                        {new Date(registro.data).toLocaleString('pt-BR')}
                      </TimelineOppositeContent>

                      <TimelineSeparator>
                        <TimelineDot color={getTimelineColor(registro.acao)}>
                          {getTimelineIcon(registro.acao)}
                        </TimelineDot>
                        {index < historico.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>

                      <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Typography variant="h6" component="span" color={getTimelineColor(registro.acao)}>
                          {registro.acao === 'PEDIDO_CRIADO' && 'Pedido Criado'}
                          {registro.acao === 'RECEBIMENTO_COMPLETO' && 'Recebimento Completo'}
                          {registro.acao === 'RECEBIMENTO_PARCIAL' && 'Recebimento Parcial'}
                          {registro.acao === 'STATUS_ATUAL' && 'Status Atual'}
                          {!['PEDIDO_CRIADO', 'RECEBIMENTO_COMPLETO', 'RECEBIMENTO_PARCIAL', 'STATUS_ATUAL'].includes(registro.acao) && 'Recebimento'}
                        </Typography>

                        <Typography variant="body1" sx={{ mt: 1, mb: 1 }}>
                          {registro.descricao}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Chip
                            label={`${formatarQuantidade(registro.quantidade)} ${itemSelecionado?.unidade || 'UN'}`}
                            size="small"
                            color={getTimelineColor(registro.acao)}
                            variant="outlined"
                          />
                          <Chip
                            label={registro.usuario}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoricoAberto(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecebimentoItens;