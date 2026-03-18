import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, IconButton, Chip, InputAdornment, CircularProgress,
  Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon, Clear as ClearIcon, Edit as EditIcon,
  CalendarMonth as CalendarIcon, School as SchoolIcon, Add as AddIcon,
  Inventory as InventoryIcon, Visibility as VisibilityIcon, Tune as TuneIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import CompactPagination from '../components/CompactPagination';
import GerarPedidoDaGuiaDialog from '../components/GerarPedidoDaGuiaDialog';
import ViewTabs from '../components/ViewTabs';
import { guiaService } from '../services/guiaService';
import { produtoService } from '../services/produtoService';
import { useToast } from '../hooks/useToast';
import api from '../services/api';

interface EscolaGuia {
  id: number;
  nome: string;
  escola_rota?: string;
  total_itens: number;
  qtd_pendente: number;
  qtd_programada: number;
  qtd_parcial: number;
  qtd_entregue: number;
  qtd_cancelado: number;
}

interface ItemGuia {
  id: number;
  produto_id: number;
  produto_nome: string;
  escola_id: number;
  escola_nome: string;
  quantidade: number;
  quantidade_demanda?: number;
  unidade: string;
  status: string;
  data_entrega?: string;
}

const GuiaDemandaDetalhe: React.FC = () => {
  const navigate = useNavigate();
  const { guiaId } = useParams<{ guiaId: string }>();
  const toast = useToast();

  const [guia, setGuia] = useState<any>(null);
  const [escolas, setEscolas] = useState<EscolaGuia[]>([]);
  const [itens, setItens] = useState<ItemGuia[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabAtiva, setTabAtiva] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog: quantidades por escola de um produto
  const [dialogEscolasOpen, setDialogEscolasOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<{ id: number; nome: string; data_entrega: string | null } | null>(null);

  // Dialog: itens de uma escola
  const [dialogItensEscolaOpen, setDialogItensEscolaOpen] = useState(false);
  const [escolaSelecionada, setEscolaSelecionada] = useState<EscolaGuia | null>(null);

  // Modal adicionar em lote
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [batchForm, setBatchForm] = useState({ produtoId: '', unidade: '', data_entrega: new Date().toISOString().split('T')[0] });
  const [batchQuantidades, setBatchQuantidades] = useState<Record<number, string>>({});
  const [batchStatus, setBatchStatus] = useState<Record<number, string>>({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);

  // Dialog gerar pedido
  const [dialogGerarPedido, setDialogGerarPedido] = useState(false);

  // Paginação
  const [pageItens, setPageItens] = useState(0);
  const [pageEscolas, setPageEscolas] = useState(0);
  const rowsPerPage = 25;

  useEffect(() => {
    if (guiaId) { loadGuiaDetalhes(); loadProdutos(); }
  }, [guiaId]);

  const loadProdutos = async () => {
    try { setProdutos(await produtoService.listar()); } catch {}
  };

  const loadGuiaDetalhes = async () => {
    try {
      setLoading(true);
      const guiaData = await guiaService.buscarGuia(Number(guiaId));
      setGuia(guiaData);
      if (guiaData?.mes && guiaData?.ano) {
        const [escolasData, itensData] = await Promise.all([
          guiaService.listarStatusEscolas(guiaData.mes, guiaData.ano, Number(guiaId)),
          guiaService.listarProdutosGuia(Number(guiaId)),
        ]);
        setEscolas(escolasData);
        const raw = itensData?.data ?? itensData ?? [];
        setItens(raw);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes da guia:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMesNome = (mes: number) => {
    const m = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return m[mes - 1];
  };

  const statusColor = (s: string): any => ({ pendente: 'default', programada: 'info', parcial: 'warning', entregue: 'success', cancelado: 'error' }[s] || 'default');

  // ── Aba Produtos: agrupar itens por (produto_id, data_entrega) ──────────────
  const produtosAgrupados = useMemo(() => {
    const map = new Map<string, { produto_id: number; produto_nome: string; unidade: string; data_entrega: string | null; total: number; total_demanda: number; escolas: ItemGuia[] }>();
    for (const item of itens) {
      const dataKey = item.data_entrega ? String(item.data_entrega).split('T')[0] : '';
      const key = `${item.produto_id}__${dataKey}`;
      if (!map.has(key)) {
        map.set(key, { produto_id: item.produto_id, produto_nome: item.produto_nome, unidade: item.unidade, data_entrega: dataKey || null, total: 0, total_demanda: 0, escolas: [] });
      }
      const g = map.get(key)!;
      g.total += Number(item.quantidade) || 0;
      g.total_demanda += Number(item.quantidade_demanda ?? item.quantidade) || 0;
      g.escolas.push(item);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.produto_nome < b.produto_nome) return -1;
      if (a.produto_nome > b.produto_nome) return 1;
      return (a.data_entrega ?? '').localeCompare(b.data_entrega ?? '');
    });
  }, [itens]);

  const filteredProdutos = useMemo(() =>
    produtosAgrupados.filter(p => p.produto_nome?.toLowerCase().includes(searchTerm.toLowerCase())),
    [produtosAgrupados, searchTerm]);

  // ── Aba Escolas ──────────────────────────────────────────────────────────
  const escolasComItens = useMemo(() =>
    escolas.filter(e => {
      const total = (Number(e.qtd_pendente)||0)+(Number(e.qtd_programada)||0)+(Number(e.qtd_parcial)||0)+(Number(e.qtd_entregue)||0)+(Number(e.qtd_cancelado)||0);
      return total > 0;
    }),
    [escolas]);

  const filteredEscolas = useMemo(() =>
    escolasComItens.filter(e => e.nome?.toLowerCase().includes(searchTerm.toLowerCase())),
    [escolasComItens, searchTerm]);

  // Itens da escola selecionada no dialog
  const itensEscolaSelecionada = useMemo(() => {
    if (!escolaSelecionada) return [];
    return itens.filter(i => i.escola_id === escolaSelecionada.id);
  }, [itens, escolaSelecionada]);

  // Escolas do produto selecionado no dialog — filtra por produto_id E data_entrega
  const escolasDoProduto = useMemo(() => {
    if (!produtoSelecionado) return [];
    return itens.filter(i => {
      if (i.produto_id !== produtoSelecionado.id) return false;
      if (produtoSelecionado.data_entrega === null) return !i.data_entrega;
      const dataItem = i.data_entrega ? String(i.data_entrega).split('T')[0] : null;
      return dataItem === produtoSelecionado.data_entrega;
    });
  }, [itens, produtoSelecionado]);

  const handleBatchSubmit = async () => {
    if (!batchForm.produtoId || !batchForm.data_entrega || !guia) return;
    const payloads = escolas
      .map(e => ({ escola: e, quantidade: Number(batchQuantidades[e.id] || 0), status: batchStatus[e.id] || 'pendente' }))
      .filter(p => p.quantidade > 0);
    if (!payloads.length) return;
    try {
      setBatchSaving(true);
      for (const { escola, quantidade, status } of payloads) {
        await api.post(`/guias/escola/${escola.id}/produtos`, {
          produtoId: parseInt(batchForm.produtoId), quantidade,
          unidade: batchForm.unidade || 'Kg', data_entrega: batchForm.data_entrega,
          mes_competencia: guia.mes, ano_competencia: guia.ano, status,
        });
      }
      toast.success('Sucesso!', 'Quantidades adicionadas com sucesso!');
      setOpenBatchDialog(false);
      setBatchQuantidades({}); setBatchStatus({});
      loadGuiaDetalhes();
    } catch (err) {
      console.error(err);
    } finally {
      setBatchSaving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;

  // ── Resumo ───────────────────────────────────────────────────────────────
  const totalItens = itens.length;
  const totalEscolas = escolasComItens.length;
  const totalEntregues = itens.filter(i => i.status === 'entregue').length;
  const totalPendentes = itens.filter(i => i.status === 'pendente').length;

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        <PageBreadcrumbs items={[
          { label: 'Guias de Demanda', path: '/guias-demanda', icon: <CalendarIcon fontSize="small" /> },
          { label: guia ? `${getMesNome(guia.mes)}/${guia.ano}` : 'Detalhes' }
        ]} />

        {/* Cards de resumo */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {[
            { label: 'Escolas', value: totalEscolas, color: 'primary.main' },
            { label: 'Itens', value: totalItens },
            { label: 'Entregues', value: totalEntregues, color: 'success.main' },
            { label: 'Pendentes', value: totalPendentes, color: 'warning.main' },
          ].map(c => (
            <Card key={c.label} sx={{ p: 1.5, flex: 1 }}>
              <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: c.color }}>{c.value}</Typography>
            </Card>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant="outlined" startIcon={<TuneIcon />} size="small"
              onClick={() => navigate(`/guias-demanda/${guiaId}/ajuste`)}
              sx={{ whiteSpace: 'nowrap' }}>
              Ajuste Fino
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} size="small"
              onClick={() => setOpenBatchDialog(true)}
              sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, whiteSpace: 'nowrap' }}>
              Adicionar em Lote
            </Button>
            <Button variant="contained" startIcon={<ShoppingCartIcon />} size="small"
              onClick={() => setDialogGerarPedido(true)}
              sx={{ bgcolor: '#1d4ed8', '&:hover': { bgcolor: '#1e40af' }, whiteSpace: 'nowrap' }}>
              Gerar Pedido
            </Button>
          </Box>
        </Box>

        {/* Abas */}
        <Box sx={{ mb: 1.5 }}>
          <ViewTabs
            value={tabAtiva}
            onChange={(v) => { setTabAtiva(v); setSearchTerm(''); }}
            tabs={[
              { value: 0, label: 'Por Produto', icon: <InventoryIcon sx={{ fontSize: 16 }} /> },
              { value: 1, label: 'Por Escola', icon: <SchoolIcon sx={{ fontSize: 16 }} /> },
            ]}
          />
        </Box>

        {/* Busca */}
        <Box sx={{ mb: 1.5 }}>
          <TextField placeholder={tabAtiva === 0 ? 'Buscar produto...' : 'Buscar escola...'}
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            size="small" sx={{ width: 320 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
              endAdornment: searchTerm && <InputAdornment position="end"><IconButton size="small" onClick={() => setSearchTerm('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>,
            }} />
        </Box>

        {/* ── Aba 0: Por Produto ── */}
        {tabAtiva === 0 && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {filteredProdutos.length === 0 ? (
              <Box textAlign="center" py={8}>
                <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Nenhum produto encontrado</Typography>
              </Box>
            ) : (
              <>
                <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell align="center">Data</TableCell>
                        <TableCell align="center">Unidade</TableCell>
                        <TableCell align="right">Qtd. Ajustada</TableCell>
                        <TableCell align="right">Qtd. Demanda</TableCell>
                        <TableCell align="center">Escolas</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredProdutos.slice(pageItens * rowsPerPage, (pageItens + 1) * rowsPerPage).map(p => {
                        const diff = p.total - p.total_demanda;
                        const hasAjuste = Math.abs(diff) > 0.0005;
                        return (
                          <TableRow key={`${p.produto_id}__${p.data_entrega}`} hover>
                            <TableCell sx={{ fontWeight: 500 }}>{p.produto_nome}</TableCell>
                            <TableCell align="center">
                              {p.data_entrega
                                ? new Date(p.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')
                                : '—'}
                            </TableCell>
                            <TableCell align="center">{p.unidade}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                {hasAjuste && (
                                  <Chip
                                    label={`${diff > 0 ? '+' : ''}${diff.toFixed(3)}`}
                                    size="small"
                                    color={diff > 0 ? 'success' : 'error'}
                                    sx={{ height: 14, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }}
                                  />
                                )}
                                <Box sx={{ minWidth: 60, textAlign: 'right' }}>{p.total.toFixed(3)}</Box>
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                              {p.total_demanda.toFixed(3)}
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={p.escolas.length} size="small" color="primary" />
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Ver quantidades por escola">
                                <IconButton size="small" color="primary"
                                  onClick={() => { setProdutoSelecionado({ id: p.produto_id, nome: p.produto_nome, data_entrega: p.data_entrega }); setDialogEscolasOpen(true); }}>
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <CompactPagination count={filteredProdutos.length} page={pageItens} rowsPerPage={rowsPerPage}
                  onPageChange={(_, p) => setPageItens(p)}
                  onRowsPerPageChange={e => { setPageItens(0); }} rowsPerPageOptions={[25]} />
              </>
            )}
          </Box>
        )}

        {/* ── Aba 1: Por Escola ── */}
        {tabAtiva === 1 && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {filteredEscolas.length === 0 ? (
              <Box textAlign="center" py={8}>
                <SchoolIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Nenhuma escola com itens</Typography>
              </Box>
            ) : (
              <>
                <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Escola</TableCell>
                        <TableCell align="center">Total Itens</TableCell>
                        <TableCell align="center">Pendentes</TableCell>
                        <TableCell align="center">Programados</TableCell>
                        <TableCell align="center">Entregues</TableCell>
                        <TableCell align="center">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredEscolas.slice(pageEscolas * rowsPerPage, (pageEscolas + 1) * rowsPerPage).map(e => {
                        const total = (Number(e.qtd_pendente)||0)+(Number(e.qtd_programada)||0)+(Number(e.qtd_parcial)||0)+(Number(e.qtd_entregue)||0)+(Number(e.qtd_cancelado)||0);
                        return (
                          <TableRow key={e.id} hover>
                            <TableCell sx={{ fontWeight: 500 }}>{e.nome}</TableCell>
                            <TableCell align="center"><Chip label={total} size="small" /></TableCell>
                            <TableCell align="center"><Chip label={Number(e.qtd_pendente)||0} size="small" /></TableCell>
                            <TableCell align="center"><Chip label={Number(e.qtd_programada)||0} size="small" color="info" /></TableCell>
                            <TableCell align="center"><Chip label={Number(e.qtd_entregue)||0} size="small" color="success" /></TableCell>
                            <TableCell align="center">
                              <Tooltip title="Ver itens desta escola">
                                <IconButton size="small" color="primary"
                                  onClick={() => { setEscolaSelecionada(e); setDialogItensEscolaOpen(true); }}>
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Gerenciar itens">
                                <IconButton size="small" color="default"
                                  onClick={() => navigate(`/guias-demanda/${guiaId}/escola/${e.id}`)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <CompactPagination count={filteredEscolas.length} page={pageEscolas} rowsPerPage={rowsPerPage}
                  onPageChange={(_, p) => setPageEscolas(p)}
                  onRowsPerPageChange={e => { setPageEscolas(0); }} rowsPerPageOptions={[25]} />
              </>
            )}
          </Box>
        )}
      </PageContainer>

      {/* Dialog: quantidades por escola de um produto */}
      <Dialog open={dialogEscolasOpen} onClose={() => setDialogEscolasOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{produtoSelecionado?.nome}</Typography>
          <Typography variant="caption" color="text.secondary">
            Quantidade por escola
            {produtoSelecionado?.data_entrega && ` · ${new Date(produtoSelecionado.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}`}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Escola</TableCell>
                <TableCell align="right">Qtd. Ajustada</TableCell>
                <TableCell align="right">Qtd. Demanda</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {escolasDoProduto.map(item => {
                const dem = Number(item.quantidade_demanda ?? item.quantidade);
                const diff = Number(item.quantidade) - dem;
                const hasAjuste = Math.abs(diff) > 0.0005;
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.escola_nome}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        {hasAjuste && (
                          <Chip label={`${diff > 0 ? '+' : ''}${diff.toFixed(3)}`} size="small" color={diff > 0 ? 'success' : 'error'} sx={{ height: 14, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }} />
                        )}
                        <Box sx={{ minWidth: 60, textAlign: 'right' }}>{Number(item.quantidade).toFixed(3)} {item.unidade}</Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                      {dem.toFixed(3)} {item.unidade}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={item.status} size="small" color={statusColor(item.status)} />
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {escolasDoProduto.reduce((s, i) => s + (Number(i.quantidade)||0), 0).toFixed(3)} {escolasDoProduto[0]?.unidade}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {escolasDoProduto.reduce((s, i) => s + (Number(i.quantidade_demanda ?? i.quantidade)||0), 0).toFixed(3)} {escolasDoProduto[0]?.unidade}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogEscolasOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: itens de uma escola */}
      <Dialog open={dialogItensEscolaOpen} onClose={() => setDialogItensEscolaOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{escolaSelecionada?.nome}</Typography>
          <Typography variant="caption" color="text.secondary">Itens desta escola na guia</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell align="center">Data Entrega</TableCell>
                <TableCell align="right">Quantidade</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {itensEscolaSelecionada.map(item => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.produto_nome}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {item.data_entrega
                      ? new Date(String(item.data_entrega).includes('T') ? item.data_entrega : item.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{Number(item.quantidade).toFixed(3)} {item.unidade}</TableCell>
                  <TableCell align="center">
                    <Chip label={item.status} size="small" color={statusColor(item.status)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogItensEscolaOpen(false); navigate(`/guias-demanda/${guiaId}/escola/${escolaSelecionada?.id}`); }}
            variant="outlined" size="small">
            Gerenciar Itens
          </Button>
          <Button onClick={() => setDialogItensEscolaOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Gerar Pedido */}
      <GerarPedidoDaGuiaDialog
        open={dialogGerarPedido}
        onClose={() => setDialogGerarPedido(false)}
        onSuccess={() => {
          toast.success('Pedido gerado com sucesso!');
          setDialogGerarPedido(false);
        }}
        guiaIdInicial={guia?.id}
      />

      {/* Modal Adicionar em Lote */}
      <Dialog open={openBatchDialog} onClose={() => !batchSaving && setOpenBatchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Adicionar Produto em Lote</Typography>
          <IconButton size="small" onClick={() => !batchSaving && setOpenBatchDialog(false)} disabled={batchSaving}>
            <ClearIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Produto</InputLabel>
              <Select value={batchForm.produtoId} label="Produto" disabled={batchSaving}
                onChange={e => {
                  const p = produtos.find(x => x.id === Number(e.target.value));
                  setBatchForm({ ...batchForm, produtoId: e.target.value as string, unidade: p?.unidade || 'Kg' });
                }}>
                {produtos.map(p => <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Data de Entrega" type="date" value={batchForm.data_entrega}
              onChange={e => setBatchForm({ ...batchForm, data_entrega: e.target.value })}
              fullWidth size="small" InputLabelProps={{ shrink: true }} disabled={batchSaving} />
            {batchForm.produtoId && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Quantidades por escola:</Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {escolas.map(e => (
                    <Box key={e.id} sx={{ display: 'flex', gap: 1.5, mb: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>{e.nome}</Typography>
                      <TextField label="Qtd" type="number" size="small"
                        value={batchQuantidades[e.id] || ''}
                        onChange={ev => setBatchQuantidades({ ...batchQuantidades, [e.id]: ev.target.value })}
                        sx={{ width: 90 }} disabled={batchSaving} />
                      <FormControl size="small" sx={{ width: 120 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={batchStatus[e.id] || 'pendente'} label="Status" disabled={batchSaving}
                          onChange={ev => setBatchStatus({ ...batchStatus, [e.id]: ev.target.value as string })}>
                          <MenuItem value="pendente">Pendente</MenuItem>
                          <MenuItem value="programada">Programada</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            {batchSaving && <LinearProgress />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBatchDialog(false)} disabled={batchSaving}>Cancelar</Button>
          <Button onClick={handleBatchSubmit} variant="contained" disabled={batchSaving || !batchForm.produtoId}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuiaDemandaDetalhe;
