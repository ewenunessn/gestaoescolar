import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Restaurant as RestaurantIcon,
  LocalCafe as CafeIcon,
  LunchDining as LunchIcon,
  RestaurantMenu as DinnerIcon,
  Cookie as SnackIcon,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';

interface EventoCalendario {
  id: number;
  titulo: string;
  tipo_evento: string;
  data_inicio: string;
  data_fim?: string;
  cor: string;
  descricao?: string;
  _refeicao?: any;
}

interface CalendarioSemanalCardapioProps {
  ano: number;
  mes: number;
  eventos: EventoCalendario[];
  onDiaClick: (data: string) => void;
  onEventoClick?: (evento: EventoCalendario) => void;
  readonly?: boolean;
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TIPOS_REFEICAO_ICONS: Record<string, React.ReactElement> = {
  'refeicao': <LunchIcon />,
  'lanche': <SnackIcon />,
  'cafe_manha': <CafeIcon />,
  'ceia': <DinnerIcon />,
  // Compatibilidade com valores antigos
  'almoco': <LunchIcon />,
  'lanche_manha': <SnackIcon />,
  'lanche_tarde': <SnackIcon />,
  'jantar': <DinnerIcon />
};

const CalendarioSemanalCardapio: React.FC<CalendarioSemanalCardapioProps> = ({
  ano,
  mes,
  eventos,
  onDiaClick,
  onEventoClick,
  readonly = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estado para controlar qual semana está sendo exibida
  const [semanaAtual, setSemanaAtual] = useState(0);

  // Gerar semanas do mês
  const semanasDoMes = useMemo(() => {
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    const semanas: Date[][] = [];
    
    // Encontrar o primeiro domingo da primeira semana
    let inicioSemana = new Date(primeiroDia);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    
    while (inicioSemana <= ultimoDia) {
      const semana: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const dia = new Date(inicioSemana);
        dia.setDate(dia.getDate() + i);
        semana.push(dia);
      }
      semanas.push(semana);
      inicioSemana.setDate(inicioSemana.getDate() + 7);
    }
    
    return semanas;
  }, [ano, mes]);

  // Agrupar eventos por data
  const eventosPorData = useMemo(() => {
    return eventos.reduce((acc, evento) => {
      const dataInicio = evento.data_inicio.split('T')[0];
      if (!acc[dataInicio]) acc[dataInicio] = [];
      acc[dataInicio].push(evento);
      
      // Se evento tem data_fim, adicionar em todos os dias do intervalo
      if (evento.data_fim) {
        const inicio = new Date(evento.data_inicio);
        const fim = new Date(evento.data_fim);
        for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
          const dataStr = d.toISOString().split('T')[0];
          if (!acc[dataStr]) acc[dataStr] = [];
          if (!acc[dataStr].find(e => e.id === evento.id)) {
            acc[dataStr].push(evento);
          }
        }
      }
      return acc;
    }, {} as Record<string, EventoCalendario[]>);
  }, [eventos]);

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];

  const formatarData = (data: Date) => {
    return data.toISOString().split('T')[0];
  };

  const isDiaHoje = (data: Date) => {
    return formatarData(data) === hojeStr;
  };

  const isDiaOutroMes = (data: Date) => {
    return data.getMonth() !== mes - 1;
  };

  const getEventosRefeicao = (data: string) => {
    const eventosNoDia = eventosPorData[data] || [];
    return eventosNoDia.filter(e => e.tipo_evento === 'refeicao');
  };

  const getIconeRefeicao = (titulo: string) => {
    const tituloLower = titulo.toLowerCase();
    if (tituloLower.includes('café') || tituloLower.includes('breakfast')) {
      return TIPOS_REFEICAO_ICONS['cafe_manha'];
    } else if (tituloLower.includes('lanche') || tituloLower.includes('merenda') || tituloLower.includes('colação')) {
      return TIPOS_REFEICAO_ICONS['lanche'];
    } else if (tituloLower.includes('ceia')) {
      return TIPOS_REFEICAO_ICONS['ceia'];
    }
    return TIPOS_REFEICAO_ICONS['refeicao'];
  };

  // Navegação entre semanas
  const navegarSemana = (direcao: 'anterior' | 'proxima') => {
    if (direcao === 'anterior') {
      setSemanaAtual(Math.max(0, semanaAtual - 1));
    } else {
      setSemanaAtual(Math.min(semanasDoMes.length - 1, semanaAtual + 1));
    }
  };

  // Resetar semana atual quando mudar o mês
  React.useEffect(() => {
    setSemanaAtual(0);
  }, [ano, mes]);

  // Semana atual para exibir
  const semanaParaExibir = semanasDoMes[semanaAtual];
  
  if (!semanaParaExibir) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          Nenhuma semana disponível para este período
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Paper 
        elevation={1} 
        sx={{ 
          borderRadius: 2, 
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        {/* Cabeçalho da semana com navegação */}
        <Box sx={{ 
          bgcolor: 'grey.50', 
          p: 1.5, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 60
        }}>
          {/* Navegação anterior */}
          <IconButton
            onClick={() => navegarSemana('anterior')}
            disabled={semanaAtual === 0}
            size="small"
            sx={{ 
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'primary.main', color: 'white' },
              '&:disabled': { opacity: 0.3 }
            }}
          >
            <ChevronLeft />
          </IconButton>

          {/* Informações da semana - mais compactas */}
          <Box sx={{ textAlign: 'center', flex: 1, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Semana {semanaAtual + 1}/{semanasDoMes.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {semanaParaExibir[0].getDate()}-{semanaParaExibir[6].getDate()}/{mes.toString().padStart(2, '0')}/{ano}
              </Typography>
              <Chip 
                label={`${semanaParaExibir.reduce((total, dia) => total + getEventosRefeicao(formatarData(dia)).length, 0)} refeições`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>
            
            {/* Indicadores de semana - mais discretos */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.3 }}>
              {Array.from({ length: semanasDoMes.length }, (_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: index === semanaAtual ? 'primary.main' : 'action.disabled',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.3)',
                      bgcolor: index === semanaAtual ? 'primary.dark' : 'action.hover'
                    }
                  }}
                  onClick={() => setSemanaAtual(index)}
                />
              ))}
            </Box>
          </Box>

          {/* Navegação próxima */}
          <IconButton
            onClick={() => navegarSemana('proxima')}
            disabled={semanaAtual === semanasDoMes.length - 1}
            size="small"
            sx={{ 
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'primary.main', color: 'white' },
              '&:disabled': { opacity: 0.3 }
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>

        {/* Layout em linhas - cada linha é um dia da semana */}
        <Box>
          {semanaParaExibir.map((dia, diaIndex) => {
            const dataStr = formatarData(dia);
            const isHoje = isDiaHoje(dia);
            const isOutroMes = isDiaOutroMes(dia);
            const isFimDeSemana = dia.getDay() === 0 || dia.getDay() === 6;
            const eventosRefeicao = getEventosRefeicao(dataStr);

            return (
              <Box
                key={diaIndex}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 80,
                  borderBottom: diaIndex < 6 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  bgcolor: isHoje 
                    ? 'primary.50' 
                    : isFimDeSemana 
                      ? 'error.25' 
                      : 'background.paper',
                  opacity: isOutroMes ? 0.6 : 1,
                  '&:hover': {
                    bgcolor: isHoje 
                      ? 'primary.100' 
                      : isFimDeSemana 
                        ? 'error.50' 
                        : 'action.hover',
                    transform: 'scale(1.01)'
                  }
                }}
                onClick={() => onDiaClick(dataStr)}
              >
                {/* Coluna do dia da semana */}
                <Box sx={{ 
                  width: { xs: 80, sm: 120 }, 
                  p: 2, 
                  borderRight: '1px solid', 
                  borderColor: 'divider',
                  textAlign: 'center'
                }}>
                  <Typography 
                    variant="caption" 
                    color={isFimDeSemana ? 'error.main' : 'text.secondary'}
                    sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}
                  >
                    {DIAS_SEMANA[dia.getDay()]}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: isHoje ? 700 : 500,
                      color: isHoje 
                        ? 'primary.main' 
                        : isFimDeSemana 
                          ? 'error.main' 
                          : 'text.primary'
                    }}
                  >
                    {dia.getDate()}
                  </Typography>
                </Box>

                {/* Coluna das refeições */}
                <Box sx={{ 
                  flex: 1, 
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap'
                }}>
                  {eventosRefeicao.length === 0 ? (
                    <Typography 
                      variant="body2" 
                      color="text.disabled"
                      sx={{ fontStyle: 'italic' }}
                    >
                      {isFimDeSemana ? 'Fim de semana' : 'Nenhuma refeição cadastrada'}
                    </Typography>
                  ) : (
                    eventosRefeicao.map((refeicao, refIndex) => {
                      const nomeRefeicao = refeicao.titulo.includes(':') 
                        ? refeicao.titulo.split(':')[1].trim() 
                        : refeicao.titulo;
                      
                      return (
                        <Chip
                          key={refIndex}
                          icon={getIconeRefeicao(refeicao.titulo)}
                          label={nomeRefeicao}
                          size="small"
                          sx={{
                            bgcolor: refeicao.cor,
                            color: 'white',
                            fontSize: '0.75rem',
                            height: 32,
                            '& .MuiChip-label': {
                              px: 1
                            },
                            '& .MuiChip-icon': {
                              color: 'white',
                              marginLeft: 1
                            },
                            boxShadow: 1,
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: 2
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEventoClick) {
                              onEventoClick(refeicao);
                            }
                          }}
                        />
                      );
                    })
                  )}
                </Box>

                {/* Coluna de ações */}
                <Box sx={{ 
                  width: 60, 
                  p: 1,
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  {!readonly && (
                    <Tooltip title="Adicionar refeição">
                      <IconButton
                        size="small"
                        sx={{ 
                          bgcolor: 'action.hover',
                          '&:hover': { 
                            bgcolor: 'primary.main', 
                            color: 'white' 
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDiaClick(dataStr);
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

export default CalendarioSemanalCardapio;