import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Button, Typography, TextField, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  Autocomplete, Alert, CircularProgress, Chip, Card,
} from "@mui/material";
import {
  Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { toNum, formatarQuantidade } from "../../../utils/formatters";
import { listarEscolas } from "../../../services/escolas";
import {
  listarProgramacoes,
  salvarProgramacoes,
  ProgramacaoEntrega,
} from "../../../services/programacaoEntrega";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import { useToast } from "../../../hooks/useToast";
import pedidosService from "../../../services/pedidos";

interface Escola { id: number; nome: string; ativo: boolean; }

export default function ProgramacaoEntregaScreen() {
  const { id: pedidoId, itemId } = useParams<{ id: string; itemId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { setPageTitle, setBackPath } = usePageTitle();

  const [programacoes, setProgramacoes] = useState<ProgramacaoEntrega[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [produtoNome, setProdutoNome] = useState('');
  const [unidade, setUnidade] = useState('');

  const backPath = `/compras/${pedidoId}`;

  useEffect(() => {
    setBackPath(backPath);
    return () => setBackPath(null);
  }, [backPath]);

  useEffect(() => {
    carregar();
  }, [itemId]);

  async function carregar() {
    setLoading(true);
    setErro('');
    try {
      const [progs, esc, pedido] = await Promise.all([
        listarProgramacoes(Number(itemId)),
        listarEscolas(),
        pedidosService.buscarPorId(Number(pedidoId)),
      ]);

      const item = pedido.itens.find((i: any) => i.id === Number(itemId));
      if (item) {
        setProdutoNome(item.produto_nome || '');
        setUnidade(item.unidade || '');
        setPageTitle(`Programação — ${item.produto_nome}`);
      }

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

  const escolasDisponiveis = (progIdx: number) =>
    escolas.filter(e => !programacoes[progIdx]?.escolas.some(pe => pe.escola_id === e.id));

  async function handleSalvar() {
    setSalvando(true);
    setErro('');
    try {
      await salvarProgramacoes(Number(itemId), programacoes);
      toast.success('Salvo!', 'Programação de entrega salva com sucesso.');
      navigate(backPath);
    } catch {
      setErro('Erro ao salvar programações');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: "center", gap: 1 }}>
            <IconButton size="small" onClick={() => navigate(backPath)}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Programação de Entrega — {produtoNome}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Quantidade total:{' '}
                <strong>{formatarQuantidade(totalGeral())} {unidade}</strong>
                {' '}(calculada automaticamente pela soma das escolas)
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => navigate(backPath)} size="small">Cancelar</Button>
            <Button
              variant="contained"
              startIcon={salvando ? <CircularProgress size={14} /> : <SaveIcon />}
              onClick={handleSalvar}
              disabled={salvando}
              size="small"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Conteúdo */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {erro && <Alert severity="error" onClose={() => setErro('')}>{erro}</Alert>}

        {programacoes.map((prog, progIdx) => (
          <Card key={progIdx} variant="outlined" sx={{ p: 2, borderRadius: '8px' }}>
            {/* Linha de controles da programação */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 100 }}>
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
                sx={{ flex: 1, minWidth: 200 }}
              />
              <Chip
                label={`${formatarQuantidade(totalProgramacao(prog))} ${unidade}`}
                color="primary"
                size="small"
              />
              <IconButton size="small" color="error" onClick={() => removerProgramacao(progIdx)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Tabela de escolas */}
            {prog.escolas.length > 0 && (
              <Table size="small" sx={{ mb: 1.5 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Escola</TableCell>
                    <TableCell align="right" sx={{ width: 160 }}>Quantidade ({unidade})</TableCell>
                    <TableCell sx={{ width: 40 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prog.escolas.map((esc, escIdx) => (
                    <TableRow key={escIdx} hover>
                      <TableCell>{esc.escola_nome}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={esc.quantidade}
                          onChange={e => atualizarQuantidadeEscola(progIdx, escIdx, toNum(e.target.value))}
                          inputProps={{ min: 0, step: 0.001 }}
                          sx={{ width: 130 }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => removerEscola(progIdx, escIdx)}>
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
              renderInput={params => (
                <TextField {...params} label="Adicionar escola" placeholder="Buscar escola..." />
              )}
              onChange={(_, escola) => { if (escola) adicionarEscola(progIdx, escola); }}
              value={null}
              blurOnSelect
              sx={{ maxWidth: 420 }}
            />
          </Card>
        ))}

        <Box>
          <Button startIcon={<AddIcon />} onClick={adicionarProgramacao} variant="outlined" size="small">
            Adicionar Programação
          </Button>
        </Box>
      </Box>

      {/* Footer com total */}
      <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', flexShrink: 0 }}>
        <Typography variant="body2">
          Total geral:{' '}
          <strong>{formatarQuantidade(totalGeral())} {unidade}</strong>
          {' '}— este valor será salvo como quantidade do item no pedido.
        </Typography>
      </Box>
    </Box>
  );
}
