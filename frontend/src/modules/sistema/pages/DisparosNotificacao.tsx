import React, { useState, useEffect } from "react";
import {
  Box, Button, Chip, FormControl, FormControlLabel, FormLabel, IconButton, InputLabel,
  MenuItem, Radio, RadioGroup, Select, Stack, TextField, Tooltip,
  Typography, Alert, CircularProgress, Paper,
} from "@mui/material";
import { FormDialog } from "../../../components/BaseDialog";
import {
  Add as AddIcon, Send as SendIcon,
  CheckCircle, Error as ErrorIcon, HourglassEmpty, Refresh,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  Disparo, CriarDisparoPayload, AlvoDisparo, TipoNotificacao,
  listarDisparos, criarDisparo,
} from "../../../services/disparosNotificacao";
import api from "../../../services/api";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";

// ── Design tokens ──────────────────────────────────────────────
const GREEN = "#22c55e";
const NAVY = "#0f172a";

// ── Helpers ──────────────────────────────────────────────────────
const STATUS_CHIP: Record<string, { label: string; color: any; icon: React.ReactElement }> = {
  pendente:    { label: 'Pendente',  color: 'warning', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  processando: { label: 'Enviando…', color: 'info',    icon: <CircularProgress size={12} /> },
  enviado:     { label: 'Enviado',   color: 'success', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  erro:        { label: 'Erro',      color: 'error',   icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
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

    setSaving(true);
    try {
      const payload: CriarDisparoPayload = {
        ...form,
        link: form.link || undefined,
        escola_ids: form.alvo === 'selecao' ? escolasSel : undefined,
        modalidade_id: form.alvo === 'modalidade' ? form.modalidade_id : undefined,
      };
      await criarDisparo(payload);
      toast.success('Notificações enviadas com sucesso');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Erro ao criar disparo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Novo Disparo de Notificação"
      onSave={handleSubmit}
      loading={saving}
      saveLabel={saving ? 'Enviando…' : 'Enviar agora'}
    >
      <Stack spacing={2.5}>
        <TextField label="Título" value={form.titulo} onChange={e => set('titulo', e.target.value)} fullWidth required size="small" inputProps={{ maxLength: 200 }} />
        <TextField label="Mensagem" value={form.mensagem} onChange={e => set('mensagem', e.target.value)} fullWidth required multiline rows={3} size="small" />
        <TextField label="Link (opcional)" value={form.link} onChange={e => set('link', e.target.value)} fullWidth size="small" placeholder="Ex: /portal-escola" />

        <FormControl size="small" fullWidth>
          <InputLabel>Tipo</InputLabel>
          <Select value={form.tipo} label="Tipo" onChange={e => set('tipo', e.target.value as TipoNotificacao)}>
            <MenuItem value="info">ℹ️ Informação</MenuItem>
            <MenuItem value="aviso">⚠️ Aviso</MenuItem>
            <MenuItem value="sucesso">✅ Sucesso</MenuItem>
            <MenuItem value="erro">❌ Erro</MenuItem>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 600, mb: 0.5 }}>Destinatários</FormLabel>
          <RadioGroup row value={form.alvo} onChange={e => set('alvo', e.target.value as AlvoDisparo)}>
            <FormControlLabel value="todas" control={<Radio size="small" />} label="Todas as escolas" />
            <FormControlLabel value="modalidade" control={<Radio size="small" />} label="Por modalidade" />
            <FormControlLabel value="selecao" control={<Radio size="small" />} label="Seleção manual" />
          </RadioGroup>
        </FormControl>

        {form.alvo === 'modalidade' && (
          <FormControl size="small" fullWidth>
            <InputLabel>Modalidade</InputLabel>
            <Select value={form.modalidade_id || ''} label="Modalidade" onChange={e => set('modalidade_id', Number(e.target.value))}>
              {modalidades.map(m => <MenuItem key={m.id} value={m.id}>{m.nome}</MenuItem>)}
            </Select>
          </FormControl>
        )}

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
      </Stack>
    </FormDialog>
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
    api.get('/escolas').then(r => setEscolas(r.data.data || r.data)).catch(() => {});
    api.get('/modalidades').then(r => setModalidades(r.data.data || r.data)).catch(() => {});
  }, []);

  return (
    <>
      <PageBreadcrumbs
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Sistema', path: '/sistema' },
          { label: 'Disparos de Notificação' },
        ]}
      />
      {/* Navy header bar */}
      <Box
        sx={{
          mb: 3,
          px: '28px',
          py: 2.5,
          background: `linear-gradient(135deg, ${NAVY}, #1e293b)`,
          position: 'relative',
        }}
      >
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GREEN}44, transparent)` }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.55rem', color: '#fff', letterSpacing: '-0.5px' }}>
              Disparos de Notificação
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Envie notificações para usuários das escolas
            </Typography>
          </Box>
          <Box>
            <Tooltip title="Atualizar">
              <IconButton onClick={carregar} sx={{ color: '#fff', mr: 1 }}><Refresh /></IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                borderRadius: '4px',
                textTransform: 'none',
                fontWeight: 600,
                bgcolor: GREEN,
                '&:hover': { bgcolor: '#16a34a' },
              }}
            >
              Novo Disparo
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 3, maxWidth: 1100 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : disparos.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: '6px' }}>Nenhum disparo criado ainda.</Alert>
        ) : (
          <Stack spacing={1.5}>
            {disparos.map(d => {
              const chip = STATUS_CHIP[d.status] ?? STATUS_CHIP.pendente;
              return (
                <Paper key={d.id} variant="outlined" sx={{ p: 2, borderRadius: '6px', borderColor: '#e5e7eb', transition: 'border-color 0.2s', '&:hover': { borderColor: '#d1d5db' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ width: 4, borderRadius: 2, bgcolor: TIPO_COLORS[d.tipo], alignSelf: 'stretch', flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>{d.titulo}</Typography>
                        <Chip size="small" label={chip.label} color={chip.color} icon={chip.icon} sx={{ height: 20, fontSize: '0.7rem', borderRadius: '3px', fontWeight: 500 }} />
                        <Chip size="small" label={
                          d.alvo === 'todas' ? 'Todas as escolas'
                            : d.alvo === 'modalidade' ? `Modalidade: ${d.modalidade_nome || d.modalidade_id}`
                              : `${d.escola_ids?.length || 0} escola(s)`
                        } variant="outlined" sx={{ height: 20, fontSize: '0.7rem', borderRadius: '3px', fontWeight: 500 }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{d.mensagem}</Typography>
                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.disabled">
                          Criado por {d.criado_por_nome} em {fmtDate(d.created_at)}
                        </Typography>
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
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={carregar}
        escolas={escolas}
        modalidades={modalidades}
      />
    </>
  );
}
