import { useState, useEffect } from 'react';
import { usePageTitle } from '../contexts/PageTitleContext';
import { useToast } from '../hooks/useToast';
import CalculoDetalhadoModal from '../components/CalculoDetalhadoModal';
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
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  School as SchoolIcon,
  Inventory as InventoryIcon,
  TableChart as TableChartIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import PageContainer from '../components/PageContainer';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import { listarEscolas, Escola } from '../services/escolas';
import { calcularDemandaPorCompetencia, CalculoDemandaResponse } from '../services/planejamentoCompras';

export default function PlanejamentoCompras() {
  const { setPageTitle } = usePageTitle();
  const toast = useToast();

  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [escolasSelecionadas, setEscolasSelecionadas] = useState<Escola[]>([]);
  const [competencia, setCompetencia] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<CalculoDemandaResponse | null>(null);
  const [tabAtiva, setTabAtiva] = useState(0);
  const [modalCalculo, setModalCalculo] = useState<{
    open: boolean;
    produto: any;
    escola: any;
  }>({
    open: false,
    produto: null,
    escola: null
  });

  useEffect(() => {
    setPageTitle('Planejamento de Compras');
    carregarDados();
  }, [setPageTitle]);

  async function carregarDados() {
    setLoading(true);
    try {
      const escolasData = await listarEscolas();
      setEscolas(escolasData.filter(e => e.ativo));
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

  // Quando competência muda, ajustar datas para o mês inteiro
  useEffect(() => {
    if (competencia) {
      const [ano, mes] = competencia.split('-').map(Number);
      const primeiroDia = new Date(ano, mes - 1, 1);
      const ultimoDia = new Date(ano, mes, 0);
      setDataInicio(primeiroDia);
      setDataFim(ultimoDia);
    }
  }, [competencia]);

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
                                  <TableCell align="right">{toNum(prod.quantidade_kg).toFixed(2)} kg</TableCell>
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
                              {toNum(prod.quantidade_total_kg).toFixed(2)} kg
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
                              return (
                                <TableCell key={prod.produto_id} align="right">
                                  {produtoEscola ? `${toNum(produtoEscola.quantidade_kg).toFixed(2)} kg` : '-'}
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
    </LocalizationProvider>
  );
}
