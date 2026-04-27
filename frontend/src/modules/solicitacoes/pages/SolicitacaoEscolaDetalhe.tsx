import React, { useState } from "react";
import {
  Box, CircularProgress, Typography, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, Chip, IconButton, Tooltip, Button,
  Collapse, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { FormDialog } from "../../../components/BaseDialog";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import ViewTabs from "../../../components/ViewTabs";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import { useToast } from "../../../hooks/useToast";
import {
  listarTodasSolicitacoes, analisarItem, aprovarItemEmergencial, recusarItem,
  Solicitacao, SolicitacaoItem, AnaliseSolicitacaoItem,
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
  contemplado: { label: 'Contemplado', color: 'success' },
  recusado: { label: 'Recusado', color: 'error'   },
};

function formatQty(value: number | undefined, unidade?: string) {
  return Number(value ?? 0).toLocaleString('pt-BR') + (unidade ? ' ' + unidade : '');
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateBR(value?: string | null): string {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString('pt-BR') : '';
}

function toDateInputValue(value?: string | null): string {
  return parseDateOnly(value) ? String(value).slice(0, 10) : '';
}

function SolicitacaoCard({
  sol,
  onAnalisar,
  onAbrirRecusa,
}: {
  sol: Solicitacao;
  onAnalisar: (itemId: number) => void;
  onAbrirRecusa: (itemId: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const s = STATUS_SOL[sol.status] ?? { label: sol.status, color: 'default' as const };

  return (
    <Paper variant="outlined" sx={{ mb: 2, borderRadius: 1, overflow: 'hidden' }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, cursor: 'pointer', bgcolor: 'action.hover' }}
        onClick={() => setExpanded(e => !e)}
      >
        <IconButton size="small" onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
        <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
          {new Date(sol.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          {sol.observacao && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>- {sol.observacao}</Typography>}
        </Typography>
        <Chip label={s.label} color={s.color} size="small" sx={{ mr: 1 }} />
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Produto</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: 130 }}>Solicitado</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', width: 110 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Decisao</TableCell>
              <TableCell sx={{ width: 170 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {sol.itens.map((item: SolicitacaoItem) => {
              const si = STATUS_ITEM[item.status] ?? { label: item.status, color: 'default' as const };
              return (
                <TableRow key={item.id}>
                  <TableCell sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{item.nome_produto}</TableCell>
                  <TableCell sx={{ fontSize: '0.82rem' }}>{formatQty(item.quantidade, item.unidade)}</TableCell>
                  <TableCell>
                    <Chip label={si.label} color={si.color as any} size="small" sx={{ fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {item.status === 'aceito' && item.atendimento_tipo === 'emergencial'
                      ? 'Guia emergencial - ' + formatQty(item.quantidade_aprovada, item.unidade) + (formatDateBR(item.data_entrega_prevista) ? ' em ' + formatDateBR(item.data_entrega_prevista) : '')
                      : item.status === 'contemplado'
                        ? 'Atendido por guia existente'
                        : item.justificativa_recusa || item.observacao_aprovacao || '-'}
                  </TableCell>
                  <TableCell align="right">
                    {item.status === 'pendente' && (
                      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                          onClick={() => onAnalisar(item.id)}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.35 }}
                        >
                          Analisar
                        </Button>
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

  // Dialog analise/aprovacao emergencial
  const [analiseOpen, setAnaliseOpen] = useState(false);
  const [analiseLoading, setAnaliseLoading] = useState(false);
  const [analise, setAnalise] = useState<AnaliseSolicitacaoItem | null>(null);
  const [quantidadeAprovada, setQuantidadeAprovada] = useState('');
  const [dataEntregaPrevista, setDataEntregaPrevista] = useState('');
  const [observacaoAprovacao, setObservacaoAprovacao] = useState('');

  const { data: todas = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-alimentos'],
    queryFn: () => listarTodasSolicitacoes(),
    onError: () => toast.error('Erro ao carregar solicitacoes'),
  } as any);

  const solicitacoes = (todas as Solicitacao[]).filter(s => s.escola_id === Number(escolaId));
  const escolaNome = solicitacoes[0]?.escola_nome ?? `Escola ${escolaId}`;

  const pendentes = solicitacoes.filter(s => s.status === 'pendente' || s.status === 'parcial')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const historico = solicitacoes.filter(s => s.status !== 'pendente' && s.status !== 'parcial')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['solicitacoes-alimentos'] });

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

  const handleAbrirAnalise = async (itemId: number) => {
    setAnaliseOpen(true);
    setAnalise(null);
    setAnaliseLoading(true);
    setQuantidadeAprovada('');
    setDataEntregaPrevista('');
    setObservacaoAprovacao('');

    try {
      const data = await analisarItem(itemId);
      setAnalise(data);
      setQuantidadeAprovada(String(data.quantidade_sugerida || data.item.quantidade || 0));
      setDataEntregaPrevista(toDateInputValue(data.data_entrega_sugerida));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Erro ao analisar solicitacao');
      setAnaliseOpen(false);
    } finally {
      setAnaliseLoading(false);
    }
  };

  const handleAprovarEmergencial = async () => {
    if (!analise) return;
    setSaving(true);
    try {
      const isGuiaExistente = analise.atendimento_sugerido === 'guia_existente';
      await aprovarItemEmergencial(analise.item.id, {
        quantidade_aprovada: isGuiaExistente ? undefined : Number(quantidadeAprovada),
        data_entrega_prevista: isGuiaExistente ? undefined : dataEntregaPrevista,
        observacao: observacaoAprovacao.trim() || undefined,
      });
      await invalidar();
      toast.success(isGuiaExistente ? 'Solicitacao atendida pela guia existente' : 'Solicitacao incluida na guia emergencial');
      setAnaliseOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Erro ao aprovar solicitacao');
    } finally {
      setSaving(false);
    }
  };

  const quantidadeNumerica = Number(quantidadeAprovada);
  const confirmAnaliseDisabled = !analise || saving || analiseLoading || (
    analise.atendimento_sugerido === 'emergencial'
    && (!Number.isFinite(quantidadeNumerica)
      || quantidadeNumerica <= 0
      || quantidadeNumerica > analise.quantidade_sugerida
      || quantidadeNumerica > analise.estoque_central.quantidade_disponivel
      || !dataEntregaPrevista)
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PageContainer>
        <Box className="data-breadcrumb-row" sx={{ display: 'none' }}>
          <IconButton size="small" onClick={() => navigate('/solicitacoes-alimentos')} className="data-breadcrumb-back">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <PageBreadcrumbs items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Solicitacoes', path: '/solicitacoes-alimentos' },
            { label: escolaNome },
          ]} />
        </Box>
        <PageHeader
          onBack={() => navigate('/solicitacoes-alimentos')}
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Solicitacoes', path: '/solicitacoes-alimentos' },
            { label: escolaNome },
          ]}
          title={escolaNome}
          subtitle="Solicitacoes de alimentos"
        />

        <Box sx={{ mb: 2 }}>
          <ViewTabs
            value={aba}
            onChange={(v) => setAba(Number(v))}
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
                ? <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Nenhuma solicitacao pendente</Typography>
                : pendentes.map(sol => (
                  <SolicitacaoCard
                    key={sol.id}
                    sol={sol}
                    onAnalisar={handleAbrirAnalise}
                    onAbrirRecusa={handleAbrirRecusa}
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
                    onAnalisar={handleAbrirAnalise}
                    onAbrirRecusa={handleAbrirRecusa}
                  />
                ))
            )}
          </>
        )}
      </PageContainer>

      {/* Dialog recusa */}
      <FormDialog
        open={recusaOpen}
        onClose={() => setRecusaOpen(false)}
        title="Recusar Item"
        onSave={handleRecusar}
        loading={saving}
        saveLabel={saving ? 'Recusando...' : 'Recusar'}
        saveColor="error"
      >
        <TextField
          label="Justificativa"
          value={justificativa}
          onChange={e => setJustificativa(e.target.value)}
          fullWidth multiline rows={3} autoFocus
        />
      </FormDialog>

      {/* Dialog analise/aprovacao */}
      <Dialog
        open={analiseOpen}
        onClose={() => !saving && setAnaliseOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: (theme) => ({
            borderRadius: 2,
            backgroundImage: 'none',
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 24px 60px rgba(0,0,0,0.55)'
              : '0 18px 46px rgba(31,36,48,0.12)',
          }),
        }}
      >
        <DialogTitle
          sx={(theme) => ({
            fontSize: '1rem',
            fontWeight: 600,
            color: 'text.primary',
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            boxShadow: theme.palette.mode === 'dark' ? 'inset 0 -1px 0 rgba(255,255,255,0.03)' : 'none',
          })}
        >
          Analisar solicitacao
        </DialogTitle>
        <DialogContent
          dividers
          sx={(theme) => ({
            bgcolor: 'background.paper',
            borderColor: 'divider',
            '& .MuiAlert-root': {
              border: '1px solid',
              borderColor: 'divider',
              backgroundImage: 'none',
              color: 'text.primary',
            },
            '& .MuiAlert-standardSuccess': {
              bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.14 : 0.10),
              borderColor: alpha(theme.palette.success.main, 0.35),
              '& .MuiAlert-icon': { color: 'success.main' },
            },
            '& .MuiAlert-standardWarning': {
              bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.16 : 0.12),
              borderColor: alpha(theme.palette.warning.main, 0.38),
              '& .MuiAlert-icon': { color: 'warning.main' },
            },
            '& .MuiAlert-standardInfo': {
              bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.14 : 0.10),
              borderColor: alpha(theme.palette.info.main, 0.35),
              '& .MuiAlert-icon': { color: 'info.main' },
            },
            '& .MuiOutlinedInput-root': {
              bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.03) : 'background.default',
            },
          })}
        >
          {analiseLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : analise ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{analise.item.nome_produto}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Solicitado: {formatQty(analise.item.quantidade, analise.item.unidade)} por {analise.item.escola_nome}
                </Typography>
              </Box>

              {analise.atendimento_sugerido === 'guia_existente' ? (
                <Alert severity="success">
                  Esse item ja esta coberto por guia aberta para esta escola. A solicitacao sera marcada como atendida pela guia existente, sem duplicar quantidade.
                </Alert>
              ) : analise.estoque_central.quantidade_disponivel < analise.quantidade_sugerida ? (
                <Alert severity="warning">
                  Estoque central disponivel menor que a necessidade descoberta. Ajuste a quantidade ou recuse o item.
                </Alert>
              ) : (
                <Alert severity="info">
                  Aprovacao criara/atualizara a Guia Emergencial do mes da data escolhida e reservara o estoque central.
                </Alert>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
                <Paper
                  variant="outlined"
                  sx={(theme) => ({
                    p: 1.25,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.035) : 'background.default',
                    borderColor: 'divider',
                    color: 'text.primary',
                  })}
                >
                  <Typography variant="caption" color="text.secondary">Central disponivel</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatQty(analise.estoque_central.quantidade_disponivel, analise.item.unidade)}</Typography>
                  <Typography variant="caption" color="text.secondary">Reservado: {formatQty(analise.estoque_central.quantidade_reservada, analise.item.unidade)}</Typography>
                </Paper>
                <Paper
                  variant="outlined"
                  sx={(theme) => ({
                    p: 1.25,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.035) : 'background.default',
                    borderColor: 'divider',
                    color: 'text.primary',
                  })}
                >
                  <Typography variant="caption" color="text.secondary">Estoque da escola</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatQty(analise.estoque_escola.quantidade_atual, analise.item.unidade)}</Typography>
                  <Typography variant="caption" color="text.secondary">Saldo local atual</Typography>
                </Paper>
                <Paper
                  variant="outlined"
                  sx={(theme) => ({
                    p: 1.25,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.035) : 'background.default',
                    borderColor: 'divider',
                    color: 'text.primary',
                  })}
                >
                  <Typography variant="caption" color="text.secondary">Ja em guia aberta</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatQty(analise.cobertura_guias.total_pendente, analise.item.unidade)}</Typography>
                  <Typography variant="caption" color="text.secondary">Necessidade: {formatQty(analise.quantidade_sugerida, analise.item.unidade)}</Typography>
                </Paper>
              </Box>

              {analise.cobertura_guias.itens.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    Cobertura por guias abertas
                  </Typography>
                  <Box
                    sx={(theme) => ({
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.025) : 'background.default',
                    })}
                  >
                    {analise.cobertura_guias.itens.slice(0, 4).map((guia, index) => (
                      <Box
                        key={guia.guia_produto_escola_id}
                        sx={(theme) => ({
                          p: 1,
                          borderTop: index ? 1 : 0,
                          borderColor: 'divider',
                          '&:nth-of-type(even)': {
                            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.025) : alpha(theme.palette.text.primary, 0.025),
                          },
                        })}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {guia.guia_nome || guia.codigo_guia || 'Guia #' + guia.guia_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Pendente: {formatQty(guia.saldo_pendente, analise.item.unidade)}{guia.data_entrega ? ' - Entrega ' + formatDateBR(guia.data_entrega) : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {analise.atendimento_sugerido === 'emergencial' && (
                <>
                  <Divider />
                  <TextField
                    label="Quantidade aprovada"
                    type="number"
                    value={quantidadeAprovada}
                    onChange={e => setQuantidadeAprovada(e.target.value)}
                    inputProps={{ min: 0, step: '0.001' }}
                    helperText={'Maximo recomendado: ' + formatQty(Math.min(analise.quantidade_sugerida, analise.estoque_central.quantidade_disponivel), analise.item.unidade)}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Data prevista de entrega"
                    type="date"
                    value={dataEntregaPrevista}
                    onChange={e => setDataEntregaPrevista(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    size="small"
                  />
                </>
              )}

              <TextField
                label="Observacao"
                value={observacaoAprovacao}
                onChange={e => setObservacaoAprovacao(e.target.value)}
                placeholder="Ex: urgencia validada com a escola"
                fullWidth
                multiline
                rows={2}
                size="small"
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions
          sx={(theme) => ({
            px: 3,
            py: 2,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            '& .MuiButton-outlined': {
              borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.18 : 0.16),
              color: 'text.secondary',
            },
          })}
        >
          <Button
            onClick={() => setAnaliseOpen(false)}
            disabled={saving}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAprovarEmergencial}
            disabled={confirmAnaliseDisabled}
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            {saving ? 'Salvando...' : analise?.atendimento_sugerido === 'guia_existente' ? 'Marcar como atendida' : 'Aprovar na guia emergencial'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
