import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, TextField, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  Autocomplete, Divider, Alert, CircularProgress, Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { toNum } from '../utils/formatters';
import { listarEscolas } from '../services/escolas';
import {
  listarProgramacoes,
  salvarProgramacoes,
  ProgramacaoEntrega,
  ProgramacaoEscola,
} from '../services/programacaoEntrega';

interface Escola { id: number; nome: string; ativo: boolean; }

interface Props {
  open: boolean;
  onClose: () => void;
  pedidoItemId: number;
  produtoNome: string;
  unidade: string;
  onSaved?: (quantidadeTotal: number) => void;
}

export default function ProgramacaoEntregaDialog({
  open, onClose, pedidoItemId, produtoNome, unidade, onSaved
}: Props) {
  const [programacoes, setProgramacoes] = useState<ProgramacaoEntrega[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (open) {
      carregar();
    }
  }, [open, pedidoItemId]);

  async function carregar() {
    setLoading(true);
    setErro('');
    try {
      const [progs, esc] = await Promise.all([
        listarProgramacoes(pedidoItemId),
        listarEscolas(),
      ]);
      // Normalizar data_entrega para yyyy-MM-dd (o banco pode retornar ISO string)
      const progsNorm = progs.map(p => ({
        ...p,
        data_entrega: p.data_entrega ? p.data_entrega.split('T')[0] : p.data_entrega,
      }));
      setProgramacoes(progsNorm.length > 0 ? progsNorm : [novaProgramacao()]);
      setEscolas((esc as any[]).filter((e: any) => e.ativo));
    } catch {
      setErro('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  function novaProgramacao(): ProgramacaoEntrega {
    return {
      data_entrega: new Date().toISOString().split('T')[0],
      observacoes: '',
      escolas: [],
    };
  }

  function adicionarProgramacao() {
    setProgramacoes(prev => [...prev, novaProgramacao()]);
  }

  function removerProgramacao(idx: number) {
    setProgramacoes(prev => prev.filter((_, i) => i !== idx));
  }

  function atualizarProgramacao(idx: number, campo: string, valor: string) {
    setProgramacoes(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));
  }
  function adicionarEscola(progIdx: number, escola: Escola) {
    setProgramacoes(prev => prev.map((p, i) => {
      if (i !== progIdx) return p;
      if (p.escolas.some(e => e.escola_id === escola.id)) return p;
      return { ...p, escolas: [...p.escolas, { escola_id: escola.id, escola_nome: escola.nome, quantidade: 0 }] };
    }));
  }

  function atualizarQuantidadeEscola(progIdx: number, escolaIdx: number, quantidade: number) {
    setProgramacoes(prev => prev.map((p, i) => {
      if (i !== progIdx) return p;
      const escolas = p.escolas.map((e, j) => j === escolaIdx ? { ...e, quantidade } : e);
      return { ...p, escolas };
    }));
  }

  function removerEscola(progIdx: number, escolaIdx: number) {
    setProgramacoes(prev => prev.map((p, i) => {
      if (i !== progIdx) return p;
      return { ...p, escolas: p.escolas.filter((_, j) => j !== escolaIdx) };
    }));
  }

  function totalProgramacao(prog: ProgramacaoEntrega): number {
    return prog.escolas.reduce((s, e) => s + toNum(e.quantidade), 0);
  }

  function totalGeral(): number {
    return programacoes.reduce((s, p) => s + totalProgramacao(p), 0);
  }

  async function handleSalvar() {
    setSalvando(true);
    setErro('');
    try {
      const resultado = await salvarProgramacoes(pedidoItemId, programacoes);
      setProgramacoes(resultado.length > 0 ? resultado : [novaProgramacao()]);
      onSaved?.(totalGeral());
      onClose();
    } catch {
      setErro('Erro ao salvar programações');
    } finally {
      setSalvando(false);
    }
  }

  const escolasDisponiveis = (progIdx: number) =>
    escolas.filter(e => !programacoes[progIdx]?.escolas.some(pe => pe.escola_id === e.id));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Programação de Entrega — {produtoNome}
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          Quantidade total: <strong>{toNum(totalGeral()).toFixed(3)} {unidade}</strong>
          {' '}(calculada automaticamente pela soma das escolas)
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}

            {programacoes.map((prog, progIdx) => (
              <Box key={progIdx} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Programação {progIdx + 1}
                  </Typography>
                  <TextField
                    label="Data de Entrega"
                    type="date"
                    size="small"
                    value={prog.data_entrega}
                    onChange={e => atualizarProgramacao(progIdx, 'data_entrega', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 180 }}
                  />
                  <TextField
                    label="Observações"
                    size="small"
                    value={prog.observacoes || ''}
                    onChange={e => atualizarProgramacao(progIdx, 'observacoes', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <Chip
                    label={`${toNum(totalProgramacao(prog)).toFixed(3)} ${unidade}`}
                    color="primary"
                    size="small"
                  />
                  <IconButton size="small" color="delete" onClick={() => removerProgramacao(progIdx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Tabela de escolas */}
                {prog.escolas.length > 0 && (
                  <Table size="small" sx={{ mb: 1 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Escola</TableCell>
                        <TableCell align="right">Quantidade ({unidade})</TableCell>
                        <TableCell width={40} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prog.escolas.map((esc, escIdx) => (
                        <TableRow key={escIdx}>
                          <TableCell>{esc.escola_nome}</TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={esc.quantidade}
                              onChange={e => atualizarQuantidadeEscola(progIdx, escIdx, toNum(e.target.value))}
                              inputProps={{ min: 0, step: 0.001 }}
                              sx={{ width: 120 }}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="delete" onClick={() => removerEscola(progIdx, escIdx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Adicionar escola */}
                <Autocomplete
                  options={escolasDisponiveis(progIdx)}
                  getOptionLabel={o => o.nome}
                  size="small"
                  renderInput={params => <TextField {...params} label="Adicionar escola" placeholder="Buscar escola..." />}
                  onChange={(_, escola) => { if (escola) adicionarEscola(progIdx, escola); }}
                  value={null}
                  blurOnSelect
                  sx={{ maxWidth: 400 }}
                />
              </Box>
            ))}

            <Button startIcon={<AddIcon />} onClick={adicionarProgramacao} variant="outlined" size="small">
              Adicionar Programação
            </Button>

            <Divider sx={{ my: 2 }} />
            <Typography variant="body2">
              Total geral: <strong>{toNum(totalGeral()).toFixed(3)} {unidade}</strong>
              {' '}— este valor será salvo como quantidade do item no pedido.
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          startIcon={salvando ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSalvar}
          disabled={salvando || loading}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
