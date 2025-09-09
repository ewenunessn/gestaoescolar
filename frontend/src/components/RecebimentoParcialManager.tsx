import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Grid,
  Divider,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

/**
 * Componente para Gestão de Recebimentos Parciais
 * 
 * Implementa a funcionalidade solicitada:
 * - Interface clara mostrando quantidades
 * - Campo para nova entrada de recebimento
 * - Controle de saldo pendente
 * - Validações automáticas
 * 
 * EXEMPLO DE USO:
 * Pedido: 10kg arroz + 10kg feijão
 * Recebimento 1: 10kg arroz + 5kg feijão (5kg feijão fica pendente)
 * Interface mostra: Feijão - Pedido: 10kg, Recebido: 5kg, Pendente: 5kg
 * Campo habilitado para receber os 5kg restantes
 */

interface ItemRecebimento {
  produto_id: number;
  produto_nome: string;
  quantidade_pedida: number;
  quantidade_ja_recebida: number;
  quantidade_pendente: number;
  pode_receber_mais: boolean;
  campo_nova_entrada: {
    habilitado: boolean;
    maximo_permitido: number;
    placeholder: string;
  };
  historico_recebimentos: Array<{
    data: string;
    quantidade: number;
    usuario: string;
    observacoes?: string;
  }>;
}

interface StatusRecebimento {
  id: number;
  status: string;
  progresso_percentual: number;
  total_itens: number;
  itens_conferidos: number;
  itens_pendentes: number;
  tem_divergencias: boolean;
}

interface RecebimentoParcialManagerProps {
  recebimentoId: number;
  onRecebimentoAtualizado?: () => void;
}

const RecebimentoParcialManager: React.FC<RecebimentoParcialManagerProps> = ({
  recebimentoId,
  onRecebimentoAtualizado
}) => {
  // Estados
  const [itens, setItens] = useState<ItemRecebimento[]>([]);
  const [status, setStatus] = useState<StatusRecebimento | null>(null);
  const [loading, setLoading] = useState(false);
  const [novasQuantidades, setNovasQuantidades] = useState<{[key: number]: string}>({});
  const [observacoes, setObservacoes] = useState<{[key: number]: string}>({});
  const [validades, setValidades] = useState<{[key: number]: string}>({});
  const [expandedItems, setExpandedItems] = useState<{[key: number]: boolean}>({});
  
  // Estado para informações do lote (1 nota fiscal por lote)
  const [loteInfo, setLoteInfo] = useState<{
    numero: string;
    notaFiscal: File | null;
    observacoes: string;
  }>({
    numero: '',
    notaFiscal: null,
    observacoes: ''
  });
  const [dialogConfirmacao, setDialogConfirmacao] = useState<{
    open: boolean;
    produto_id?: number;
    produto_nome?: string;
    quantidade?: number;
  }>({ open: false });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  // Carregar dados
  useEffect(() => {
    carregarItens();
  }, [recebimentoId]);

  const carregarItens = async () => {
    setLoading(true);
    try {
      // Importar dinamicamente o serviço para evitar problemas de dependência circular
      const { listarItensComSaldoPendente } = await import('../services/recebimentosV2');
      const data = await listarItensComSaldoPendente(recebimentoId);
      
      if (data.success) {
        setItens(data.itens);
        setStatus(data.recebimento);
      } else {
        throw new Error('Erro ao carregar dados');
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Erro ao carregar itens',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuantidadeChange = (produto_id: number, valor: string) => {
    // Permitir apenas números e ponto decimal
    const valorLimpo = valor.replace(/[^0-9.]/g, '');
    setNovasQuantidades(prev => ({
      ...prev,
      [produto_id]: valorLimpo
    }));
  };

  const handleObservacaoChange = (produto_id: number, valor: string) => {
    setObservacoes(prev => ({
      ...prev,
      [produto_id]: valor
    }));
  };

  const handleValidadeChange = (produto_id: number, valor: string) => {
    setValidades(prev => ({
      ...prev,
      [produto_id]: valor
    }));
  };

  const handleComprovanteChange = (produto_id: number, file: File | null) => {
    setComprovantes(prev => ({
      ...prev,
      [produto_id]: file
    }));
  };

  const abrirConfirmacao = (item: ItemRecebimento) => {
    const quantidade = parseFloat(novasQuantidades[item.produto_id] || '0');
    
    if (quantidade <= 0) {
      setSnackbar({
        open: true,
        message: 'Informe uma quantidade válida',
        severity: 'warning'
      });
      return;
    }

    if (quantidade > item.quantidade_pendente) {
      setSnackbar({
        open: true,
        message: `Quantidade (${quantidade}) excede o saldo pendente (${item.quantidade_pendente})`,
        severity: 'error'
      });
      return;
    }

    setDialogConfirmacao({
      open: true,
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade
    });
  };

  const confirmarRecebimento = async () => {
    if (!dialogConfirmacao.produto_id || !dialogConfirmacao.quantidade) return;

    setLoading(true);
    try {
      // Importar dinamicamente o serviço
      const { registrarRecebimentoParcial } = await import('../services/recebimentosV2');
      
      const data = await registrarRecebimentoParcial(recebimentoId, {
        produto_id: dialogConfirmacao.produto_id,
        quantidade_recebida: dialogConfirmacao.quantidade,
        data_validade: validades[dialogConfirmacao.produto_id] || undefined,
        observacoes: observacoes[dialogConfirmacao.produto_id] || '',
        comprovante: loteInfo.notaFiscal || undefined, // Nota fiscal do lote
        lote_numero: loteInfo.numero || undefined,
        lote_observacoes: loteInfo.observacoes || undefined
      });

      if (data.success) {
        setSnackbar({
          open: true,
          message: `${dialogConfirmacao.produto_nome}: ${dialogConfirmacao.quantidade} registrado com sucesso`,
          severity: 'success'
        });

        // Limpar campos
        setNovasQuantidades(prev => ({
          ...prev,
          [dialogConfirmacao.produto_id!]: ''
        }));
        setObservacoes(prev => ({
          ...prev,
          [dialogConfirmacao.produto_id!]: ''
        }));

        // Recarregar dados
        await carregarItens();
        
        if (onRecebimentoAtualizado) {
          onRecebimentoAtualizado();
        }
      } else {
        throw new Error('Erro ao registrar recebimento');
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Erro ao registrar recebimento',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setDialogConfirmacao({ open: false });
    }
  };

  const toggleExpandItem = (produto_id: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [produto_id]: !prev[produto_id]
    }));
  };

  const getStatusColor = (item: ItemRecebimento) => {
    if (!item.pode_receber_mais) return 'success';
    if (item.quantidade_ja_recebida === 0) return 'warning';
    return 'info';
  };

  const getStatusLabel = (item: ItemRecebimento) => {
    if (!item.pode_receber_mais) return 'Completo';
    if (item.quantidade_ja_recebida === 0) return 'Pendente';
    return 'Parcial';
  };

  return (
    <Box>
      {/* Header com Status Geral */}
      {status && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Recebimento #{recebimentoId}
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Chip 
                    label={status.status} 
                    color={status.status === 'FINALIZADO' ? 'success' : 'primary'} 
                  />
                  <Typography variant="body2" color="text.secondary">
                    {status.itens_conferidos}/{status.total_itens} itens conferidos
                  </Typography>
                  {status.itens_pendentes > 0 && (
                    <Typography variant="body2" color="warning.main">
                      {status.itens_pendentes} itens com saldo pendente
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box textAlign="right">
                  <Typography variant="h4" color="primary.main">
                    {status.progresso_percentual}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={status.progresso_percentual} 
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Itens */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Controle de Recebimentos Parciais
          </Typography>
          
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell align="center">Quantidade Pedida</TableCell>
                  <TableCell align="center">Quantidade Recebida</TableCell>
                  <TableCell align="center">Saldo Pendente</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Nova Entrada</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itens.map((item) => (
                  <React.Fragment key={item.produto_id}>
                    <TableRow>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2">
                              {item.produto_nome}
                            </Typography>
                            {item.historico_recebimentos.length > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                {item.historico_recebimentos.length} recebimento(s)
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography variant="h6">
                          {item.quantidade_pedida}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography 
                          variant="h6" 
                          color={item.quantidade_ja_recebida > 0 ? 'success.main' : 'text.secondary'}
                        >
                          {item.quantidade_ja_recebida}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography 
                          variant="h6" 
                          color={item.quantidade_pendente > 0 ? 'warning.main' : 'text.secondary'}
                        >
                          {item.quantidade_pendente}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Chip 
                          label={getStatusLabel(item)}
                          color={getStatusColor(item)}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        {item.pode_receber_mais ? (
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <OutlinedInput
                              placeholder={`Máx: ${item.quantidade_pendente}`}
                              value={novasQuantidades[item.produto_id] || ''}
                              onChange={(e) => handleQuantidadeChange(item.produto_id, e.target.value)}
                              endAdornment={
                                <InputAdornment position="end">
                                  <Typography variant="caption" color="text.secondary">
                                    kg
                                  </Typography>
                                </InputAdornment>
                              }
                              disabled={loading}
                            />
                          </FormControl>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Item completo
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box display="flex" gap={1} justifyContent="center">
                          {item.pode_receber_mais && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<AddIcon />}
                              onClick={() => abrirConfirmacao(item)}
                              disabled={loading || !novasQuantidades[item.produto_id]}
                            >
                              Registrar
                            </Button>
                          )}
                          
                          {item.historico_recebimentos.length > 0 && (
                            <IconButton
                              size="small"
                              onClick={() => toggleExpandItem(item.produto_id)}
                            >
                              {expandedItems[item.produto_id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Linha expandida com histórico */}
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0 }}>
                        <Collapse in={expandedItems[item.produto_id]}>
                          <Box sx={{ py: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Histórico de Recebimentos
                            </Typography>
                            <List dense>
                              {item.historico_recebimentos.map((hist, index) => (
                                <ListItem key={index} divider>
                                  <ListItemText
                                    primary={`${hist.quantidade} - ${hist.usuario}`}
                                    secondary={`${new Date(hist.data).toLocaleString('pt-BR')} ${hist.observacoes ? `- ${hist.observacoes}` : ''}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                            
                            {item.pode_receber_mais && (
                              <Box mt={2}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    📦 Recebimento por Lote de Entrega
                                  </Typography>
                                  <Typography variant="body2">
                                    Cada lote de entrega deve ter uma nota fiscal e validade próprias. 
                                    Registre todos os produtos deste lote com os mesmos dados.
                                  </Typography>
                                </Alert>
                                
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="Número do Lote"
                                      value={loteInfo.numero || ''}
                                      onChange={(e) => setLoteInfo(prev => ({ ...prev, numero: e.target.value }))}
                                      placeholder="Ex: LOTE001, L240716"
                                      helperText="Identificação do lote de entrega"
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Button
                                      variant="outlined"
                                      component="label"
                                      fullWidth
                                      size="small"
                                      sx={{ height: '40px' }}
                                    >
                                      {loteInfo.notaFiscal ? 
                                        `NF: ${loteInfo.notaFiscal.name}` : 
                                        '📄 Nota Fiscal do Lote'
                                      }
                                      <input
                                        type="file"
                                        hidden
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0] || null;
                                          setLoteInfo(prev => ({ ...prev, notaFiscal: file }));
                                        }}
                                      />
                                    </Button>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      type="date"
                                      label={`Validade - ${item.produto_nome}`}
                                      value={validades[item.produto_id] || ''}
                                      onChange={(e) => handleValidadeChange(item.produto_id, e.target.value)}
                                      InputLabelProps={{ shrink: true }}
                                      helperText="Validade específica deste produto"
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label={`Observações - ${item.produto_nome}`}
                                      value={observacoes[item.produto_id] || ''}
                                      onChange={(e) => handleObservacaoChange(item.produto_id, e.target.value)}
                                      placeholder="Ex: Produto em boas condições, embalagem íntegra..."
                                      helperText="Observações específicas deste produto"
                                    />
                                  </Grid>
                                  <Grid item xs={12}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label="Observações Gerais do Lote"
                                      value={loteInfo.observacoes || ''}
                                      onChange={(e) => setLoteInfo(prev => ({ ...prev, observacoes: e.target.value }))}
                                      placeholder="Ex: Entrega parcial conforme acordado, transporte adequado..."
                                      multiline
                                      rows={2}
                                      helperText="Observações gerais para todo o lote de entrega"
                                    />
                                  </Grid>
                                </Grid>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {itens.length === 0 && !loading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Nenhum item encontrado para este recebimento.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <Dialog open={dialogConfirmacao.open} onClose={() => setDialogConfirmacao({ open: false })}>
        <DialogTitle>Confirmar Recebimento</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Confirma o recebimento de <strong>{dialogConfirmacao.quantidade}</strong> de{' '}
            <strong>{dialogConfirmacao.produto_nome}</strong>?
          </Typography>
          
          {dialogConfirmacao.produto_id && observacoes[dialogConfirmacao.produto_id] && (
            <Box mt={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Observações:
              </Typography>
              <Typography variant="body2">
                {observacoes[dialogConfirmacao.produto_id]}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogConfirmacao({ open: false })}
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>
          <Button 
            onClick={confirmarRecebimento}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RecebimentoParcialManager;