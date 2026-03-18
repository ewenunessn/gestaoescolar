import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  CalendarMonth as CalendarIcon,
  MoreVert as MoreVertIcon,
  FileDownload as DownloadIcon
} from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import CalendarioMensal from '../components/CalendarioMensal';
import CriarEditarEventoDialog from '../components/CriarEditarEventoDialog';
import { useToast } from '../hooks/useToast';
import { usePeriodoAtivo } from '../hooks/queries/usePeriodosQueries';
import {
  buscarCalendarioLetivoAtivo,
  buscarCalendarioPorPeriodo,
  listarEventosPorMes,
  calcularDiasLetivos,
  importarFeriadosNacionais,
  criarEvento,
  atualizarEvento,
  criarCalendarioLetivo,
  CalendarioLetivo as CalendarioLetivoType,
  EventoCalendario,
  getLabelsEventos
} from '../services/calendarioLetivo';

export default function CalendarioLetivo() {
  const toast = useToast();
  const { data: periodoAtivo } = usePeriodoAtivo();
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [loading, setLoading] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [dialogEventoOpen, setDialogEventoOpen] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoCalendario | null>(null);

  // Definir ano baseado no período ativo
  useEffect(() => {
    if (periodoAtivo) {
      setAno(periodoAtivo.ano);
    }
  }, [periodoAtivo?.id]);

  // Carregar eventos quando ano ou mês mudar
  useEffect(() => {
    carregarEventosMes();
  }, [ano, mes]);

  const carregarEventosMes = async () => {
    try {
      setLoading(true);
      // Buscar eventos diretamente por ano/mês, sem precisar de calendário
      const eventosData = await listarEventosPorMes(0, ano, mes); // 0 = qualquer calendário
      setEventos(eventosData);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      setEventos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const handleProximoMes = () => {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const handleDiaClick = (data: string) => {
    setDiaSelecionado(data);
  };

  const handleImportarFeriados = async () => {
    try {
      await importarFeriadosNacionais(0, ano); // 0 = criar eventos sem calendário específico
      toast.successSave('os feriados nacionais');
      carregarEventosMes();
    } catch (error) {
      toast.errorSave('os feriados');
    }
    setMenuAnchor(null);
  };

  const handleSalvarEvento = async (eventoData: Partial<EventoCalendario>) => {
    try {
      // Adicionar ano ao evento
      const eventoComAno = {
        ...eventoData,
        ano_referencia: ano
      };
      
      if (eventoEditando) {
        await atualizarEvento(eventoEditando.id, eventoComAno);
        toast.successSave('o evento');
      } else {
        await criarEvento(eventoComAno);
        toast.successSave('o evento');
      }
      carregarEventosMes();
      setDialogEventoOpen(false);
      setEventoEditando(null);
    } catch (error) {
      toast.errorSave('o evento');
      throw error;
    }
  };

  const handleNovoEvento = () => {
    setEventoEditando(null);
    setDialogEventoOpen(true);
  };

  const eventosDoDia = diaSelecionado
    ? eventos.filter(e => {
        const dataInicio = e.data_inicio.split('T')[0];
        const dataFim = e.data_fim ? e.data_fim.split('T')[0] : dataInicio;
        return diaSelecionado >= dataInicio && diaSelecionado <= dataFim;
      })
    : [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const labels = getLabelsEventos();

  return (
    <PageContainer>
      <PageHeader
        title="Calendário Letivo"
        subtitle={`Ano ${ano}`}
      />

      <Grid container spacing={3}>
        {/* Coluna principal - Calendário */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 3 }}>
            {/* Barra de ações */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNovoEvento}
              >
                Novo Evento
              </Button>

              <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
                <MoreVertIcon />
              </IconButton>
            </Box>

            {/* Calendário */}
            <CalendarioMensal
              ano={ano}
              mes={mes}
              eventos={eventos}
              onMesAnterior={handleMesAnterior}
              onProximoMes={handleProximoMes}
              onDiaClick={handleDiaClick}
              diasLetivos={[]}
            />
          </Card>
        </Grid>

        {/* Coluna lateral - Informações e eventos */}
        <Grid item xs={12} lg={4}>
          {/* Card de eventos do ano */}
          <Card sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon />
              Eventos do Ano {ano}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Total de eventos cadastrados
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {eventos.length}
              </Typography>
            </Box>
          </Card>

          {/* Card de eventos do dia selecionado */}
          {diaSelecionado && (
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Eventos de {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR')}
              </Typography>

              {eventosDoDia.length > 0 ? (
                <List dense>
                  {eventosDoDia.map(evento => (
                    <ListItem
                      key={evento.id}
                      sx={{
                        borderLeft: `4px solid ${evento.cor}`,
                        mb: 1,
                        bgcolor: 'grey.50',
                        borderRadius: '4px'
                      }}
                    >
                      <ListItemText
                        primary={evento.titulo}
                        secondary={
                          <Box>
                            <Chip
                              label={labels[evento.tipo_evento as keyof typeof labels]}
                              size="small"
                              sx={{ mt: 0.5, fontSize: '0.7rem' }}
                            />
                            {evento.descricao && (
                              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                {evento.descricao}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                  Nenhum evento neste dia
                </Typography>
              )}
            </Card>
          )}

          {/* Card de resumo de eventos */}
          {!diaSelecionado && (
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Eventos do Mês
              </Typography>

              {eventos.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Object.entries(
                    eventos.reduce((acc, e) => {
                      acc[e.tipo_evento] = (acc[e.tipo_evento] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([tipo, count]) => (
                    <Box key={tipo} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">
                        {labels[tipo as keyof typeof labels]}
                      </Typography>
                      <Chip label={count} size="small" />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                  Nenhum evento neste mês
                </Typography>
              )}
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Menu de ações */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleImportarFeriados}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Importar Feriados Nacionais
        </MenuItem>
        <MenuItem onClick={() => {/* TODO: Exportar */}}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Exportar Calendário
        </MenuItem>
      </Menu>

      {/* Dialog de criar/editar evento */}
      <CriarEditarEventoDialog
        open={dialogEventoOpen}
        onClose={() => {
          setDialogEventoOpen(false);
          setEventoEditando(null);
        }}
        onSave={handleSalvarEvento}
        evento={eventoEditando}
        calendarioId={0}
        dataInicial={diaSelecionado || undefined}
      />
    </PageContainer>
  );
}
