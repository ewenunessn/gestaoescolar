import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';

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

interface CalendarioMensalProps {
  ano: number;
  mes: number;
  eventos: EventoCalendario[];
  onDiaClick: (data: string) => void;
  onEventoClick?: (evento: EventoCalendario) => void;
  readonly?: boolean;
  onMesAnterior?: () => void;
  onProximoMes?: () => void;
}

const ABV = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export default function CalendarioMensal({
  ano, mes, eventos, onDiaClick, onEventoClick, readonly,
  onMesAnterior, onProximoMes,
}: CalendarioMensalProps) {
  const { semanas, hojeStr, evtPorData } = useMemo(() => {
    /* Gerar o grid: semanas de DOM a SAB */
    const primeiro = new Date(ano, mes - 1, 1);
    const ultimo = new Date(ano, mes, 0).getDate();

    // Encontrar o domingo da primeira semana
    let ini = new Date(primeiro);
    ini.setDate(ini.getDate() - ini.getDay()); // dow: 0=dom, 1=seg, ... 6=sab

    const semanasOut: number[][] = [];
    const cur = new Date(ini);
    const ultimoDia = new Date(ano, mes, 0);

    // Gerar semanas completas (7 dias), mesmo com dias fora do mês
    while (cur <= ultimoDia) {
      const sem: number[] = [];
      for (let i = 0; i < 7; i++) {
        sem.push(cur.getMonth() === mes - 1 ? cur.getDate() : 0); // 0 = dia vazio
        cur.setDate(cur.getDate() + 1);
      }
      semanasOut.push(sem);
    }

    const hoje = new Date();
    const hojeS = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    // Eventos por data
    const porData: Record<string, EventoCalendario[]> = {};
    for (const e of eventos) {
      const ds = e.data_inicio.split('T')[0];
      if (!porData[ds]) porData[ds] = [];
      porData[ds].push(e);
      if (e.data_fim) {
        const ini = new Date(e.data_inicio);
        const fim = new Date(e.data_fim);
        for (let c = new Date(ini); c <= fim; c.setDate(c.getDate() + 1)) {
          const cs = c.toISOString().split('T')[0];
          if (!porData[cs]) porData[cs] = [];
          if (!porData[cs].find(x => x.id === e.id)) porData[cs].push(e);
        }
      }
    }

    return { semanas: semanasOut, hojeStr: hojeS, evtPorData: porData };
  }, [ano, mes, eventos]);

  const MES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <Box sx={{
      borderRadius: 2.5,
      overflow: 'hidden',
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
    }}>
      {/* ═══ HEADER ═══ */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2.5, py: 1.5,
        bgcolor: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>
          {MES[mes - 1]} {ano}
        </Typography>
        {(onMesAnterior || onProximoMes) && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Box
              onClick={() => onMesAnterior?.()}
              sx={{
                width: 28, height: 28, borderRadius: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
              }}
            >
              {/* prev */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </Box>
            <Box
              onClick={() => onProximoMes?.()}
              sx={{
                width: 28, height: 28, borderRadius: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
              }}
            >
              {/* next */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </Box>
          </Box>
        )}
      </Box>

      {/* ═══ DIAS DA SEMANA ═══ */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        bgcolor: 'action.hover',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        {ABV.map(abv => (
          <Typography
            key={abv}
            sx={{
              py: 0.8,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              color: 'text.secondary',
              borderRight: '1px solid',
              borderColor: 'divider',
              '&:last-child': { borderRight: 'none' },
            }}
          >
            {abv}
          </Typography>
        ))}
      </Box>

      {/* ═══ GRID ═══ */}
      {semanas.map((sem, si) => (
        <Box
          key={si}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {sem.map((dia, di) => {
            const isVazio = dia === 0;
            const dataStr = isVazio ? '' : `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const isHoje = !isVazio && dataStr === hojeStr;
            const eDia = !isVazio ? (evtPorData[dataStr] || []) : [];
            const temEvento = eDia.length > 0;

            if (isVazio) {
              return (
                <Box
                  key={di}
                  sx={{
                    minHeight: 100,
                    p: 0.75,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderRight: 'none' },
                    bgcolor: 'rgba(0,0,0,0.02)',
                    cursor: 'default',
                  }}
                />
              );
            }

            return (
              <Box
                key={di}
                onClick={() => !readonly && onDiaClick(dataStr)}
                sx={{
                  minHeight: 100,
                  p: 0.75,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderRight: 'none' },
                  bgcolor: isHoje ? 'rgba(46,160,67,0.08)' : 'transparent',
                  cursor: readonly ? 'default' : 'pointer',
                  transition: 'background 0.12s ease',
                  '&:hover': readonly ? {} : { bgcolor: 'rgba(255,255,255,0.03)' },
                  position: 'relative',
                }}
              >
                {temEvento && (
                  <Box sx={{
                    position: 'absolute',
                    left: 0, top: 8, bottom: 8,
                    width: '2px',
                    borderRadius: 1,
                    bgcolor: eDia[0]?.cor || '#666',
                  }} />
                )}

                <Box sx={{ display: 'flex', mb: 0.5 }}>
                  <Typography
                    sx={{
                      width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: isHoje ? 800 : 600,
                      fontSize: '0.72rem',
                      color: isHoje ? 'primary.contrastText' : 'text.primary',
                      bgcolor: isHoje ? 'primary.main' : 'transparent',
                      borderRadius: '50%',
                    }}
                  >
                    {dia}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {eDia.slice(0, 3).map(ev => {
                    const nome = ev.titulo.includes(':')
                      ? ev.titulo.split(':')[1].trim()
                      : ev.titulo;
                    return (
                      <Typography
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onEventoClick?.(ev); }}
                        sx={{
                          py: 0.25, px: 0.5,
                          borderRadius: 0.5,
                          bgcolor: ev.cor,
                          color: '#fff',
                          fontSize: '0.58rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          transition: 'all 0.12s ease',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          },
                        }}
                      >
                        {nome}
                      </Typography>
                    );
                  })}
                  {eDia.length > 3 && (
                    <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', fontWeight: 600, pl: 0.5 }}>
                      +{eDia.length - 3} mais
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
