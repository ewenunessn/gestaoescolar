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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Popover,
  Badge,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon,
  Done as DoneIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Receipt as ReceiptIcon,
  Comment as CommentIcon
} from '@mui/icons-material';
import pedidosService from '../services/pedidos';
import faturamentoService from '../services/faturamento';
import { PedidoDetalhado, STATUS_PEDIDO } from '../types/pedido';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import { formatarMoeda, formatarData } from '../utils/dateUtils';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

// Função para formatar números removendo zeros desnecessários
const formatarNumero = (numero: number): string => {
  // Remove zeros desnecessários após a vírgula
  return parseFloat(numero.toString()).toString();
};

export default function PedidoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [dialogCancelar, setDialogCancelar] = useState(false);
  const [dialogAlterarStatus, setDialogAlterarStatus] = useState(false);
  const [novoStatus, setNovoStatus] = useState('');
  const [motivoStatus, setMotivoStatus] = useState('');
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [processando, setProcessando] = useState(false);
  const [temFaturamento, setTemFaturamento] = useState(false);
  const [temConsumoRegistrado, setTemConsumoRegistrado] = useState(false);
  const [mensagemConsumo, setMensagemConsumo] = useState('');

  // Estado para o popover de observações
  const [obsAnchorEl, setObsAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [obsItemSelecionado, setObsItemSelecionado] = useState<any>(null);

  const obsPopoverOpen = Boolean(obsAnchorEl);

  const abrirObservacoes = (event: React.MouseEvent<HTMLButtonElement>, item: any) => {
    setObsAnchorEl(event.currentTarget);
    setObsItemSelecionado(item);
  };

  const fecharObservacoes = () => {
    setObsAnchorEl(null);
    setObsItemSelecionado(null);
  };

  useEffect(() => {
    carregarPedido();
  }, [id]);

  useEffect(() => {
    if (pedido && pedido.id) {
      verificarFaturamento();
      verificarConsumo();
    }
  }, [pedido]);

  const carregarPedido = async () => {
    try {
      setLoading(true);
      const dados = await pedidosService.buscarPorId(Number(id));
      console.log('📊 Dados do pedido:', dados);
      console.log('📦 Primeiro item:', dados.itens[0]);
      console.log('📦 Quantidade do primeiro item:', dados.itens[0]?.quantidade, typeof dados.itens[0]?.quantidade);
      setPedido(dados);
    } catch (error) {
      console.error('Erro ao carregar pedido:', error);
      setErro('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const verificarFaturamento = async () => {
    try {
      const faturamentos = await faturamentoService.buscarPorPedido(Number(id));
      setTemFaturamento(faturamentos.length > 0);
    } catch (error) {
      console.error('Erro ao verificar faturamento:', error);
      setTemFaturamento(false);
    }
  };

  const verificarConsumo = async () => {
    try {
      const faturamentos = await faturamentoService.buscarPorPedido(Number(id));
      
      // Verificar se algum faturamento tem itens com consumo
      let totalItensComConsumo = 0;
      let numerosFaturamento: string[] = [];
      
      // Buscar detalhes de cada faturamento para verificar consumo
      for (const fat of faturamentos) {
        const detalhes = await faturamentoService.buscarPorId(fat.id);
        
        const itensComConsumo = detalhes.itens?.filter(item => 
          item.consumo_registrado === true
        ) || [];
        
        if (itensComConsumo.length > 0) {
          totalItensComConsumo += itensComConsumo.length;
          numerosFaturamento.push(fat.numero);
        }
      }
      
      if (totalItensComConsumo > 0) {
        setTemConsumoRegistrado(true);
        const fatsText = numerosFaturamento.join(', ');
        setMensagemConsumo(
          `Este pedido possui ${totalItensComConsumo} item(ns) com consumo registrado no(s) faturamento(s) ${fatsText}. ` +
          `Para excluir o pedido, é necessário reverter o consumo de todos os itens primeiro.`
        );
      } else {
        setTemConsumoRegistrado(false);
        setMensagemConsumo('');
      }
    } catch (error) {
      console.error('Erro ao verificar consumo:', error);
      setTemConsumoRegistrado(false);
      setMensagemConsumo('');
    }
  };

  const handleGerarFaturamento = () => {
    if (temFaturamento) {
      // Se já tem faturamento, mostrar alerta
      setErro('Este pedido já possui um faturamento gerado. Não é possível gerar novamente.');
    } else {
      // Navegar para a página de gerar faturamento
      navigate(`/pedidos/${id}/faturamento`);
    }
  };

  const atualizarStatus = async (novoStatus: string) => {
    try {
      setProcessando(true);
      await pedidosService.atualizarStatus(Number(id), novoStatus, motivoStatus || undefined);
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      await carregarPedido();
      setDialogAlterarStatus(false);
      setNovoStatus('');
      setMotivoStatus('');
      setErro('');
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      setErro(error.response?.data?.message || 'Erro ao atualizar status');
    } finally {
      setProcessando(false);
    }
  };

  const handleAbrirAlterarStatus = (status: string) => {
    setNovoStatus(status);
    setDialogAlterarStatus(true);
  };

  const handleExcluir = async () => {
    try {
      setProcessando(true);

      // Usar endpoint de exclusão para rascunhos e cancelados
      await pedidosService.excluirPedido(Number(id));
      // Redirecionar para lista após excluir
      navigate('/pedidos');

      setErro('');
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      setErro(error.response?.data?.message || 'Erro ao excluir pedido');
    } finally {
      setProcessando(false);
    }
  };

  const handleCancelar = async () => {
    if (!motivoCancelamento.trim()) {
      setErro('Informe o motivo do cancelamento');
      return;
    }

    try {
      setProcessando(true);
      await pedidosService.atualizarStatus(Number(id), 'cancelado', motivoCancelamento);
      setDialogCancelar(false);
      setMotivoCancelamento('');
      await carregarPedido();
      setErro('');
    } catch (error: any) {
      console.error('Erro ao cancelar pedido:', error);
      setErro(error.response?.data?.message || 'Erro ao cancelar pedido');
    } finally {
      setProcessando(false);
    }
  };

  const getStatusChip = (status: string) => {
    const statusInfo = STATUS_PEDIDO[status as keyof typeof STATUS_PEDIDO];
    return (
      <Chip
        label={statusInfo?.label || status}
        color={statusInfo?.color as any || 'default'}
        size="medium"
      />
    );
  };

  const getStepAtivo = (status: string) => {
    const steps = ['pendente', 'aprovado', 'em_separacao', 'enviado', 'entregue'];
    return steps.indexOf(status);
  };

  const ehCancelado = pedido?.status === 'cancelado';
  const ehConcluido = pedido?.status === 'concluido';
  const podeExcluir = pedido !== null;
  const podeEditar = pedido !== null; // Pode editar sempre
  const podeAlterarStatus = pedido !== null; // Pode alterar status sempre

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  if (!pedido) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Pedido não encontrado</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs 
        items={[
          { label: 'Pedidos', path: '/pedidos', icon: <ShoppingCartIcon fontSize="small" /> },
          { label: `Pedido ${pedido.numero}` }
        ]}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Pedido {pedido.numero}
        </Typography>
        {getStatusChip(pedido.status)}
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações do Pedido
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Número</Typography>
                <Typography variant="body1" fontWeight="bold">{pedido.numero}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Data do Pedido</Typography>
                <Typography variant="body1">{formatarData(pedido.data_pedido)}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Criado por</Typography>
                <Typography variant="body1">{pedido.usuario_criacao_nome}</Typography>
              </Box>

              {pedido.usuario_aprovacao_nome && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Aprovado por</Typography>
                  <Typography variant="body1">
                    {pedido.usuario_aprovacao_nome} em {formatarData(pedido.data_aprovacao!)}
                  </Typography>
                </Box>
              )}

              {pedido.observacoes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Observações</Typography>
                  <Typography variant="body1">{pedido.observacoes}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Fornecedores
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Fornecedores envolvidos neste pedido:
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Array.from(new Set(pedido.itens.map(item => item.fornecedor_nome))).map(fornecedor => (
                    <Chip
                      key={fornecedor}
                      label={fornecedor}
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Itens do Pedido
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Fornecedor / Contrato</TableCell>
                      <TableCell align="center">Unidade</TableCell>
                      <TableCell align="center">Quantidade</TableCell>
                      <TableCell align="center">Data Entrega</TableCell>
                      <TableCell align="center">Preço Unitário</TableCell>
                      <TableCell align="center">Valor Total</TableCell>
                      <TableCell align="center" width="80">Obs</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pedido.itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.fornecedor_nome}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.fornecedor_cnpj && `${item.fornecedor_cnpj} - `}Contrato {item.contrato_numero}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{item.unidade || '-'}</TableCell>
                        <TableCell align="center">
                          {item.quantidade ? formatarNumero(Number(item.quantidade)) : '0'}
                        </TableCell>
                        <TableCell align="center">
                          {item.data_entrega_prevista ? formatarData(item.data_entrega_prevista) : '-'}
                        </TableCell>
                        <TableCell align="center">{formatarMoeda(item.preco_unitario)}</TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="bold">
                            {formatarMoeda(item.valor_total)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {item.observacoes ? (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => abrirObservacoes(e, item)}
                            >
                              <Badge variant="dot" color="primary">
                                <CommentIcon fontSize="small" />
                              </Badge>
                            </IconButton>
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={6} align="right">
                        <Typography variant="h6">Total:</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" color="primary" fontWeight="bold">
                          {formatarMoeda(pedido.valor_total)}
                        </Typography>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Popover para observações */}
              <Popover
                open={obsPopoverOpen}
                anchorEl={obsAnchorEl}
                onClose={fecharObservacoes}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
              >
                <Box sx={{ p: 2, width: 350 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    Observações do Item
                  </Typography>
                  {obsItemSelecionado && (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {obsItemSelecionado.produto_nome}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {obsItemSelecionado.observacoes}
                      </Typography>
                    </>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button size="small" onClick={fecharObservacoes}>
                      Fechar
                    </Button>
                  </Box>
                </Box>
              </Popover>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            {/* Select de Status - Sempre disponível */}
            {podeAlterarStatus && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Alterar Status</InputLabel>
                <Select
                  value={pedido.status}
                  label="Alterar Status"
                  onChange={(e) => handleAbrirAlterarStatus(e.target.value)}
                  disabled={processando}
                >
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="recebido_parcial">Recebido Parcial</MenuItem>
                  <MenuItem value="concluido">Concluído</MenuItem>
                  <MenuItem value="suspenso">Suspenso</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                </Select>
              </FormControl>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Botão Editar - Sempre disponível */}
              {podeEditar && (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/pedidos/${pedido.id}/editar`)}
                  disabled={processando}
                >
                  Editar Pedido
                </Button>
              )}

              {/* Botão de Exclusão */}
              {podeExcluir && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => setDialogExcluir(true)}
                  disabled={processando}
                >
                  Excluir Pedido
                </Button>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Diálogo de Alteração de Status */}
      <Dialog open={dialogAlterarStatus} onClose={() => setDialogAlterarStatus(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Alterar Status do Pedido
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Você está alterando o status para: <strong>{STATUS_PEDIDO[novoStatus as keyof typeof STATUS_PEDIDO]?.label}</strong>
          </Typography>
          <TextField
            fullWidth
            label="Motivo (opcional)"
            multiline
            rows={3}
            value={motivoStatus}
            onChange={(e) => setMotivoStatus(e.target.value)}
            placeholder="Descreva o motivo da alteração..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAlterarStatus(false)}>Cancelar</Button>
          <Button 
            onClick={() => atualizarStatus(novoStatus)} 
            variant="contained"
            disabled={processando}
          >
            {processando ? 'Alterando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Exclusão */}
      <Dialog open={dialogExcluir} onClose={() => setDialogExcluir(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Excluir Pedido
        </DialogTitle>
        <DialogContent>
          {temConsumoRegistrado && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                ⚠️ Pedido com Consumo Registrado
              </Typography>
              <Typography variant="body2">
                {mensagemConsumo}
              </Typography>
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {ehCancelado
              ? 'Tem certeza que deseja excluir este pedido cancelado? Esta ação não pode ser desfeita.'
              : ehConcluido
                ? 'Tem certeza que deseja excluir este pedido concluído? Esta ação não pode ser desfeita e removerá o histórico.'
                : 'Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.'
            }
          </Typography>
          {!ehCancelado && !ehConcluido && !temConsumoRegistrado && (
            <Typography variant="body2" color="warning.main" sx={{ mb: 2, fontWeight: 'bold' }}>
              ⚠️ Atenção: Este pedido está em andamento. A exclusão pode impactar fornecedores e processos em curso.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogExcluir(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            onClick={handleExcluir}
            color="error"
            variant="contained"
            disabled={processando || temConsumoRegistrado}
          >
            {processando ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Cancelamento */}
      <Dialog open={dialogCancelar} onClose={() => setDialogCancelar(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Cancelar Pedido
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Informe o motivo do cancelamento:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            placeholder="Ex: Produto indisponível no estoque do fornecedor"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogCancelar(false)} disabled={processando}>
            Voltar
          </Button>
          <Button
            onClick={handleCancelar}
            color="error"
            variant="contained"
            disabled={processando || !motivoCancelamento.trim()}
          >
            {processando ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
}
