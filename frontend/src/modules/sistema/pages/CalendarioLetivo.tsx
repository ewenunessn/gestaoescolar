import { useState, useEffect } from "react";
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
} from "@mui/material";
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  CalendarMonth as CalendarIcon,
  MoreVert as MoreVertIcon,
  FileDownload as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from "@mui/icons-material";
import PageContainer from "../../../components/PageContainer";
import PageHeader from "../../../components/PageHeader";
import CalendarioMensal from "../../../components/CalendarioMensal";
import CriarEditarEventoDialog from "../../../components/CriarEditarEventoDialog";
import { useToast } from "../../../hooks/useToast";
import { usePeriodoAtivo } from "../../../hooks/queries/usePeriodosQueries";
import {
  buscarCalendarioLetivoAtivo,
  buscarCalendarioPorPeriodo,
  listarEventosPorMes,
  calcularDiasLetivos,
  importarFeriadosNacionais,
  criarEvento,
  atualizarEvento,
  excluirEvento,
  criarCalendarioLetivo,
  CalendarioLetivo as CalendarioLetivoType,
  EventoCalendario,
  getLabelsEventos
} from "../../../services/calendarioLetivo";

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
  const [mostrarEventosAntigos, setMostrarEventosAntigos] = useState(false);
  const [eventoParaExcluir, setEventoParaExcluir] = useState<EventoCalendario | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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
    // Se clicar no dia já selecionado, desseleciona
    if (diaSelecionado === data) {
      setDiaSelecionado(null);
      return;
    }
    
    setDiaSelecionado(data);
    // Navegar para o mês do dia clicado se necessário
    const [anoData, mesData] = data.split('-').map(Number);
    if (anoData !== ano || mesData !== mes) {
      setAno(anoData);
      setMes(mesData);
    }
  };

  const handleEventoClick = (evento: EventoCalendario) => {
    const dataEvento = evento.data_inicio.split('T')[0];
    handleDiaClick(dataEvento);
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

  const handleEditarEvento = (evento: EventoCalendario, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que o clique no botão editar acione o clique no item
    setEventoEditando(evento);
    setDialogEventoOpen(true);
  };

  const handleConfirmarExclusao = (evento: EventoCalendario, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que o clique no botão excluir acione o clique no item
    setEventoParaExcluir(evento);
    setConfirmDeleteOpen(true);
  };

  const handleExcluirEvento = async () => {
    if (!eventoParaExcluir) return;

    try {
      await excluirEvento(eventoParaExcluir.id);
      toast.successDelete('o evento');
      carregarEventosMes();
      setConfirmDeleteOpen(false);
      setEventoParaExcluir(null);
      // Se o dia selecionado não tiver mais eventos, desseleciona
      if (diaSelecionado) {
        const eventosRestantes = eventos.filter(e => 
          e.id !== eventoParaExcluir.id &&
          e.data_inicio.split('T')[0] === diaSelecionado
        );
        if (eventosRestantes.length === 0) {
          setDiaSelecionado(null);
        }
      }
    } catch (error) {
      toast.errorDelete('o evento');
    }
  };

  const eventosDoDia = diaSelecionado
    ? eventos.filter(e => {
        const dataInicio = e.data_inicio.split('T')[0];
        const dataFim = e.data_fim ? e.data_fim.split('T')[0] : dataInicio;
        return diaSelecionado >= dataInicio && diaSelecionado <= dataFim;
      })
    : [];

  // Filtrar eventos para lista geral (quando nenhum dia está selecionado)
  const hoje = new Date().toISOString().split('T')[0];
  const eventosListaGeral = eventos.filter(e => {
    const dataInicio = e.data_inicio.split("T")[0];
    if (mostrarEventosAntigos) {
      return true; // Mostrar todos
    }
    return dataInicio >= hoje; // Mostrar apenas futuros
  }).sort((a, b) => {
    // Ordenar por data
    return a.data_inicio.localeCompare(b.data_inicio);
  });

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

          {/* Card de eventos do dia selecionado ou lista geral */}
          {diaSelecionado ? (
            <Card sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Eventos de {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR')}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEventoEditando(null);
                    setDialogEventoOpen(true);
                  }}
                >
                  Adicionar
                </Button>
              </Box>

              {eventosDoDia.length > 0 ? (
                <List dense>
                  {eventosDoDia.map(evento => (
                    <ListItem
                      key={evento.id}
                      sx={{
                        borderLeft: `4px solid ${evento.cor}`,
                        mb: 1,
                        bgcolor: 'grey.50',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => handleEditarEvento(evento, e)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => handleConfirmarExclusao(evento, e)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      }
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
          ) : (
            <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', maxHeight: '600px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Próximos Eventos
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setMostrarEventosAntigos(!mostrarEventosAntigos)}
                >
                  {mostrarEventosAntigos ? 'Ocultar Antigos' : 'Ver Antigos'}
                </Button>
              </Box>

              {eventosListaGeral.length > 0 ? (
                <Box sx={{ overflowY: 'auto', flex: 1 }}>
                  <List dense>
                    {eventosListaGeral.map(evento => {
                      const dataInicio = evento.data_inicio.split('T')[0];
                      const [anoEvento, mesEvento, diaEvento] = dataInicio.split('-').map(Number);
                      const dataEvento = new Date(anoEvento, mesEvento - 1, diaEvento);
                      const isPast = dataInicio < hoje;
                      
                      return (
                        <ListItem
                          key={evento.id}
                          button
                          onClick={() => handleEventoClick(evento)}
                          sx={{
                            borderLeft: `4px solid ${evento.cor}`,
                            mb: 1,
                            bgcolor: isPast ? 'grey.100' : 'grey.50',
                            borderRadius: '4px',
                            opacity: isPast ? 0.7 : 1,
                            '&:hover': {
                              bgcolor: isPast ? 'grey.200' : 'grey.100',
                              transform: 'translateX(4px)',
                              transition: 'all 0.2s'
                            }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: '50px' }}>
                                  {dataEvento.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </Typography>
                                <Typography variant="body2" sx={{ flex: 1 }}>
                                  {evento.titulo}
                                </Typography>
                                <Chip
                                  label={labels[evento.tipo_evento as keyof typeof labels]}
                                  size="small"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                  {mostrarEventosAntigos ? 'Nenhum evento cadastrado' : 'Nenhum evento futuro'}
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
      {/* Dialog de confirmação de exclusão */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o evento "{eventoParaExcluir?.titulo}"?
          </Typography>
          {eventoParaExcluir && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={labels[eventoParaExcluir.tipo_evento as keyof typeof labels]}
                size="small"
                sx={{ mr: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {(() => {
                  const dataInicio = eventoParaExcluir.data_inicio.split('T')[0];
                  const [ano, mes, dia] = dataInicio.split('-').map(Number);
                  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
                })()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExcluirEvento} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
