import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  Print as PrintIcon,
  CalendarMonth,
  ViewWeek,
} from '@mui/icons-material';

import CalendarioMensal from './CalendarioMensal';
import CalendarioSemanalCardapio from './CalendarioSemanalCardapio';

interface EventoCalendario {
  id: number;
  titulo: string;
  tipo_evento: string;
  data_inicio: string;
  data_fim?: string;
  cor: string;
  descricao?: string;
  _refeicao?: {
    tipo_refeicao?: string;
  };
}

interface CalendarioProfissionalProps {
  ano: number;
  mes: number;
  eventos: EventoCalendario[];
  onMesAnterior: () => void;
  onProximoMes: () => void;
  onDiaClick: (data: string) => void;
  onEventoClick?: (evento: EventoCalendario) => void;
  onExportarCalendario?: () => void;
  onExportarFrequencia?: () => void;
  onRelatorioDetalhado?: () => void;
  onGerarPDFTabela?: () => void;
  readonly?: boolean;
}

type ViewType = 'month' | 'week';

const CalendarioProfissional: React.FC<CalendarioProfissionalProps> = ({
  ano, mes, eventos, onMesAnterior, onProximoMes, onDiaClick,
  onEventoClick, onExportarCalendario, onExportarFrequencia,
  onRelatorioDetalhado, onGerarPDFTabela, readonly = false,
}) => {
  const [view, setView] = useState<ViewType>('month');
  const [anchorElPdf, setAnchorElPdf] = useState<null | HTMLElement>(null);

  const totalRef = useMemo(
    () => eventos.filter(e => e.tipo_evento === 'refeicao').length,
    [eventos]
  );

  const monthLabel = useMemo(() => {
    const m = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${m[mes - 1]} ${ano}`;
  }, [ano, mes]);

  // Unique event types for legend
  const tiposLegend = useMemo(() => {
    const seen = new Set<string>();
    const labels: Record<string, string> = {
      refeicao: 'Refeicoes',
      feriado: 'Feriados',
      evento_escolar: 'Eventos Escolares',
      reuniao: 'Reunioes',
      formacao: 'Formacoes',
    };
    return eventos
      .filter(e => !seen.has(e.tipo_evento) && (seen.add(e.tipo_evento), true))
      .map(e => ({ tipo: e.tipo_evento, cor: e.cor, label: labels[e.tipo_evento] || e.tipo_evento }));
  }, [eventos]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ═══ TOOLBAR ═══ */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
      }}>
        {/* Month label + badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            {monthLabel}
          </Typography>
          <Chip
            label={`${totalRef} refeic${totalRef !== 1 ? 'oes' : 'ao'}`}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.65rem',
              fontWeight: 700,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          />
        </Box>

        {/* View toggles */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'action.hover',
          borderRadius: 1.5,
          p: 0.25,
          border: '1px solid',
          borderColor: 'divider',
        }}>
          <IconButton
            onClick={() => setView('month')}
            size="small"
            sx={{
              width: 32,
              height: 32,
              bgcolor: view === 'month' ? 'primary.main' : 'transparent',
              color: view === 'month' ? '#fff' : 'text.secondary',
              '&:hover': { bgcolor: view === 'month' ? 'primary.dark' : 'action.selected' },
              borderRadius: 1,
            }}
          >
            <CalendarMonth fontSize="small" />
          </IconButton>
          <IconButton
            onClick={() => setView('week')}
            size="small"
            sx={{
              width: 32,
              height: 32,
              bgcolor: view === 'week' ? 'primary.main' : 'transparent',
              color: view === 'week' ? '#fff' : 'text.secondary',
              '&:hover': { bgcolor: view === 'week' ? 'primary.dark' : 'action.selected' },
              borderRadius: 1,
            }}
          >
            <ViewWeek fontSize="small" />
          </IconButton>
        </Box>

        {/* PDF menu */}
        {(onExportarCalendario || onExportarFrequencia || onRelatorioDetalhado || onGerarPDFTabela) && (
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <IconButton
              onClick={(e) => setAnchorElPdf(anchorElPdf ? null : e.currentTarget)}
              size="small"
              sx={{
                width: 32,
                height: 32,
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
              title="Exportar PDF"
            >
              <PrintIcon fontSize="small" />
            </IconButton>
            {Boolean(anchorElPdf) && (
              <Paper
                sx={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  mt: 1,
                  minWidth: 210,
                  zIndex: 1300,
                  borderRadius: 1.5,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                }}
                onMouseLeave={() => setAnchorElPdf(null)}
              >
                <List sx={{ py: 0 }}>
                  {[
                    { fn: onExportarCalendario, label: 'Exportar Calendario' },
                    { fn: onExportarFrequencia, label: 'Exportar Frequencia' },
                    { fn: onRelatorioDetalhado, label: 'Relatorio Detalhado' },
                    { fn: onGerarPDFTabela, label: 'Gerar PDF Tabela' },
                  ]
                    .filter(x => x.fn)
                    .map((item, i) => (
                      <ListItem
                        key={i}
                        onClick={() => { item.fn?.(); setAnchorElPdf(null); }}
                        sx={{
                          py: 1.2,
                          px: 2,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <ListItemIcon>
                          <PrintIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 500 }}
                        />
                      </ListItem>
                    ))}
                </List>
              </Paper>
            )}
            {Boolean(anchorElPdf) && (
              <Box
                sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1299 }}
                onClick={() => setAnchorElPdf(null)}
              />
            )}
          </Box>
        )}
      </Box>

      {/* ═══ CALENDAR VIEW ═══ */}
      {view === 'week' ? (
        <CalendarioSemanalCardapio
          ano={ano}
          mes={mes}
          eventos={eventos}
          onDiaClick={onDiaClick}
          onEventoClick={onEventoClick}
          readonly={readonly}
        />
      ) : (
        <CalendarioMensal
          ano={ano}
          mes={mes}
          eventos={eventos}
          onDiaClick={onDiaClick}
          onEventoClick={onEventoClick}
          onMesAnterior={onMesAnterior}
          onProximoMes={onProximoMes}
          readonly={readonly}
        />
      )}

      {/* ═══ LEGEND ═══ */}
      {tiposLegend.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1, fontWeight: 600, fontSize: '0.7rem' }}>
            Legenda:
          </Typography>
          {tiposLegend.map(tipo => (
            <Chip
              key={tipo.tipo}
              label={tipo.label}
              size="small"
              sx={{
                bgcolor: tipo.cor,
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 600,
                height: 22,
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default CalendarioProfissional;
