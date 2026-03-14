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
  Tooltip,
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
  Comment as CommentIcon,
  CalendarMonth as CalendarIcon,
  MergeType as MergeIcon,
} from '@mui/icons-material';
import Checkbox from '@mui/material/Checkbox';
import { apiWithRetry } from '../services/api';
import pedidosService from '../services/pedidos';
import faturamentoService from '../services/faturamento';
import ProgramacaoEntregaDialog from '../components/ProgramacaoEntregaDialog';
import { PedidoDetalhado, STATUS_PEDIDO } from '../types/pedido';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import PageContainer from '../components/PageContainer';
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

  // Estado para o dialog de programação de entrega
  const [programacaoDialog, setProgramacaoDialog] = useState<{
    open: boolean; itemId: number; produtoNome: string; unidade: string;
  }>({ open: false, itemId: 0, produtoNome: '', unidade: '' });

  // Estado para mesclar itens
  const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
  const [mesclando, setMesclando] = useState(false);

  const obsPopoverOpen = Boolean(obsAnchorEl);

  const toggleSelecao = (itemId: number) => {
    setItensSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const itensMesclaveis = pedido
    ? (() => {
        if (itensSelecionados.size < 2) return false;
        const selecionados = pedido.itens.filter(i => itensSelecionados.has(i.id!));
        const produtoIds = new Set(selecionados.map(i => i.produto_id));
        return produtoIds.size === 1;
      })()
    : false;

  const handleMesclar = async () => {
    if (!itensMesclaveis) return;
    try {
      setMesclando(true);
      await apiWithRetry.post('/compras/itens/mesclar', { item_ids: Array.from(itensSelecionados) });
      setItensSelecionados(new Set());
      await carregarPedido();
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao mesclar itens');
    } finally {
      setMesclando(false);
    }
  };

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
      navigate(`/compras/${id}/faturamento`);
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
      navigate('/compras');

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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        {/* Cabeçalho */}
      <Box sx={{ 
        flexShrink: 0, 
        px: 2, 
        py: 1, 
        bgcolor: 'white',
        borderBottom: '1px solid #e9ecef'
      }}>
        <PageBreadcrumbs 
          items={[
            { label: 'Compras', path: '/compras', icon: <ShoppingCartIcon fontSize="small" /> },
            { label: `Compra ${pedido.numero}` }
          ]}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#212529' }}>
              Compra {pedido.numero}
            </Typography>
            {getStatusChip(pedido.status)}
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {formatarMoeda(pedido.valor_total)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {podeAlterarStatus && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={pedido.status}
                  label="Status"
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
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<ReceiptIcon />}
              onClick={() => navigate(`/compras/${pedido.id}/faturamentos`)}
              disabled={processando}
              sx={{ textTransform: 'none' }}
            >
              Faturamento
            </Button>
            {podeEditar && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/compras/${pedido.id}/editar`)}
                disabled={processando}
                sx={{ textTransform: 'none', borderColor: '#dee2e6', color: '#495057' }}
              >
                Editar
              </Button>
            )}
            {podeExcluir && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => setDialogExcluir(true)}
                disabled={processando}
                sx={{ textTransform: 'none' }}
              >
                Excluir
              </Button>
            )}
          </Box>
        </Box>

        {/* Informações em linha */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: '#6c757d' }}>
            <strong>{pedido.numero}</strong> · {formatarData(pedido.data_pedido)} · {pedido.usuario_criacao_nome}
            {pedido.usuario_aprovacao_nome && ` · Aprovado: ${pedido.usuario_aprovacao_nome}`}
            {' · '}{Array.from(new Set(pedido.itens.map(i => i.fornecedor_nome))).length} fornecedor(es)
            {' · '}{pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}
          </Typography>
        </Box>

        {pedido.observacoes && (
          <Alert severity="info" sx={{ mt: 0.75, py: 0.25, '& .MuiAlert-message': { py: 0.25 } }}>
            <Typography variant="caption">{pedido.observacoes}</Typography>
          </Alert>
        )}

        {erro && (
          <Alert severity="error" sx={{ mt: 0.75 }} onClose={() => setErro('')}>
            {erro}
          </Alert>
        )}
      </Box>

      {/* Tabela de Itens */}
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, mt: 1.5 }}>
        Itens da Compra
      </Typography>
      
      <Box sx={{ 
        bgcolor: 'white',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #e9ecef'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          px: 2,
          py: 1,
          borderBottom: '1px solid #e9ecef'
        }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontSize: '0.875rem' }}>
            {pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {itensSelecionados.size >= 2 && (
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={<MergeIcon />}
                onClick={handleMesclar}
                disabled={mesclando || !itensMesclaveis}
                sx={{ textTransform: 'none' }}
              >
                {mesclando ? 'Mesclando...' : `Mesclar (${itensSelecionados.size})`}
              </Button>
            )}
            {itensSelecionados.size >= 2 && !itensMesclaveis && (
              <Typography variant="caption" color="error">Selecione itens do mesmo produto</Typography>
            )}
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {formatarMoeda(pedido.valor_total)}
            </Typography>
          </Box>
        </Box>

        <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Produto</TableCell>
                <TableCell>Fornecedor</TableCell>
                <TableCell align="right">Quantidade</TableCell>
                <TableCell align="center">Entrega</TableCell>
                <TableCell align="right">Preço Unit.</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="center" width="60">Obs</TableCell>
                <TableCell align="center" width="60">Prog.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pedido.itens.map((item) => (
                <TableRow key={item.id} hover selected={itensSelecionados.has(item.id!)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={itensSelecionados.has(item.id!)}
                      onChange={() => toggleSelecao(item.id!)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {item.produto_nome}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {item.fornecedor_nome}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.contrato_numero}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {item.quantidade ? formatarNumero(Number(item.quantidade)) : '0'} {item.unidade || ''}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {item.data_entrega_prevista ? formatarData(item.data_entrega_prevista) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatarMoeda(item.preco_unitario)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
                  <TableCell align="center">
                    <Tooltip title="Programação de entrega por escola">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => setProgramacaoDialog({
                          open: true,
                          itemId: item.id!,
                          produtoNome: item.produto_nome || '',
                          unidade: item.unidade || 'kg',
                        })}
                      >
                        <CalendarIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      </PageContainer>

      {/* Diálogo de Alteração de Status - Compacto */}
      <Dialog open={dialogAlterarStatus} onClose={() => setDialogAlterarStatus(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Alterar Status</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Alterando para: <strong>{STATUS_PEDIDO[novoStatus as keyof typeof STATUS_PEDIDO]?.label}</strong>
          </Alert>
          <TextField
            size="small"
            fullWidth
            label="Motivo (opcional)"
            multiline
            rows={2}
            value={motivoStatus}
            onChange={(e) => setMotivoStatus(e.target.value)}
            placeholder="Descreva o motivo..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setDialogAlterarStatus(false)}>Cancelar</Button>
          <Button 
            size="small"
            onClick={() => atualizarStatus(novoStatus)} 
            variant="contained"
            disabled={processando}
          >
            {processando ? 'Alterando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Exclusão - Compacto */}
      <Dialog open={dialogExcluir} onClose={() => setDialogExcluir(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Excluir Compra</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {temConsumoRegistrado && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              <Typography variant="body2" fontWeight="600" gutterBottom>
                Compra com Consumo Registrado
              </Typography>
              <Typography variant="body2">
                {mensagemConsumo}
              </Typography>
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary">
            {ehCancelado
              ? 'Tem certeza que deseja excluir esta compra cancelada? Esta ação não pode ser desfeita.'
              : ehConcluido
                ? 'Tem certeza que deseja excluir esta compra concluída? Esta ação não pode ser desfeita.'
                : 'Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.'
            }
          </Typography>
          {!ehCancelado && !ehConcluido && !temConsumoRegistrado && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              <Typography variant="body2">
                Esta compra está em andamento. A exclusão pode impactar fornecedores.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setDialogExcluir(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button
            size="small"
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

      {/* Dialog de Programação de Entrega */}
      <ProgramacaoEntregaDialog
        open={programacaoDialog.open}
        onClose={() => setProgramacaoDialog(prev => ({ ...prev, open: false }))}
        pedidoItemId={programacaoDialog.itemId}
        produtoNome={programacaoDialog.produtoNome}
        unidade={programacaoDialog.unidade}
        onSaved={() => carregarPedido()}
      />

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
    </Box>
  );
}
