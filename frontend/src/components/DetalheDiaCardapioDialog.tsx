import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Chip, Button,
  IconButton, Card, CardContent, Divider
} from '@mui/material';
import { Delete as DeleteIcon, Event as EventIcon, Restaurant as RestaurantIcon, AccessTime as TimeIcon, Place as PlaceIcon } from '@mui/icons-material';
import { getLabelsEventos, getCoresEventos } from '../services/calendarioLetivo';
import { TIPOS_REFEICAO, MESES } from '../services/cardapiosModalidade';

interface DetalheDiaCardapioDialogProps {
  open: boolean;
  onClose: () => void;
  diaSelecionado: number | null;
  cardapio: any;
  refeicoesDia: any[];
  eventosDia: any[];
  corTipoRefeicao: any;
  onAdicionarRefeicao: () => void;
  onExcluirRefeicao: (id: number) => void;
  onVerDetalhes: (refeicaoId: number) => void;
}

export const DetalheDiaCardapioDialog: React.FC<DetalheDiaCardapioDialogProps> = ({
  open,
  onClose,
  diaSelecionado,
  cardapio,
  refeicoesDia,
  eventosDia,
  corTipoRefeicao,
  onAdicionarRefeicao,
  onExcluirRefeicao,
  onVerDetalhes
}) => {
  const labels = getLabelsEventos();
  const cores = getCoresEventos();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ 
        sx: { 
          borderRadius: 2,
          minHeight: '500px'
        } 
      }}
    >
      {/* Cabeçalho */}
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {diaSelecionado && cardapio && `${diaSelecionado} de ${MESES[cardapio.mes - 1]}`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {diaSelecionado && cardapio && new Date(cardapio.ano, cardapio.mes - 1, diaSelecionado).toLocaleDateString('pt-BR', { weekday: 'long' })}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        {/* Seção de Refeições */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <RestaurantIcon sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Refeições do Dia
            </Typography>
          </Box>

          {refeicoesDia.length === 0 ? (
            <Card variant="outlined" sx={{ bgcolor: '#fafafa', textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Nenhuma preparação cadastrada
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {refeicoesDia.map((ref) => (
                <Card 
                  key={ref.id}
                  variant="outlined"
                  sx={{ 
                    borderLeft: `4px solid ${corTipoRefeicao[ref.tipo_refeicao] || '#ccc'}`,
                    '&:hover': { boxShadow: 2 },
                    transition: 'box-shadow 0.2s'
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {ref.refeicao_nome}
                        </Typography>
                        <Chip
                          label={TIPOS_REFEICAO[ref.tipo_refeicao]}
                          size="small"
                          sx={{
                            bgcolor: corTipoRefeicao[ref.tipo_refeicao] || '#ccc',
                            color: 'white',
                            height: 20,
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}
                        />
                        {ref.observacao && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            {ref.observacao}
                          </Typography>
                        )}
                        <Button
                          size="small"
                          onClick={() => onVerDetalhes(ref.refeicao_id)}
                          sx={{ mt: 1, fontSize: '0.75rem', textTransform: 'none' }}
                        >
                          Ver Detalhes Completos
                        </Button>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => onExcluirRefeicao(ref.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Seção de Eventos */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EventIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Eventos do Dia
            </Typography>
          </Box>

          {eventosDia.length === 0 ? (
            <Card variant="outlined" sx={{ bgcolor: '#fafafa', textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Não existem eventos
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {eventosDia.map((evento) => (
                <Card 
                  key={evento.id}
                  variant="outlined"
                  sx={{ 
                    borderLeft: `4px solid ${evento.cor || cores[evento.tipo_evento] || '#ccc'}`,
                    '&:hover': { boxShadow: 2 },
                    transition: 'box-shadow 0.2s'
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {evento.titulo}
                    </Typography>
                    <Chip
                      label={labels[evento.tipo_evento as keyof typeof labels] || evento.tipo_evento}
                      size="small"
                      sx={{
                        bgcolor: evento.cor || cores[evento.tipo_evento] || '#ccc',
                        color: 'white',
                        height: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        mb: evento.descricao || evento.local || evento.hora_inicio ? 1 : 0
                      }}
                    />
                    {evento.descricao && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {evento.descricao}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      {evento.local && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PlaceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {evento.local}
                          </Typography>
                        </Box>
                      )}
                      {evento.hora_inicio && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {evento.hora_inicio} {evento.hora_fim && `- ${evento.hora_fim}`}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* Rodapé */}
      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#fafafa' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Fechar
        </Button>
        <Button 
          variant="contained" 
          onClick={onAdicionarRefeicao}
          sx={{ textTransform: 'none' }}
        >
          Adicionar Preparação
        </Button>
      </DialogActions>
    </Dialog>
  );
};
