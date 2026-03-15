import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '../contexts/PageTitleContext';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, Popover, Tooltip,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import {
  Cancel as CancelIcon, Edit as EditIcon, Receipt as ReceiptIcon,
  CalendarMonth as CalendarIcon, MergeType as MergeIcon, Tune as TuneIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { listarProgramacoes } from '../services/programacaoEntrega';
import pedidosService from '../services/pedidos';
import faturamentoService from '../services/faturamento';
import { apiWithRetry } from '../services/api';
import CompactPagination from '../components/CompactPagination';
import { PedidoDetalhado, STATUS_PEDIDO } from '../types/pedido';
import PageContainer from '../components/PageContainer';
import { formatarMoeda, formatarData } from '../utils/dateUtils';

const formatarNumero = (n: number) => parseFloat(n.toString()).toString();

export default function PedidoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { setPageTitle, setBackPath } = usePageTitle();

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

  const [gerandoPdf, setGerandoPdf] = useState(false);

  async function gerarPDFRequisicao() {
    if (!pedido) return;
    setGerandoPdf(true);
    try {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default;
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default as any;
      (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

      // Carregar programações de todos os itens
      const progsMap: Record<number, any[]> = {};
      await Promise.all(pedido.itens.map(async (item) => {
        if (!item.id) return;
        const progs = await listarProgramacoes(item.id);
        progsMap[item.id] = progs.map(p => ({
          ...p,
          data_entrega: p.data_entrega ? p.data_entrega.split('T')[0] : p.data_entrega,
        }));
      }));

      // Agrupar itens por fornecedor
      const fornMap: Record<number, { nome: string; cnpj: string; itens: typeof pedido.itens }> = {};
      pedido.itens.forEach(item => {
        const fid = item.fornecedor_id ?? 0;
        if (!fornMap[fid]) fornMap[fid] = { nome: item.fornecedor_nome ?? '—', cnpj: item.fornecedor_cnpj ?? '—', itens: [] };
        fornMap[fid].itens.push(item);
      });

      const C_HEADER = '#2d3748';
      const C_SUB    = '#4a5568';
      const C_STRIPE = '#f7f8fa';
      const C_BORDER = '#e2e8f0';
      const C_TOTAL  = '#1a202c';

      const competencia = pedido.competencia_mes_ano ?? formatarData(pedido.data_pedido);
      const docNumero   = pedido.numero;

      // Número de controle: pedidoId + timestamp truncado
      const ctrlBase = `${pedido.id}-${Date.now().toString(36).toUpperCase()}`;

      const content: any[] = [];
      let pageSeq = 0;

      Object.values(fornMap).forEach((forn, fi) => {
        // Agrupar itens do fornecedor por data de entrega (programação)
        // Montar mapa: data_entrega -> [{ item, quantidade }]
        const progDataMap: Record<string, { item: typeof pedido.itens[0]; quantidade: number }[]> = {};

        forn.itens.forEach(item => {
          const progs = progsMap[item.id!] ?? [];
          if (progs.length === 0) {
            // Sem programação: usa data prevista ou "Sem data"
            const key = item.data_entrega_prevista ? item.data_entrega_prevista.split('T')[0] : 'Sem data definida';
            if (!progDataMap[key]) progDataMap[key] = [];
            progDataMap[key].push({ item, quantidade: Number(item.quantidade) });
          } else {
            progs.forEach(prog => {
              const key = prog.data_entrega;
              if (!progDataMap[key]) progDataMap[key] = [];
              const qtdTotal = prog.escolas.reduce((s: number, e: any) => s + Number(e.quantidade), 0);
              progDataMap[key].push({ item, quantidade: qtdTotal });
            });
          }
        });

        const datas = Object.keys(progDataMap).sort();
        let totalFornecedor = 0;

        // Quebra de página entre fornecedores
        if (fi > 0) content.push({ text: '', pageBreak: 'before' });

        datas.forEach((data, di) => {
          pageSeq++;
          const linhas = progDataMap[data];
          let subtotal = 0;

          // Cabeçalho do fornecedor (só na primeira data)
          if (di === 0) {
            content.push({
              columns: [
                {
                  stack: [
                    { text: 'REQUISIÇÃO DE COMPRA', fontSize: 7, bold: true, color: '#718096', characterSpacing: 1 },
                    { text: forn.nome, fontSize: 14, bold: true, color: C_TOTAL, margin: [0, 2, 0, 0] },
                    { text: `CNPJ: ${forn.cnpj}`, fontSize: 8, color: C_SUB, margin: [0, 2, 0, 0] },
                  ],
                },
                {
                  stack: [
                    { text: `Pedido: ${docNumero}`, fontSize: 8, alignment: 'right', color: C_SUB },
                    { text: `Competência: ${competencia}`, fontSize: 8, alignment: 'right', color: C_SUB, margin: [0, 2, 0, 0] },
                    { text: `Controle: ${ctrlBase}-${String(pageSeq).padStart(3, '0')}`, fontSize: 7, alignment: 'right', color: '#a0aec0', margin: [0, 2, 0, 0] },
                  ],
                  width: 180,
                },
              ],
              margin: [0, 0, 0, 8],
            });
            content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: C_HEADER }], margin: [0, 0, 0, 8] });
          } else {
            // Próxima data do mesmo fornecedor: número de controle atualizado
            content.push({
              text: `Controle: ${ctrlBase}-${String(pageSeq).padStart(3, '0')}`,
              fontSize: 7, alignment: 'right', color: '#a0aec0', margin: [0, 0, 0, 4],
            });
          }

          // Linha de data de entrega
          content.push({
            table: {
              widths: ['*'],
              body: [[{
                text: `Data de Entrega: ${data}`,
                fontSize: 9, bold: true, color: '#ffffff',
                fillColor: C_SUB, margin: [6, 4, 6, 4],
              }]],
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 4],
          });

          // Tabela de itens
          const tableBody: any[][] = [
            // Cabeçalho
            [
              { text: 'Item', bold: true, fontSize: 8, fillColor: C_HEADER, color: '#fff', margin: [4, 4, 4, 4] },
              { text: 'Marca', bold: true, fontSize: 8, fillColor: C_HEADER, color: '#fff', alignment: 'center', margin: [4, 4, 4, 4] },
              { text: 'Unid.', bold: true, fontSize: 8, fillColor: C_HEADER, color: '#fff', alignment: 'center', margin: [4, 4, 4, 4] },
              { text: 'Vl. Unit.', bold: true, fontSize: 8, fillColor: C_HEADER, color: '#fff', alignment: 'right', margin: [4, 4, 4, 4] },
              { text: 'Quantidade', bold: true, fontSize: 8, fillColor: C_HEADER, color: '#fff', alignment: 'right', margin: [4, 4, 4, 4] },
              { text: 'Custo', bold: true, fontSize: 8, fillColor: C_HEADER, color: '#fff', alignment: 'right', margin: [4, 4, 4, 4] },
            ],
          ];

          linhas.forEach(({ item, quantidade }, idx) => {
            const custo = Number(item.preco_unitario) * quantidade;
            subtotal += custo;
            const bg = idx % 2 === 0 ? '#ffffff' : C_STRIPE;
            tableBody.push([
              { text: item.produto_nome ?? '—', fontSize: 8, fillColor: bg, margin: [4, 3, 4, 3] },
              { text: item.marca ?? '—', fontSize: 8, fillColor: bg, alignment: 'center', margin: [4, 3, 4, 3] },
              { text: item.unidade ?? '—', fontSize: 8, fillColor: bg, alignment: 'center', margin: [4, 3, 4, 3] },
              { text: formatarMoeda(item.preco_unitario), fontSize: 8, fillColor: bg, alignment: 'right', margin: [4, 3, 4, 3] },
              { text: `${quantidade % 1 === 0 ? quantidade.toFixed(0) : quantidade.toFixed(2)} ${item.unidade ?? ''}`, fontSize: 8, fillColor: bg, alignment: 'right', margin: [4, 3, 4, 3] },
              { text: formatarMoeda(custo), fontSize: 8, fillColor: bg, alignment: 'right', margin: [4, 3, 4, 3] },
            ]);
          });

          // Subtotal da programação
          totalFornecedor += subtotal;
          tableBody.push([
            { text: `Subtotal — ${data}`, colSpan: 5, bold: true, fontSize: 8, fillColor: '#edf2f7', alignment: 'right', margin: [4, 4, 4, 4] },
            {}, {}, {}, {},
            { text: formatarMoeda(subtotal), bold: true, fontSize: 8, fillColor: '#edf2f7', alignment: 'right', margin: [4, 4, 4, 4] },
          ]);

          content.push({
            table: {
              headerRows: 1,
              widths: ['*', 60, 35, 60, 65, 65],
              body: tableBody,
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0,
              hLineColor: () => C_BORDER,
              fillColor: () => null,
            },
            margin: [0, 0, 0, 8],
          });
        });

        // Total geral do fornecedor
        content.push({
          table: {
            widths: ['*', 100],
            body: [[
              { text: `TOTAL GERAL — ${forn.nome}`, bold: true, fontSize: 9, color: '#ffffff', fillColor: C_TOTAL, margin: [6, 5, 6, 5] },
              { text: formatarMoeda(totalFornecedor), bold: true, fontSize: 10, color: '#ffffff', fillColor: C_TOTAL, alignment: 'right', margin: [6, 5, 6, 5] },
            ]],
          },
          layout: 'noBorders',
          margin: [0, 4, 0, 0],
        });
      });

      const docDef: any = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [28, 36, 28, 36],
        content,
        footer: (currentPage: number, pageCount: number) => ({
          columns: [
            { text: `Pedido ${docNumero} · Competência: ${competencia}`, fontSize: 7, color: '#a0aec0', margin: [28, 0, 0, 0] },
            { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: '#a0aec0', alignment: 'right', margin: [0, 0, 28, 0] },
          ],
        }),
        defaultStyle: { font: 'Roboto' },
      };

      pdfMake.createPdf(docDef).download(`requisicao-${docNumero}.pdf`);
    } catch (e) {
      console.error(e);
      setErro('Erro ao gerar PDF');
    } finally {
      setGerandoPdf(false);
    }
  }

  const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
  const [mesclando, setMesclando] = useState(false);
  const [itensPagina, setItensPagina] = useState(0);
  const [itensPorPagina, setItensPorPagina] = useState(25);

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
  useEffect(() => {
    if (pedido) {
      setPageTitle(`Compra ${pedido.numero}`);
      setBackPath('/compras');
    }
    return () => { setBackPath(null); };
  }, [pedido]);
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
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        {/* Cabeçalho */}
        <Box sx={{ px: 2, py: 1, bgcolor: 'white', borderBottom: '1px solid #e9ecef' }}>

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
              <Button variant="outlined" startIcon={<TuneIcon />}
                onClick={() => navigate(`/compras/${pedido.id}/programacoes-ajuste`)} disabled={processando}>
                Ajuste de Prog.
              </Button>
              <Button variant="outlined" startIcon={<PdfIcon />}
                onClick={gerarPDFRequisicao} disabled={processando || gerandoPdf}>
                {gerandoPdf ? 'Gerando...' : 'PDF Requisição'}
              </Button>
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, mt: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Itens da Compra</Typography>
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
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
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
                  {pedido.itens.slice(itensPagina * itensPorPagina, (itensPagina + 1) * itensPorPagina).map((item) => (
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
                            onClick={() => navigate(`/compras/${pedido.id}/item/${item.id}/programacao`)}>
                            <CalendarIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <CompactPagination
              count={pedido.itens.length}
              page={itensPagina}
              rowsPerPage={itensPorPagina}
              onPageChange={(_, p) => setItensPagina(p)}
              onRowsPerPageChange={(e) => { setItensPorPagina(parseInt(e.target.value, 10)); setItensPagina(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Box>
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
