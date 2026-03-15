import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, Popover, Tooltip,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import {
  Cancel as CancelIcon, Edit as EditIcon, Receipt as ReceiptIcon,
  CalendarMonth as CalendarIcon, MergeType as MergeIcon,
} from '@mui/icons-material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import pedidosService from '../services/pedidos';
import faturamentoService from '../services/faturamento';
import { apiWithRetry } from '../services/api';
import ProgramacaoEntregaDialog from '../components/ProgramacaoEntregaDialog';
import { PedidoDetalhado, STATUS_PEDIDO } from '../types/pedido';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import PageContainer from '../components/PageContainer';
import { formatarMoeda, formatarData } from '../utils/dateUtils';

const formatarNumero = (n: number) => parseFloat(n.toString()).toString();

export default function PedidoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);

  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [dialogAlterarStatus, setDialogAlterarStatus] = useState(false);
  const [novoStatus, setNovoStatus] = useState('');
  const [motivoStatus, setMotivoStatus] = useState('');
  const [temConsumoRegistrado, setTemConsumoRegistrado] = useState(false);
  const [mensagemConsumo, setMensagemConsumo] = useState('');

  const [obsAnchorEl, setObsAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [obsItemSelecionado, setObsItemSelecionado] = useState<any>(null);

  const [programacaoDialog, setProgramacaoDialog] = useState<{
    open: boolean; itemId: number; produtoNome: string; unidade: string;
  }>({ open: false, itemId: 0, produtoNome: '', unidade: '' });

  const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
  const [mesclando, setMesclando] = useState(false);

  const toggleSelecao = (itemId: number) => {
    setItensSelecionados(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const itensMesclaveis = pedido
    ? itensSelecionados.size >= 2 &&
      new Set(pedido.itens.filter(i => itensSelecionados.has(i.id!)).map(i => i.produto_id)).size === 1
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

  useEffect(() => { carregarPedido(); }, [id]);
  useEffect(() => { if (pedido?.id) verificarConsumo(); }, [pedido?.id]);

  const carregarPedido = async () => {
    try {
      setLoading(true);
      setPedido(await pedidosService.buscarPorId(Number(id)));
    } catch { setErro('Erro ao carregar pedido'); }
    finally { setLoading(false); }
  };

  const verificarConsumo = async () => {
    try {
      const faturamentos = await faturamentoService.buscarPorPedido(Number(id));
      let total = 0;
      const nums: string[] = [];
      for (const fat of faturamentos) {
        const det = await faturamentoService.buscarPorId(fat.id);
        const c = det.itens?.filter(i => i.consumo_registrado) || [];
        if (c.length) { total += c.length; nums.push(fat.numero); }
      }
      setTemConsumoRegistrado(total > 0);
      setMensagemConsumo(total > 0
        ? `${total} item(ns) com consumo registrado no(s) faturamento(s) ${nums.join(', ')}.`
        : '');
    } catch { setTemConsumoRegistrado(false); }
  };

  const atualizarStatus = async (status: string) => {
    try {
      setProcessando(true);
      await pedidosService.atualizarStatus(Number(id), status, motivoStatus || undefined);
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      await carregarPedido();
      setDialogAlterarStatus(false);
      setNovoStatus(''); setMotivoStatus(''); setErro('');
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao atualizar status');
    } finally { setProcessando(false); }
  };

  const handleExcluir = async () => {
    try {
      setProcessando(true);
      await pedidosService.excluirPedido(Number(id));
      navigate('/compras');
    } catch (error: any) {
      setErro(error.response?.data?.message || 'Erro ao excluir pedido');
    } finally { setProcessando(false); }
  };

  if (loading) return <Box sx={{ p: 3 }}><Typography>Carregando...</Typography></Box>;
  if (!pedido) return <Box sx={{ p: 3 }}><Alert severity="error">Pedido não encontrado</Alert></Box>;

  const statusInfo = STATUS_PEDIDO[pedido.status as keyof typeof STATUS_PEDIDO];
  const ehCancelado = pedido.status === 'cancelado';
  const ehConcluido = pedido.status === 'concluido';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        {/* Cabeçalho */}
        <Box sx={{ px: 2, py: 1, bgcolor: 'white', borderBottom: '1px solid #e9ecef' }}>
          <PageBreadcrumbs items={[
            { label: 'Compras', path: '/compras', icon: <ShoppingCartIcon fontSize="small" /> },
            { label: `Compra ${pedido.numero}` },
          ]} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Compra {pedido.numero}
              </Typography>
              <Chip label={statusInfo?.label || pedido.status} color={statusInfo?.color as any || 'default'} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {formatarMoeda(pedido.valor_total)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select value={pedido.status} label="Status"
                  onChange={(e) => { setNovoStatus(e.target.value); setDialogAlterarStatus(true); }}
                  disabled={processando}>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="recebido_parcial">Recebido Parcial</MenuItem>
                  <MenuItem value="concluido">Concluído</MenuItem>
                  <MenuItem value="suspenso">Suspenso</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<ReceiptIcon />}
                onClick={() => navigate(`/compras/${pedido.id}/faturamentos`)} disabled={processando}>
                Faturamento
              </Button>
              <Button variant="contained" color={'edit' as any} startIcon={<EditIcon />}
                onClick={() => navigate(`/compras/${pedido.id}/editar`)} disabled={processando}>
                Editar
              </Button>
              <Button variant="contained" color={'delete' as any} startIcon={<CancelIcon />}
                onClick={() => setDialogExcluir(true)} disabled={processando}>
                Excluir
              </Button>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {pedido.numero} · {formatarData(pedido.data_pedido)} · {pedido.usuario_criacao_nome}
            {pedido.usuario_aprovacao_nome && ` · Aprovado: ${pedido.usuario_aprovacao_nome}`}
            {' · '}{new Set(pedido.itens.map(i => i.fornecedor_nome)).size} fornecedor(es)
            {' · '}{pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}
          </Typography>

          {pedido.observacoes && (
            <Alert severity="info" sx={{ mt: 0.75, py: 0.25, '& .MuiAlert-message': { py: 0.25 } }}>
              <Typography variant="caption">{pedido.observacoes}</Typography>
            </Alert>
          )}
          {erro && <Alert severity="error" sx={{ mt: 0.75 }} onClose={() => setErro('')}>{erro}</Alert>}
        </Box>

        {/* Tabela */}
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, mt: 1.5 }}>Itens da Compra</Typography>

        <Box sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden', border: '1px solid #e9ecef' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 0.75, borderBottom: '1px solid #e9ecef' }}>
            <Typography variant="caption" color="text.secondary">
              {pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {itensSelecionados.size >= 2 && !itensMesclaveis && (
                <Typography variant="caption" color="error">Selecione itens do mesmo produto</Typography>
              )}
              {itensSelecionados.size >= 2 && (
                <Button variant="contained" color="warning" startIcon={<MergeIcon />}
                  onClick={handleMesclar} disabled={mesclando || !itensMesclaveis}>
                  {mesclando ? 'Mesclando...' : `Mesclar (${itensSelecionados.size})`}
                </Button>
              )}
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {formatarMoeda(pedido.valor_total)}
              </Typography>
            </Box>
          </Box>

          <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Produto</TableCell>
                  <TableCell>Fornecedor</TableCell>
                  <TableCell align="right">Quantidade</TableCell>
                  <TableCell align="center">Entrega</TableCell>
                  <TableCell align="right">Preço Unit.</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center" width={50}>Prog.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pedido.itens.map((item) => (
                  <TableRow key={item.id} hover selected={itensSelecionados.has(item.id!)}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small"
                        checked={itensSelecionados.has(item.id!)}
                        onChange={() => toggleSelecao(item.id!)} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{item.produto_nome}</TableCell>
                    <TableCell>
                      {item.fornecedor_nome}
                      {item.contrato_numero && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          · {item.contrato_numero}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {item.quantidade ? formatarNumero(Number(item.quantidade)) : '0'} {item.unidade || ''}
                    </TableCell>
                    <TableCell align="center">
                      {item.data_entrega_prevista ? formatarData(item.data_entrega_prevista) : '-'}
                    </TableCell>
                    <TableCell align="right">{formatarMoeda(item.preco_unitario)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>{formatarMoeda(item.valor_total)}</TableCell>
                    <TableCell align="center" sx={{ py: 0 }}>
                      <Tooltip title="Programação de entrega por escola">
                        <IconButton size="small" color="primary"
                          onClick={() => setProgramacaoDialog({
                            open: true, itemId: item.id!,
                            produtoNome: item.produto_nome || '', unidade: item.unidade || 'kg',
                          })}>
                          <CalendarIcon sx={{ fontSize: 16 }} />
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

      {/* Dialog Alterar Status */}
      <Dialog open={dialogAlterarStatus} onClose={() => setDialogAlterarStatus(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Alterar Status</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Alterando para: <strong>{STATUS_PEDIDO[novoStatus as keyof typeof STATUS_PEDIDO]?.label}</strong>
          </Alert>
          <TextField fullWidth label="Motivo (opcional)" multiline rows={2}
            value={motivoStatus} onChange={(e) => setMotivoStatus(e.target.value)}
            placeholder="Descreva o motivo..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAlterarStatus(false)}>Cancelar</Button>
          <Button onClick={() => atualizarStatus(novoStatus)} variant="contained" disabled={processando}>
            {processando ? 'Alterando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Excluir */}
      <Dialog open={dialogExcluir} onClose={() => setDialogExcluir(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Excluir Compra</DialogTitle>
        <DialogContent>
          {temConsumoRegistrado && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>Compra com Consumo Registrado</Typography>
              <Typography variant="body2">{mensagemConsumo}</Typography>
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            {ehCancelado ? 'Excluir esta compra cancelada?' : ehConcluido
              ? 'Excluir esta compra concluída?' : 'Excluir esta compra? Esta ação não pode ser desfeita.'}
          </Typography>
          {!ehCancelado && !ehConcluido && !temConsumoRegistrado && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              <Typography variant="body2">Esta compra está em andamento. A exclusão pode impactar fornecedores.</Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogExcluir(false)} disabled={processando}>Cancelar</Button>
          <Button onClick={handleExcluir} color="delete" variant="contained"
            disabled={processando || temConsumoRegistrado}>
            {processando ? 'Excluindo...' : 'Confirmar Exclusão'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Programação */}
      <ProgramacaoEntregaDialog
        open={programacaoDialog.open}
        onClose={() => setProgramacaoDialog(p => ({ ...p, open: false }))}
        pedidoItemId={programacaoDialog.itemId}
        produtoNome={programacaoDialog.produtoNome}
        unidade={programacaoDialog.unidade}
        onSaved={carregarPedido}
      />

      {/* Popover Observações */}
      <Popover open={Boolean(obsAnchorEl)} anchorEl={obsAnchorEl} onClose={() => setObsAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Box sx={{ p: 2, width: 320 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>Observações</Typography>
          {obsItemSelecionado && (
            <>
              <Typography variant="caption" color="text.secondary">{obsItemSelecionado.produto_nome}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{obsItemSelecionado.observacoes}</Typography>
            </>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
            <Button onClick={() => setObsAnchorEl(null)}>Fechar</Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}
