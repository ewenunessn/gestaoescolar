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
        px: 3, 
        py: 2.5, 
        bgcolor: 'white',
        borderBottom: '1px solid #e9ecef'
      }}>
        <PageBreadcrumbs 
          items={[
            { label: 'Compras', path: '/compras', icon: <ShoppingCartIcon fontSize="small" /> },
            { label: `Compra ${pedido.numero}` }
          ]}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#212529' }}>
              Compra {pedido.numero}
            </Typography>
            {getStatusChip(pedido.status)}
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {formatarMoeda(pedido.valor_total)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {podeAlterarStatus && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
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
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/compras/${pedido.id}/editar`)}
                disabled={processando}
                sx={{ 
                  textTransform: 'none',
                  borderColor: '#dee2e6',
                  color: '#495057',
                  '&:hover': {
                    borderColor: '#adb5bd',
                    bgcolor: '#f8f9fa'
                  }
                }}
              >
                Editar
              </Button>
            )}
            {podeExcluir && (
              <Button
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
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mt: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#6c757d' }}>Número</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#212529' }}>{pedido.numero}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#6c757d' }}>Data</Typography>
            <Typography variant="body2" sx={{ color: '#212529' }}>{formatarData(pedido.data_pedido)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#6c757d' }}>Criado por</Typography>
            <Typography variant="body2" sx={{ color: '#212529' }}>{pedido.usuario_criacao_nome}</Typography>
          </Box>
          {pedido.usuario_aprovacao_nome && (
            <Box>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>Aprovado por</Typography>
              <Typography variant="body2" sx={{ color: '#212529' }}>{pedido.usuario_aprovacao_nome}</Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" sx={{ color: '#6c757d' }}>Fornecedores</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#212529' }}>
              {Array.from(new Set(pedido.itens.map(item => item.fornecedor_nome))).length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#6c757d' }}>Itens</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#212529' }}>{pedido.itens.length}</Typography>
          </Box>
        </Box>

        {pedido.observacoes && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#6c757d' }}>Observações</Typography>
            <Typography variant="body2" sx={{ color: '#212529' }}>{pedido.observacoes}</Typography>
          </Alert>
        )}

        {erro && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErro('')}>
            {erro}
          </Alert>
        )}
      </Box>

      {/* Tabela de Itens */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
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
          px: 3,
          py: 2,
          borderBottom: '1px solid #e9ecef'
        }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontSize: '0.875rem' }}>
            {pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {formatarMoeda(pedido.valor_total)}
          </Typography>
        </Box>

        <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell>Fornecedor</TableCell>
                <TableCell align="right">Quantidade</TableCell>
                <TableCell align="center">Entrega</TableCell>
                <TableCell align="right">Preço Unit.</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="center" width="60">Obs</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pedido.itens.map((item, index) => (
                <TableRow key={item.id} hover>
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
