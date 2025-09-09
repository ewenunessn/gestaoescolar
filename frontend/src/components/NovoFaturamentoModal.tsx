import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import faturamentoInterfaceService from '../services/faturamentoInterfaceService';
import {
  ContratoDisponivel,
  ModalidadeFaturamento,
  ItemFaturamentoAgrupado,
  NovoFaturamentoRequest,
  ModalidadeSelecionada
} from '../types/faturamentoInterface';

interface NovoFaturamentoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NovoFaturamentoModal: React.FC<NovoFaturamentoModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dados do formulário
  const [contratos, setContratos] = useState<ContratoDisponivel[]>([]);
  const [modalidades, setModalidades] = useState<ModalidadeFaturamento[]>([]);
  const [itensContrato, setItensContrato] = useState<ItemFaturamentoAgrupado[]>([]);
  
  // Seleções do usuário
  const [contratoSelecionado, setContratoSelecionado] = useState<number | null>(null);
  const [modalidadesSelecionadas, setModalidadesSelecionadas] = useState<ModalidadeSelecionada[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<number[]>([]);
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (open) {
      carregarDadosIniciais();
    } else {
      resetForm();
    }
  }, [open]);

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [contratosResponse, modalidadesResponse] = await Promise.all([
        faturamentoInterfaceService.listarContratosDisponiveis({ status: 'ativo' }),
        faturamentoInterfaceService.listarModalidades({ ativa: true })
      ]);
      
      setContratos(contratosResponse.data);
      setModalidades(modalidadesResponse);
    } catch (err) {
      setError('Erro ao carregar dados iniciais');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const carregarItensContrato = async (contratoId: number) => {
    try {
      setLoading(true);
      const itens = await faturamentoInterfaceService.buscarItensContrato(contratoId);
      setItensContrato(itens);
    } catch (err) {
      setError('Erro ao carregar itens do contrato');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setContratoSelecionado(null);
    setModalidadesSelecionadas([]);
    setItensSelecionados([]);
    setObservacoes('');
    setItensContrato([]);
    setError(null);
    setSuccess(null);
  };

  const handleContratoChange = async (contratoId: number) => {
    setContratoSelecionado(contratoId);
    if (contratoId) {
      await carregarItensContrato(contratoId);
    } else {
      setItensContrato([]);
    }
  };

  const adicionarModalidade = () => {
    setModalidadesSelecionadas(prev => [
      ...prev,
      { modalidade_id: 0, percentual: 0 }
    ]);
  };

  const removerModalidade = (index: number) => {
    setModalidadesSelecionadas(prev => prev.filter((_, i) => i !== index));
  };

  const atualizarModalidade = (index: number, campo: keyof ModalidadeSelecionada, valor: any) => {
    setModalidadesSelecionadas(prev => prev.map((modalidade, i) => 
      i === index ? { ...modalidade, [campo]: valor } : modalidade
    ));
  };

  const toggleItemSelecionado = (itemId: number) => {
    setItensSelecionados(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selecionarTodosItens = () => {
    const todosIds = itensContrato.map(item => item.id);
    setItensSelecionados(todosIds);
  };

  const desselecionarTodosItens = () => {
    setItensSelecionados([]);
  };

  const calcularValorTotal = () => {
    return itensContrato
      .filter(item => itensSelecionados.includes(item.id))
      .reduce((total, item) => total + item.valor_total, 0);
  };

  const validarFormulario = (): string | null => {
    if (!contratoSelecionado) return 'Selecione um contrato';
    if (modalidadesSelecionadas.length === 0) return 'Adicione pelo menos uma modalidade';
    if (itensSelecionados.length === 0) return 'Selecione pelo menos um item';
    
    // Validar modalidades
    for (const modalidade of modalidadesSelecionadas) {
      if (!modalidade.modalidade_id) return 'Selecione todas as modalidades';
      if (modalidade.percentual <= 0) return 'Todos os percentuais devem ser maiores que zero';
    }
    
    // Validar soma dos percentuais
    if (!faturamentoInterfaceService.validarModalidades(modalidadesSelecionadas)) {
      return 'A soma dos percentuais das modalidades deve ser 100%';
    }
    
    return null;
  };

  const handleSubmit = async () => {
    const erro = validarFormulario();
    if (erro) {
      setError(erro);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const contrato = contratos.find(c => c.id === contratoSelecionado);
      if (!contrato) throw new Error('Contrato não encontrado');
      
      const dados: NovoFaturamentoRequest = {
        contrato_id: contratoSelecionado!,
        fornecedor_id: contrato.fornecedor_id,
        modalidades: modalidadesSelecionadas,
        itens_selecionados: itensSelecionados,
        observacoes: observacoes || undefined
      };
      
      const response = await faturamentoInterfaceService.criarNovoFaturamento(dados);
      setSuccess(`Faturamento criado com sucesso! ID: ${response.faturamento_id}`);
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar faturamento');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const somaPercentuais = modalidadesSelecionadas.reduce((soma, m) => soma + m.percentual, 0);
  const valorTotal = calcularValorTotal();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Criar Novo Faturamento</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {!loading && (
          <Box>
            {/* Etapa 1: Seleção de Contrato */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  1. Selecionar Contrato
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Contrato</InputLabel>
                  <Select
                    value={contratoSelecionado || ''}
                    label="Contrato"
                    onChange={(e) => handleContratoChange(Number(e.target.value))}
                  >
                    {contratos.map((contrato) => (
                      <MenuItem key={contrato.id} value={contrato.id}>
                        {contrato.numero} - {contrato.fornecedor_nome} ({formatCurrency(contrato.valor_total)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            {/* Etapa 2: Seleção de Itens */}
            {contratoSelecionado && itensContrato.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      2. Selecionar Itens ({itensSelecionados.length} de {itensContrato.length})
                    </Typography>
                    <Box>
                      <Button size="small" onClick={selecionarTodosItens} sx={{ mr: 1 }}>
                        Selecionar Todos
                      </Button>
                      <Button size="small" onClick={desselecionarTodosItens}>
                        Desselecionar Todos
                      </Button>
                    </Box>
                  </Box>
                  
                  <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">Selecionar</TableCell>
                          <TableCell>Produto</TableCell>
                          <TableCell align="right">Qtd. Pedida</TableCell>
                          <TableCell align="right">Qtd. Recebida</TableCell>
                          <TableCell align="center">Status</TableCell>
                          <TableCell align="right">Valor Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {itensContrato.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={itensSelecionados.includes(item.id)}
                                onChange={() => toggleItemSelecionado(item.id)}
                              />
                            </TableCell>
                            <TableCell>{item.produto_nome}</TableCell>
                            <TableCell align="right">{item.quantidade_pedida}</TableCell>
                            <TableCell align="right">{item.quantidade_recebida}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={item.status_recebimento}
                                size="small"
                                color={
                                  item.status_recebimento === 'completo' ? 'success' :
                                  item.status_recebimento === 'parcial' ? 'warning' : 'error'
                                }
                              />
                            </TableCell>
                            <TableCell align="right">{formatCurrency(item.valor_total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {itensSelecionados.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="body1" fontWeight="bold">
                        Valor Total Selecionado: {formatCurrency(valorTotal)}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Etapa 3: Configuração de Modalidades */}
            {itensSelecionados.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      3. Configurar Modalidades
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={adicionarModalidade}
                      variant="outlined"
                      size="small"
                    >
                      Adicionar Modalidade
                    </Button>
                  </Box>
                  
                  {modalidadesSelecionadas.map((modalidadeSel, index) => (
                    <Box key={index} mb={2}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={5}>
                          <FormControl fullWidth>
                            <InputLabel>Modalidade</InputLabel>
                            <Select
                              value={modalidadeSel.modalidade_id}
                              label="Modalidade"
                              onChange={(e) => atualizarModalidade(index, 'modalidade_id', Number(e.target.value))}
                            >
                              {modalidades.map((modalidade) => (
                                <MenuItem key={modalidade.id} value={modalidade.id}>
                                  {modalidade.nome} ({modalidade.percentual_repasse}% repasse)
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            label="Percentual (%)"
                            type="number"
                            value={modalidadeSel.percentual}
                            onChange={(e) => atualizarModalidade(index, 'percentual', Number(e.target.value))}
                            inputProps={{ min: 0, max: 100, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" color="text.secondary">
                            Valor: {formatCurrency((valorTotal * modalidadeSel.percentual) / 100)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={1}>
                          <IconButton
                            onClick={() => removerModalidade(index)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                  
                  {modalidadesSelecionadas.length > 0 && (
                    <Box mt={2}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        color={Math.abs(somaPercentuais - 100) < 0.01 ? 'success.main' : 'error.main'}
                      >
                        Total: {somaPercentuais.toFixed(2)}% 
                        {Math.abs(somaPercentuais - 100) < 0.01 ? ' ✓' : ' (deve somar 100%)'}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Etapa 4: Observações */}
            {modalidadesSelecionadas.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    4. Observações (Opcional)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Observações"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Digite observações sobre este faturamento..."
                  />
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !contratoSelecionado || itensSelecionados.length === 0 || modalidadesSelecionadas.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {loading ? 'Criando...' : 'Criar Faturamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NovoFaturamentoModal;