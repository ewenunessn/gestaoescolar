import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Button, Chip, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Popover, List, ListItemButton, ListItemText, Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, Save as SaveIcon, Tune as TuneIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { usePageTitle } from '../contexts/PageTitleContext';
import { useToast } from '../hooks/useToast';
import { toNum, formatarQuantidade } from '../utils/formatters';
import pedidosService from '../services/pedidos';
import { listarProgramacoes, salvarProgramacoes, ProgramacaoEntrega } from '../services/programacaoEntrega';
import { listarEscolas } from '../services/escolas';
import { PedidoItem } from '../types/pedido';

interface Escola { id: number; nome: string; ativo: boolean; }
interface ColState { itemId: number | null; progIdx: number | null; }
type Qtds = Record<number, Record<number, number>>;

const MAX_COLS = 5;
const COL_W = 190;
const ESC_W = 210;

export default function AjusteProgramacoesScreen() {
  const { id: pedidoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { setPageTitle, setBackPath } = usePageTitle();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [programacoes, setProgramacoes] = useState<Record<number, ProgramacaoEntrega[]>>({});
  const [cols, setCols] = useState<ColState[]>(
    Array.from({ length: MAX_COLS }, () => ({ itemId: null, progIdx: null }))
  );
  const [qtds, setQtds] = useState<Qtds>({});
  const [qtdsOrig, setQtdsOrig] = useState<Qtds>({});
  const [salvando, setSalvando] = useState<Record<number, boolean>>({});

  // Popover seletor
  const [selAnchor, setSelAnchor] = useState<{ el: HTMLElement; ci: number } | null>(null);
  const [selStep, setSelStep] = useState<'item' | 'prog'>('item');
  const [selItemId, setSelItemId] = useState<number | null>(null);

  // Modal ajuste em lote
  const [ajModal, setAjModal] = useState<{ open: boolean; ci: number } | null>(null);
  const [ajPct, setAjPct] = useState('');
  const [ajMin, setAjMin] = useState('');
  const [ajMax, setAjMax] = useState('');
  const [ajArred, setAjArred] = useState<'none' | 'int' | '0.5' | '0.1' | 'custom'>('none');
  const [ajArredCustom, setAjArredCustom] = useState('');

  // Modal replicar
  const [repModal, setRepModal] = useState<{ open: boolean; from: number } | null>(null);
  const [repTo, setRepTo] = useState<number | ''>('');

  const backPath = `/compras/${pedidoId}`;

  useEffect(() => {
    setPageTitle('Ajuste de Programações');
    setBackPath(backPath);
    return () => setBackPath(null);
  }, []);

  useEffect(() => { carregar(); }, [pedidoId]);

  async function carregar() {
    setLoading(true);
    try {
      const [pedido, esc] = await Promise.all([
        pedidosService.buscarPorId(Number(pedidoId)),
        listarEscolas(),
      ]);
      setEscolas((esc as any[]).filter(e => e.ativo));
      setItens(pedido.itens);
      const map: Record<number, ProgramacaoEntrega[]> = {};
      await Promise.all(pedido.itens.map(async (item: PedidoItem) => {
        if (!item.id) return;
        const progs = await listarProgramacoes(item.id);
        map[item.id] = progs.map(p => ({
          ...p,
          data_entrega: p.data_entrega ? p.data_entrega.split('T')[0] : p.data_entrega,
        }));
      }));
      setProgramacoes(map);
    } catch {
      setErro('Erro ao carregar dados do pedido');
    } finally {
      setLoading(false);
    }
  }

  function initCol(ci: number, itemId: number, progIdx: number, progsMap?: Record<number, ProgramacaoEntrega[]>) {
    const src = progsMap ?? programacoes;
    const prog = src[itemId]?.[progIdx];
    if (!prog) return;
    const m: Record<number, number> = {};
    prog.escolas.forEach(e => { m[e.escola_id] = toNum(e.quantidade); });
    setQtds(prev => ({ ...prev, [ci]: m }));
    setQtdsOrig(prev => ({ ...prev, [ci]: { ...m } }));
  }

  function selectCol(ci: number, itemId: number, progIdx: number) {
    setCols(prev => prev.map((c, i) => i === ci ? { itemId, progIdx } : c));
    initCol(ci, itemId, progIdx);
    setSelAnchor(null);
  }

  const getQ = (ci: number, eid: number) => qtds[ci]?.[eid] ?? 0;
  const setQ = (ci: number, eid: number, v: number) =>
    setQtds(prev => ({ ...prev, [ci]: { ...(prev[ci] ?? {}), [eid]: v } }));
  const delta = (ci: number, eid: number) => getQ(ci, eid) - (qtdsOrig[ci]?.[eid] ?? 0);
  const totalCol = (ci: number) => escolas.reduce((s, e) => s + getQ(ci, e.id), 0);
  const totalOrig = (ci: number) => escolas.reduce((s, e) => s + (qtdsOrig[ci]?.[e.id] ?? 0), 0);
  const colConfigured = (ci: number) => cols[ci].itemId !== null && cols[ci].progIdx !== null;

  function colLabel(ci: number) {
    const col = cols[ci];
    if (!col.itemId || col.progIdx === null) return `Coluna ${ci + 1}`;
    const item = itens.find(i => i.id === col.itemId);
    const prog = programacoes[col.itemId]?.[col.progIdx];
    if (!item || !prog) return `Coluna ${ci + 1}`;
    const nome = item.produto_nome?.split(' ').slice(0, 3).join(' ') ?? '';
    return `${nome}\n${prog.data_entrega}`;
  }

  function colUnidade(ci: number) {
    const col = cols[ci];
    if (!col.itemId) return '';
    return itens.find(i => i.id === col.itemId)?.unidade ?? '';
  }

  function arredondar(v: number): number {
    if (ajArred === 'int') return Math.round(v);
    if (ajArred === '0.5') return Math.round(v * 2) / 2;
    if (ajArred === '0.1') return Math.round(v * 10) / 10;
    if (ajArred === 'custom') {
      const m = toNum(ajArredCustom);
      if (m > 0) return Math.round(v / m) * m;
    }
    return v;
  }

  function previewTotal(ci: number): number {
    const pct = toNum(ajPct);
    const min = ajMin !== '' ? toNum(ajMin) : null;
    const max = ajMax !== '' ? toNum(ajMax) : null;
    return escolas.reduce((s, e) => {
      let v = getQ(ci, e.id);
      if (pct !== 0) v = v * (1 + pct / 100);
      v = arredondar(v);
      if (min !== null) v = Math.max(v, min);
      if (max !== null) v = Math.min(v, max);
      return s + v;
    }, 0);
  }

  function aplicarAjuste(ci: number) {
    const pct = toNum(ajPct);
    const min = ajMin !== '' ? toNum(ajMin) : null;
    const max = ajMax !== '' ? toNum(ajMax) : null;
    setQtds(prev => {
      const col = { ...(prev[ci] ?? {}) };
      escolas.forEach(e => {
        let v = col[e.id] ?? 0;
        if (pct !== 0) v = v * (1 + pct / 100);
        v = arredondar(v);
        if (min !== null) v = Math.max(v, min);
        if (max !== null) v = Math.min(v, max);
        col[e.id] = v;
      });
      return { ...prev, [ci]: col };
    });
    setAjModal(null);
  }

  function resetarCol(ci: number) {
    setQtds(prev => ({ ...prev, [ci]: { ...(qtdsOrig[ci] ?? {}) } }));
  }

  function replicar(from: number, to: number) {
    setQtds(prev => ({ ...prev, [to]: { ...(prev[from] ?? {}) } }));
    setRepModal(null);
    setRepTo('');
    toast.success('Replicado!', 'Quantidades copiadas. Salve a coluna destino para confirmar.');
  }

  async function salvarCol(ci: number) {
    const col = cols[ci];
    if (!col.itemId || col.progIdx === null) return;
    const allProgs = programacoes[col.itemId] ?? [];
    setSalvando(prev => ({ ...prev, [ci]: true }));
    try {
      const colQtds = qtds[ci] ?? {};
      const updated = allProgs.map((p, i) => {
        if (i !== col.progIdx) return p;
        return {
          ...p,
          escolas: escolas
            .filter(e => (colQtds[e.id] ?? 0) > 0)
            .map(e => ({ escola_id: e.id, escola_nome: e.nome, quantidade: colQtds[e.id] ?? 0 })),
        };
      });
      const resultado = await salvarProgramacoes(col.itemId, updated);
      setProgramacoes(prev => ({ ...prev, [col.itemId!]: resultado }));
      setQtdsOrig(prev => ({ ...prev, [ci]: { ...(qtds[ci] ?? {}) } }));
      toast.success('Salvo!', 'Programação atualizada com sucesso.');
    } catch {
      toast.error('Erro', 'Não foi possível salvar a programação.');
    } finally {
      setSalvando(prev => ({ ...prev, [ci]: false }));
    }
  }

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (erro) return <Box sx={{ p: 3 }}><Alert severity="error">{erro}</Alert></Box>;

  const selOpen = Boolean(selAnchor);

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>

      {/* ── Tabela ── */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', minWidth: ESC_W + MAX_COLS * COL_W }}>
          <TableHead>
            {/* Linha cabeçalho colunas */}
            <TableRow>
              <TableCell sx={{ width: ESC_W, bgcolor: '#f1f3f5', fontWeight: 700, position: 'sticky', left: 0, zIndex: 4, borderRight: '2px solid #dee2e6' }}>
                Escola
              </TableCell>
              {Array.from({ length: MAX_COLS }, (_, ci) => (
                <TableCell key={ci} sx={{ width: COL_W, bgcolor: colConfigured(ci) ? '#e8f4fd' : '#f8f9fa', p: 0.75, verticalAlign: 'top' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Button
                      size="small" fullWidth
                      variant={colConfigured(ci) ? 'contained' : 'outlined'}
                      sx={{ fontSize: 10, textTransform: 'none', lineHeight: 1.3, minHeight: 32, whiteSpace: 'pre-line', textAlign: 'center' }}
                      onClick={(e) => { setSelAnchor({ el: e.currentTarget, ci }); setSelStep('item'); setSelItemId(null); }}
                    >
                      {colLabel(ci)}
                    </Button>
                    {colConfigured(ci) && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
                        <Tooltip title="Ajuste em lote"><IconButton size="small" onClick={() => { setAjModal({ open: true, ci }); setAjPct(''); setAjMin(''); setAjMax(''); setAjArred('none'); }}><TuneIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                        <Tooltip title="Replicar quantidades"><IconButton size="small" onClick={() => { setRepModal({ open: true, from: ci }); setRepTo(''); }}><CopyIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                        <Tooltip title="Salvar esta coluna"><IconButton size="small" color="success" onClick={() => salvarCol(ci)} disabled={!!salvando[ci]}>{salvando[ci] ? <CircularProgress size={12} /> : <SaveIcon sx={{ fontSize: 14 }} />}</IconButton></Tooltip>
                      </Box>
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
            {/* Linha totais */}
            <TableRow>
              <TableCell sx={{ bgcolor: '#e9ecef', fontWeight: 700, fontSize: 11, position: 'sticky', left: 0, zIndex: 4, borderRight: '2px solid #dee2e6' }}>
                Total geral
              </TableCell>
              {Array.from({ length: MAX_COLS }, (_, ci) => {
                const tot = totalCol(ci);
                const d = tot - totalOrig(ci);
                return (
                  <TableCell key={ci} sx={{ bgcolor: '#e9ecef', textAlign: 'center', fontWeight: 700, fontSize: 11 }}>
                    {colConfigured(ci) ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <span>{formatarQuantidade(tot)} {colUnidade(ci)}</span>
                        {d !== 0 && <Chip label={`${d > 0 ? '+' : ''}${formatarQuantidade(d)}`} size="small" color={d > 0 ? 'success' : 'error'} sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }} />}
                      </Box>
                    ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {escolas.map((escola, ri) => (
              <TableRow key={escola.id} sx={{ bgcolor: ri % 2 === 0 ? 'white' : '#fafbfc', '&:hover': { bgcolor: '#f0f7ff' } }}>
                <TableCell sx={{ position: 'sticky', left: 0, bgcolor: ri % 2 === 0 ? 'white' : '#fafbfc', zIndex: 2, borderRight: '2px solid #dee2e6', fontSize: 12, fontWeight: 500 }}>
                  {escola.nome}
                </TableCell>
                {Array.from({ length: MAX_COLS }, (_, ci) => {
                  const q = getQ(ci, escola.id);
                  const d = delta(ci, escola.id);
                  const configured = colConfigured(ci);
                  return (
                    <TableCell key={ci} sx={{ p: 0.5, textAlign: 'center' }}>
                      {configured ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TextField
                            size="small" type="number"
                            value={q === 0 ? '' : q}
                            onChange={(e) => setQ(ci, escola.id, toNum(e.target.value))}
                            inputProps={{ min: 0, step: 0.1, style: { textAlign: 'right', fontSize: 12, padding: '3px 4px' } }}
                            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', minWidth: 20 }}>
                            {colUnidade(ci)}
                          </Typography>
                          <Box sx={{ width: 36, display: 'flex', justifyContent: 'center' }}>
                            {d !== 0 && (
                              <Chip
                                label={`${d > 0 ? '+' : ''}${formatarQuantidade(d)}`}
                                size="small"
                                color={d > 0 ? 'success' : 'error'}
                                sx={{ height: 14, fontSize: 8, '& .MuiChip-label': { px: 0.4 } }}
                              />
                            )}
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* ── Popover seletor de item/programação ── */}
      <Popover
        open={selOpen}
        anchorEl={selAnchor?.el}
        onClose={() => setSelAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 300, maxHeight: 400 } }}
      >
        {selStep === 'item' ? (
          <>
            <Box sx={{ px: 2, py: 1, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">SELECIONAR ITEM DO PEDIDO</Typography>
            </Box>
            <List dense disablePadding>
              {itens.map(item => (
                <ListItemButton key={item.id} onClick={() => { setSelItemId(item.id!); setSelStep('prog'); }}>
                  <ListItemText
                    primary={item.produto_nome}
                    secondary={`${item.quantidade} ${item.unidade} · ${item.fornecedor_nome ?? ''}`}
                    primaryTypographyProps={{ fontSize: 12 }}
                    secondaryTypographyProps={{ fontSize: 10 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        ) : (
          <>
            <Box sx={{ px: 2, py: 1, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" onClick={() => setSelStep('item')}><ArrowBackIcon sx={{ fontSize: 14 }} /></IconButton>
              <Typography variant="caption" fontWeight={700} color="text.secondary">SELECIONAR PROGRAMAÇÃO</Typography>
            </Box>
            {selItemId && (programacoes[selItemId] ?? []).length === 0 && (
              <Box sx={{ p: 2 }}><Typography variant="caption" color="text.secondary">Nenhuma programação cadastrada para este item.</Typography></Box>
            )}
            <List dense disablePadding>
              {selItemId && (programacoes[selItemId] ?? []).map((prog, pi) => {
                const usadaEm = cols.findIndex((c, i) => i !== selAnchor?.ci && c.itemId === selItemId && c.progIdx === pi);
                const desabilitada = usadaEm !== -1;
                return (
                  <ListItemButton key={pi} disabled={desabilitada} onClick={() => selectCol(selAnchor!.ci, selItemId, pi)}>
                    <ListItemText
                      primary={prog.data_entrega}
                      secondary={desabilitada
                        ? `Em uso na coluna ${usadaEm + 1}`
                        : `${prog.escolas.length} escola(s) · Total: ${formatarQuantidade(prog.escolas.reduce((s, e) => s + toNum(e.quantidade), 0))} ${itens.find(i => i.id === selItemId)?.unidade ?? ''}`}
                      primaryTypographyProps={{ fontSize: 12 }}
                      secondaryTypographyProps={{ fontSize: 10, color: desabilitada ? 'error.main' : undefined }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
            <Divider />
            <ListItemButton onClick={() => {
              if (!selItemId || !selAnchor) return;
              const newProg: ProgramacaoEntrega = { data_entrega: new Date().toISOString().split('T')[0], escolas: [] };
              const existing = programacoes[selItemId] ?? [];
              const newIdx = existing.length;
              setProgramacoes(prev => ({ ...prev, [selItemId]: [...existing, newProg] }));
              selectCol(selAnchor.ci, selItemId, newIdx);
            }}>
              <ListItemText primary="+ Nova programação vazia" primaryTypographyProps={{ fontSize: 12, color: 'primary.main' }} />
            </ListItemButton>
          </>
        )}
      </Popover>

      {/* ── Modal ajuste em lote ── */}
      {ajModal && (() => {
        const ci = ajModal.ci;
        const totAtual = totalCol(ci);
        const totOrig = totalOrig(ci);
        const totPreview = previewTotal(ci);
        const unid = colUnidade(ci);
        const fmt = (v: number) => formatarQuantidade(v);
        const diffPreview = totPreview - totAtual;
        return (
          <Dialog open={ajModal.open} onClose={() => setAjModal(null)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>Ajuste em Lote — {colLabel(ci)}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

                {/* Resumo antes/depois */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ flex: 1, p: 1.5, bgcolor: '#f8f9fa', borderRadius: 1, textAlign: 'center', border: '1px solid #e9ecef' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Original salvo</Typography>
                    <Typography variant="subtitle2" fontWeight={700}>{fmt(totOrig)} {unid}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1.5, bgcolor: '#f8f9fa', borderRadius: 1, textAlign: 'center', border: '1px solid #e9ecef' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Atual (editado)</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color={totAtual !== totOrig ? 'warning.main' : 'text.primary'}>
                      {fmt(totAtual)} {unid}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1.5, bgcolor: '#e8f4fd', borderRadius: 1, textAlign: 'center', border: '1px solid #bee3f8' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Após ajuste</Typography>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main">{fmt(totPreview)} {unid}</Typography>
                    {diffPreview !== 0 && (
                      <Chip
                        label={`${diffPreview > 0 ? '+' : ''}${fmt(diffPreview)}`}
                        size="small" color={diffPreview >= 0 ? 'success' : 'error'}
                        sx={{ height: 16, fontSize: 9, mt: 0.25, '& .MuiChip-label': { px: 0.5 } }}
                      />
                    )}
                  </Box>
                </Box>

                <Divider />

                <TextField
                  label="Aumentar / Reduzir (%)"
                  type="number" size="small"
                  value={ajPct}
                  onChange={e => setAjPct(e.target.value)}
                  helperText="Ex: 10 para +10%, -5 para -5%. Deixe vazio para não alterar."
                  inputProps={{ step: 0.1 }}
                />

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Arredondamento</InputLabel>
                    <Select value={ajArred} label="Arredondamento" onChange={e => setAjArred(e.target.value as any)}>
                      <MenuItem value="none">Sem arredondamento</MenuItem>
                      <MenuItem value="int">Inteiro (sem decimais)</MenuItem>
                      <MenuItem value="0.5">Múltiplo de 0,5</MenuItem>
                      <MenuItem value="0.1">1 casa decimal</MenuItem>
                      <MenuItem value="custom">Múltiplo personalizado</MenuItem>
                    </Select>
                  </FormControl>
                  {ajArred === 'custom' && (
                    <TextField
                      label="Múltiplo" type="number" size="small" sx={{ width: 120 }}
                      value={ajArredCustom}
                      onChange={e => setAjArredCustom(e.target.value)}
                      helperText="Ex: 5, 12, 0.25"
                      inputProps={{ min: 0.001, step: 'any' }}
                    />
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField label="Mínimo por escola" type="number" size="small" sx={{ flex: 1 }}
                    value={ajMin} onChange={e => setAjMin(e.target.value)} inputProps={{ min: 0, step: 0.1 }} />
                  <TextField label="Máximo por escola" type="number" size="small" sx={{ flex: 1 }}
                    value={ajMax} onChange={e => setAjMax(e.target.value)} inputProps={{ min: 0, step: 0.1 }} />
                </Box>

              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
              <Button color="warning" onClick={() => { resetarCol(ci); setAjModal(null); }}>
                Resetar para original
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setAjModal(null)}>Cancelar</Button>
                <Button variant="contained" onClick={() => aplicarAjuste(ci)}>Aplicar</Button>
              </Box>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* ── Modal replicar ── */}
      <Dialog open={!!repModal?.open} onClose={() => setRepModal(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Replicar Quantidades</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Copiar quantidades de <strong>{repModal ? colLabel(repModal.from) : ''}</strong> para:
            </Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>Coluna destino</InputLabel>
              <Select value={repTo} label="Coluna destino" onChange={e => setRepTo(e.target.value as number)}>
                {Array.from({ length: MAX_COLS }, (_, ci) => {
                  if (ci === repModal?.from) return null;
                  return <MenuItem key={ci} value={ci}>{colLabel(ci)}</MenuItem>;
                })}
              </Select>
            </FormControl>
            <Alert severity="info" sx={{ py: 0.5 }}>
              As quantidades serão copiadas mas não salvas automaticamente. Salve a coluna destino para confirmar.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepModal(null)}>Cancelar</Button>
          <Button variant="contained" disabled={repTo === ''} onClick={() => repModal && repTo !== '' && replicar(repModal.from, repTo as number)}>
            Replicar
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
