import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../contexts/PageTitleContext';
import { useToast } from '../hooks/useToast';
import CalculoDetalhadoModal from '../components/CalculoDetalhadoModal';
import SeletorPeriodoCalendario from '../components/SeletorPeriodoCalendario';
import SelecionarContratosDialog from '../components/SelecionarContratosDialog';
import { toNum } from '../utils/formatters';
import {
  Box,
  Card,
  Button,
  Typography,
  Grid,
  TextField,
  Autocomplete,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  School as SchoolIcon,
  Inventory as InventoryIcon,
  TableChart as TableChartIcon,
  CalendarMonth as CalendarIcon,
  ShoppingCart as ShoppingCartIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import PageContainer from '../components/PageContainer';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import { listarEscolas } from '../services/escolas';

interface Escola {
  id: number;
  nome: string;
  ativo: boolean;
}
import {
  calcularDemandaPorCompetencia,
  gerarGuiasDemanda,
  gerarPedidosPorPeriodo,
  gerarPedidoDaGuia,
  CalculoDemandaResponse,
  PeriodoGerarPedido,
  GerarGuiasResponse,
  GerarPedidoDaGuiaResponse,
} from '../services/planejamentoCompras';
import { guiaService } from '../services/guiaService';

export default function PlanejamentoCompras() {
  const { setPageTitle } = usePageTitle();
  const toast = useToast();
  const navigate = useNavigate();

  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<Escola[]>([]);
  const [competencia, setCompetencia] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [gerandoPedidos, setGerandoPedidos] = useState(false);
  const [resultado, setResultado] = useState<CalculoDemandaResponse | null>(null);
  const [tabAtiva, setTabAtiva] = useState(0);
  const [modalCalculo, setModalCalculo] = useState<{ open: boolean; produto: any; escola: any }>({
    open: false, produto: null, escola: null
  });

  const [gerandoGuias, setGerandoGuias] = useState(false);
  const [resultadoGuias, setResultadoGuias] = useState<GerarGuiasResponse | null>(null);
  // Períodos para geração de pedidos
  const [periodos, setPeriodos] = useState<PeriodoGerarPedido[]>([]);
  const [resultadoGeracao, setResultadoGeracao] = useState<any>(null);
  const [seletorOpen, setSeletorOpen] = useState(false);

  // Estados para seleção de contratos
  const [produtosMultiplosContratos, setProdutosMultiplosContratos] = useState<any[]>([]);
  const [dialogSelecaoContratos, setDialogSelecaoContratos] = useState(false);
  const [contratosSelecionados, setContratosSelecionados] = useState<any[]>([]);

  // Gerar pedido da guia
  const [guias, setGuias] = useState<any[]>([]);
  const [guiaSelecionada, setGuiaSelecionada] = useState<any | null>(null);
  const [gerandoPedidoGuia, setGerandoPedidoGuia] = useState(false);
  const [resultadoPedidoGuia, setResultadoPedidoGuia] = useState<GerarPedidoDaGuiaResponse | null>(null);

  useEffect(() => {
    setPageTitle('Planejamento de Compras');
    carregarDados();
  }, [setPageTitle]);

  async function carregarDados() {
    setLoading(true);
    try {
      const [escolasData, guiasData] = await Promise.all([
        listarEscolas(),
        guiaService.listarGuias(),
      ]);
      setEscolas(escolasData.filter((e: any) => e.ativo));
      // Ordenar guias mais recentes primeiro
      const guiasOrdenadas = (guiasData?.data ?? guiasData ?? []).sort((a: any, b: any) => {
        if (a.ano !== b.ano) return b.ano - a.ano;
        return b.mes - a.mes;
      });
      setGuias(guiasOrdenadas);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  }

  // Gerar lista de competências (últimos 12 meses + próximos 3)
  function gerarCompetencias() {
    const competencias = [];
    const hoje = new Date();
    
    for (let i = -12; i <= 3; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const mesNome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      competencias.push({
        valor: `${ano}-${mes}`,
        label: mesNome.charAt(0).toUpperCase() + mesNome.slice(1)
      });
    }
    
    return competencias;
  }

  // Quando competência muda, resetar períodos
  useEffect(() => {
    if (competencia) {
      const [ano, mes] = competencia.split('-').map(Number);
      const primeiroDia = new Date(ano, mes - 1, 1);
      const ultimoDia = new Date(ano, mes, 0);
      setDataInicio(primeiroDia);
      setDataFim(ultimoDia);
      setPeriodos([]);
      setResultadoGeracao(null);
    }
  }, [competencia]);

  function adicionarPeriodo() {
    if (!competencia) return;
    const [ano, mes] = competencia.split('-').map(Number);
    const primeiroDia = new Date(ano, mes - 1, 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setPeriodos(prev => [...prev, { data_inicio: fmt(primeiroDia), data_fim: fmt(primeiroDia) }]);
  }

  function removerPeriodo(idx: number) {
    setPeriodos(prev => prev.filter((_, i) => i !== idx));
  }

  function atualizarPeriodo(idx: number, campo: keyof PeriodoGerarPedido, valor: string) {
    setPeriodos(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));
  }

  async function handleGerarPedidoDaGuia() {
    if (!guiaSelecionada) return;
    setGerandoPedidoGuia(true);
    setResultadoPedidoGuia(null);
    try {
      const res = await gerarPedidoDaGuia(
        guiaSelecionada.id,
        contratosSelecionados.length > 0 ? contratosSelecionados : undefined
      );
      
      // Se requer seleção de contratos, abrir dialog
      if (res.requer_selecao) {
        setProdutosMultiplosContratos(res.produtos_multiplos_contratos || []);
        setDialogSelecaoContratos(true);
        toast.info('Seleção necessária', res.mensagem || 'Selecione os contratos para continuar');
        return;
      }
      
      setResultadoPedidoGuia(res);
      if (res.total_criados > 0) {
        toast.success('Pedido gerado', `Pedido ${res.pedidos_criados[0].numero} criado com sucesso`);
        // Limpar seleção após sucesso
        setContratosSelecionados([]);
        setProdutosMultiplosContratos([]);
      } else {
        toast.error('Erro', res.erros?.[0]?.motivo || 'Nenhum pedido criado');
      }
    } catch (error: any) {
      toast.error('Erro', error.response?.data?.error || 'Não foi possível gerar o pedido');
    } finally {
      setGerandoPedidoGuia(false);
    }
  }

  async function handleGerarGuias() {
    if (!competencia || periodos.length === 0) {
      toast.warning('Atenção', 'Defina a competência e ao menos um período');
      return;
    }
    setGerandoGuias(true);
    setResultadoGuias(null);
    try {
      const res = await gerarGuiasDemanda(
        competencia,
        periodos,
        escolasSelecionadas.length > 0 ? escolasSelecionadas.map(e => e.id) : undefined
      );
      setResultadoGuias(res);
      if (res.total_criadas > 0) {
        toast.success('Guias geradas', `${res.total_criadas} guia(s) de demanda criada(s) com sucesso`);
      } else {
        const motivos = res.erros?.map((e) => e.motivo).join('; ') || 'Verifique os erros abaixo';
        toast.error('Nenhuma guia criada', motivos);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Não foi possível gerar as guias';
      toast.error('Erro', msg);
    } finally {
      setGerandoGuias(false);
    }
  }

  async function handleGerarPedidos() {
    if (!competencia || periodos.length === 0) {
      toast.warning('Atenção', 'Defina a competência e ao menos um período');
      return;
    }
    setGerandoPedidos(true);
    setResultadoGeracao(null);
    try {
      const res = await gerarPedidosPorPeriodo(
        competencia,
        periodos,
        escolasSelecionadas.length > 0 ? escolasSelecionadas.map(e => e.id) : undefined,
        contratosSelecionados.length > 0 ? contratosSelecionados : undefined
      );
      
      // Se requer seleção de contratos, abrir dialog
      if (res.requer_selecao) {
        setProdutosMultiplosContratos(res.produtos_multiplos_contratos || []);
        setDialogSelecaoContratos(true);
        toast.info('Seleção necessária', res.mensagem || 'Selecione os contratos para continuar');
        return;
      }
      
      setResultadoGeracao(res);
      if (res.total_criados > 0) {
        toast.success('Pedidos gerados', `${res.total_criados} pedido(s) criado(s) com sucesso`);
        // Limpar seleção após sucesso
        setContratosSelecionados([]);
        setProdutosMultiplosContratos([]);
      } else {
        const motivos = res.erros?.map((e: any) => e.motivo).join('; ') || 'Verifique os erros abaixo';
        toast.error('Nenhum pedido criado', motivos);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Não foi possível gerar os pedidos';
      toast.error('Erro', msg);
    } finally {
      setGerandoPedidos(false);
    }
  }

  const handleConfirmarSelecaoContratos = (selecao: { produto_id: number; contrato_produto_id: number; quantidade?: number }[]) => {
    setContratosSelecionados(selecao);
    setDialogSelecaoContratos(false);
    // Tentar gerar pedidos novamente com a seleção
    // Verificar qual função estava sendo executada
    if (guiaSelecionada) {
      setTimeout(() => handleGerarPedidoDaGuia(), 100);
    } else {
      setTimeout(() => handleGerarPedidos(), 100);
    }
  };

  const handleCancelarSelecaoContratos = () => {
    setDialogSelecaoContratos(false);
    setProdutosMultiplosContratos([]);
    setContratosSelecionados([]);
  };

  async function handleCalcular() {
    if (!competencia) {
      toast.warning('Atenção', 'Selecione a competência');
      return;
    }

    if (!dataInicio || !dataFim) {
      toast.warning('Atenção', 'Selecione o período');
      return;
    }

    setCalculando(true);
    try {
      const dataInicioStr = dataInicio.toISOString().split('T')[0];
      const dataFimStr = dataFim.toISOString().split('T')[0];
      
      console.log('Enviando:', { competencia, dataInicioStr, dataFimStr });

      const resultado = await calcularDemandaPorCompetencia(
        competencia,
        dataInicioStr,
        dataFimStr,
        escolasSelecionadas.length > 0 ? escolasSelecionadas.map(e => e.id) : undefined
      );

      setResultado(resultado);
      toast.success('Sucesso!', 'Demanda calculada com sucesso');
    } catch (error: any) {
      console.error('Erro ao calcular demanda:', error);
      const mensagem = error.response?.data?.detalhes || error.response?.data?.error || 'Não foi possível calcular a demanda';
      toast.error('Erro', mensagem);
    } finally {
      setCalculando(false);
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const competencias = gerarCompetencias();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <PageContainer>
        <PageBreadcrumbs
          items={[
            { label: 'Compras', path: '/compras' },
            { label: 'Planejamento de Compras' }
          ]}
        />

        <Grid container spacing={2}>
          {/* Seleção de Competência e Período */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon />
                Seleção de Competência e Período
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Competência</InputLabel>
                    <Select
                      value={competencia}
                      onChange={(e) => setCompetencia(e.target.value)}
                      label="Competência"
                    >
                      {competencias.map((comp) => (
                        <MenuItem key={comp.valor} value={comp.valor}>
                          {comp.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4}>
                  <DatePicker
                    label="Data Início"
                    value={dataInicio}
                    onChange={(newValue) => setDataInicio(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                    disabled={!competencia}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <DatePicker
                    label="Data Fim"
                    value={dataFim}
                    onChange={(newValue) => setDataFim(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                    disabled={!competencia}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    options={escolas}
                    getOptionLabel={(option) => option.nome}
                    renderInput={(params) => (
                      <TextField {...params} label="Filtrar Escolas (opcional)" placeholder="Todas as escolas" />
                    )}
                    value={escolasSelecionadas}
                    onChange={(e, value) => setEscolasSelecionadas(value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={calculando ? <CircularProgress size={20} /> : <CalculateIcon />}
                    onClick={handleCalcular}
                    disabled={calculando || !competencia || !dataInicio || !dataFim}
                    fullWidth
                    sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
                  >
                    {calculando ? 'Calculando...' : 'Calcular Demanda'}
                  </Button>
                </Grid>
              </Grid>
            </Card>
          </Grid>

          {/* Resultados */}
          {resultado && (
            <Grid item xs={12}>
              <Card sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Resultado do Planejamento</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {resultado.escolas_total} escola(s)
                  </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  Período: {new Date(resultado.periodo.data_inicio).toLocaleDateString('pt-BR')} até{' '}
                  {new Date(resultado.periodo.data_fim).toLocaleDateString('pt-BR')}
                </Alert>

                <Tabs value={tabAtiva} onChange={(e, newValue) => setTabAtiva(newValue)} sx={{ mb: 2 }}>
                  <Tab label="Por Escola" icon={<SchoolIcon />} iconPosition="start" />
                  <Tab label="Por Produto" icon={<InventoryIcon />} iconPosition="start" />
                  <Tab label="Consolidado" icon={<TableChartIcon />} iconPosition="start" />
                </Tabs>

                {/* Tab 0: Por Escola */}
                {tabAtiva === 0 && (
                  <Box>
                    {resultado.demanda_por_escola.map((escola) => (
                      <Card key={`${escola.escola_id}-${escola.modalidade_id}`} sx={{ mb: 2, p: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          {escola.escola_nome}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          {escola.modalidade_nome} • {escola.numero_alunos} alunos
                        </Typography>

                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Produto</TableCell>
                                <TableCell align="right">Quantidade (kg)</TableCell>
                                <TableCell align="center" width={60}>Cálculo</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {escola.produtos.map((prod) => (
                                <TableRow key={prod.produto_id}>
                                  <TableCell>{prod.produto_nome}</TableCell>
                                  <TableCell align="right">
                                    {prod.quantidade_embalagens ? (
                                      <>
                                        <strong>{prod.quantidade_embalagens}</strong> {prod.unidade}
                                        <span style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '8px' }}>
                                          ({toNum(prod.quantidade_kg).toFixed(2)}kg)
                                        </span>
                                      </>
                                    ) : (
                                      `${toNum(prod.quantidade_kg).toFixed(2)} kg`
                                    )}
                                  </TableCell>
                                  <TableCell align="center">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => setModalCalculo({
                                        open: true,
                                        produto: prod,
                                        escola: {
                                          escola_nome: escola.escola_nome,
                                          modalidade_nome: escola.modalidade_nome
                                        }
                                      })}
                                      title="Ver detalhes do cálculo"
                                    >
                                      <CalculateIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Card>
                    ))}
                  </Box>
                )}

                {/* Tab 1: Por Produto */}
                {tabAtiva === 1 && (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Produto</TableCell>
                          <TableCell align="right">Quantidade Total (kg)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {resultado.demanda_por_produto.map((prod) => (
                          <TableRow key={prod.produto_id}>
                            <TableCell>{prod.produto_nome}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              {prod.quantidade_embalagens ? (
                                <>
                                  <strong>{prod.quantidade_embalagens}</strong> {prod.unidade}
                                  <span style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '8px' }}>
                                    ({toNum(prod.quantidade_total_kg).toFixed(2)}kg)
                                  </span>
                                </>
                              ) : (
                                `${toNum(prod.quantidade_total_kg).toFixed(2)} kg`
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Tab 2: Consolidado */}
                {tabAtiva === 2 && (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>Escola</TableCell>
                          {resultado.demanda_por_produto.map((prod) => (
                            <TableCell key={prod.produto_id} align="right" sx={{ minWidth: 120 }}>
                              {prod.produto_nome}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {resultado.consolidado.map((escola) => (
                          <TableRow key={escola.escola_id}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {escola.escola_nome}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {escola.modalidade_nome}
                              </Typography>
                            </TableCell>
                            {resultado.demanda_por_produto.map((prod) => {
                              const produtoEscola = escola.produtos.find(p => p.produto_id === prod.produto_id);
                              if (!produtoEscola) return <TableCell key={prod.produto_id} align="right">-</TableCell>;
                              
                              return (
                                <TableCell key={prod.produto_id} align="right">
                                  {produtoEscola.quantidade_embalagens ? (
                                    <>
                                      <strong>{produtoEscola.quantidade_embalagens}</strong> {prod.unidade}
                                      <span style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block' }}>
                                        ({toNum(produtoEscola.quantidade_kg).toFixed(2)}kg)
                                      </span>
                                    </>
                                  ) : (
                                    `${toNum(produtoEscola.quantidade_kg).toFixed(2)} kg`
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Card>
            </Grid>
          )}
          {/* Painel: Gerar Pedido de Compra a partir de Guia de Demanda */}
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCartIcon />
                Gerar Compra da Guia de Demanda
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                Selecione uma guia de demanda já ajustada. O pedido de compra será gerado com as quantidades ajustadas e datas de entrega de cada escola.
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Guia de Demanda</InputLabel>
                <Select
                  value={guiaSelecionada?.id ?? ''}
                  label="Guia de Demanda"
                  onChange={e => setGuiaSelecionada(guias.find(g => g.id === Number(e.target.value)) ?? null)}
                >
                  {guias.map(g => {
                    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                    const label = g.nome || `Guia ${meses[(g.mes ?? 1) - 1]}/${g.ano}`;
                    return (
                      <MenuItem key={g.id} value={g.id}>
                        {label} — {g.total_produtos ?? 0} produto(s)
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {guiaSelecionada && (
                <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`Guia #${guiaSelecionada.id}`} size="small" />
                  <Chip label={`Status: ${guiaSelecionada.status}`} size="small" color={guiaSelecionada.status === 'aberta' ? 'success' : 'default'} />
                  {guiaSelecionada.competencia_mes_ano && (
                    <Chip label={`Competência: ${guiaSelecionada.competencia_mes_ano}`} size="small" variant="outlined" />
                  )}
                </Box>
              )}

              <Button
                variant="contained"
                startIcon={gerandoPedidoGuia ? <CircularProgress size={18} /> : <ShoppingCartIcon />}
                onClick={handleGerarPedidoDaGuia}
                disabled={gerandoPedidoGuia || !guiaSelecionada}
                sx={{ bgcolor: '#1d4ed8', '&:hover': { bgcolor: '#1e40af' } }}
              >
                {gerandoPedidoGuia ? 'Gerando...' : 'Gerar Pedido de Compra'}
              </Button>

              {resultadoPedidoGuia && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ mb: 2 }} />
                  {resultadoPedidoGuia.pedidos_criados.map(p => (
                    <Alert
                      key={p.pedido_id}
                      severity="success"
                      sx={{ mb: 1 }}
                      action={
                        <Button size="small" onClick={() => navigate(`/compras/${p.pedido_id}`)}>
                          Ver Pedido
                        </Button>
                      }
                    >
                      Pedido {p.numero} criado — {p.total_itens} item(ns)
                      {p.sem_contrato.length > 0 && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'warning.main' }}>
                          Sem contrato (não incluídos): {p.sem_contrato.join(', ')}
                        </Typography>
                      )}
                    </Alert>
                  ))}
                  {resultadoPedidoGuia.erros?.map((e, i) => (
                    <Alert key={i} severity="error" sx={{ mb: 1 }}>{e.motivo}</Alert>
                  ))}
                </Box>
              )}
            </Card>
          </Grid>

          {/* Painel: Gerar Guias de Demanda por Período */}
          {competencia && (
            <Grid item xs={12}>
              <Card sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TableChartIcon />
                  Gerar Guias de Demanda por Escola
                </Typography>

                <Alert severity="info" sx={{ mb: 2 }}>
                  Selecione um ou mais períodos. Cada período gera uma guia de demanda com as quantidades por escola, que depois origina o pedido de compra.
                </Alert>

                {/* Lista de períodos selecionados */}
                {periodos.length > 0 && (
                  <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {periodos.map((p, idx) => (
                      <Chip
                        key={idx}
                        label={`Período ${idx + 1}: ${p.data_inicio} → ${p.data_fim}`}
                        onDelete={() => setPeriodos(prev => prev.filter((_, i) => i !== idx))}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<CalendarIcon />}
                    onClick={() => setSeletorOpen(true)}
                    size="small"
                  >
                    {periodos.length === 0 ? 'Selecionar Período' : 'Adicionar Período'}
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={gerandoGuias ? <CircularProgress size={18} /> : <TableChartIcon />}
                    onClick={handleGerarGuias}
                    disabled={gerandoGuias || periodos.length === 0}
                  >
                    {gerandoGuias ? 'Gerando...' : `Gerar Guia${periodos.length !== 1 ? 's' : ''} de Demanda (${periodos.length} período${periodos.length !== 1 ? 's' : ''})`}
                  </Button>
                </Box>

                {/* Resultado da geração de guias */}
                {resultadoGuias && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    {resultadoGuias.guias_criadas.map((g) => (
                      <Alert
                        key={g.guia_id}
                        severity="success"
                        sx={{ mb: 1 }}
                        action={
                          <Button size="small" onClick={() => navigate(`/guias-demanda/${g.guia_id}`)}>
                            Ver Guia
                          </Button>
                        }
                      >
                        Guia #{g.guia_id} — {g.total_escolas} escola(s), {g.total_produtos} produto(s), {g.total_itens} item(ns)
                        {g.periodos && g.periodos.length > 0 && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            {g.periodos.length === 1
                              ? `Período: ${g.periodos[0].data_inicio} → ${g.periodos[0].data_fim}`
                              : `${g.periodos.length} períodos: ${g.periodos[0].data_inicio} → ${g.periodos[g.periodos.length - 1].data_fim}`}
                          </Typography>
                        )}
                      </Alert>
                    ))}
                    {resultadoGuias.erros?.map((e, i) => (
                      <Alert key={i} severity="error" sx={{ mb: 1 }}>
                        {e.motivo}
                      </Alert>
                    ))}
                    {resultadoGuias.total_criadas > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip label={`${resultadoGuias.total_criadas} guia(s) criada(s)`} color="success" size="small" />
                        <Button size="small" variant="outlined" onClick={() => navigate('/guias')}>
                          Ver todas as guias
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </Card>
            </Grid>
          )}

        </Grid>
      </PageContainer>

      {/* Modal de Detalhamento do Cálculo */}
      {modalCalculo.produto && modalCalculo.escola && (
        <CalculoDetalhadoModal
          open={modalCalculo.open}
          onClose={() => setModalCalculo({ open: false, produto: null, escola: null })}
          produto={modalCalculo.produto}
          escola={modalCalculo.escola}
        />
      )}

      {/* Seletor de Período via Calendário */}
      <SeletorPeriodoCalendario
        open={seletorOpen}
        onClose={() => setSeletorOpen(false)}
        onConfirm={(p) => setPeriodos(prev => [...prev, p])}
        periodosExistentes={periodos}
        competencia={competencia || undefined}
        titulo={periodos.length === 0 ? 'Selecionar 1º Período' : `Adicionar Período ${periodos.length + 1}`}
      />

      {/* Dialog de Seleção de Contratos */}
      <SelecionarContratosDialog
        open={dialogSelecaoContratos}
        onClose={handleCancelarSelecaoContratos}
        produtos={produtosMultiplosContratos}
        onConfirmar={handleConfirmarSelecaoContratos}
      />
    </LocalizationProvider>
  );
}
