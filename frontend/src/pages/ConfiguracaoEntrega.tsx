import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Switch,
  FormControlLabel,
  Collapse,
  IconButton,
  Badge,
  Dialog
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Route as RouteIcon,
  Assignment as GuiaIcon,
  Inventory as InventoryIcon,
  School as SchoolIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { guiaService } from '../services/guiaService';
import { rotaService } from '../modules/entregas/services/rotaService';
import { itemGuiaService, ItemGuia } from '../services/itemGuiaService';
import { RotaEntrega, ConfiguracaoEntrega as ConfiguracaoEntregaType } from '../modules/entregas/types/rota';
import { useNavigate } from 'react-router-dom';

interface ItemGuiaComSelecao extends ItemGuia {
  selecionado: boolean;
}

// Usar o tipo importado
type ConfiguracaoAtiva = ConfiguracaoEntregaType;

const ConfiguracaoEntrega: React.FC = () => {
  const navigate = useNavigate();
  const [guias, setGuias] = useState<any[]>([]);
  const [rotas, setRotas] = useState<RotaEntrega[]>([]);
  const [itensGuia, setItensGuia] = useState<ItemGuiaComSelecao[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado da configuração atual
  const [configuracao, setConfiguracao] = useState<ConfiguracaoAtiva>({
    guiaId: 0,
    rotasSelecionadas: [],
    itensSelecionados: [],
    ativa: true
  });

  // Estado para controlar expansão dos grupos de produtos
  const [produtosExpandidos, setProdutosExpandidos] = useState<Set<string>>(new Set());

  // Estado para modal de visualização por escola
  const [modalVisualizacaoAberto, setModalVisualizacaoAberto] = useState(false);
  const [dadosEscolas, setDadosEscolas] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  // Recarregar dados quando a página receber foco
  useEffect(() => {
    const handleFocus = () => {
      if (configuracao.guiaId > 0) {
        carregarItensGuia(configuracao.guiaId);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [configuracao.guiaId]);

  useEffect(() => {
    if (configuracao.guiaId > 0) {
      carregarItensGuia(configuracao.guiaId);
    }
  }, [configuracao.guiaId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar dados básicos
      const [guiasData, rotasData] = await Promise.all([
        guiaService.listarGuias(),
        rotaService.listarRotas()
      ]);

      const guiasResponse = guiasData?.data || guiasData;
      const guiasAbertas = Array.isArray(guiasResponse)
        ? guiasResponse.filter(g => g.status === 'aberta')
        : [];
      setGuias(guiasAbertas);
      setRotas(rotasData);

      // Tentar carregar configuração ativa existente
      await carregarConfiguracaoAtiva();

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      // Usar dados simulados em caso de erro
      setGuias([
        { id: 1, mes: 1, ano: 2025, status: 'aberta', observacao: 'Guia Janeiro 2025' },
        { id: 2, mes: 2, ano: 2025, status: 'aberta', observacao: 'Guia Fevereiro 2025' }
      ]);
      setRotas([
        { id: 1, nome: 'Rota Centro', cor: '#2563eb', ativo: true, created_at: '', updated_at: '', total_escolas: 5 },
        { id: 2, nome: 'Rota Norte', cor: '#dc2626', ativo: true, created_at: '', updated_at: '', total_escolas: 3 },
        { id: 3, nome: 'Rota Sul', cor: '#16a34a', ativo: true, created_at: '', updated_at: '', total_escolas: 4 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const carregarConfiguracaoAtiva = async () => {
    try {
      const config = await rotaService.buscarConfiguracaoAtiva();
      if (config) {
        setConfiguracao(config);
      }
    } catch (err) {
      console.log('Nenhuma configuração ativa encontrada');
    }
  };

  const carregarItensGuia = async (guiaId: number) => {
    try {
      const itens = await itemGuiaService.listarItensPorGuia(guiaId);

      // Limpar IDs inválidos da configuração (itens que não existem mais)
      const idsValidos = itens.map(item => item.id);
      const itensSelecionadosLimpos = configuracao.itensSelecionados.filter(id => idsValidos.includes(id));

      // Atualizar configuração se houve mudanças (IDs inválidos foram removidos)
      if (itensSelecionadosLimpos.length !== configuracao.itensSelecionados.length) {
        setConfiguracao(prev => ({
          ...prev,
          itensSelecionados: itensSelecionadosLimpos
        }));
      }

      const itensComSelecao: ItemGuiaComSelecao[] = itens.map(item => ({
        ...item,
        selecionado: itensSelecionadosLimpos.includes(item.id)
      }));

      setItensGuia(itensComSelecao);
    } catch (err) {
      console.error('Erro ao carregar itens da guia:', err);
    }
  };

  const toggleRota = (rotaId: number) => {
    setConfiguracao(prev => ({
      ...prev,
      rotasSelecionadas: prev.rotasSelecionadas.includes(rotaId)
        ? prev.rotasSelecionadas.filter(id => id !== rotaId)
        : [...prev.rotasSelecionadas, rotaId]
    }));
  };

  const toggleItem = (itemId: number) => {
    setConfiguracao(prev => ({
      ...prev,
      itensSelecionados: prev.itensSelecionados.includes(itemId)
        ? prev.itensSelecionados.filter(id => id !== itemId)
        : [...prev.itensSelecionados, itemId]
    }));
  };

  const selecionarTodasRotas = () => {
    setConfiguracao(prev => ({
      ...prev,
      rotasSelecionadas: rotas.map(rota => rota.id)
    }));
  };

  const deselecionarTodasRotas = () => {
    setConfiguracao(prev => ({
      ...prev,
      rotasSelecionadas: []
    }));
  };

  const selecionarTodosItens = () => {
    setConfiguracao(prev => ({
      ...prev,
      itensSelecionados: itensGuia.map(item => item.id)
    }));
  };

  const deselecionarTodosItens = () => {
    setConfiguracao(prev => ({
      ...prev,
      itensSelecionados: []
    }));
  };

  // Agrupar itens por produto
  const itensAgrupados = useMemo(() => {
    const grupos = new Map<string, ItemGuiaComSelecao[]>();

    itensGuia.forEach(item => {
      const chave = item.produto_nome;
      if (!grupos.has(chave)) {
        grupos.set(chave, []);
      }
      grupos.get(chave)!.push(item);
    });

    return Array.from(grupos.entries()).map(([produto, itens]) => ({
      produto,
      itens: itens.sort((a, b) => a.escola_nome.localeCompare(b.escola_nome)),
      totalItens: itens.length,
      itensSelecionados: itens.filter(item => configuracao.itensSelecionados.includes(item.id)).length,
      quantidadeTotal: itens.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0),
      unidade: itens[0]?.unidade || ''
    }));
  }, [itensGuia, configuracao.itensSelecionados]);

  const toggleProdutoExpansao = (produto: string) => {
    setProdutosExpandidos(prev => {
      const novo = new Set(prev);
      if (novo.has(produto)) {
        novo.delete(produto);
      } else {
        novo.add(produto);
      }
      return novo;
    });
  };

  const toggleProdutoCompleto = (produto: string) => {
    const grupo = itensAgrupados.find(g => g.produto === produto);
    if (!grupo) return;

    const todosItensDoProduto = grupo.itens.map(item => item.id);
    const todosSelecionados = todosItensDoProduto.every(id => configuracao.itensSelecionados.includes(id));

    if (todosSelecionados) {
      // Desselecionar todos os itens deste produto
      setConfiguracao(prev => ({
        ...prev,
        itensSelecionados: prev.itensSelecionados.filter(id => !todosItensDoProduto.includes(id))
      }));
    } else {
      // Selecionar todos os itens deste produto
      setConfiguracao(prev => ({
        ...prev,
        itensSelecionados: [...new Set([...prev.itensSelecionados, ...todosItensDoProduto])]
      }));
    }
  };

  const expandirTodosProdutos = () => {
    setProdutosExpandidos(new Set(itensAgrupados.map(g => g.produto)));
  };

  const recolherTodosProdutos = () => {
    setProdutosExpandidos(new Set());
  };

  const visualizarPorEscola = async () => {
    if (!configuracao.guiaId || configuracao.rotasSelecionadas.length === 0 || configuracao.itensSelecionados.length === 0) {
      setError('Configure a guia, rotas e itens antes de visualizar por escola');
      return;
    }

    try {
      setLoading(true);

      // Usar os itens já carregados e filtrar localmente
      const itensFiltrados = itensGuia.filter(item =>
        configuracao.itensSelecionados.includes(item.id)
      );

      if (itensFiltrados.length === 0) {
        setError('Nenhum item selecionado encontrado');
        return;
      }

      // Buscar informações das escolas das rotas selecionadas
      const escolasRotas = new Map<number, any>();

      for (const rotaId of configuracao.rotasSelecionadas) {
        try {
          const escolasRota = await rotaService.listarEscolasRota(rotaId);
          escolasRota.forEach(escolaRota => {
            escolasRotas.set(escolaRota.escola_id, {
              escola_id: escolaRota.escola_id,
              escola_nome: escolaRota.escola_nome,
              escola_endereco: escolaRota.escola_endereco || '',
              rota_id: rotaId
            });
          });
        } catch (err) {
          console.warn(`Erro ao carregar escolas da rota ${rotaId}:`, err);
        }
      }

      // Agrupar itens por escola, considerando apenas escolas das rotas selecionadas
      const escolasAgrupadas = new Map<string, any>();

      itensFiltrados.forEach(item => {
        // Verificar se a escola do item está nas rotas selecionadas
        const escolaInfo = escolasRotas.get(item.escola_id);
        if (!escolaInfo) {
          return; // Pular itens de escolas que não estão nas rotas selecionadas
        }

        const chaveEscola = `${item.escola_id}-${item.escola_nome}`;

        if (!escolasAgrupadas.has(chaveEscola)) {
          escolasAgrupadas.set(chaveEscola, {
            escola_id: item.escola_id,
            escola_nome: item.escola_nome,
            escola_endereco: escolaInfo.escola_endereco || '',
            rota_id: escolaInfo.rota_id,
            itens: [],
            total_itens: 0,
            produtos_unicos: new Set()
          });
        }

        const escola = escolasAgrupadas.get(chaveEscola)!;
        escola.itens.push(item);
        escola.total_itens++;
        escola.produtos_unicos.add(item.produto_nome);
      });

      // Converter para array e ordenar
      const escolasArray = Array.from(escolasAgrupadas.values()).map(escola => ({
        ...escola,
        produtos_unicos: escola.produtos_unicos.size
      })).sort((a, b) => a.escola_nome.localeCompare(b.escola_nome));

      setDadosEscolas(escolasArray);
      setModalVisualizacaoAberto(true);

    } catch (err) {
      console.error('Erro ao carregar dados por escola:', err);
      setError('Erro ao carregar dados por escola');
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracao = async () => {
    try {
      setSalvando(true);
      setError(null);

      if (!configuracao.guiaId) {
        setError('Selecione uma guia de demanda');
        return;
      }

      if (configuracao.rotasSelecionadas.length === 0) {
        setError('Selecione pelo menos uma rota');
        return;
      }

      if (configuracao.itensSelecionados.length === 0) {
        setError('Selecione pelo menos um item');
        return;
      }

      // Salvar configuração na API
      const resultado = await rotaService.salvarConfiguracao({
        guiaId: configuracao.guiaId,
        rotasSelecionadas: configuracao.rotasSelecionadas,
        itensSelecionados: configuracao.itensSelecionados,
        ativa: true
      });

      setSuccess(resultado.message || 'Configuração de entrega salva com sucesso! O mobile agora mostrará apenas os itens selecionados.');

      // Limpar mensagem de sucesso após 5 segundos
      setTimeout(() => setSuccess(null), 5000);

    } catch (err: any) {
      console.error('Erro ao salvar configuração:', err);
      setError(`Erro ao salvar configuração: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Configuração de Entrega
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Configure quais rotas e itens serão exibidos no aplicativo mobile
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => navigate('/visualizacao-entregas')}
              disabled={!configuracao.guiaId || configuracao.rotasSelecionadas.length === 0 || configuracao.itensSelecionados.length === 0}
            >
              Visualizar Entregas
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={carregarDados}
              disabled={salvando}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={salvarConfiguracao}
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </Box>
        </Box>

        {/* Alertas */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Seção 1: Guia de Demanda */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <GuiaIcon color="primary" />
                  <Typography variant="h6">
                    1. Selecionar Guia de Demanda
                  </Typography>
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Guia de Demanda</InputLabel>
                  <Select
                    value={configuracao.guiaId || ''}
                    onChange={(e) => setConfiguracao(prev => ({
                      ...prev,
                      guiaId: Number(e.target.value),
                      itensSelecionados: [] // Reset itens quando muda guia
                    }))}
                    label="Guia de Demanda"
                  >
                    {guias.map((guia) => (
                      <MenuItem key={guia.id} value={guia.id}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <GuiaIcon fontSize="small" />
                          {guia.mes}/{guia.ano}
                          {guia.observacao && ` - ${guia.observacao}`}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* Seção 2: Rotas */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <RouteIcon color="primary" />
                    <Typography variant="h6">
                      2. Selecionar Rotas
                    </Typography>
                  </Box>
                  <Box>
                    <Button size="small" onClick={selecionarTodasRotas} sx={{ mr: 1 }}>
                      Todas
                    </Button>
                    <Button size="small" onClick={deselecionarTodasRotas}>
                      Nenhuma
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  {rotas.map((rota) => (
                    <Grid item xs={12} key={rota.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: configuracao.rotasSelecionadas.includes(rota.id) ? 2 : 1,
                          borderColor: configuracao.rotasSelecionadas.includes(rota.id) ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => toggleRota(rota.id)}
                      >
                        <CardContent sx={{ py: 2 }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Checkbox
                              checked={configuracao.rotasSelecionadas.includes(rota.id)}
                              onChange={() => toggleRota(rota.id)}
                            />
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: rota.cor
                              }}
                            />
                            <Box flex={1}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {rota.nome}
                              </Typography>
                              {rota.descricao && (
                                <Typography variant="caption" color="text.secondary">
                                  {rota.descricao}
                                </Typography>
                              )}
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <SchoolIcon fontSize="small" color="action" />
                              <Typography variant="caption">
                                {rota.total_escolas || 0}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Box mt={2}>
                  <Typography variant="body2" color="primary">
                    {configuracao.rotasSelecionadas.length} de {rotas.length} rotas selecionadas
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Seção 3: Itens */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <InventoryIcon color="primary" />
                    <Typography variant="h6">
                      3. Selecionar Itens
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button size="small" onClick={selecionarTodosItens} sx={{ mr: 1 }}>
                      Todos
                    </Button>
                    <Button size="small" onClick={deselecionarTodosItens} sx={{ mr: 1 }}>
                      Nenhum
                    </Button>
                    <Button size="small" onClick={expandirTodosProdutos} sx={{ mr: 1 }}>
                      Expandir
                    </Button>
                    <Button size="small" onClick={recolherTodosProdutos}>
                      Recolher
                    </Button>
                  </Box>
                </Box>

                {configuracao.guiaId === 0 ? (
                  <Alert severity="info">
                    Selecione uma guia de demanda para ver os itens disponíveis
                  </Alert>
                ) : (
                  <>
                    <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                      {itensAgrupados.map((grupo) => {
                        const todosItensSelecionados = grupo.itens.every(item => configuracao.itensSelecionados.includes(item.id));
                        const algunsItensSelecionados = grupo.itens.some(item => configuracao.itensSelecionados.includes(item.id));
                        const expandido = produtosExpandidos.has(grupo.produto);

                        return (
                          <Card
                            key={grupo.produto}
                            sx={{
                              mb: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paper'
                            }}
                          >
                            {/* Cabeçalho do Produto */}
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Checkbox
                                  checked={todosItensSelecionados}
                                  indeterminate={algunsItensSelecionados && !todosItensSelecionados}
                                  onChange={() => toggleProdutoCompleto(grupo.produto)}
                                />

                                <IconButton
                                  size="small"
                                  onClick={() => toggleProdutoExpansao(grupo.produto)}
                                  sx={{ p: 0.5 }}
                                >
                                  {expandido ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                                </IconButton>

                                <Box flex={1} onClick={() => toggleProdutoExpansao(grupo.produto)} sx={{ cursor: 'pointer' }}>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    {grupo.produto}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {(Number(grupo.quantidadeTotal) || 0).toLocaleString('pt-BR', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 3
                                    })} {grupo.unidade} • {grupo.totalItens} escolas
                                  </Typography>
                                </Box>

                                <Badge
                                  badgeContent={grupo.itensSelecionados}
                                  color="primary"
                                  max={999}
                                  sx={{ mr: 1 }}
                                >
                                  <Chip
                                    label={`${grupo.itensSelecionados}/${grupo.totalItens}`}
                                    size="small"
                                    color={todosItensSelecionados ? 'success' : algunsItensSelecionados ? 'warning' : 'default'}
                                    variant="outlined"
                                    sx={{
                                      bgcolor: (theme) => theme.palette.mode === 'dark'
                                        ? 'background.paper'
                                        : 'background.default'
                                    }}
                                  />
                                </Badge>
                              </Box>
                            </CardContent>

                            {/* Detalhes dos Itens (Colapsável) */}
                            <Collapse in={expandido}>
                              <Divider />
                              <Box sx={{
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
                              }}>
                                <TableContainer>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{
                                        bgcolor: (theme) => theme.palette.mode === 'dark'
                                          ? 'rgba(255, 255, 255, 0.05)'
                                          : 'rgba(0, 0, 0, 0.02)'
                                      }}>
                                        <TableCell padding="checkbox" sx={{ width: 48 }}></TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Escola</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Qtd</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Lote</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {grupo.itens.map((item) => (
                                        <TableRow
                                          key={item.id}
                                          hover
                                          sx={{
                                            '&:hover': {
                                              bgcolor: (theme) => theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.08)'
                                                : 'action.hover'
                                            }
                                          }}
                                        >
                                          <TableCell padding="checkbox">
                                            <Checkbox
                                              size="small"
                                              checked={configuracao.itensSelecionados.includes(item.id)}
                                              onChange={() => toggleItem(item.id)}
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">
                                              {item.escola_nome}
                                            </Typography>
                                          </TableCell>
                                          <TableCell align="right">
                                            <Typography variant="body2" fontWeight="medium">
                                              {(Number(item.quantidade) || 0).toLocaleString('pt-BR', {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 3
                                              })}
                                            </Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Chip
                                              label={item.lote || 'S/L'}
                                              size="small"
                                              variant="outlined"
                                              sx={{
                                                fontSize: '0.7rem',
                                                height: 20,
                                                bgcolor: (theme) => theme.palette.mode === 'dark'
                                                  ? 'background.paper'
                                                  : 'background.default'
                                              }}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            </Collapse>
                          </Card>
                        );
                      })}
                    </Box>

                    <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="primary">
                        {(() => {
                          // Contar apenas itens selecionados que existem na lista atual
                          const idsValidos = itensGuia.map(item => item.id);
                          const itensSelecionadosValidos = configuracao.itensSelecionados.filter(id => idsValidos.includes(id));
                          return `${itensSelecionadosValidos.length} de ${itensGuia.length} itens selecionados`;
                        })()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {itensAgrupados.length} produtos • {produtosExpandidos.size} expandidos
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Resumo */}
        {(configuracao.guiaId > 0 || configuracao.rotasSelecionadas.length > 0 || configuracao.itensSelecionados.length > 0) && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumo da Configuração
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <GuiaIcon fontSize="small" color="primary" />
                    <Typography variant="body2">
                      <strong>Guia:</strong> {guias.find(g => g.id === configuracao.guiaId)?.mes}/{guias.find(g => g.id === configuracao.guiaId)?.ano || 'Não selecionada'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <RouteIcon fontSize="small" color="primary" />
                    <Typography variant="body2">
                      <strong>Rotas:</strong> {configuracao.rotasSelecionadas.length} selecionadas
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <InventoryIcon fontSize="small" color="primary" />
                    <Typography variant="body2">
                      <strong>Itens:</strong> {configuracao.itensSelecionados.length} selecionados
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Modal de Visualização por Escola */}
        <Dialog
          open={modalVisualizacaoAberto}
          onClose={() => setModalVisualizacaoAberto(false)}
          maxWidth="lg"
          fullWidth
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant="h6">
                Visualização por Escola
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dados filtrados conforme configuração atual
              </Typography>
            </Box>
            <IconButton onClick={() => setModalVisualizacaoAberto(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ p: 2, maxHeight: '70vh', overflow: 'auto' }}>
            {dadosEscolas.length === 0 ? (
              <Alert severity="info">
                Nenhuma escola encontrada com os filtros aplicados
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {dadosEscolas.map((escola) => (
                  <Grid item xs={12} md={6} key={escola.escola_id}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <SchoolIcon color="primary" />
                          <Box flex={1}>
                            <Typography variant="h6" fontWeight="bold">
                              {escola.escola_nome}
                            </Typography>
                            {escola.escola_endereco && (
                              <Typography variant="body2" color="text.secondary">
                                📍 {escola.escola_endereco}
                              </Typography>
                            )}
                            {escola.rota_id && (
                              <Typography variant="caption" color="text.secondary">
                                🚚 Rota: {rotas.find(r => r.id === escola.rota_id)?.nome || `ID ${escola.rota_id}`}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        <Box display="flex" gap={1} mb={2}>
                          <Chip
                            label={`${escola.total_itens} itens`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={`${escola.produtos_unicos} produtos`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>
                          Itens para Entrega:
                        </Typography>

                        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Produto</TableCell>
                                <TableCell align="right">Qtd</TableCell>
                                <TableCell>Lote</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {escola.itens.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                      {item.produto_nome}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2">
                                      {(Number(item.quantidade) || 0).toFixed(3)} {item.unidade}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={item.lote || 'S/L'}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {dadosEscolas.length} escola(s) • {dadosEscolas.reduce((sum, e) => sum + e.total_itens, 0)} itens totais
            </Typography>
          </Box>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ConfiguracaoEntrega;