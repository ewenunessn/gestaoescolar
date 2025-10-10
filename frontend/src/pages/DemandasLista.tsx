import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import demandasService from '../services/demandas';
import { listarEscolas } from '../services/escolas';
import { Demanda, STATUS_DEMANDA } from '../types/demanda';
import { formatarData } from '../utils/dateUtils';
import { DemandaFormModal, DemandaDetalhesModal } from '../components';

export default function DemandasLista() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [solicitantes, setSolicitantes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Filtros
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [filtroObjeto, setFiltroObjeto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // Modais
  const [modalForm, setModalForm] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [demandaSelecionada, setDemandaSelecionada] = useState<number | undefined>();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [demandasData, , solicitantesData] = await Promise.all([
        demandasService.listar(),
        listarEscolas(), // Mantido para compatibilidade, mas não usado
        demandasService.listarSolicitantes()
      ]);
      setDemandas(demandasData);
      setSolicitantes(solicitantesData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setErro('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      const demandas = await demandasService.listar({
        escola_nome: filtroSolicitante || undefined,
        objeto: filtroObjeto || undefined,
        status: filtroStatus || undefined,
        data_inicio: filtroDataInicio || undefined,
        data_fim: filtroDataFim || undefined
      });
      setDemandas(demandas);
    } catch (error: any) {
      console.error('Erro ao filtrar:', error);
      setErro('Erro ao aplicar filtros');
    } finally {
      setLoading(false);
    }
  };

  const limparFiltros = () => {
    setFiltroSolicitante('');
    setFiltroObjeto('');
    setFiltroStatus('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    carregarDados();
  };

  const handleNovaDemanda = () => {
    setDemandaSelecionada(undefined);
    setModalForm(true);
  };

  const handleVisualizarDemanda = (id: number) => {
    setDemandaSelecionada(id);
    setModalDetalhes(true);
  };



  const handleSuccessForm = () => {
    carregarDados();
  };

  const getStatusChip = (status: string) => {
    const statusInfo = STATUS_DEMANDA[status as keyof typeof STATUS_DEMANDA];
    return (
      <Chip
        label={statusInfo?.label || status}
        color={statusInfo?.color as any || 'default'}
        size="small"
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Demandas Escolas e Anexos da SEMED
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNovaDemanda}
        >
          Nova Demanda
        </Button>
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterListIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Filtros</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Solicitante</InputLabel>
                <Select
                  value={filtroSolicitante}
                  onChange={(e) => setFiltroSolicitante(e.target.value)}
                  label="Solicitante"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {solicitantes.map((solicitante) => (
                    <MenuItem key={solicitante} value={solicitante}>
                      {solicitante}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Buscar no Objeto"
                value={filtroObjeto}
                onChange={(e) => setFiltroObjeto(e.target.value)}
                placeholder="Digite palavras-chave..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'action.active' }} />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="enviado_semead">Enviado à SEMAD</MenuItem>
                  <MenuItem value="atendido">Atendido</MenuItem>
                  <MenuItem value="nao_atendido">Não Atendido</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Data Início"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Data Fim"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={aplicarFiltros}
                  fullWidth
                >
                  Filtrar
                </Button>
                <Button
                  variant="outlined"
                  onClick={limparFiltros}
                  fullWidth
                >
                  Limpar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Solicitante</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nº Ofício</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Data Solicitação à SEMED</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Objeto</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Data Envio à SEMAD</TableCell>

              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Data Resposta</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Tempo na SEMAD</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Visualizar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {demandas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Nenhuma demanda encontrada
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              demandas.map((demanda) => (
                <TableRow key={demanda.id} hover>
                  <TableCell>{demanda.escola_nome}</TableCell>
                  <TableCell>{demanda.numero_oficio}</TableCell>
                  <TableCell>{formatarData(demanda.data_solicitacao)}</TableCell>
                  <TableCell>
                    <Tooltip
                      title={
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxWidth: 400 }}>
                          {demanda.objeto}
                        </Typography>
                      }
                      arrow
                      placement="top"
                      enterDelay={500}
                    >
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          maxWidth: 200,
                          cursor: 'help',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: 'primary.main'
                          }
                        }}
                      >
                        {demanda.objeto}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{formatarData(demanda.data_semead)}</TableCell>

                  <TableCell>
                    {demanda.data_resposta_semead ? formatarData(demanda.data_resposta_semead) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    {demanda.dias_solicitacao !== null ? (
                      <Chip label={`${demanda.dias_solicitacao} dias`} size="small" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {getStatusChip(demanda.status)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleVisualizarDemanda(demanda.id)}
                      title="Visualizar"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de Formulário */}
      <DemandaFormModal
        open={modalForm}
        onClose={() => setModalForm(false)}
        onSuccess={handleSuccessForm}
        demandaId={demandaSelecionada}
      />

      {/* Modal de Detalhes */}
      <DemandaDetalhesModal
        open={modalDetalhes}
        onClose={() => setModalDetalhes(false)}
        onRefresh={carregarDados}
        demandaId={demandaSelecionada}
      />
    </Box>
  );
}
