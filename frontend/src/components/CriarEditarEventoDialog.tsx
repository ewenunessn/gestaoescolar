import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress
} from '@mui/material';
import { EventoCalendario, getLabelsEventos, getCoresEventos } from '../services/calendarioLetivo';

interface CriarEditarEventoDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (evento: Partial<EventoCalendario>) => Promise<void>;
  evento?: EventoCalendario | null;
  calendarioId: number;
  dataInicial?: string;
}

export default function CriarEditarEventoDialog({
  open,
  onClose,
  onSave,
  evento,
  calendarioId,
  dataInicial
}: CriarEditarEventoDialogProps) {
  const [form, setForm] = useState<Partial<EventoCalendario>>({
    calendario_letivo_id: calendarioId,
    titulo: '',
    descricao: '',
    tipo_evento: 'evento_escolar',
    data_inicio: dataInicial || new Date().toISOString().split('T')[0],
    data_fim: '',
    cor: '#007bff',
    observacoes: ''
  });
  const [saving, setSaving] = useState(false);

  const labels = getLabelsEventos();
  const cores = getCoresEventos();

  useEffect(() => {
    if (evento) {
      setForm({
        ...evento,
        data_inicio: evento.data_inicio.split('T')[0],
        data_fim: evento.data_fim ? evento.data_fim.split('T')[0] : ''
      });
    } else if (dataInicial) {
      setForm(prev => ({ ...prev, data_inicio: dataInicial }));
    }
  }, [evento, dataInicial]);

  useEffect(() => {
    // Atualizar cor automaticamente quando tipo muda
    if (form.tipo_evento && !evento) {
      const corPadrao = cores[form.tipo_evento as keyof typeof cores];
      setForm(prev => ({ ...prev, cor: corPadrao }));
    }
  }, [form.tipo_evento]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.titulo || !form.tipo_evento || !form.data_inicio) {
      return;
    }

    try {
      setSaving(true);
      await onSave(form);
      onClose();
      // Resetar form
      setForm({
        calendario_letivo_id: calendarioId,
        titulo: '',
        descricao: '',
        tipo_evento: 'evento_escolar',
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        cor: '#007bff',
        observacoes: ''
      });
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {evento ? 'Editar Evento' : 'Novo Evento'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {/* Título */}
          <TextField
            label="Título do Evento"
            fullWidth
            required
            value={form.titulo}
            onChange={(e) => handleChange('titulo', e.target.value)}
            placeholder="Ex: Reunião de Pais, Feriado Nacional..."
          />

          {/* Tipo e Cor */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth required sx={{ flex: 2 }}>
              <InputLabel>Tipo de Evento</InputLabel>
              <Select
                value={form.tipo_evento}
                label="Tipo de Evento"
                onChange={(e) => handleChange('tipo_evento', e.target.value)}
              >
                {Object.entries(labels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: cores[value as keyof typeof cores]
                        }}
                      />
                      {label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ flex: 1, minWidth: 120 }}>
              <TextField
                label="Cor"
                type="color"
                fullWidth
                value={form.cor}
                onChange={(e) => handleChange('cor', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>

          {/* Datas */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Data de Início"
              type="date"
              required
              value={form.data_inicio}
              onChange={(e) => handleChange('data_inicio', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Data de Término (opcional)"
              type="date"
              value={form.data_fim}
              onChange={(e) => handleChange('data_fim', e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Para eventos de múltiplos dias"
              sx={{ flex: 1 }}
            />
          </Box>

          {/* Descrição */}
          <TextField
            label="Descrição (opcional)"
            fullWidth
            multiline
            rows={3}
            value={form.descricao}
            onChange={(e) => handleChange('descricao', e.target.value)}
            placeholder="Adicione detalhes sobre o evento..."
          />

          {/* Observações */}
          <TextField
            label="Observações (opcional)"
            fullWidth
            multiline
            rows={2}
            value={form.observacoes}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Informações adicionais..."
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.titulo || !form.tipo_evento || !form.data_inicio}
        >
          {saving ? <CircularProgress size={24} /> : evento ? 'Salvar' : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
