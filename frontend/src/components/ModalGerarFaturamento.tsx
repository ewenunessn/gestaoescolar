import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Receipt as ReceiptIcon,
  Calculate as CalculateIcon,
  Send as SendIcon,
  Close as CloseIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon
} from '@mui/icons-material';
import faturamentoService from '../services/faturamento';
import type { FaturamentoPrevia, ContratoCalculado, ItemCalculado } from '../types/faturamento';
import type { PedidoDetalhado } from '../types/pedido';
import { formatarMoeda } from '../utils/dateUtils';
import ResumoModalidades from './ResumoModalidades';

interface ModalGerarFaturamentoProps {
  open: boolean;
  onClose: () => void;
  pedido: PedidoDetalhado;
  onFaturamentoGerado?: (faturamentoId: number) => void;
}

export default function ModalGerarFaturamento({
  open,
  onClose,
  pedido,
  onFaturamentoGerado
}: ModalGerarFaturamentoProps) {
  const [loading, setLoading] = useState(false);
  const [previa, setPrevia] = useState<FaturamentoPrevia | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [expandedContract, setExpandedContract] = useState<string | false>(false);
  const [modoVisualizacao, setModoVisualizacao] = useState<'resumo' | 'detalhado'>('resumo');

  const etapas = ['Calcular Prévia', 'Revisar', 'Gerar'];

  useEffect(() => {
    if (open && pedido) {
      calcularPrevia();
    }
  }, [open, pedido]);

  const calcularPrevia = async () => {
    try {
      setLoading(true);
      setErro('');
      setEtapaAtual(0);
      
      const previaData = await faturamentoService.calcularPrevia(pedido.id);
      setPrevia(previaData);
      setEtapaAtual(1);
      
    } catch (error: any) {
      console.error('Erro ao calcular prévia:', error);
      setErro(error.response?.data?.message || 'Erro ao calcular prévia do faturamento');
    } finally {
      setLoading(false);
    }
  };

  const gerarFaturamento = async () => {
    try {
      setLoading(true);
      setErro('');
      setEtapaAtual(2);
      
      const resultado = await faturamentoService.gerar({
        pedido_id: pedido.id,
        observacoes: observacoes || undefined
      });
      
      // Chamar callback se fornecido
      if (onFaturamentoGerado) {
        onFaturamentoGerado(resultado.faturamento.id);
      }
      
      onClose();
      
    } catch (error: any) {
      console.error('Erro ao gerar faturamento:', error);
      setErro(error.response?.data?.message || 'Erro ao gerar faturamento');
      setEtapaAtual(1); // Voltar para revisão
    } finally {
      setLoading(false);
    }
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedContract(isExpanded ? panel : false);
  };

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(2)}%`;
  };

  const calcularResumoModalidades = () => {
    if (!previa) return [];

    const resumoPorModalidade: { [key: number]: any } = {};

    // Agregar dados por modalidade
    previa.contratos.forEach(contrato => {
      contrato.itens.forEach(item => {
        item.divisoes.forEach(divisao => {
          if (!resumoPorModalidade[divisao.modalidade_id]) {
            resumoPorModalidade[divisao.modalidade_id] = {
              nome: divisao.modalidade_nome,
              codigo_financeiro: divisao.modalidade_codigo_financeiro,
              quantidade: 0,
              valor: 0,
              percentual: divisao.percentual
            };
          }
          resumoPorModalidade[divisao.modalidade_id].quantidade += divisao.quantidade;
          resumoPorModalidade[divisao.modalidade_id].valor += divisao.valor;
        });
      });
    });

    return Object.values(resumoPorModalidade).sort((a: any, b: any) => b.valor - a.valor);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon />
          <Typography variant="h6">
            Gerar Faturamento - {pedido.numero}
          </Typography>
        </Box>
        <Button onClick={onClose} color="inherit" size="small">
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Stepper */}
        <Box sx={{ p: 3, pb: 2 }}>
          <Stepper activeStep={etapaAtual} sx={{ mb: 2 }}>
            {etapas.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {erro && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Alert severity="error" onClose={() => setErro('')}>
              {erro}
            </Alert>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>
              {etapaAtual === 0 ? 'Calculando prévia...' : 'Gerando faturamento...'}
            </Typography>
          </Box>
        )}

        {previa && !loading && (
          <Box sx={{ px: 3, pb: 2, maxHeight: '60vh', overflow: 'auto' }}>
            {/* Resumo Geral */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumo do Faturamento
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Contratos</Typography>
                    <Typography variant="h6">{previa.resumo.total_contratos}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Fornecedores</Typography>
                    <Typography variant="h6">{previa.resumo.total_fornecedores}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Modalidades</Typography>
                    <Typography variant="h6">{previa.resumo.total_modalidades}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Valor Total</Typography>
                    <Typography variant="h6" color="primary">
                      {formatarMoeda(previa.resumo.valor_total)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Resumo por Modalidades */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <ResumoModalidades 
                  modalidades={calcularResumoModalidades()}
                  titulo={`Resumo por Modalidade (${previa.modalidades.length})`}
                />
              </CardContent>
            </Card>

            {/* Toggle de Visualização */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Detalhamento por Contrato
              </Typography>
              <ToggleButtonGroup
                value={modoVisualizacao}
                exclusive
                onChange={(_, newMode) => newMode && setModoVisualizacao(newMode)}
                size="small"
              >
                <ToggleButton value="resumo">
                  <ViewModuleIcon sx={{ mr: 1 }} />
                  Resumo
                </ToggleButton>
                <ToggleButton value="detalhado">
                  <ViewListIcon sx={{ mr: 1 }} />
                  Detalhado
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            {modoVisualizacao === 'resumo' ? (
              // Visualização Resumida - apenas totais por contrato
              <Box>
                {previa.contratos.map((contrato: ContratoCalculado) => (
                  <Card key={contrato.contrato_id} sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {contrato.contrato_numero} - {contrato.fornecedor_nome}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {contrato.itens.length} itens • {contrato.quantidade_total} unidades
                          </Typography>
                        </Box>
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {formatarMoeda(contrato.valor_total)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              // Visualização Detalhada - com accordions
              <Box>
                {previa.contratos.map((contrato: ContratoCalculado) => (
              <Accordion 
                key={contrato.contrato_id}
                expanded={expandedContract === `contrato-${contrato.contrato_id}`}
                onChange={handleAccordionChange(`contrato-${contrato.contrato_id}`)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                      {contrato.contrato_numero} - {contrato.fornecedor_nome}
                    </Typography>
                    <Chip 
                      label={`${contrato.itens.length} itens`} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {formatarMoeda(contrato.valor_total)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Produto</TableCell>
                          <TableCell align="right">Qtd. Total</TableCell>
                          <TableCell>Modalidade</TableCell>
                          <TableCell align="right">Qtd.</TableCell>
                          <TableCell align="right">%</TableCell>
                          <TableCell align="right">Valor</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contrato.itens.map((item: ItemCalculado) => 
                          item.divisoes.map((divisao, index) => (
                            <TableRow 
                              key={`${item.pedido_item_id}-${divisao.modalidade_id}`}
                              sx={{ 
                                backgroundColor: divisao.quantidade === 0 ? 'grey.50' : 'inherit',
                                opacity: divisao.quantidade === 0 ? 0.6 : 1
                              }}
                            >
                              {index === 0 && (
                                <>
                                  <TableCell rowSpan={item.divisoes.length}>
                                    <Typography variant="body2" fontWeight="bold">
                                      {item.produto_nome}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {item.unidade}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right" rowSpan={item.divisoes.length}>
                                    <Typography variant="body2" fontWeight="bold">
                                      {item.quantidade_original}
                                    </Typography>
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                <Typography variant="body2">
                                  {divisao.modalidade_nome}
                                </Typography>
                                {divisao.modalidade_codigo_financeiro && (
                                  <Typography variant="caption" color="text.secondary">
                                    {divisao.modalidade_codigo_financeiro}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  fontWeight={divisao.quantidade > 0 ? 'bold' : 'normal'}
                                  color={divisao.quantidade > 0 ? 'primary' : 'text.secondary'}
                                >
                                  {divisao.quantidade}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {formatarPercentual(divisao.percentual)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  fontWeight={divisao.valor > 0 ? 'bold' : 'normal'}
                                  color={divisao.valor > 0 ? 'primary' : 'text.secondary'}
                                >
                                  {formatarMoeda(divisao.valor)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
              </Box>
            )}

            {/* Observações */}
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observações do Faturamento"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre o faturamento (opcional)..."
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        
        {previa && (
          <>
            <Button
              startIcon={<CalculateIcon />}
              onClick={calcularPrevia}
              disabled={loading}
            >
              Recalcular
            </Button>
            <Button
              variant="contained"
              startIcon={<SendIcon />}
              onClick={gerarFaturamento}
              disabled={loading}
            >
              {loading ? 'Gerando...' : 'Gerar Faturamento'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}