import React, { useState, useEffect } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, FormLabel, IconButton, InputLabel,
  MenuItem, Radio, RadioGroup, Select, Stack, TextField, Tooltip,
  Typography, Alert, CircularProgress, Paper,
} from '@mui/material';
import {
  Add as AddIcon, Cancel as CancelIcon, Send as SendIcon,
  Schedule as ScheduleIcon, CheckCircle, Error as ErrorIcon,
  HourglassEmpty, Refresh,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  Disparo, CriarDisparoPayload, AlvoDisparo, TipoNotificacao,
  listarDisparos, criarDisparo, cancelarDisparo,
} from '../services/disparosNotificacao';
import api from '../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CHIP: Record<string, { label: string; color: any; icon: React.ReactElement }> = {
  pendente:     { label: 'Agendado',    color: 'warning', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  processando:  { label: 'Enviando…',  color: 'info',    icon: <CircularProgress size={12} /> },
  enviado:      { label: 'Enviado',     color: 'success', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  cancelado:    { label: 'Cancelado',   color: 'default', icon: <CancelIcon sx={{ fontSize: 14 }} /> },
  erro:         { label: 'Erro',        color: 'error',   icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
};

const TIPO_COLORS: Record<TipoNotificacao, string> = {
  info: '#2563eb', aviso: '#d97706', sucesso: '#16a34a', erro: '#dc2626',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Formulário de criação ────────────────────────────────────────────────────
interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  escolas: { id: number; nome: string }[];
  modalidades: { id: number; nome: string }[];
}

function FormDialog({ open, onClose, onSaved, escolas, modalidades }: FormDialogProps) {
  const [form, setForm] = useState<CriarDisparoPayload>({
    titulo: '', mensagem: '', link: '', tipo: 'info', alvo: 'todas',
  });
  const [agendado, setAgendado] = useState(false);
  const [dataHora, setDataHora] = useState('');
  const [escolasSel, setEscolasSel] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof CriarDisparoPayload, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      toast.error('Título e mensagem são obrigatórios'); return;
    }
    if (form.alvo === 'selecao' && !escolasSel.length) {
      toast.error('Selecione ao menos uma escola'); return;
    }
    if (agendado && !dataHora) {
      toast.error('Informe a data e hora do agendamento'); return;
    }
    if (agendado && new Date(dataHora) <= new Date()) {
      toast.error('A data de agendamento deve ser no futuro'); return;
    }

    setSaving(true);
    try {
      const payload: CriarDisparoPayload = {
        ...form,
        link: form.link || undefined,
        escola_ids: form.alvo === 'selecao' ? escolasSel : undefined,
        modalidade_id: form.alvo === 'modalidade' ? form.modalidade_id : undefined,
        agendado_para: agendado ? new Date(dataHora).toISOString() : undefined,
      };
      await criarDisparo(payload);
      toast.success(agendado ? 'Disparo agendado com sucesso' : 'Notificações enviadas com sucesso');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao criar disparo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Novo Disparo de Notificação</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {/* Título */}
          <TextField label="Título" value={form.titulo} onChange={e => set('titulo', e.target.value)} fullWidth required size="small" inputProps={{ maxLength: 200 }} />

          {/* Mensagem */}
          <TextField label="Mensagem" value={form.mensagem} onChange={e => set('mensagem', e.target.value)} fullWidth required multiline rows={3} size="small" />

          {/* Link opcional */}
          <TextField label="Link (opcional)" value={form.link} onChange={e => set('link', e.target.value)} fullWidth size="small" placeholder="Ex: /portal-escola" />

          {/* Tipo */}
          <FormControl size="small" fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select value={form.tipo} label="Tipo" onChange={e => set('tipo', e.target.value as TipoNotificacao)}>
              <MenuItem value="info">ℹ️ Informação</MenuItem>
              <MenuItem value="aviso">⚠️ Aviso</MenuItem>
              <MenuItem value="sucesso">✅ Sucesso</MenuItem>
              <MenuItem value="erro">❌ Erro</MenuItem>
            </Select>
          </FormControl>

          {/* Alvo */}
          <FormControl>
            <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 600, mb: 0.5 }}>Destinatários</FormLabel>
            <RadioGroup row value={form.alvo} onChange={e => set('alvo', e.target.value as AlvoDisparo)}>
              <FormControlLabel value="todas" control={<Radio size="small" />} label="Todas as escolas" />
              <FormControlLabel value="modalidade" control={<Radio size="small" />} label="Por modalidade" />
              <FormControlLabel value="selecao" control={<Radio size="small" />} label="Seleção manual" />
            </RadioGroup>
          </FormControl>

          {/* Modalidade */}
          {form.alvo === 'modalidade' && (
            <FormControl size="small" fullWidth>
              <InputLabel>Modalidade</InputLabel>
              <Select value={form.modalidade_id || ''} label="Modalidade" onChange={e => set('modalidade_id', Number(e.target.value))}>
                {modalidades.map(m => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          {/* Seleção de escolas */}
          {form.alvo === 'selecao' && (
            <FormControl size="small" fullWidth>
              <InputLabel>Escolas</InputLabel>
              <Select
                multiple value={escolasSel}
                label="Escolas"
                onChange={e => setEscolasSel(e.target.value as number[])}
                renderValue={sel => `${sel.length} escola(s) selecionada(s)`}
              >
                {escolas.map(e => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          {/* Agendamento */}
          <FormControl>
            <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 600, mb: 0.5 }}>Envio</FormLabel>
            <RadioGroup row value={agendado ? 'agendado' : 'imediato'} onChange={e => setAgendado(e.target.value === 'agendado')}>
              <FormControlLabel value="imediato" control={<Radio size="small" />} label="Imediato" />
              <FormControlLabel value="agendado" control={<Radio size="small" />} label="Agendar para data/hora" />
            </RadioGroup>
          </FormControl>

          {agendado && (
            <TextField
              label="Data e hora do envio"
              type="datetime-local"
              value={dataHora}
              onChange={e => setDataHora(e.target.value)}
              fullWidth size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date(Date.now() + 60_000).toISOString().slice(0, 16) }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained" onClick={handleSubmit} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : agendado ? <ScheduleIcon /> : <SendIcon />}
        >
          {saving ? 'Enviando…' : agendado ? 'Agendar' : 'Enviar agora'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function DisparosNotificacao() {
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [escolas, setEscolas] = useState<{ id: number; nome: string }[]>([]);
  const [modalidades, setModalidades] = useState<{ id: number; nome: string }[]>([]);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await listarDisparos();
      setDisparos(data);
    } catch { toast.error('Erro ao carregar disparos'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    carregar();
    // Carregar escolas e modalidades para o formulário
    api.get('/escolas').then(r => setEscolas(r.data.data || r.data)).catch(() => {});
    api.get('/modalidades').then(r => setModalidades(r.data.data || r.data)).catch(() => {});
  }, []);

  const handleCancelar = async (id: number) => {
    if (!confirm('Cancelar este disparo agendado?')) return;
    try {
      await cancelarDisparo(id);
      toast.success('Disparo cancelado');
      carregar();
    } catch { toast.error('Erro ao cancelar'); }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Disparos de Notificação</Typography>
          <Typography variant="body2" color="text.secondary">
            Envie notificações para usuários das escolas — imediato ou agendado
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Atualizar">
            <IconButton onClick={carregar} size="small"><Refresh /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Novo Disparo
          </Button>
        </Stack>
      </Box>

      {/* Lista */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : disparos.length === 0 ? (
        <Alert severity="info">Nenhum disparo criado ainda.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {disparos.map(d => {
            const chip = STATUS_CHIP[d.status] ?? STATUS_CHIP.pendente;
            return (
              <Paper key={d.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  {/* Indicador de tipo */}
                  <Box sx={{ width: 4, borderRadius: 2, bgcolor: TIPO_COLORS[d.tipo], alignSelf: 'stretch', flexShrink: 0 }} />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{d.titulo}</Typography>
                      <Chip size="small" label={chip.label} color={chip.color} icon={chip.icon} sx={{ height: 20, fontSize: '0.7rem' }} />
                      <Chip size="small" label={
                        d.alvo === 'todas' ? 'Todas as escolas'
                        : d.alvo === 'modalidade' ? `Modalidade: ${d.modalidade_nome || d.modalidade_id}`
                        : `${d.escola_ids?.length || 0} escola(s)`
                      } variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{d.mensagem}</Typography>

                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.disabled">
                        Criado por {d.criado_por_nome} em {fmtDate(d.created_at)}
                      </Typography>
                      {d.agendado_para && (
                        <Typography variant="caption" color="warning.main">
                          ⏰ Agendado para {fmtDate(d.agendado_para)}
                        </Typography>
                      )}
                      {d.status === 'enviado' && (
                        <Typography variant="caption" color="success.main">
                          ✓ {d.total_enviado} notificação(ões) enviada(s) em {fmtDate(d.enviado_at)}
                        </Typography>
                      )}
                      {d.status === 'erro' && (
                        <Typography variant="caption" color="error.main">Erro: {d.erro_msg}</Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Ação cancelar */}
                  {d.status === 'pendente' && (
                    <Tooltip title="Cancelar agendamento">
                      <IconButton size="small" color="error" onClick={() => handleCancelar(d.id)}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={carregar}
        escolas={escolas}
        modalidades={modalidades}
      />
    </Box>
  );
}
