import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

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

interface CalendarioCardapioProps {
  ano: number;
  mes: number;
  eventos: EventoCalendario[];
  onMesAnterior: () => void;
  onProximoMes: () => void;
  onDiaClick: (data: string) => void;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function CalendarioCardapio({
  ano,
  mes,
  eventos,
  onMesAnterior,
  onProximoMes,
  onDiaClick
}: CalendarioCardapioProps) {
  
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
    const eventosNoDia = eventosPorData[data] || [];
    const temFeriado = eventosNoDia.some(e => e.tipo_evento.includes('feriado'));
    const temRecesso = eventosNoDia.some(e => ['recesso', 'ferias'].includes(e.tipo_evento));

    let bgcolor = 'transparent';
    let color = isOutroMes ? 'text.disabled' : 'text.primary';
    let border = '1px solid #e0e0e0';

    if (isHoje) {
      border = '2px solid #1976d2';
    }

    if (!isOutroMes) {
      if (temFeriado) {
        bgcolor = '#ffebee';
      } else if (temRecesso) {
        bgcolor = '#fff3e0';
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
          const refeicoesNoDia = eventosNoDia.filter(e => e.tipo_evento === 'refeicao');
          const outrosEventos = eventosNoDia.filter(e => e.tipo_evento !== 'refeicao');
          const style = getDiaStyle(diaInfo);

          return (
            <Tooltip
              key={index}
              title={
                eventosNoDia.length > 0 ? (
                  <Box>
                    {eventosNoDia.map(e => (
                      <Typography key={e.id} variant="caption" display="block">
                        • {e.titulo}
                      </Typography>
                    ))}
                  </Box>
                ) : ''
              }
              arrow
            >
              <Box
                onClick={() => diaInfo.mes === 'atual' && onDiaClick(diaInfo.data)}
                sx={{
                  minHeight: 100,
                  p: 0.5,
                  cursor: diaInfo.mes === 'atual' ? 'pointer' : 'default',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  ...style,
                  '&:hover': diaInfo.mes === 'atual' ? {
                    bgcolor: style.bgcolor === 'transparent' ? 'grey.100' : style.bgcolor,
                    transform: 'scale(1.02)',
                    boxShadow: 1
                  } : {},
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Número do dia */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: diaInfo.data === hoje ? 700 : 500,
                    mb: 0.5,
                    fontSize: '0.875rem'
                  }}
                >
                  {diaInfo.dia}
                </Typography>

                {/* Refeições com texto */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25, overflow: 'hidden' }}>
                  {refeicoesNoDia.slice(0, 3).map(refeicao => {
                    // Extrair apenas o nome da refeição (depois do ":")
                    const nomeRefeicao = refeicao.titulo.includes(':') 
                      ? refeicao.titulo.split(':')[1].trim() 
                      : refeicao.titulo;
                    
                    return (
                      <Box
                        key={refeicao.id}
                        sx={{
                          bgcolor: refeicao.cor,
                          color: 'white',
                          px: 0.5,
                          py: 0.25,
                          borderRadius: '3px',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.2
                        }}
                      >
                        {nomeRefeicao}
                      </Box>
                    );
                  })}
                  {refeicoesNoDia.length > 3 && (
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', textAlign: 'center' }}>
                      +{refeicoesNoDia.length - 3} mais
                    </Typography>
                  )}
                </Box>

                {/* Indicadores de outros eventos */}
                {outrosEventos.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.5 }}>
                    {outrosEventos.slice(0, 3).map(evento => (
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
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
