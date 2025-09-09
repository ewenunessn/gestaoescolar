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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Delete,
  Save,
  Cancel,
  Visibility,
  Receipt,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { listarModalidades, Modalidade } from '../../services/modalidades';
import {
  listarModalidadesPorPedido,
  configurarModalidadesItem,
  obterPreviaFaturamento,
  ItemModalidadeConfig,
} from '../../services/faturamentoModalidades';
import { useToast } from '../../hooks/useToast';

interface SelecaoModalidadesProps {
  pedido_id: number;
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface ModalidadeItemConfig {
  modalidade_id: number;
  percentual: number;
}

interface ItemComModalidades extends ItemModalidadeConfig {
  modalidades_config: ModalidadeItemConfig[];
  percentual_total: number;
  editando: boolean;
}

const SelecaoModalidades: React.FC<SelecaoModalidadesProps> = ({
  pedido_id,
  open,
  onClose,
  onSave,
}) => {
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [itens, setItens] = useState<ItemComModalidades[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [previa, setPrevia] = useState<any>(null);
  const [mostrarPrevia, setMostrarPrevia] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      carregarDados();
    }
  }, [open, pedido_id]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [modalidadesData, itensData] = await Promise.all([
        listarModalidades(),
        listarModalidadesPorPedido(pedido_id),
      ]);

      setModalidades(modalidadesData);
      
      const itensComConfig = itensData.map(item => ({
        ...item,
        modalidades_config: item.modalidades.map(m => ({
          modalidade_id: m.modalidade_id,
          percentual: m.percentual,
        })),
        percentual_total: item.modalidades.reduce((sum, m) => sum + m.percentual, 0),
        editando: false,
      }));
      
      setItens(itensComConfig);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados das modalidades');
    } finally {
      setLoading(false);
    }
  };

  const adicionarModalidade = (itemIndex: number) => {
    const novosItens = [...itens];
    novosItens[itemIndex].modalidades_config.push({
      modalidade_id: 0,
      percentual: 0,
    });
    setItens(novosItens);
  };

  const removerModalidade = (itemIndex: number, modalidadeIndex: number) => {
    const novosItens = [...itens];
    novosItens[itemIndex].modalidades_config.splice(modalidadeIndex, 1);
    novosItens[itemIndex].percentual_total = novosItens[itemIndex].modalidades_config
      .reduce((sum, m) => sum + m.percentual, 0);
    setItens(novosItens);
  };

  const atualizarModalidade = (
    itemIndex: number,
    modalidadeIndex: number,
    campo: 'modalidade_id' | 'percentual',
    valor: number
  ) => {
    const novosItens = [...itens];
    novosItens[itemIndex].modalidades_config[modalidadeIndex][campo] = valor;
    
    if (campo === 'percentual') {
      novosItens[itemIndex].percentual_total = novosItens[itemIndex].modalidades_config
        .reduce((sum, m) => sum + m.percentual, 0);
    }
    
    setItens(novosItens);
  };

  const toggleEdicao = (itemIndex: number) => {
    const novosItens = [...itens];
    novosItens[itemIndex].editando = !novosItens[itemIndex].editando;
    setItens(novosItens);
  };

  const salvarModalidadesItem = async (itemIndex: number) => {
    const item = itens[itemIndex];
    
    // Validar percentuais
    if (item.percentual_total !== 100) {
      toast.error(`O total de percentuais para ${item.nome_produto} deve ser 100%`);
      return;
    }

    // Validar modalidades selecionadas
    const modalidadesInvalidas = item.modalidades_config.filter(
      m => m.modalidade_id === 0 || m.percentual <= 0
    );
    
    if (modalidadesInvalidas.length > 0) {
      toast.error('Todas as modalidades devem ser selecionadas com percentual maior que 0');
      return;
    }

    try {
      setSalvando(true);
      await configurarModalidadesItem(
        pedido_id,
        item.item_id,
        item.modalidades_config
      );
      
      toggleEdicao(itemIndex);
      toast.success(`Modalidades salvas para ${item.nome_produto}`);
    } catch (error) {
      console.error('Erro ao salvar modalidades:', error);
      toast.error('Erro ao salvar modalidades');
    } finally {
      setSalvando(false);
    }
  };

  const gerarPrevia = async () => {
    try {
      setLoading(true);
      const previaData = await obterPreviaFaturamento(pedido_id);
      setPrevia(previaData);
      setMostrarPrevia(true);
    } catch (error) {
      console.error('Erro ao gerar prévia:', error);
      toast.error('Erro ao gerar prévia do faturamento');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMostrarPrevia(false);
    onClose();
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
    handleClose();
  };

  const getModalidadeNome = (modalidade_id: number) => {
    const modalidade = modalidades.find(m => m.id === modalidade_id);
    return modalidade ? modalidade.nome : 'Selecione...';
  };

  const getStatusPercentual = (percentual: number) => {
    if (percentual === 100) {
      return { color: 'success', icon: <CheckCircle /> };
    } else if (percentual > 100) {
      return { color: 'error', icon: <Warning /> };
    } else {
      return { color: 'warning', icon: <Warning /> };
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Receipt />
            <Typography variant="h6">
              Configurar Modalidades de Faturamento
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Configure as modalidades de faturamento para cada item do pedido.
                O total de percentuais por item deve somar 100%.
              </Alert>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="right">Quantidade</TableCell>
                      <TableCell align="right">Valor Unitário</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                      <TableCell align="center">Modalidades</TableCell>
                      <TableCell align="center">Total %</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {itens.map((item, itemIndex) => {
                      const statusPercentual = getStatusPercentual(item.percentual_total);
                      
                      return (
                        <TableRow key={item.item_id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {item.nome_produto}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{item.quantidade}</TableCell>
                          <TableCell align="right">
                            R$ {item.preco_unitario.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="medium">
                              R$ {item.subtotal.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {item.editando ? (
                              <Box>
                                {item.modalidades_config.map((modalidade, modalidadeIndex) => (
                                  <Box key={modalidadeIndex} display="flex" alignItems="center" gap={1} mb={1}>
                                    <FormControl size="small" sx={{ minWidth: 150 }}>
                                      <Select
                                        value={modalidade.modalidade_id}
                                        onChange={(e) => atualizarModalidade(
                                          itemIndex,
                                          modalidadeIndex,
                                          'modalidade_id',
                                          Number(e.target.value)
                                        )}
                                      >
                                        <MenuItem value={0}>Selecione...</MenuItem>
                                        {modalidades.map((m) => (
                                          <MenuItem key={m.id} value={m.id}>
                                            {m.nome}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                    
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={modalidade.percentual}
                                      onChange={(e) => atualizarModalidade(
                                        itemIndex,
                                        modalidadeIndex,
                                        'percentual',
                                        Number(e.target.value)
                                      )}
                                      inputProps={{ min: 0, max: 100, step: 0.01 }}
                                      sx={{ width: 80 }}
                                      InputProps={{
                                        endAdornment: '%'
                                      }}
                                    />
                                    
                                    <IconButton
                                      size="small"
                                      onClick={() => removerModalidade(itemIndex, modalidadeIndex)}
                                      color="error"
                                    >
                                      <Delete />
                                    </IconButton>
                                  </Box>
                                ))}
                                
                                <Button
                                  size="small"
                                  startIcon={<Add />}
                                  onClick={() => adicionarModalidade(itemIndex)}
                                  variant="outlined"
                                >
                                  Adicionar Modalidade
                                </Button>
                              </Box>
                            ) : (
                              <Box>
                                {item.modalidades.map((modalidade, index) => (
                                  <Chip
                                    key={index}
                                    label={`${modalidade.nome_modalidade}: ${modalidade.percentual}%`}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={statusPercentual.icon}
                              label={`${item.percentual_total}%`}
                              color={statusPercentual.color as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {item.editando ? (
                              <Box display="flex" gap={1}>
                                <Tooltip title="Salvar">
                                  <IconButton
                                    size="small"
                                    onClick={() => salvarModalidadesItem(itemIndex)}
                                    color="primary"
                                    disabled={salvando}
                                  >
                                    {salvando ? <CircularProgress size={16} /> : <Save />}
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancelar">
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleEdicao(itemIndex)}
                                    color="secondary"
                                  >
                                    <Cancel />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Tooltip title="Editar modalidades">
                                <IconButton
                                  size="small"
                                  onClick={() => toggleEdicao(itemIndex)}
                                  color="primary"
                                >
                                  <Add />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Fechar
          </Button>
          <Button
            onClick={gerarPrevia}
            startIcon={<Visibility />}
            variant="outlined"
            disabled={loading}
          >
            Visualizar Prévia
          </Button>
          <Button
            onClick={handleSave}
            startIcon={<Save />}
            variant="contained"
            color="primary"
          >
            Salvar Configurações
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Prévia */}
      <Dialog open={mostrarPrevia} onClose={() => setMostrarPrevia(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Prévia do Faturamento
        </DialogTitle>
        <DialogContent>
          {previa && previa.pedido && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Pedido: {previa.pedido.numero_pedido || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Valor Total: R$ {(previa.pedido.valor_total || 0).toFixed(2)}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Resumo por Modalidade
              </Typography>
              
              <Grid container spacing={2}>
                {previa.resumo_modalidades && previa.resumo_modalidades.length > 0 ? (
                  previa.resumo_modalidades.map((modalidade: any) => (
                    <Grid item xs={12} sm={6} md={4} key={modalidade.modalidade_id}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {modalidade.nome_modalidade || 'N/A'}
                          </Typography>
                          <Typography variant="h6" color="primary">
                            R$ {(modalidade.valor_total || 0).toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {(modalidade.percentual_total || 0).toFixed(2)}% do total
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Nenhuma modalidade configurada
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMostrarPrevia(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SelecaoModalidades;