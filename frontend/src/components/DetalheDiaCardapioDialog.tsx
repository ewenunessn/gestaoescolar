import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Chip, Button,
  IconButton, Card, CardContent, Divider
} from '@mui/material';
import { Delete as DeleteIcon, Event as EventIcon, Restaurant as RestaurantIcon, AccessTime as TimeIcon, Place as PlaceIcon, ContentCopy as CopyIcon, ArrowBack } from '@mui/icons-material';
import { getLabelsEventos, getCoresEventos } from '../services/calendarioLetivo';
import { TIPOS_REFEICAO } from '../services/cardapiosModalidade';
import { dateUtils } from '../utils/dateUtils';

interface DetalheDiaCardapioDialogProps {
  open: boolean; onClose: () => void; diaSelecionado: number | null;
  cardapio: any; refeicoesDia: any[]; eventosDia: any[]; corTipoRefeicao: any;
  onAdicionarRefeicao: () => void; onExcluirRefeicao: (id: number) => void;
  onVerDetalhes: (refeicaoId: number) => void; onReplicarRefeicoes?: () => void;
}

export const DetalheDiaCardapioDialog: React.FC<DetalheDiaCardapioDialogProps> = ({
  open, onClose, diaSelecionado, cardapio, refeicoesDia, eventosDia,
  corTipoRefeicao, onAdicionarRefeicao, onExcluirRefeicao, onVerDetalhes, onReplicarRefeicoes
}) => {
  const labels = getLabelsEventos();
  const cores = getCoresEventos();

  return (
    <Dialog
      open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* ── HEADER ── */}
      <Box sx={{
        px: 3, pt: 2.5, pb: 1.5,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid', borderColor: 'divider'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
          {diaSelecionado && cardapio && dateUtils.formatLong(cardapio.ano, cardapio.mes, diaSelecionado)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2, fontWeight: 500 }}>
          {diaSelecionado && cardapio && dateUtils.getDayOfWeekName(cardapio.ano, cardapio.mes, diaSelecionado)}
          {refeicoesDia.length > 0 && (
            <Chip
              label={`${refeicoesDia.length} refeio${refeicoesDia.length > 1 ? 'es' : ''}`}
              size="small"
              sx={{ ml: 1.5, height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'primary.main', color: 'primary.contrastText' }}
            />
          )}
        </Typography>
      </Box>

      {/* ── CONTENT ── */}
      <DialogContent sx={{ px: 3, py: 2 }}>

        {/* Refeições */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RestaurantIcon sx={{ fontSize: 16, color: '#fff' }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
              Refeições
            </Typography>
          </Box>

          {refeicoesDia.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">Nenhuma preparacao neste dia</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {refeicoesDia.map((ref) => (
                <Card
                  key={ref.id}
                  variant="outlined"
                  sx={{
                    borderLeft: `4px solid ${corTipoRefeicao[ref.tipo_refeicao] || '#ccc'}`,
                    transition: 'box-shadow 0.15s ease',
                    '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },
                  }}
                >
                  <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { py: 1.2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => onVerDetalhes(ref.refeicao_id)}>
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                          {ref.refeicao_nome}
                        </Typography>
                        <Chip
                          label={TIPOS_REFEICAO[ref.tipo_refeicao]}
                          size="small"
                          sx={{ bgcolor: corTipoRefeicao[ref.tipo_refeicao] || '#ccc', color: '#fff', height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                        />
                        {ref.observacao && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                            {ref.observacao}
                          </Typography>
                        )}
                      </Box>
                      <IconButton size="small" onClick={() => onExcluirRefeicao(ref.id)}
                        sx={{ color: 'error.main', opacity: 0.6, '&:hover': { opacity: 1 } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* Eventos */}
        {eventosDia.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EventIcon sx={{ fontSize: 16, color: '#fff' }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Eventos</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {eventosDia.map((evento) => (
                  <Card key={evento.id} variant="outlined"
                    sx={{ borderLeft: `4px solid ${evento.cor || cores[evento.tipo_evento] || '#ccc'}` }}>
                    <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { py: 1.2 } }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{evento.titulo}</Typography>
                      <Chip label={labels[evento.tipo_evento as keyof typeof labels] || evento.tipo_evento}
                        size="small" sx={{ bgcolor: evento.cor || cores[evento.tipo_evento] || '#ccc', color: '#fff', height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                      {evento.local && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <PlaceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">{evento.local}</Typography>
                        </Box>
                      )}
                      {evento.hora_inicio && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                          <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {evento.hora_inicio} {evento.hora_fim && `- ${evento.hora_fim}`}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      {/* ── FOOTER ── */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }} startIcon={<ArrowBack fontSize="small" />}>
          Voltar
        </Button>
        <Box sx={{ flex: 1 }} />
        {refeicoesDia.length > 0 && onReplicarRefeicoes && (
          <Button onClick={onReplicarRefeicoes}
            sx={{ textTransform: 'none' }} startIcon={<CopyIcon fontSize="small" />}>
            Replicar
          </Button>
        )}
        <Button variant="contained" onClick={onAdicionarRefeicao}>
          Adicionar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
