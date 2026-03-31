import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Box,
  Typography,
  IconButton,
  Button,
  ButtonGroup,
  Paper,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
  Toolbar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today as TodayIcon,
  CalendarMonth,
  ViewWeek,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Print as PrintIcon,
  FileDownload as ExportIcon
} from '@mui/icons-material';

// Importar estilos do React Big Calendar
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';

// Importar nossa visualização semanal customizada
import CalendarioSemanalCardapio from './CalendarioSemanalCardapio';

// Configurar localização para português brasileiro
const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Mensagens em português
const messages = {
  allDay: 'Dia inteiro',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Não há eventos neste período.',
  showMore: (total: number) => `+ Ver mais (${total})`
};

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

interface CalendarioProfissionalProps {
  ano: number;
  mes: number;
  eventos: EventoCalendario[];
  onMesAnterior: () => void;
  onProximoMes: () => void;
  onDiaClick: (data: string) => void;
  onEventoClick?: (evento: EventoCalendario) => void;
  onNovoEvento?: (data: Date) => void;
  onEditarEvento?: (evento: EventoCalendario) => void;
  onExcluirEvento?: (evento: EventoCalendario) => void;
  onPdfClick?: (e: React.MouseEvent<HTMLElement>) => void;
  readonly?: boolean;
}

interface BigCalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: EventoCalendario;
  allDay?: boolean;
}

const CalendarioProfissional: React.FC<CalendarioProfissionalProps> = ({
  ano,
  mes,
  eventos,
  onMesAnterior,
  onProximoMes,
  onDiaClick,
  onEventoClick,
  onNovoEvento,
  onEditarEvento,
  onExcluirEvento,
  onPdfClick,
  readonly = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date(ano, mes - 1, 1));
  const [selectedEvent, setSelectedEvent] = useState<EventoCalendario | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    evento?: EventoCalendario;
  } | null>(null);
  const [dialogNovoEvento, setDialogNovoEvento] = useState(false);
  const [novoEventoData, setNovoEventoData] = useState<Date | null>(null);

  // Sincronizar data do calendário com as props ano/mes
  React.useEffect(() => {
    setDate(new Date(ano, mes - 1, 1));
  }, [ano, mes]);

  // Garantir que apenas views válidas sejam usadas
  React.useEffect(() => {
    if (view !== Views.MONTH && view !== Views.WEEK) {
      setView(Views.MONTH);
    }
  }, [view]);

  // Converter eventos para formato do React Big Calendar
  const eventosFormatados = useMemo((): BigCalendarEvent[] => {
    return eventos.map(evento => {
      // Extrair ano, mês e dia da string sem considerar timezone
      const [anoInicio, mesInicio, diaInicio] = evento.data_inicio.split('T')[0].split('-').map(Number);
      const inicio = new Date(anoInicio, mesInicio - 1, diaInicio, 12, 0, 0); // Usar meio-dia para evitar problemas de timezone
      
      let fim: Date;
      if (evento.data_fim) {
        const [anoFim, mesFim, diaFim] = evento.data_fim.split('T')[0].split('-').map(Number);
        fim = new Date(anoFim, mesFim - 1, diaFim, 12, 0, 0);
      } else {
        fim = new Date(anoInicio, mesInicio - 1, diaInicio, 12, 0, 0);
      }
      
      return {
        id: evento.id,
        title: evento.titulo,
        start: inicio,
        end: fim,
        resource: evento,
        allDay: true // Sempre tratar como evento de dia inteiro para cardápios
      };
    });
  }, [eventos]);

  // Estilos customizados para eventos
  const eventStyleGetter = useCallback((event: BigCalendarEvent) => {
    const evento = event.resource;
    return {
      style: {
        backgroundColor: evento.cor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '12px',
        fontWeight: 500,
        padding: '2px 6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }
    };
  }, []);

  // Estilos para slots de data
  const dayPropGetter = useCallback((date: Date) => {
    const hoje = new Date();
    const isHoje = date.toDateString() === hoje.toDateString();
    const isFimDeSemana = date.getDay() === 0 || date.getDay() === 6;
    
    // Verificar se o dia pertence ao mês atual do cardápio
    const isOutroMes = date.getMonth() !== mes - 1 || date.getFullYear() !== ano;
    
    return {
      style: {
        backgroundColor: isHoje 
          ? theme.palette.primary.light + '20'
          : isFimDeSemana 
            ? theme.palette.error.light + '10'
            : 'transparent',
        opacity: isOutroMes ? 0.3 : 1, // Dias de outros meses ficam escuros
        pointerEvents: isOutroMes ? 'none' : 'auto', // Desabilita clique em dias de outros meses
        color: isOutroMes ? theme.palette.text.disabled : 'inherit'
      }
    };
  }, [theme, mes, ano]);

  // Navegação personalizada - DESABILITADA (calendário travado no mês)
  const handleNavigate = (newDate: Date, view: View, action: string) => {
    // Não permite navegação - calendário travado no mês do cardápio
    return;
  };

  // Clique em evento
  const handleSelectEvent = (event: BigCalendarEvent) => {
    if (onEventoClick) {
      onEventoClick(event.resource);
    }
  };

  // Clique em slot vazio
  const handleSelectSlot = ({ start }: { start: Date }) => {
    if (readonly) return;
    
    const dataStr = start.toISOString().split('T')[0];
    onDiaClick(dataStr);
    
    if (onNovoEvento) {
      setNovoEventoData(start);
      setDialogNovoEvento(true);
    }
  };

  // Menu de contexto
  const handleEventContextMenu = (event: BigCalendarEvent, e: React.MouseEvent) => {
    if (readonly) return;
    
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX - 2,
      mouseY: e.clientY - 4,
      evento: event.resource
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Toolbar customizada
  const CustomToolbar = ({ label, onNavigate, onView }: any) => {
    // Criar label personalizado baseado nas props ano/mes
    const labelPersonalizado = useMemo(() => {
      const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return `${meses[mes - 1]} ${ano}`;
    }, [ano, mes]);

    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: 2,
        flexWrap: 'wrap',
        gap: 2
      }}>
        {/* Título centralizado - sem navegação */}
        <Typography 
          variant={isMobile ? "h6" : "h5"} 
          sx={{ 
            fontWeight: 600, 
            color: 'text.primary',
            textAlign: 'center',
            flex: 1
          }}
        >
          {labelPersonalizado}
        </Typography>

        {/* Controles de visualização */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Seletor de período discreto */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: 'action.hover', 
            borderRadius: 1, 
            p: 0.3,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <IconButton
              onClick={() => onView(Views.MONTH)}
              size="small"
              sx={{ 
                minWidth: 28,
                height: 28,
                bgcolor: view === Views.MONTH ? 'primary.main' : 'transparent',
                color: view === Views.MONTH ? 'white' : 'text.secondary',
                '&:hover': { 
                  bgcolor: view === Views.MONTH ? 'primary.dark' : 'action.hover' 
                },
                borderRadius: 0.5
              }}
            >
              <CalendarMonth fontSize="small" />
            </IconButton>
            <IconButton
              onClick={() => onView(Views.WEEK)}
              size="small"
              sx={{ 
                minWidth: 28,
                height: 28,
                bgcolor: view === Views.WEEK ? 'primary.main' : 'transparent',
                color: view === Views.WEEK ? 'white' : 'text.secondary',
                '&:hover': { 
                  bgcolor: view === Views.WEEK ? 'primary.dark' : 'action.hover' 
                },
                borderRadius: 0.5
              }}
            >
              <ViewWeek fontSize="small" />
            </IconButton>
          </Box>

          {onPdfClick && (
            <IconButton 
              onClick={onPdfClick} 
              color="primary"
              sx={{ ml: 1 }}
            >
              <PrintIcon />
            </IconButton>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
        {/* Renderizar visualização customizada para semana */}
        {view === Views.WEEK ? (
          <Box>
            {/* Toolbar customizada para visualização semanal */}
            <CustomToolbar 
              label="" 
              onNavigate={(action: string) => {
                if (action === 'PREV') onMesAnterior();
                else if (action === 'NEXT') onProximoMes();
              }}
              onView={setView}
            />
            
            {/* Nossa visualização semanal customizada */}
            <CalendarioSemanalCardapio
              ano={ano}
              mes={mes}
              eventos={eventos}
              onDiaClick={onDiaClick}
              onEventoClick={onEventoClick}
              readonly={readonly}
            />
          </Box>
        ) : (
          <Box sx={{ height: isMobile ? 400 : 600 }}>
            <Calendar
              localizer={localizer}
              events={eventosFormatados}
              startAccessor="start"
              endAccessor="end"
              titleAccessor="title"
              allDayAccessor="allDay"
              resourceAccessor="resource"
              view={view}
              onView={setView}
              date={date}
              onNavigate={handleNavigate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable={!readonly}
              popup
              popupOffset={30}
              eventPropGetter={eventStyleGetter}
              dayPropGetter={dayPropGetter}
              messages={messages}
              culture="pt-BR"
              showMultiDayTimes={false}
              step={60}
              timeslots={1}
              components={{
                toolbar: CustomToolbar
              }}
              formats={{
                monthHeaderFormat: 'MMMM yyyy',
                dayHeaderFormat: 'EEEE dd/MM',
                dayRangeHeaderFormat: ({ start, end }) => 
                  `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM yyyy', { locale: ptBR })}`
              }}
              style={{
                height: '100%',
                fontFamily: theme.typography.fontFamily
              }}
            />
          </Box>
        )}

        {/* Legenda de tipos de evento */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1, 
          mt: 2, 
          pt: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider' 
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
            Legenda:
          </Typography>
          {Array.from(new Set(eventos.map(e => e.tipo_evento))).map(tipo => {
            const evento = eventos.find(e => e.tipo_evento === tipo);
            const labels: Record<string, string> = {
              'refeicao': 'Refeições',
              'feriado': 'Feriados',
              'evento_escolar': 'Eventos Escolares',
              'reuniao': 'Reuniões',
              'formacao': 'Formações'
            };
            
            return (
              <Chip
                key={tipo}
                label={labels[tipo] || tipo}
                size="small"
                sx={{
                  bgcolor: evento?.cor,
                  color: 'white',
                  fontSize: '0.7rem'
                }}
              />
            );
          })}
        </Box>
      </Paper>

      {/* Menu de contexto */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem 
          onClick={() => {
            if (contextMenu?.evento && onEditarEvento) {
              onEditarEvento(contextMenu.evento);
            }
            handleCloseContextMenu();
          }}
        >
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Editar
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (contextMenu?.evento && onExcluirEvento) {
              onExcluirEvento(contextMenu.evento);
            }
            handleCloseContextMenu();
          }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Excluir
        </MenuItem>
      </Menu>

      {/* Dialog para novo evento */}
      <Dialog 
        open={dialogNovoEvento} 
        onClose={() => setDialogNovoEvento(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Novo Evento</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Título do Evento"
              fullWidth
              variant="outlined"
            />
            <TextField
              label="Data"
              type="date"
              fullWidth
              variant="outlined"
              value={novoEventoData ? novoEventoData.toISOString().split('T')[0] : ''}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Evento</InputLabel>
              <Select label="Tipo de Evento">
                <MenuItem value="refeicao">Refeição</MenuItem>
                <MenuItem value="evento_escolar">Evento Escolar</MenuItem>
                <MenuItem value="reuniao">Reunião</MenuItem>
                <MenuItem value="formacao">Formação</MenuItem>
                <MenuItem value="feriado">Feriado</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Descrição"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNovoEvento(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained"
            onClick={() => {
              if (onNovoEvento && novoEventoData) {
                onNovoEvento(novoEventoData);
              }
              setDialogNovoEvento(false);
            }}
          >
            Criar Evento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarioProfissional;