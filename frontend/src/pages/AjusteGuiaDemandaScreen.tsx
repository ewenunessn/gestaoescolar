import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box, Typography, IconButton, Button, Chip, CircularProgress, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Popover, List, ListItemButton, ListItemText, Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, Save as SaveIcon, Tune as TuneIcon,
  ContentCopy as CopyIcon, RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { usePageTitle } from '../contexts/PageTitleContext';
import { useToast } from '../hooks/useToast';
import { formatarQuantidade } from '../utils/formatters';
import { toNum } from '../utils/formatters';
import api from '../services/api';

interface EscolaQtd { id: number; nome: string; quantidade: number; quantidade_demanda: number; item_id: number; }
interface GrupoItem {
  produto_id: number; produto_nome: string; unidade: string;
  data_entrega: string | null; escolas: EscolaQtd[];
}
interface Escola { id: number; nome: string; }
interface ColState { grupoIdx: number | null; }
type Qtds = Record<number, Record<number, number>>; // colIdx → escolaId → qtd

const MAX_COLS = 5;
const COL_W = 200;
const ESC_W = 220;

export default function AjusteGuiaDemandaScreen() {
  const { guiaId } = useParams<{ guiaId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { setPageTitle, setBackPath } = usePageTitle();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [guia, setGuia] = useState<any>(null);
  const [grupos, setGrupos] = useState<GrupoItem[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [cols, setCols] = useState<ColState[]>(Array.from({ length: MAX_COLS }, () => ({ grupoIdx: null })));
  const [qtds, setQtds] = useState<Qtds>({});
  const [qtdsDemanda, setQtdsDemanda] = useState<Qtds>({}); // original calculado
  const [salvando, setSalvando] = useState<Record<number, boolean>>({});

  // Popover seletor
  const [selAnchor, setSelAnchor] = useState<{ el: HTMLElement; ci: number } | null>(null);

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

  const backPath = `/guias-demanda/${guiaId}`;

  useEffect(() => {
    setPageTitle('Ajuste de Demanda');
    setBackPath(backPath);
    return () => setBackPath(null);
  }, []);

  useEffect(() => { if (guiaId) carregar(); }, [guiaId]);

  async function carregar() {
    setLoading(true);
    try {
      const [guiaRes, ajusteRes, escolasRes] = await Promise.all([
        api.get(`/guias/${guiaId}`),
        api.get(`/guias/${guiaId}/ajuste`),
        api.get('/escolas'),
      ]);
      setGuia(guiaRes.data.data || guiaRes.data);
      const gs: GrupoItem[] = ajusteRes.data.data || [];
      setGrupos(gs);
      const esc: Escola[] = ((escolasRes.data.data || escolasRes.data) as any[]).filter((e: any) => e.ativo !== false);
      setEscolas(esc);
    } catch {
      setErro('Erro ao carregar dados da guia');
    } finally {
      setLoading(false);
    }
  }

  function initCol(ci: number, grupoIdx: number, gs?: GrupoItem[]) {
    const src = gs ?? grupos;
    const grupo = src[grupoIdx];
    if (!grupo) return;
    const qtdMap: Record<number, number> = {};
    const demMap: Record<number, number> = {};
    grupo.escolas.forEach(e => {
      qtdMap[e.id] = e.quantidade;
      demMap[e.id] = e.quantidade_demanda;
    });
    setQtds(prev => ({ ...prev, [ci]: qtdMap }));
    setQtdsDemanda(prev => ({ ...prev, [ci]: demMap }));
  }

  function selectCol(ci: number, grupoIdx: number) {
    setCols(prev => prev.map((c, i) => i === ci ? { grupoIdx } : c));
    initCol(ci, grupoIdx);
    setSelAnchor(null);
  }

  const getQ = (ci: number, eid: number) => qtds[ci]?.[eid] ?? 0;
  const setQ = (ci: number, eid: number, v: number) =>
    setQtds(prev => ({ ...prev, [ci]: { ...(prev[ci] ?? {}), [eid]: v } }));
  const getDemanda = (ci: number, eid: number) => qtdsDemanda[ci]?.[eid] ?? 0;
  const delta = (ci: number, eid: number) => getQ(ci, eid) - getDemanda(ci, eid);
  const totalCol = (ci: number) => escolas.reduce((s, e) => s + getQ(ci, e.id), 0);
  const totalDemanda = (ci: number) => escolas.reduce((s, e) => s + getDemanda(ci, e.id), 0);
  const colConfigured = (ci: number) => cols[ci].grupoIdx !== null;

  function colLabel(ci: number) {
    const gi = cols[ci].grupoIdx;
    if (gi === null || gi === undefined) return `Coluna ${ci + 1}`;
    const g = grupos[gi];
    if (!g) return `Coluna ${ci + 1}`;
    const nome = g.produto_nome.split(' ').slice(0, 3).join(' ');
    return g.data_entrega
      ? `${nome}\n${new Date(g.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}`
      : nome;
  }

  function colUnidade(ci: number) {
    const gi = cols[ci].grupoIdx;
    if (gi === null || gi === undefined) return '';
    return grupos[gi]?.unidade ?? '';
  }

  function arredondar(v: number): number {
    if (ajArred === 'int') return Math.round(v);
    if (ajArred === '0.5') return Math.round(v * 2) / 2;
    if (ajArred === '0.1') return Math.round(v * 10) / 10;
    if (ajArred === 'custom') { const m = toNum(ajArredCustom); if (m > 0) return Math.round(v / m) * m; }
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
        col[e.id] = Math.round(v * 1000) / 1000;
      });
      return { ...prev, [ci]: col };
    });
    setAjModal(null);
  }

  function resetarCol(ci: number) {
    setQtds(prev => ({ ...prev, [ci]: { ...(qtdsDemanda[ci] ?? {}) } }));
  }

  function replicar(from: number, to: number) {
    setQtds(prev => ({ ...prev, [to]: { ...(prev[from] ?? {}) } }));
    setRepModal(null); setRepTo('');
    toast.success('Quantidades copiadas. Salve a coluna destino para confirmar.');
  }

  async function salvarCol(ci: number) {
    const gi = cols[ci].grupoIdx;
    if (gi === null || gi === undefined) return;
    const grupo = grupos[gi];
    if (!grupo) return;
    setSalvando(prev => ({ ...prev, [ci]: true }));
    try {
      const colQtds = qtds[ci] ?? {};
      const ajustes = grupo.escolas.map(esc => ({
        item_id: esc.item_id,
        quantidade: colQtds[esc.id] ?? esc.quantidade,
      }));
      await api.put(`/guias/${guiaId}/ajuste`, { ajustes });
      toast.success('Ajuste salvo com sucesso.');
      carregar();
    } catch {
      toast.error('Não foi possível salvar o ajuste.');
    } finally {
      setSalvando(prev => ({ ...prev, [ci]: false }));
    }
  }

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (erro) return <Box sx={{ p: 3 }}><Alert severity="error">{erro}</Alert></Box>;

  const fmt = (v: number) => formatarQuantidade(v);
  const selOpen = Boolean(selAnchor);

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1, bgcolor: 'white', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton size="small" onClick={() => navigate(backPath)}><ArrowBackIcon /></IconButton>
        <Typography variant="subtitle1" fontWeight={700}>
          Ajuste de Demanda — {guia ? `${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][guia.mes - 1]}/${guia.ano}` : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          Selecione até {MAX_COLS} colunas para editar simultaneamente
        </Typography>
      </Box>

      {/* Tabela */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', minWidth: ESC_W + MAX_COLS * COL_W }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: ESC_W, bgcolor: '#f1f3f5', fontWeight: 700, position: 'sticky', left: 0, zIndex: 4, borderRight: '2px solid #dee2e6' }}>
                Escola
              </TableCell>
              {Array.from({ length: MAX_COLS }, (_, ci) => (
                <TableCell key={ci} sx={{ width: COL_W, bgcolor: colConfigured(ci) ? '#e8f4fd' : '#f8f9fa', p: 0.75, verticalAlign: 'top' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Button size="small" fullWidth
                      variant={colConfigured(ci) ? 'contained' : 'outlined'}
                      sx={{ fontSize: 10, textTransform: 'none', lineHeight: 1.3, minHeight: 32, whiteSpace: 'pre-line', textAlign: 'center' }}
                      onClick={(e) => setSelAnchor({ el: e.currentTarget, ci })}>
                      {colLabel(ci)}
                    </Button>
                    {colConfigured(ci) && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
                        <Tooltip title="Ajuste em lote"><IconButton size="small" onClick={() => { setAjModal({ open: true, ci }); setAjPct(''); setAjMin(''); setAjMax(''); setAjArred('none'); }}><TuneIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                        <Tooltip title="Replicar"><IconButton size="small" onClick={() => { setRepModal({ open: true, from: ci }); setRepTo(''); }}><CopyIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                        <Tooltip title="Resetar para demanda calculada"><IconButton size="small" color="warning" onClick={() => resetarCol(ci)}><ResetIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                        <Tooltip title="Salvar"><IconButton size="small" color="success" onClick={() => salvarCol(ci)} disabled={!!salvando[ci]}>{salvando[ci] ? <CircularProgress size={12} /> : <SaveIcon sx={{ fontSize: 14 }} />}</IconButton></Tooltip>
                      </Box>
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
            {/* Linha totais */}
            <TableRow>
              <TableCell sx={{ bgcolor: '#e9ecef', fontWeight: 700, fontSize: 11, position: 'sticky', left: 0, zIndex: 4, borderRight: '2px solid #dee2e6' }}>Total</TableCell>
              {Array.from({ length: MAX_COLS }, (_, ci) => {
                const tot = totalCol(ci); const dem = totalDemanda(ci); const d = tot - dem;
                return (
                  <TableCell key={ci} sx={{ bgcolor: '#e9ecef', textAlign: 'center', fontWeight: 700, fontSize: 11 }}>
                    {colConfigured(ci) ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <span>{fmt(tot)} {colUnidade(ci)}</span>
                        <Typography variant="caption" color="text.disabled">/ {fmt(dem)}</Typography>
                        {d !== 0 && <Chip label={`${d > 0 ? '+' : ''}${fmt(d)}`} size="small" color={d > 0 ? 'success' : 'error'} sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }} />}
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
                  const q = getQ(ci, escola.id); const dem = getDemanda(ci, escola.id); const d = delta(ci, escola.id);
                  return (
                    <TableCell key={ci} sx={{ p: 0.5, textAlign: 'center' }}>
                      {colConfigured(ci) ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TextField size="small" type="number"
                            value={q === 0 ? '' : q}
                            onChange={(e) => setQ(ci, escola.id, toNum(e.target.value))}
                            inputProps={{ min: 0, step: 0.001, style: { textAlign: 'right', fontSize: 12, padding: '3px 4px' } }}
                            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
                          <Box sx={{ width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9 }}>{fmt(dem)}</Typography>
                            {d !== 0 && <Chip label={`${d > 0 ? '+' : ''}${fmt(d)}`} size="small" color={d > 0 ? 'success' : 'error'} sx={{ height: 14, fontSize: 8, '& .MuiChip-label': { px: 0.4 } }} />}
                          </Box>
                        </Box>
                      ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Popover seletor de grupo */}
      <Popover open={selOpen} anchorEl={selAnchor?.el} onClose={() => setSelAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 320, maxHeight: 420 } }}>
        <Box sx={{ px: 2, py: 1, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">SELECIONAR PRODUTO / PERÍODO</Typography>
        </Box>
        <List dense disablePadding>
          {grupos.map((g, gi) => {
            const emUso = cols.findIndex((c, i) => i !== selAnchor?.ci && c.grupoIdx === gi);
            return (
              <ListItemButton key={gi} disabled={emUso !== -1} onClick={() => selAnchor && selectCol(selAnchor.ci, gi)}>
                <ListItemText
                  primary={g.produto_nome}
                  secondary={`${g.data_entrega ? new Date(g.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'} · ${g.escolas.length} escola(s)${emUso !== -1 ? ` · Em uso na col. ${emUso + 1}` : ''}`}
                  primaryTypographyProps={{ fontSize: 12 }}
                  secondaryTypographyProps={{ fontSize: 10, color: emUso !== -1 ? 'error.main' : undefined }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Popover>

      {/* Modal ajuste em lote */}
      {ajModal && (() => {
        const ci = ajModal.ci;
        const totAtual = totalCol(ci); const totDem = totalDemanda(ci); const totPrev = previewTotal(ci);
        const unid = colUnidade(ci); const diffPrev = totPrev - totAtual;
        return (
          <Dialog open onClose={() => setAjModal(null)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>Ajuste em Lote — {colLabel(ci)}</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {[
                    { label: 'Demanda calculada', val: totDem, color: undefined },
                    { label: 'Atual (editado)', val: totAtual, color: totAtual !== totDem ? 'warning.main' : undefined },
                    { label: 'Após ajuste', val: totPrev, color: 'primary.main', diff: diffPrev },
                  ].map(({ label, val, color, diff }) => (
                    <Box key={label} sx={{ flex: 1, p: 1.5, bgcolor: label === 'Após ajuste' ? '#e8f4fd' : '#f8f9fa', borderRadius: 1, textAlign: 'center', border: '1px solid #e9ecef' }}>
                      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                      <Typography variant="subtitle2" fontWeight={700} color={color}>{fmt(val)} {unid}</Typography>
                      {diff !== undefined && diff !== 0 && <Chip label={`${diff > 0 ? '+' : ''}${fmt(diff)}`} size="small" color={diff >= 0 ? 'success' : 'error'} sx={{ height: 16, fontSize: 9, mt: 0.25, '& .MuiChip-label': { px: 0.5 } }} />}
                    </Box>
                  ))}
                </Box>
                <Divider />
                <TextField label="Aumentar / Reduzir (%)" type="number" size="small" value={ajPct} onChange={e => setAjPct(e.target.value)} helperText="Ex: 10 para +10%, -5 para -5%" inputProps={{ step: 0.1 }} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Arredondamento</InputLabel>
                    <Select value={ajArred} label="Arredondamento" onChange={e => setAjArred(e.target.value as any)}>
                      <MenuItem value="none">Sem arredondamento</MenuItem>
                      <MenuItem value="int">Inteiro</MenuItem>
                      <MenuItem value="0.5">Múltiplo de 0,5</MenuItem>
                      <MenuItem value="0.1">1 casa decimal</MenuItem>
                      <MenuItem value="custom">Múltiplo personalizado</MenuItem>
                    </Select>
                  </FormControl>
                  {ajArred === 'custom' && <TextField label="Múltiplo" type="number" size="small" sx={{ width: 120 }} value={ajArredCustom} onChange={e => setAjArredCustom(e.target.value)} inputProps={{ min: 0.001, step: 'any' }} />}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField label="Mínimo por escola" type="number" size="small" sx={{ flex: 1 }} value={ajMin} onChange={e => setAjMin(e.target.value)} inputProps={{ min: 0, step: 0.001 }} />
                  <TextField label="Máximo por escola" type="number" size="small" sx={{ flex: 1 }} value={ajMax} onChange={e => setAjMax(e.target.value)} inputProps={{ min: 0, step: 0.001 }} />
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
              <Button color="warning" onClick={() => { resetarCol(ci); setAjModal(null); }}>Resetar para demanda</Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setAjModal(null)}>Cancelar</Button>
                <Button variant="contained" onClick={() => aplicarAjuste(ci)}>Aplicar</Button>
              </Box>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* Modal replicar */}
      <Dialog open={!!repModal?.open} onClose={() => setRepModal(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Replicar Quantidades</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">Copiar de <strong>{repModal ? colLabel(repModal.from) : ''}</strong> para:</Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>Coluna destino</InputLabel>
              <Select value={repTo} label="Coluna destino" onChange={e => setRepTo(e.target.value as number)}>
                {Array.from({ length: MAX_COLS }, (_, ci) => ci === repModal?.from ? null : <MenuItem key={ci} value={ci}>{colLabel(ci)}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepModal(null)}>Cancelar</Button>
          <Button variant="contained" disabled={repTo === ''} onClick={() => repModal && repTo !== '' && replicar(repModal.from, repTo as number)}>Replicar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
