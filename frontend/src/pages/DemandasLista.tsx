import { useState, useEffect, useRef, useCallback } from 'react';
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
  InputAdornment,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import demandasService from '../services/demandas';
import { listarEscolas } from '../services/escolas';
import { Demanda, STATUS_DEMANDA } from '../types/demanda';
import { formatarData } from '../utils/dateUtils';
import { DemandaDetalhesModal, LoadingScreen } from '../components';

export default function DemandasLista() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [demandasOriginais, setDemandasOriginais] = useState<Demanda[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
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
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [demandaSelecionada, setDemandaSelecionada] = useState<number | undefined>();
  const [modalExcluir, setModalExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Formulário inline
  const [modoEdicao, setModoEdicao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalCamposAdicionais, setModalCamposAdicionais] = useState(false);
  const [formData, setFormData] = useState({
    escola_solicitante: '',
    numero_oficio: '',
    data_solicitacao: new Date().toISOString().split('T')[0],
    objeto: '',
    descricao_itens: '',
    observacoes: ''
  });

  // Navegação por teclado
  const [linhaSelecionada, setLinhaSelecionada] = useState<number>(-1);

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [demandasPaginadas, setDemandasPaginadas] = useState<Demanda[]>([]);

  // Controle de visibilidade dos filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em um campo
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl + A: Adicionar nova demanda
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        handleNovaDemanda();
        return;
      }

      // Ctrl + F: Focar no filtro de solicitante
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        filtroSolicitanteRef.current?.focus();
        return;
      }

      // Ctrl + L: Limpar filtros
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        limparFiltros();
        return;
      }

      // ESC: Fechar modal ou cancelar edição
      if (e.key === 'Escape') {
        if (modalDetalhes) {
          setModalDetalhes(false);
        } else if (modalExcluir) {
          setModalExcluir(false);
        } else if (modoEdicao) {
          handleCancelarEdicao();
        } else if (modalCamposAdicionais) {
          setModalCamposAdicionais(false);
        }
        return;
      }

      // Navegação com setas (apenas se não estiver em modo edição)
      if (!modoEdicao && !modalDetalhes && !modalCamposAdicionais) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setLinhaSelecionada(prev => Math.min(prev + 1, demandasPaginadas.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setLinhaSelecionada(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && linhaSelecionada >= 0) {
          e.preventDefault();
          handleVisualizarDemanda(demandasPaginadas[linhaSelecionada].id);
        }
      }

      // Atalhos para demanda selecionada
      if (linhaSelecionada >= 0 && demandasPaginadas[linhaSelecionada] && !modoEdicao) {
        const demandaSelecionadaAtual = demandasPaginadas[linhaSelecionada];

        // Ctrl + E: Enviar para SEMAD (apenas se pendente)
        if (e.ctrlKey && e.key === 'e' && demandaSelecionadaAtual.status === 'pendente') {
          e.preventDefault();
          handleVisualizarDemanda(demandaSelecionadaAtual.id);
          // O modal de detalhes terá a ação de enviar
        }

        // Ctrl + R: Recusar (apenas se pendente)
        if (e.ctrlKey && e.key === 'r' && demandaSelecionadaAtual.status === 'pendente') {
          e.preventDefault();
          handleVisualizarDemanda(demandaSelecionadaAtual.id);
          // O modal de detalhes terá a ação de recusar
        }

        // Ctrl + Delete: Excluir demanda
        if (e.ctrlKey && e.key === 'Delete') {
          e.preventDefault();
          setDemandaSelecionada(demandaSelecionadaAtual.id);
          setModalExcluir(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [demandasPaginadas, linhaSelecionada, modoEdicao, modalDetalhes, modalCamposAdicionais, modalExcluir]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [demandasData, escolasData, solicitantesData] = await Promise.all([
        demandasService.listar(),
        listarEscolas(),
        demandasService.listarSolicitantes()
      ]);
      setDemandasOriginais(demandasData);
      setDemandas(demandasData);
      setEscolas(escolasData);
      setSolicitantes(solicitantesData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setErro('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Filtro local em tempo real
  const filtrarDemandas = useCallback(() => {
    let demandasFiltradas = [...demandasOriginais];

    // Filtro por solicitante
    if (filtroSolicitante) {
      demandasFiltradas = demandasFiltradas.filter(demanda =>
        demanda.escola_nome.toLowerCase().includes(filtroSolicitante.toLowerCase())
      );
    }

    // Filtro por objeto
    if (filtroObjeto) {
      demandasFiltradas = demandasFiltradas.filter(demanda =>
        demanda.objeto.toLowerCase().includes(filtroObjeto.toLowerCase())
      );
    }

    // Filtro por status
    if (filtroStatus) {
      demandasFiltradas = demandasFiltradas.filter(demanda =>
        demanda.status === filtroStatus
      );
    }

    // Filtro por data início
    if (filtroDataInicio) {
      demandasFiltradas = demandasFiltradas.filter(demanda =>
        new Date(demanda.data_solicitacao) >= new Date(filtroDataInicio)
      );
    }

    // Filtro por data fim
    if (filtroDataFim) {
      demandasFiltradas = demandasFiltradas.filter(demanda =>
        new Date(demanda.data_solicitacao) <= new Date(filtroDataFim)
      );
    }

    setDemandas(demandasFiltradas);
    // Reset página e linha selecionada quando filtros mudarem
    setPage(0);
    setLinhaSelecionada(-1);
  }, [demandasOriginais, filtroSolicitante, filtroObjeto, filtroStatus, filtroDataInicio, filtroDataFim]);

  // Calcular paginação
  const calcularPaginacao = useCallback(() => {
    const inicio = page * rowsPerPage;
    const fim = inicio + rowsPerPage;
    const demandasDaPagina = demandas.slice(inicio, fim);
    setDemandasPaginadas(demandasDaPagina);
  }, [demandas, page, rowsPerPage]);

  // Aplicar filtros sempre que os filtros mudarem
  useEffect(() => {
    if (demandasOriginais.length > 0) {
      filtrarDemandas();
    }
  }, [filtrarDemandas, demandasOriginais]);

  // Calcular paginação sempre que demandas ou página mudarem
  useEffect(() => {
    calcularPaginacao();
  }, [calcularPaginacao]);



  const limparFiltros = () => {
    setFiltroSolicitante('');
    setFiltroObjeto('');
    setFiltroStatus('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setDemandas(demandasOriginais);
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
    setLinhaSelecionada(-1); // Reset seleção ao mudar página
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    setLinhaSelecionada(-1);
  };

  const handleNovaDemanda = () => {
    setFormData({
      escola_solicitante: '',
      numero_oficio: '',
      data_solicitacao: new Date().toISOString().split('T')[0],
      objeto: '',
      descricao_itens: '',
      observacoes: ''
    });
    setModoEdicao(true);
  };

  const handleCancelarEdicao = () => {
    setModoEdicao(false);
    setFormData({
      escola_solicitante: '',
      numero_oficio: '',
      data_solicitacao: new Date().toISOString().split('T')[0],
      objeto: '',
      descricao_itens: '',
      observacoes: ''
    });
  };

  const handleSalvarDemanda = async () => {
    // Se não tem descrição, abrir modal para campos adicionais
    if (!formData.descricao_itens.trim()) {
      setModalCamposAdicionais(true);
      return;
    }

    try {
      setSalvando(true);

      // Encontrar a escola selecionada ou usar o texto digitado
      const escolaSelecionada = escolas.find(escola => escola.nome === formData.escola_solicitante);

      const dados = {
        escola_id: escolaSelecionada?.id || null,
        escola_nome: formData.escola_solicitante,
        numero_oficio: formData.numero_oficio,
        data_solicitacao: formData.data_solicitacao,
        objeto: formData.objeto,
        descricao_itens: formData.descricao_itens,
        observacoes: formData.observacoes
      };

      await demandasService.criar(dados);
      setModoEdicao(false);
      setModalCamposAdicionais(false);
      await carregarDados();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setErro(error.response?.data?.message || 'Erro ao salvar demanda');
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarComCamposAdicionais = async () => {
    setModalCamposAdicionais(false);
    await handleSalvarDemanda();
  };

  const handleChangeForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Tab' && nextFieldRef?.current) {
      e.preventDefault();
      nextFieldRef.current.focus();
    }
    if (e.key === 'Escape') {
      handleCancelarEdicao();
    }
  };

  const handleVisualizarDemanda = (id: number) => {
    setDemandaSelecionada(id);
    setModalDetalhes(true);
  };

  const handleExcluirDemanda = async () => {
    if (!demandaSelecionada) return;

    try {
      setExcluindo(true);
      await demandasService.excluir(demandaSelecionada);
      setModalExcluir(false);
      await carregarDados();
      setLinhaSelecionada(-1); // Reset seleção
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      setErro(error.response?.data?.message || 'Erro ao excluir demanda');
    } finally {
      setExcluindo(false);
    }
  };





  // Refs para navegação com Tab
  const numeroOficioRef = useRef<HTMLInputElement>(null);
  const dataSolicitacaoRef = useRef<HTMLInputElement>(null);
  const objetoRef = useRef<HTMLInputElement>(null);
  const filtroSolicitanteRef = useRef<HTMLInputElement>(null);

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
    return <LoadingScreen message="Carregando demandas..." />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {erro && (
        <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
          <Alert severity="error" onClose={() => setErro('')}>
            {erro}
          </Alert>
        </Box>
      )}

      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>
          Gerenciamento de Demandas
        </Typography>
        
        <Card sx={{ borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 3 }}>
            <Autocomplete
              freeSolo
              size="small"
              options={solicitantes}
              value={filtroSolicitante}
              onChange={(_, newValue) => setFiltroSolicitante(newValue || '')}
              onInputChange={(_, newInputValue) => setFiltroSolicitante(newInputValue)}
              sx={{ flex: 1, minWidth: '200px' }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={filtroSolicitanteRef}
                  placeholder="Buscar por solicitante..."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }}
                />
              )}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant={mostrarFiltros ? "contained" : "outlined"}
                startIcon={<FilterListIcon />} 
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
              >
                Filtros
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={handleNovaDemanda}
              >
                Nova Demanda
              </Button>
            </Box>
          </Box>
          
          {/* Filtros Avançados - Mostrar apenas quando ativado */}
          {mostrarFiltros && (
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Buscar no Objeto"
                    value={filtroObjeto}
                    onChange={(e) => setFiltroObjeto(e.target.value)}
                    placeholder="Palavras-chave..."
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

                <Grid item xs={12} md={3}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={limparFiltros}
                    fullWidth
                  >
                    Limpar Filtros
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {`Mostrando ${Math.min(page * rowsPerPage + 1, demandas.length)}-${Math.min((page + 1) * rowsPerPage, demandas.length)} de ${demandas.length} demandas`}
          </Typography>
        </Card>

        {loading ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography>Carregando...</Typography>
            </CardContent>
          </Card>
        ) : demandasPaginadas.length === 0 && !modoEdicao ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                Nenhuma demanda encontrada
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}>
            <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, minWidth: 200, width: 250 }}>Solicitante</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Nº Ofício</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Data Solicitação</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Objeto</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Data Envio SEMAD</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Data Resposta</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Tempo SEMAD</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Linha de formulário para nova demanda */}
            {modoEdicao && (
              <TableRow sx={{ bgcolor: 'rgba(25, 118, 210, 0.04)' }}>
                <TableCell sx={{ py: 1, minWidth: 200, width: 250 }}>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={escolas.map(escola => escola.nome)}
                    value={formData.escola_solicitante}
                    onChange={(_, newValue) => handleChangeForm('escola_solicitante', newValue || '')}
                    onInputChange={(_, newInputValue) => handleChangeForm('escola_solicitante', newInputValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Escola solicitante"
                        variant="outlined"
                        size="small"
                        onKeyDown={(e) => handleKeyDown(e, numeroOficioRef)}
                        autoFocus
                      />
                    )}
                  />
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  <TextField
                    inputRef={numeroOficioRef}
                    size="small"
                    placeholder="Nº Ofício"
                    value={formData.numero_oficio}
                    onChange={(e) => handleChangeForm('numero_oficio', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, dataSolicitacaoRef)}
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  <TextField
                    inputRef={dataSolicitacaoRef}
                    size="small"
                    type="date"
                    value={formData.data_solicitacao}
                    onChange={(e) => handleChangeForm('data_solicitacao', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, objetoRef)}
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  <TextField
                    inputRef={objetoRef}
                    size="small"
                    placeholder="Objeto da solicitação"
                    value={formData.objeto}
                    onChange={(e) => handleChangeForm('objeto', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSalvarDemanda();
                      }
                    }}
                    multiline
                    maxRows={3}
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    -
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    -
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    -
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1 }}>
                  <Chip label="Pendente" color="warning" size="small" />
                </TableCell>
                <TableCell align="center" sx={{ py: 1 }}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={handleSalvarDemanda}
                    disabled={salvando || !formData.escola_solicitante || !formData.numero_oficio || !formData.objeto}
                    title="Salvar"
                  >
                    <SaveIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={handleCancelarEdicao}
                    disabled={salvando}
                    title="Cancelar"
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            )}

            {demandasPaginadas.length === 0 && !modoEdicao ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Nenhuma demanda encontrada
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              demandasPaginadas.map((demanda, index) => (
                <TableRow
                  key={demanda.id}
                  hover
                  sx={{
                    backgroundColor: linhaSelecionada === index ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                    cursor: 'pointer'
                  }}
                  onClick={() => setLinhaSelecionada(index)}
                >
                  <TableCell sx={{ minWidth: 200, width: 250 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusIndicator status={demanda.status} size="small" />
                      <Typography variant="body2">{demanda.escola_nome}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{demanda.numero_oficio}</TableCell>
                  <TableCell>{formatarData(demanda.data_solicitacao)}</TableCell>
                  <TableCell sx={{ maxWidth: 300, minWidth: 250 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.4
                      }}
                    >
                      {demanda.objeto}
                    </Typography>
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

            <TablePagination
              component="div"
              count={demandas.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Itens por página:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
        </Paper>
        )}
      </Box>

      {/* Modal de Detalhes */}
      <DemandaDetalhesModal
        open={modalDetalhes}
        onClose={() => setModalDetalhes(false)}
        onRefresh={carregarDados}
        demandaId={demandaSelecionada}
      />

      {/* Modal de Confirmação de Exclusão */}
      <Dialog
        open={modalExcluir}
        onClose={() => setModalExcluir(false)}
        maxWidth="sm"
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !excluindo) {
            e.preventDefault();
            e.stopPropagation();
            handleExcluirDemanda();
          }
        }}
      >
        <DialogTitle>Excluir Demanda</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Tem certeza que deseja excluir esta demanda? Esta ação não pode ser desfeita.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Pressione Enter para confirmar ou Esc para cancelar
          </Typography>
          {demandaSelecionada && demandasPaginadas.find(d => d.id === demandaSelecionada) && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {demandasPaginadas.find(d => d.id === demandaSelecionada)?.escola_nome}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ofício: {demandasPaginadas.find(d => d.id === demandaSelecionada)?.numero_oficio}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Objeto: {demandasPaginadas.find(d => d.id === demandaSelecionada)?.objeto}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalExcluir(false)} disabled={excluindo}>
            Cancelar
          </Button>
          <Button
            onClick={handleExcluirDemanda}
            variant="contained"
            color="error"
            disabled={excluindo}
          >
            {excluindo ? 'Excluindo...' : 'Confirmar Exclusão (Enter)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para campos adicionais */}
      <Dialog open={modalCamposAdicionais} onClose={() => setModalCamposAdicionais(false)} maxWidth="md" fullWidth>
        <DialogTitle>Campos Adicionais</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            required
            multiline
            rows={4}
            label="Descrição de Itens"
            value={formData.descricao_itens}
            onChange={(e) => handleChangeForm('descricao_itens', e.target.value)}
            placeholder="Ex: Aquisição de Fogão Industrial 6 (seis) bocas"
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Observações"
            value={formData.observacoes}
            onChange={(e) => handleChangeForm('observacoes', e.target.value)}
            placeholder="Informações adicionais (opcional)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalCamposAdicionais(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvarComCamposAdicionais}
            variant="contained"
            disabled={salvando || !formData.descricao_itens.trim()}
            startIcon={<SaveIcon />}
          >
            {salvando ? 'Salvando...' : 'Salvar Demanda'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
