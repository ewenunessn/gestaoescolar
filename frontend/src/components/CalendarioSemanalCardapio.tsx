import React, { useMemo, useState, useEffect } from 'react';
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
import { carregarTiposRefeicao } from '../services/cardapiosModalidade';

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
  
  // Estado para tipos de refeição dinâmicos
  const [tiposRefeicaoDinamicos, setTiposRefeicaoDinamicos] = useState<Array<{key: string, label: string, icon: React.ReactElement}>>([]);

  // Carregar tipos de refeição do banco
  useEffect(() => {
    const carregarTipos = async () => {
      try {
        const tipos = await carregarTiposRefeicao();
        const tiposFormatados = Object.entries(tipos).map(([key, label]) => ({
          key,
          label,
          icon: TIPOS_REFEICAO_ICONS[key] || <RestaurantIcon />
        }));
        setTiposRefeicaoDinamicos(tiposFormatados);
      } catch (err) {
        console.error('Erro ao carregar tipos de refeição:', err);
        // Fallback para tipos padrão
        setTiposRefeicaoDinamicos([
          { key: 'cafe_manha', label: 'Café da Manhã', icon: <CafeIcon /> },
          { key: 'lanche', label: 'Lanche', icon: <SnackIcon /> },
          { key: 'refeicao', label: 'Refeição', icon: <LunchIcon /> },
          { key: 'ceia', label: 'Ceia', icon: <DinnerIcon /> }
        ]);
      }
    };
    carregarTipos();
  }, []);

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

  // Semana atual para exibir (apenas dias úteis - Segunda a Sábado)
  const semanaParaExibir = semanasDoMes[semanaAtual];
  const diasUteis = semanaParaExibir ? semanaParaExibir.filter(dia => dia.getDay() >= 1 && dia.getDay() <= 6) : [];
  
  if (!semanaParaExibir || diasUteis.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          Nenhuma semana disponível para este período
        </Typography>
      </Box>
    );
  }

  // Usar tipos dinâmicos carregados do banco
  const tiposRefeicao = tiposRefeicaoDinamicos;
  
  // Mostrar loading enquanto carrega tipos
  if (tiposRefeicao.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          Carregando tipos de refeição...
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

          {/* Informações da semana */}
          <Box sx={{ textAlign: 'center', flex: 1, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Semana {semanaAtual + 1}/{semanasDoMes.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {diasUteis[0].getDate()}-{diasUteis[diasUteis.length - 1].getDate()}/{mes.toString().padStart(2, '0')}/{ano}
              </Typography>
              <Chip 
                label={`${diasUteis.reduce((total, dia) => total + getEventosRefeicao(formatarData(dia)).length, 0)} refeições`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>
            
            {/* Indicadores de semana */}
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

        {/* Tabela: Linhas = Tipos de Refeição, Colunas = Dias da Semana */}
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'table', width: '100%', minWidth: 800 }}>
            {/* Cabeçalho da tabela - Dias da semana */}
            <Box sx={{ 
              display: 'table-row',
              bgcolor: 'grey.100',
              fontWeight: 600
            }}>
              {/* Primeira coluna - Tipo de Preparação */}
              <Box sx={{ 
                display: 'table-cell',
                p: 2,
                borderRight: '1px solid',
                borderBottom: '2px solid',
                borderColor: 'divider',
                bgcolor: 'primary.50',
                width: 150,
                verticalAlign: 'middle'
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Tipo de Preparação
                </Typography>
              </Box>

              {/* Colunas dos dias úteis (Segunda a Sábado) */}
              {diasUteis.map((dia, index) => {
                const dataStr = formatarData(dia);
                const isHoje = isDiaHoje(dia);
                
                return (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'table-cell',
                      p: 1.5,
                      borderRight: index < diasUteis.length - 1 ? '1px solid' : 'none',
                      borderBottom: '2px solid',
                      borderColor: 'divider',
                      textAlign: 'center',
                      bgcolor: isHoje ? 'primary.100' : 'grey.50',
                      minWidth: 120,
                      verticalAlign: 'middle'
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        fontWeight: 600, 
                        mb: 0.5,
                        color: isHoje ? 'primary.main' : 'text.secondary'
                      }}
                    >
                      {DIAS_SEMANA[dia.getDay()]}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: isHoje ? 700 : 600,
                        color: isHoje ? 'primary.main' : 'text.primary'
                      }}
                    >
                      {dia.getDate()}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Linhas da tabela - Uma para cada tipo de refeição */}
            {tiposRefeicao.map((tipoRefeicao, tipoIndex) => (
              <Box 
                key={tipoRefeicao.key}
                sx={{ 
                  display: 'table-row',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                {/* Primeira coluna - Nome do tipo */}
                <Box sx={{ 
                  display: 'table-cell',
                  p: 2,
                  borderRight: '1px solid',
                  borderBottom: tipoIndex < tiposRefeicao.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                  verticalAlign: 'top'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: 'primary.main', display: 'flex' }}>
                      {tipoRefeicao.icon}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {tipoRefeicao.label}
                    </Typography>
                  </Box>
                </Box>

                {/* Colunas dos dias - Preparações deste tipo */}
                {diasUteis.map((dia, diaIndex) => {
                  const dataStr = formatarData(dia);
                  const isHoje = isDiaHoje(dia);
                  const isOutroMes = isDiaOutroMes(dia);
                  const eventosRefeicao = getEventosRefeicao(dataStr);
                  
                  // Filtrar apenas refeições deste tipo
                  const refeicoesDoTipo = eventosRefeicao.filter(
                    ref => ref._refeicao?.tipo_refeicao === tipoRefeicao.key
                  );

                  return (
                    <Box 
                      key={diaIndex}
                      sx={{ 
                        display: 'table-cell',
                        p: 1.5,
                        borderRight: diaIndex < diasUteis.length - 1 ? '1px solid' : 'none',
                        borderBottom: tipoIndex < tiposRefeicao.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        bgcolor: isHoje ? 'primary.50' : 'background.paper',
                        opacity: isOutroMes ? 0.3 : 1,
                        cursor: 'pointer',
                        verticalAlign: 'top',
                        '&:hover': {
                          bgcolor: isHoje ? 'primary.100' : 'action.hover'
                        }
                      }}
                      onClick={() => onDiaClick(dataStr)}
                    >
                      {refeicoesDoTipo.length === 0 ? (
                        <Typography 
                          variant="caption" 
                          color="text.disabled"
                          sx={{ fontStyle: 'italic', display: 'block', textAlign: 'center' }}
                        >
                          -
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {refeicoesDoTipo.map((refeicao, refIndex) => {
                            const nomeRefeicao = refeicao.titulo.includes(':') 
                              ? refeicao.titulo.split(':')[1].trim() 
                              : refeicao.titulo;
                            
                            return (
                              <Chip
                                key={refIndex}
                                label={nomeRefeicao}
                                size="small"
                                sx={{
                                  bgcolor: refeicao.cor,
                                  color: 'white',
                                  fontSize: '0.7rem',
                                  height: 24,
                                  width: '100%',
                                  justifyContent: 'flex-start',
                                  '& .MuiChip-label': {
                                    px: 1,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'block'
                                  },
                                  boxShadow: 1,
                                  cursor: 'pointer',
                                  '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: 2,
                                    zIndex: 1
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
                          })}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default CalendarioSemanalCardapio;