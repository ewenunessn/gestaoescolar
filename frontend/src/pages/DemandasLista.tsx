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
  Pagination,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import demandasService from '../services/demandas';
import { listarEscolas } from '../services/escolas';
import { Demanda, STATUS_DEMANDA } from '../types/demanda';
import { formatarData } from '../utils/dateUtils';
import { DemandaDetalhesModal } from '../components';

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
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(10);
  const [demandasPaginadas, setDemandasPaginadas] = useState<Demanda[]>([]);

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
    setPaginaAtual(1);
    setLinhaSelecionada(-1);
  }, [demandasOriginais, filtroSolicitante, filtroObjeto, filtroStatus, filtroDataInicio, filtroDataFim]);

  // Calcular paginação
  const calcularPaginacao = useCallback(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const demandasDaPagina = demandas.slice(inicio, fim);
    setDemandasPaginadas(demandasDaPagina);
  }, [demandas, paginaAtual, itensPorPagina]);

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
    setPaginaAtual(1);
  };

  const handleMudancaPagina = (_: React.ChangeEvent<unknown>, novaPagina: number) => {
    setPaginaAtual(novaPagina);
    setLinhaSelecionada(-1); // Reset seleção ao mudar página
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
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Demandas Escolas e Anexos da SEMED
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNovaDemanda}
        >
          Nova Demanda (Ctrl+A)
        </Button>
      </Box>

      {erro && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3, boxShadow: 1 }}>
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" color="primary.main">
                Filtros de Busca
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={limparFiltros}
              sx={{ minWidth: 'auto' }}
            >
              Limpar Tudo (Ctrl+L)
            </Button>
          </Box>

          <Grid container spacing={2} alignItems="center">
            {/* Linha 1: Filtros principais */}
            <Grid item xs={12} md={3}>
              <Autocomplete
                freeSolo
                size="small"
                options={solicitantes}
                value={filtroSolicitante}
                onChange={(_, newValue) => setFiltroSolicitante(newValue || '')}
                onInputChange={(_, newInputValue) => setFiltroSolicitante(newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputRef={filtroSolicitanteRef}
                    label="Solicitante"
                    placeholder="Digite ou selecione..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'action.active', fontSize: 20 }} />
                        </InputAdornment>
                      )
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Buscar no Objeto"
                value={filtroObjeto}
                onChange={(e) => setFiltroObjeto(e.target.value)}
                placeholder="Palavras-chave..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'action.active', fontSize: 20 }} />
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
          </Grid>

          {/* Indicador de filtros ativos */}
          {(filtroSolicitante || filtroObjeto || filtroStatus || filtroDataInicio || filtroDataFim) && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Filtros ativos:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {filtroSolicitante && (
                  <Chip
                    label={`Solicitante: ${filtroSolicitante}`}
                    size="small"
                    onDelete={() => setFiltroSolicitante('')}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {filtroObjeto && (
                  <Chip
                    label={`Objeto: ${filtroObjeto}`}
                    size="small"
                    onDelete={() => setFiltroObjeto('')}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {filtroStatus && (
                  <Chip
                    label={`Status: ${filtroStatus}`}
                    size="small"
                    onDelete={() => setFiltroStatus('')}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {filtroDataInicio && (
                  <Chip
                    label={`De: ${new Date(filtroDataInicio).toLocaleDateString('pt-BR')}`}
                    size="small"
                    onDelete={() => setFiltroDataInicio('')}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {filtroDataFim && (
                  <Chip
                    label={`Até: ${new Date(filtroDataFim).toLocaleDateString('pt-BR')}`}
                    size="small"
                    onDelete={() => setFiltroDataFim('')}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold', minWidth: 200, width: 250 }}>Solicitante</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Nº Ofício</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Data Solicitação à SEMED</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Objeto</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Data Envio à SEMAD</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Data Resposta</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Tempo na SEMAD</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Visualizar</TableCell>
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
                  <TableCell sx={{ minWidth: 200, width: 250 }}>{demanda.escola_nome}</TableCell>
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

      {/* Paginação */}
      {demandas.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {Math.min((paginaAtual - 1) * itensPorPagina + 1, demandas.length)} a{' '}
            {Math.min(paginaAtual * itensPorPagina, demandas.length)} de {demandas.length} demandas
          </Typography>
          <Stack spacing={2}>
            <Pagination
              count={Math.ceil(demandas.length / itensPorPagina)}
              page={paginaAtual}
              onChange={handleMudancaPagina}
              color="primary"
              showFirstButton
              showLastButton
              size="medium"
            />
          </Stack>
        </Box>
      )}

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
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
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
