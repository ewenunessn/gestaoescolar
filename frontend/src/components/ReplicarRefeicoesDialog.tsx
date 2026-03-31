import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
  Grid,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { TIPOS_REFEICAO } from '../services/cardapiosModalidade';

interface ReplicarRefeicoesDialogProps {
  open: boolean;
  onClose: () => void;
  diaOrigem: number;
  mesAno: string;
  refeicoes: any[];
  onReplicar: (diasDestino: Date[]) => Promise<void>;
  corTipoRefeicao: any;
}

export const ReplicarRefeicoesDialog: React.FC<ReplicarRefeicoesDialogProps> = ({
  open,
  onClose,
  diaOrigem,
  mesAno,
  refeicoes,
  onReplicar,
  corTipoRefeicao,
}) => {
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Extrair mês e ano do cardápio (passado via props)
  const getMesAno = () => {
    // mesAno vem no formato "MARÇO/2026"
    const partes = mesAno.split('/');
    if (partes.length !== 2) {
      console.warn('Formato inválido de mesAno:', mesAno);
      return { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() };
    }
    
    const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
    const mesNome = partes[0].trim().toUpperCase();
    const mesIndex = meses.indexOf(mesNome);
    const mes = mesIndex >= 0 ? mesIndex + 1 : new Date().getMonth() + 1;
    const ano = parseInt(partes[1].trim());
    
    return { mes, ano: ano || new Date().getFullYear() };
  };

  const { mes, ano } = getMesAno();
  const diasNoMes = new Date(ano, mes, 0).getDate();

  const handleDiaClick = (dia: number) => {
    if (dia === diaOrigem) return; // Não pode selecionar o dia de origem

    if (diasSelecionados.includes(dia)) {
      setDiasSelecionados(diasSelecionados.filter(d => d !== dia));
    } else {
      setDiasSelecionados([...diasSelecionados, dia]);
    }
  };

  const handleReplicar = async () => {
    if (diasSelecionados.length === 0) return;

    setLoading(true);
    try {
      // Criar datas com o mês correto (JavaScript usa 0-11 para meses)
      // Usar meio-dia para evitar problemas de timezone
      const datasDestino = diasSelecionados.map(dia => new Date(ano, mes - 1, dia, 12, 0, 0));
      
      await onReplicar(datasDestino);
      setDiasSelecionados([]);
      onClose();
    } catch (error) {
      console.error('Erro ao replicar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDiasSelecionados([]);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CopyIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Replicar Refeições
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Selecione os dias para os quais deseja copiar as refeições do dia {diaOrigem}
        </Alert>

        {/* Refeições que serão replicadas */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Refeições a serem copiadas:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {refeicoes.map((ref) => (
              <Box
                key={ref.id}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  borderLeft: `4px solid ${corTipoRefeicao[ref.tipo_refeicao] || '#ccc'}`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
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
                    fontWeight: 600,
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Calendário mensal para seleção */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Selecione os dias de destino:
          </Typography>
          
          {/* Calendário estilo grade */}
          <Box sx={{ 
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden'
          }}>
            {/* Cabeçalho dos dias da semana */}
            <Grid container sx={{ bgcolor: 'primary.main' }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                <Grid item xs key={dia} sx={{ 
                  textAlign: 'center', 
                  py: 1,
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}>
                  {dia}
                </Grid>
              ))}
            </Grid>

            {/* Dias do mês */}
            {(() => {
              const primeiroDia = new Date(ano, mes - 1, 1).getDay();
              const semanas: (number | null)[][] = [];
              let semanaAtual: (number | null)[] = [];
              
              // Preencher dias vazios antes do primeiro dia
              for (let i = 0; i < primeiroDia; i++) {
                semanaAtual.push(null);
              }
              
              // Preencher os dias do mês
              for (let dia = 1; dia <= diasNoMes; dia++) {
                semanaAtual.push(dia);
                if (semanaAtual.length === 7) {
                  semanas.push(semanaAtual);
                  semanaAtual = [];
                }
              }
              
              // Completar última semana
              if (semanaAtual.length > 0) {
                while (semanaAtual.length < 7) {
                  semanaAtual.push(null);
                }
                semanas.push(semanaAtual);
              }

              return semanas.map((semana, semanaIdx) => (
                <Grid container key={semanaIdx} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                  {semana.map((dia, diaIdx) => {
                    if (dia === null) {
                      return (
                        <Grid item xs key={`empty-${diaIdx}`} sx={{ 
                          minHeight: 50,
                          bgcolor: '#f5f5f5',
                          borderRight: diaIdx < 6 ? '1px solid' : 'none',
                          borderColor: 'divider'
                        }} />
                      );
                    }

                    const estaSelecionado = diasSelecionados.includes(dia);
                    const ehDiaOrigem = dia === diaOrigem;
                    const ehDomingo = diaIdx === 0;

                    return (
                      <Grid item xs key={dia} sx={{ 
                        minHeight: 50,
                        borderRight: diaIdx < 6 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        bgcolor: ehDomingo ? '#fff3e0' : 'white'
                      }}>
                        <Box
                          onClick={() => !ehDiaOrigem && handleDiaClick(dia)}
                          sx={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: ehDiaOrigem ? 'not-allowed' : 'pointer',
                            bgcolor: estaSelecionado ? 'primary.main' : 
                                     ehDiaOrigem ? 'action.disabledBackground' : 
                                     'transparent',
                            color: estaSelecionado ? 'white' : 
                                   ehDiaOrigem ? 'text.disabled' : 
                                   ehDomingo ? 'error.main' :
                                   'text.primary',
                            fontWeight: estaSelecionado ? 700 : ehDomingo ? 600 : 400,
                            fontSize: '0.95rem',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: ehDiaOrigem ? 'action.disabledBackground' :
                                       estaSelecionado ? 'primary.dark' : 
                                       'action.hover',
                            },
                          }}
                        >
                          {dia}
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              ));
            })()}
          </Box>

          {/* Legenda */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: 'primary.main', borderRadius: 0.5 }} />
              <Typography variant="caption">Selecionado</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: 'action.disabledBackground', borderRadius: 0.5 }} />
              <Typography variant="caption">Dia origem</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#fff3e0', border: '1px solid #e0e0e0', borderRadius: 0.5 }} />
              <Typography variant="caption" color="error.main">Domingo</Typography>
            </Box>
          </Box>

          {diasSelecionados.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Dias selecionados: {diasSelecionados.length}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {diasSelecionados
                  .sort((a, b) => a - b)
                  .map((dia) => (
                    <Chip
                      key={dia}
                      label={dia}
                      size="small"
                      onDelete={() => handleDiaClick(dia)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#fafafa' }}>
        <Button onClick={handleClose} disabled={loading} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleReplicar}
          disabled={diasSelecionados.length === 0 || loading}
          sx={{ textTransform: 'none' }}
        >
          {loading ? 'Replicando...' : `Replicar para ${diasSelecionados.length} dia(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
