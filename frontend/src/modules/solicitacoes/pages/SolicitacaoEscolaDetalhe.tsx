import React, { useState } from "react";
import {
  Box, CircularProgress, Typography, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, IconButton, Tooltip, Button,
  Collapse, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  DoneAll as DoneAllIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import ViewTabs from "../../../components/ViewTabs";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import { useToast } from "../../../hooks/useToast";
import {
  listarTodasSolicitacoes, aceitarItem, recusarItem, aprovarTudo,
  Solicitacao, SolicitacaoItem,
} from "../../../services/solicitacoesAlimentos";

const STATUS_SOL: Record<string, { label: string; color: 'warning' | 'info' | 'success' | 'error' | 'default' }> = {
  pendente:  { label: 'Pendente',  color: 'warning' },
  parcial:   { label: 'Parcial',   color: 'info'    },
  concluida: { label: 'Concluída', color: 'success' },
  cancelada: { label: 'Cancelada', color: 'error'   },
};

const STATUS_ITEM: Record<string, { label: string; color: 'warning' | 'success' | 'error' }> = {
  pendente: { label: 'Pendente', color: 'warning' },
  aceito:   { label: 'Aceito',   color: 'success' },
  recusado: { label: 'Recusado', color: 'error'   },
};

function SolicitacaoCard({
  sol,
  onAceitar,
  onAbrirRecusa,
  onAprovarTudo,
}: {
  sol: Solicitacao;
  onAceitar: (itemId: number) => void;
  onAbrirRecusa: (itemId: number) => void;
  onAprovarTudo: (solId: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const s = STATUS_SOL[sol.status] ?? { label: sol.status, color: 'default' as const };
  const temPendente = sol.itens.some((i: SolicitacaoItem) => i.status === "pendente");

  return (
    <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, cursor: 'pointer', bgcolor: 'grey.50' }}
        onClick={() => setExpanded(e => !e)}
      >
        <IconButton size="small" onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
        <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
          {new Date(sol.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          {sol.observacao && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>— {sol.observacao}</Typography>}
        </Typography>
        <Chip label={s.label} color={s.color} size="small" sx={{ mr: 1 }} />
        {temPendente && (
          <Tooltip title="Aprovar todos os itens pendentes">
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<DoneAllIcon sx={{ fontSize: 14 }} />}
              onClick={e => { e.stopPropagation(); onAprovarTudo(sol.id); }}
              sx={{ fontSize: '0.7rem', py: 0.25 }}
            >
              Aprovar tudo
            </Button>
          </Tooltip>
        )}
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Produto</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: 130 }}>Quantidade</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: 110 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Justificativa</TableCell>
              <TableCell sx={{ width: 90 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {sol.itens.map((item: SolicitacaoItem) => {
              const si = STATUS_ITEM[item.status] ?? { label: item.status, color: 'default' as const };
              return (
                <TableRow key={item.id}>
                  <TableCell sx={{ fontSize: '0.82rem' }}>{item.nome_produto}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>{item.quantidade} {item.unidade}</TableCell>
                  <TableCell>
                    <Chip label={si.label} color={si.color as any} size="small" sx={{ fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {item.justificativa_recusa || '—'}
                  </TableCell>
                  <TableCell>
                    {item.status === 'pendente' && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Aceitar">
                          <IconButton size="small" color="success" onClick={() => onAceitar(item.id)}>
                            <CheckCircleIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Recusar">
                          <IconButton size="small" color="error" onClick={() => onAbrirRecusa(item.id)}>
                            <CancelIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Collapse>
    </Paper>
  );
}

export default function SolicitacaoEscolaDetalhe() {
  const { escolaId } = useParams<{ escolaId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [aba, setAba] = useState(0);

  // Dialog recusa
  const [recusaOpen, setRecusaOpen] = useState(false);
  const [recusaItemId, setRecusaItemId] = useState<number | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [saving, setSaving] = useState(false);

  // Dialog aprovar tudo
  const [aprovarId, setAprovarId] = useState<number | null>(null);

  const { data: todas = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-alimentos'],
    queryFn: () => listarTodasSolicitacoes(),
    onError: () => toast.error('Erro ao carregar solicitações'),
  } as any);

  const solicitacoes = (todas as Solicitacao[]).filter(s => s.escola_id === Number(escolaId));
  const escolaNome = solicitacoes[0]?.escola_nome ?? `Escola ${escolaId}`;

  const pendentes = solicitacoes.filter(s => s.status === 'pendente' || s.status === 'parcial')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const historico = solicitacoes.filter(s => s.status !== 'pendente' && s.status !== 'parcial')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['solicitacoes-alimentos'] });

  const handleAceitar = async (itemId: number) => {
    try {
      await aceitarItem(itemId);
      await invalidar();
      toast.success('Item aceito');
    } catch { toast.error('Erro ao aceitar item'); }
  };

  const handleAbrirRecusa = (itemId: number) => {
    setRecusaItemId(itemId); setJustificativa(''); setRecusaOpen(true);
  };

  const handleRecusar = async () => {
    if (!recusaItemId || !justificativa.trim()) { toast.error('Informe a justificativa'); return; }
    setSaving(true);
    try {
      await recusarItem(recusaItemId, justificativa);
      await invalidar();
      toast.success('Item recusado');
      setRecusaOpen(false);
    } catch { toast.error('Erro ao recusar item'); }
    finally { setSaving(false); }
  };

  const handleAprovarTudo = async () => {
    if (!aprovarId) return;
    setSaving(true);
    try {
      await aprovarTudo(aprovarId);
      await invalidar();
      toast.success('Solicitação aprovada');
      setAprovarId(null);
    } catch { toast.error('Erro ao aprovar solicitação'); }
    finally { setSaving(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/solicitacoes-alimentos')} size="small">
            Voltar
          </Button>
        </Box>
        <PageHeader
          title={escolaNome}
          subtitle="Solicitações de alimentos"
          breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Solicitações', path: '/solicitacoes-alimentos' }, { label: escolaNome }]}
        />

        <Box sx={{ mb: 2 }}>
          <ViewTabs
            value={aba}
            onChange={setAba}
            tabs={[
              { value: 0, label: 'Pendentes', badge: pendentes.length },
              { value: 1, label: 'Histórico', badge: historico.length },
            ]}
          />
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <>
            {aba === 0 && (
              pendentes.length === 0
                ? <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Nenhuma solicitação pendente</Typography>
                : pendentes.map(sol => (
                  <SolicitacaoCard
                    key={sol.id}
                    sol={sol}
                    onAceitar={handleAceitar}
                    onAbrirRecusa={handleAbrirRecusa}
                    onAprovarTudo={setAprovarId}
                  />
                ))
            )}
            {aba === 1 && (
              historico.length === 0
                ? <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Nenhum histórico encontrado</Typography>
                : historico.map(sol => (
                  <SolicitacaoCard
                    key={sol.id}
                    sol={sol}
                    onAceitar={handleAceitar}
                    onAbrirRecusa={handleAbrirRecusa}
                    onAprovarTudo={setAprovarId}
                  />
                ))
            )}
          </>
        )}
      </PageContainer>

      {/* Dialog recusa */}
      <Dialog open={recusaOpen} onClose={() => setRecusaOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Recusar Item</DialogTitle>
        <DialogContent>
          <TextField
            label="Justificativa"
            value={justificativa}
            onChange={e => setJustificativa(e.target.value)}
            fullWidth multiline rows={3} autoFocus sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecusaOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleRecusar} disabled={saving}>
            {saving ? 'Recusando...' : 'Recusar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog aprovar tudo */}
      <Dialog open={!!aprovarId} onClose={() => setAprovarId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar aprovação</DialogTitle>
        <DialogContent>
          <Typography>Aprovar todos os itens pendentes desta solicitação?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAprovarId(null)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleAprovarTudo} disabled={saving}>
            {saving ? 'Aprovando...' : 'Aprovar tudo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
