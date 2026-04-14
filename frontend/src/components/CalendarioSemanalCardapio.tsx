import React, { useMemo, useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import {
  LocalCafe as CafeIcon,
  LunchDining as LunchIcon,
  RestaurantMenu as DinnerIcon,
  Cookie as SnackIcon,
  Restaurant as RestaurantIcon,
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

interface Props {
  ano: number;
  mes: number;
  eventos: EventoCalendario[];
  onDiaClick: (data: string) => void;
  onEventoClick?: (evento: EventoCalendario) => void;
  readonly?: boolean;
}

const ICO: Record<string, React.ReactElement> = {
  refeicao: <LunchIcon fontSize="small" />,
  lanche: <SnackIcon fontSize="small" />,
  cafe_manha: <CafeIcon fontSize="small" />,
  ceia: <DinnerIcon fontSize="small" />,
  almoco: <LunchIcon fontSize="small" />,
  lanche_manha: <SnackIcon fontSize="small" />,
  lanche_tarde: <SnackIcon fontSize="small" />,
  jantar: <DinnerIcon fontSize="small" />,
};

const ABV = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MES = [
  'Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export default function CalendarioSemanalCardapio({
  ano, mes, eventos, onDiaClick, onEventoClick,
}: Props) {
  const [sem, setSem] = useState(0);
  const [tipos, setTipos] = useState<{ k: string; l: string; icon: React.ReactElement }[]>([]);

  // Carregar tipos
  useEffect(() => {
    (async () => {
      try {
        const r = await carregarTiposRefeicao();
        const f = Object.entries(r).map(([k, l]) => ({
          k, l, icon: ICO[k] || <RestaurantIcon fontSize="small" />,
        }));
        setTipos(f);
      } catch {
        setTipos([
          { k: 'cafe_manha', l: 'Cafe da Manha', icon: <CafeIcon fontSize="small" /> },
          { k: 'lanche', l: 'Lanche', icon: <SnackIcon fontSize="small" /> },
          { k: 'refeicao', l: 'Refeicao', icon: <LunchIcon fontSize="small" /> },
          { k: 'ceia', l: 'Ceia', icon: <DinnerIcon fontSize="small" /> },
        ]);
      }
    })();
  }, []);

  // Gerar semanas (DOM-SAB)
  const semanas = useMemo(() => {
    const primeiro = new Date(ano, mes - 1, 1);
    const ultimo = new Date(ano, mes, 0);
    const out: Date[][] = [];

    // Encontrar o domingo da primeira semana
    let ini = new Date(primeiro);
    ini.setDate(ini.getDate() - ini.getDay());

    while (ini <= ultimo) {
      const s: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(ini);
        d.setDate(d.getDate() + i);
        s.push(d);
      }
      out.push(s);
      ini.setDate(ini.getDate() + 7);
    }

    // Remove trailing week if all dates past last day
    while (out.length > 1 && out[out.length - 1][0] > ultimo) out.pop();

    return out;
  }, [ano, mes]);

  // Eventos por data
  const porData = useMemo(() => {
    const m: Record<string, EventoCalendario[]> = {};
    for (const e of eventos) {
      const ds = e.data_inicio.split('T')[0];
      if (!m[ds]) m[ds] = [];
      m[ds].push(e);
      if (e.data_fim) {
        const ini = new Date(e.data_inicio);
        const fim = new Date(e.data_fim);
        for (let c = new Date(ini); c <= fim; c.setDate(c.getDate() + 1)) {
          const cs = c.toISOString().split('T')[0];
          if (!m[cs]) m[cs] = [];
          if (!m[cs].find(x => x.id === e.id)) m[cs].push(e);
        }
      }
    }
    return m;
  }, [eventos]);

  const hojeStr = new Date().toISOString().split('T')[0];
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const nav = (dir: 'ant' | 'prox') => {
    if (dir === 'ant') setSem((s) => Math.max(0, s - 1));
    else setSem((s) => Math.min(semanas.length - 1, s + 1));
  };

  useEffect(() => { setSem(0); }, [ano, mes]);

  const wk = semanas[sem];
  const dias = wk ? wk.filter((d) => d.getMonth() === mes - 1) : [];
  if (!wk || dias.length === 0 || tipos.length === 0) return null;

  const nRef = dias.reduce(
    (n, d) => n + (porData[fmt(d)] || []).filter((e) => e.tipo_evento === 'refeicao').length, 0
  );

  return (
    <Box sx={{
      borderRadius: 2.5,
      overflow: 'hidden',
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
    }}>
      {/* ═══ NAV BAR ═══ */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2.5,
        py: 1.2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Prev */}
          <Box
            onClick={() => sem > 0 && nav('ant')}
            sx={{
              width: 30, height: 30, borderRadius: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: sem === 0 ? 'default' : 'pointer',
              opacity: sem === 0 ? 0.25 : 1,
              color: 'text.secondary',
              '&:hover': sem > 0 ? { bgcolor: 'action.selected', color: 'text.primary' } : {},
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.2 }}>
              {dias[0].getDate()} - {dias[dias.length - 1].getDate()} de {MES[mes - 1]?.slice(0, 3)} {ano}
            </Typography>
            <Chip
              label={`${nRef} refeico${nRef !== 1 ? 'es' : 'es'}`}
              size="small"
              variant="outlined"
              sx={{ height: 16, fontSize: '0.58rem', color: 'text.secondary', borderColor: 'divider', mt: 0.3 }}
            />
          </Box>

          {/* Next */}
          <Box
            onClick={() => sem < semanas.length - 1 && nav('prox')}
            sx={{
              width: 30, height: 30, borderRadius: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: sem === semanas.length - 1 ? 'default' : 'pointer',
              opacity: sem === semanas.length - 1 ? 0.25 : 1,
              color: 'text.secondary',
              '&:hover': sem < semanas.length - 1 ? { bgcolor: 'action.selected', color: 'text.primary' } : {},
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Box>
        </Box>

        {/* Week dots */}
        <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center' }}>
          {semanas.map((_, i) => (
            <Box
              key={i}
              onClick={() => setSem(i)}
              sx={{
                width: i === sem ? 18 : 5,
                height: 5,
                borderRadius: 3,
                bgcolor: i === sem ? 'primary.main' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* ═══ TABLE ═══ */}
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '2px',
            minWidth: 600,
          }}
        >
          <thead>
            <tr>
              <th style={{
                padding: '10px 12px',
                textAlign: 'left',
                verticalAlign: 'bottom',
                minWidth: 120,
              }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.6rem', color: 'text.secondary', letterSpacing: '.08em' }}>
                  PREPARACAO
                </Typography>
              </th>
              {dias.map((d, i) => {
                const h = fmt(d) === hojeStr;
                return (
                  <th key={i} style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'bottom' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.58rem', color: 'text.secondary', letterSpacing: '.08em', display: 'block' }}>
                      {ABV[d.getDay()]}
                    </Typography>
                    <Typography sx={{ fontWeight: h ? 800 : 600, fontSize: h ? '1.05rem' : '0.92rem', color: h ? 'primary.main' : 'text.primary' }}>
                      {d.getDate()}
                    </Typography>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {tipos.map((tp) => {
              // Count total items in this row for the week
              const countSem = dias.reduce((n, d) => {
                const e = (porData[fmt(d)] || []).filter(
                  (ev) => ev.tipo_evento === 'refeicao' && ev._refeicao?.tipo_refeicao === tp.k
                );
                return n + e.length;
              }, 0);
              // Skip row if no meals this week
              if (countSem === 0) return null;

              return (
                <tr key={tp.k} style={{ verticalAlign: 'top' }}>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 16 } }}>
                        {tp.icon}
                      </Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.74rem' }}>
                        {tp.l}
                      </Typography>
                    </Box>
                  </td>
                  {dias.map((d, di) => {
                    const evts = (porData[fmt(d)] || []).filter(
                      (e) => e.tipo_evento === 'refeicao' && e._refeicao?.tipo_refeicao === tp.k
                    );
                    return (
                      <td
                        key={di}
                        onClick={() => onDiaClick(fmt(d))}
                        style={{
                          padding: '8px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          cursor: 'pointer',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                      >
                        {evts.length === 0 ? (
                          <Typography sx={{ color: 'text.disabled', fontSize: '.7rem', fontStyle: 'italic' }}>
                            &mdash;
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                            {evts.map((e, ei) => {
                              const nome = e.titulo.includes(':') ? e.titulo.split(':')[1].trim() : e.titulo;
                              return (
                                <Chip
                                  key={ei}
                                  label={nome}
                                  size="small"
                                  title={nome}
                                  onClick={(ev) => { ev.stopPropagation(); onEventoClick?.(e); }}
                                  sx={{
                                    bgcolor: e.cor,
                                    color: '#fff',
                                    fontSize: '0.62rem',
                                    height: 22,
                                    borderRadius: 1,
                                    width: '100%',
                                    maxWidth: '100%',
                                    justifyContent: 'flex-start',
                                    '& .MuiChip-label': { 
                                      px: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    },
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                    transition: 'all 0.12s ease',
                                    '&:hover': { transform: 'scale(1.02)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' },
                                  }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </Box>
      </Box>
    </Box>
  );
}
