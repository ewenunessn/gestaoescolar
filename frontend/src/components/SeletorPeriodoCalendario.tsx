import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, Tooltip,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

export interface Periodo {
  data_inicio: string; // YYYY-MM-DD
  data_fim: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (periodo: Periodo) => void;
  periodosExistentes?: Periodo[]; // para bloquear sobreposição
  competencia?: string; // YYYY-MM — restringe ao mês
  titulo?: string;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function toDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function SeletorPeriodoCalendario({ open, onClose, onConfirm, periodosExistentes = [], competencia, titulo }: Props) {
  // Mês exibido
  const hoje = new Date();
  const initYear = competencia ? Number(competencia.split('-')[0]) : hoje.getFullYear();
  const initMonth = competencia ? Number(competencia.split('-')[1]) - 1 : hoje.getMonth();

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [selecting, setSelecting] = useState<Date | null>(null); // primeiro clique
  const [hovered, setHovered] = useState<Date | null>(null);
  const [confirmed, setConfirmed] = useState<Periodo | null>(null);

  // Reset ao abrir
  const handleOpen = () => {
    setViewYear(initYear);
    setViewMonth(initMonth);
    setSelecting(null);
    setHovered(null);
    setConfirmed(null);
  };

  // Dias bloqueados (já em algum período existente)
  const blockedDates = useMemo(() => {
    const set = new Set<string>();
    for (const p of periodosExistentes) {
      const start = toDate(p.data_inicio);
      const end = toDate(p.data_fim);
      const cur = new Date(start);
      while (cur <= end) {
        set.add(fmt(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return set;
  }, [periodosExistentes]);

  // Gerar dias do mês
  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const result: (Date | null)[] = [];
    // padding início
    for (let i = 0; i < first.getDay(); i++) result.push(null);
    for (let d = 1; d <= last.getDate(); d++) result.push(new Date(viewYear, viewMonth, d));
    return result;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Restrição ao mês da competência
  const isOutsideCompetencia = (d: Date) => {
    if (!competencia) return false;
    return d.getFullYear() !== initYear || d.getMonth() !== initMonth;
  };

  const isBlocked = (d: Date) => blockedDates.has(fmt(d));

  // Range selecionado (durante hover ou confirmado)
  const rangeStart = selecting;
  const rangeEnd = hovered;
  const getRange = (): [Date, Date] | null => {
    if (!rangeStart) return null;
    const end = rangeEnd || rangeStart;
    return rangeStart <= end ? [rangeStart, end] : [end, rangeStart];
  };

  const isInRange = (d: Date) => {
    const r = getRange();
    if (!r) return false;
    return d >= r[0] && d <= r[1];
  };
  const isRangeStart = (d: Date) => { const r = getRange(); return r ? sameDay(d, r[0]) : false; };
  const isRangeEnd = (d: Date) => { const r = getRange(); return r ? sameDay(d, r[1]) : false; };

  // Períodos existentes para highlight
  const isExisting = (d: Date) => {
    for (const p of periodosExistentes) {
      const s = toDate(p.data_inicio), e = toDate(p.data_fim);
      if (d >= s && d <= e) return true;
    }
    return false;
  };

  const handleDayClick = (d: Date) => {
    if (isBlocked(d) || isOutsideCompetencia(d)) return;
    if (!selecting) {
      setSelecting(d);
      setHovered(d);
    } else {
      // segundo clique — confirmar range
      const r = getRange()!;
      // verificar se algum dia do range está bloqueado
      const cur = new Date(r[0]);
      let hasBlocked = false;
      while (cur <= r[1]) {
        if (isBlocked(cur)) { hasBlocked = true; break; }
        cur.setDate(cur.getDate() + 1);
      }
      if (hasBlocked) {
        // resetar seleção
        setSelecting(null);
        setHovered(null);
        return;
      }
      setConfirmed({ data_inicio: fmt(r[0]), data_fim: fmt(r[1]) });
      setSelecting(null);
      setHovered(null);
    }
  };

  const handleConfirm = () => {
    if (confirmed) { onConfirm(confirmed); onClose(); }
  };

  const mesNome = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth TransitionProps={{ onEnter: handleOpen }}>
      <DialogTitle sx={{ pb: 0.5 }}>{titulo || 'Selecionar Período'}</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        {/* Legenda */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
          {periodosExistentes.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#cbd5e1' }} />
              <Typography variant="caption">Já selecionado</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#38b6ff' }} />
            <Typography variant="caption">Selecionando</Typography>
          </Box>
          {confirmed && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: '#1fa3f0' }} />
              <Typography variant="caption">
                {confirmed.data_inicio} → {confirmed.data_fim}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Navegação mês */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <IconButton size="small" onClick={prevMonth} disabled={!!competencia && viewMonth === initMonth && viewYear === initYear}>
            <ChevronLeft fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{mesNome}</Typography>
          <IconButton size="small" onClick={nextMonth} disabled={!!competencia && viewMonth === initMonth && viewYear === initYear}>
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>

        {/* Grid dias semana */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25, mb: 0.5 }}>
          {DIAS_SEMANA.map(d => (
            <Typography key={d} variant="caption" align="center" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem' }}>
              {d}
            </Typography>
          ))}
        </Box>

        {/* Grid dias */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25 }}>
          {days.map((day, i) => {
            if (!day) return <Box key={`empty-${i}`} />;
            const blocked = isBlocked(day) || isOutsideCompetencia(day);
            const existing = isExisting(day);
            const inRange = isInRange(day);
            const isStart = isRangeStart(day);
            const isEnd = isRangeEnd(day);
            const isConfirmedDay = confirmed
              ? day >= toDate(confirmed.data_inicio) && day <= toDate(confirmed.data_fim)
              : false;

            let bg = 'transparent';
            let color = 'text.primary';
            let borderRadius = '4px';

            if (blocked || existing) { bg = '#e2e8f0'; color = 'text.disabled'; }
            if (isConfirmedDay) { bg = '#1fa3f0'; color = '#fff'; }
            if (inRange && !isConfirmedDay) { bg = '#bae6fd'; }
            if ((isStart || isEnd) && !isConfirmedDay) { bg = '#38b6ff'; color = '#fff'; }
            if (isStart) borderRadius = '4px 0 0 4px';
            if (isEnd) borderRadius = '0 4px 4px 0';
            if (isStart && isEnd) borderRadius = '4px';

            return (
              <Tooltip key={fmt(day)} title={blocked ? 'Período já ocupado' : ''} disableHoverListener={!blocked}>
                <Box
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => selecting && !blocked && setHovered(day)}
                  sx={{
                    height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: bg, borderRadius,
                    cursor: blocked ? 'not-allowed' : 'pointer',
                    '&:hover': !blocked ? { bgcolor: inRange ? '#7dd3fc' : '#e0f2fe' } : {},
                    transition: 'background 0.1s',
                  }}
                >
                  <Typography variant="caption" sx={{ color, fontWeight: isStart || isEnd || isConfirmedDay ? 700 : 400, fontSize: '0.75rem' }}>
                    {day.getDate()}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        {selecting && (
          <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            Clique no dia final do período
          </Typography>
        )}
        {!selecting && !confirmed && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            Clique no dia inicial do período
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color={'add' as any} onClick={handleConfirm} disabled={!confirmed}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
