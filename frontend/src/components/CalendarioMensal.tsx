import { Box, Typography, IconButton, Tooltip, Badge } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { EventoCalendario } from '../services/calendarioLetivo';

interface CalendarioMensalProps {
  ano: number;
  mes: number;
  eventos: EventoCalendario[];
  onMesAnterior: () => void;
  onProximoMes: () => void;
  onDiaClick: (data: string) => void;
  diasLetivos?: string[];
  diasNaoLetivos?: string[];
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function CalendarioMensal({
  ano,
  mes,
  eventos,
  onMesAnterior,
  onProximoMes,
  onDiaClick,
  diasLetivos = [],
  diasNaoLetivos = []
}: CalendarioMensalProps) {
  
  // Gerar dias do mês
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0);
  const diasNoMes = ultimoDia.getDate();
  const diaSemanaInicio = primeiroDia.getDay();

  // Dias do mês anterior para preencher
  const diasMesAnterior = diaSemanaInicio;
  const ultimoDiaMesAnterior = new Date(ano, mes - 1, 0).getDate();

  // Gerar array de dias
  const dias: Array<{ dia: number; mes: 'anterior' | 'atual' | 'proximo'; data: string }> = [];

  // Dias do mês anterior
  for (let i = diasMesAnterior - 1; i >= 0; i--) {
    const dia = ultimoDiaMesAnterior - i;
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anoAnterior = mes === 1 ? ano - 1 : ano;
    dias.push({
      dia,
      mes: 'anterior',
      data: `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    });
  }

  // Dias do mês atual
  for (let dia = 1; dia <= diasNoMes; dia++) {
    dias.push({
      dia,
      mes: 'atual',
      data: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    });
  }

  // Dias do próximo mês para completar a grade
  const diasRestantes = 42 - dias.length; // 6 semanas * 7 dias
  for (let dia = 1; dia <= diasRestantes; dia++) {
    const mesProximo = mes === 12 ? 1 : mes + 1;
    const anoProximo = mes === 12 ? ano + 1 : ano;
    dias.push({
      dia,
      mes: 'proximo',
      data: `${anoProximo}-${String(mesProximo).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    });
  }

  // Agrupar eventos por data
  const eventosPorData = eventos.reduce((acc, evento) => {
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

  const hoje = new Date().toISOString().split('T')[0];

  const getDiaStyle = (diaInfo: typeof dias[0]) => {
    const { data, mes: mesDia } = diaInfo;
    const isHoje = data === hoje;
    const isOutroMes = mesDia !== 'atual';
    const isLetivo = diasLetivos.includes(data);
    const isNaoLetivo = diasNaoLetivos.includes(data);
    const eventosNoDia = eventosPorData[data] || [];
    const temFeriado = eventosNoDia.some(e => e.tipo_evento.includes('feriado'));
    const temRecesso = eventosNoDia.some(e => ['recesso', 'ferias'].includes(e.tipo_evento));

    let bgcolor = 'transparent';
    let color = isOutroMes ? 'text.disabled' : 'text.primary';
    let border = '1px solid transparent';

    if (isHoje) {
      border = '2px solid #1976d2';
    }

    if (!isOutroMes) {
      if (temFeriado) {
        bgcolor = '#ffebee';
      } else if (temRecesso) {
        bgcolor = '#fff3e0';
      } else if (isLetivo) {
        bgcolor = '#e8f5e9';
      } else if (isNaoLetivo) {
        bgcolor = '#f5f5f5';
      }
    }

    return {
      bgcolor,
      color,
      border,
      opacity: isOutroMes ? 0.5 : 1
    };
  };

  return (
    <Box>
      {/* Cabeçalho com navegação */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <IconButton onClick={onMesAnterior} size="small">
          <ChevronLeft />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {MESES[mes - 1]} {ano}
        </Typography>
        <IconButton onClick={onProximoMes} size="small">
          <ChevronRight />
        </IconButton>
      </Box>

      {/* Grade do calendário */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {/* Cabeçalho dos dias da semana */}
        {DIAS_SEMANA.map(dia => (
          <Box
            key={dia}
            sx={{
              textAlign: 'center',
              py: 1,
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'text.secondary',
              bgcolor: 'grey.100',
              borderRadius: '4px'
            }}
          >
            {dia}
          </Box>
        ))}

        {/* Dias do mês */}
        {dias.map((diaInfo, index) => {
          const eventosNoDia = eventosPorData[diaInfo.data] || [];
          const style = getDiaStyle(diaInfo);

          return (
            <Tooltip
              key={index}
              title={
                eventosNoDia.length > 0 ? (
                  <Box>
                    {eventosNoDia.slice(0, 3).map(e => (
                      <Typography key={e.id} variant="caption" display="block">
                        • {e.titulo}
                      </Typography>
                    ))}
                    {eventosNoDia.length > 3 && (
                      <Typography variant="caption" display="block">
                        +{eventosNoDia.length - 3} mais
                      </Typography>
                    )}
                  </Box>
                ) : ''
              }
              arrow
            >
              <Box
                onClick={() => diaInfo.mes === 'atual' && onDiaClick(diaInfo.data)}
                sx={{
                  minHeight: 80,
                  p: 0.5,
                  cursor: diaInfo.mes === 'atual' ? 'pointer' : 'default',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  ...style,
                  '&:hover': diaInfo.mes === 'atual' ? {
                    bgcolor: style.bgcolor === 'transparent' ? 'grey.100' : style.bgcolor,
                    transform: 'scale(1.02)',
                    boxShadow: 1
                  } : {}
                }}
              >
                {/* Número do dia */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: diaInfo.data === hoje ? 700 : 500,
                    mb: 0.5
                  }}
                >
                  {diaInfo.dia}
                </Typography>

                {/* Indicadores de eventos */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                  {eventosNoDia.slice(0, 3).map(evento => (
                    <Box
                      key={evento.id}
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: evento.cor
                      }}
                    />
                  ))}
                  {eventosNoDia.length > 3 && (
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                      +{eventosNoDia.length - 3}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Legenda */}
      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#e8f5e9', borderRadius: '4px' }} />
          <Typography variant="caption">Dia Letivo</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#ffebee', borderRadius: '4px' }} />
          <Typography variant="caption">Feriado</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#fff3e0', borderRadius: '4px' }} />
          <Typography variant="caption">Recesso/Férias</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#f5f5f5', borderRadius: '4px' }} />
          <Typography variant="caption">Não Letivo</Typography>
        </Box>
      </Box>
    </Box>
  );
}
