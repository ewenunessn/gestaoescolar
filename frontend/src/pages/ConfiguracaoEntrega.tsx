import React, { useState, useEffect } from 'react';
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
  FormControlLabel
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Route as RouteIcon,
  Assignment as GuiaIcon,
  Inventory as InventoryIcon,
  School as SchoolIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { guiaService } from '../services/guiaService';
import { rotaService } from '../modules/entregas/services/rotaService';
import { itemGuiaService, ItemGuia } from '../services/itemGuiaService';
import { RotaEntrega, ConfiguracaoEntrega as ConfiguracaoEntregaType } from '../modules/entregas/types/rota';

interface ItemGuiaComSelecao extends ItemGuia {
  selecionado: boolean;
}

// Usar o tipo importado
type ConfiguracaoAtiva = ConfiguracaoEntregaType;

const ConfiguracaoEntrega: React.FC = () => {
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

  useEffect(() => {
    carregarDados();
  }, []);

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
      
      const itensComSelecao: ItemGuiaComSelecao[] = itens.map(item => ({
        ...item,
        selecionado: configuracao.itensSelecionados.includes(item.id)
      }));
      
      setItensGuia(itensComSelecao);
      
      // Se não há itens selecionados, selecionar todos por padrão
      if (configuracao.itensSelecionados.length === 0) {
        setConfiguracao(prev => ({
          ...prev,
          itensSelecionados: itensComSelecao.map(item => item.id)
        }));
      }
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
                    value={configuracao.guiaId}
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
                  <Box>
                    <Button size="small" onClick={selecionarTodosItens} sx={{ mr: 1 }}>
                      Todos
                    </Button>
                    <Button size="small" onClick={deselecionarTodosItens}>
                      Nenhum
                    </Button>
                  </Box>
                </Box>

                {configuracao.guiaId === 0 ? (
                  <Alert severity="info">
                    Selecione uma guia de demanda para ver os itens disponíveis
                  </Alert>
                ) : (
                  <>
                    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={configuracao.itensSelecionados.length === itensGuia.length && itensGuia.length > 0}
                                indeterminate={configuracao.itensSelecionados.length > 0 && configuracao.itensSelecionados.length < itensGuia.length}
                                onChange={(e) => e.target.checked ? selecionarTodosItens() : deselecionarTodosItens()}
                              />
                            </TableCell>
                            <TableCell>Produto</TableCell>
                            <TableCell>Qtd</TableCell>
                            <TableCell>Lote</TableCell>
                            <TableCell>Escola</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {itensGuia.map((item) => (
                            <TableRow key={item.id} hover>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={configuracao.itensSelecionados.includes(item.id)}
                                  onChange={() => toggleItem(item.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.produto_nome}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {item.quantidade} {item.unidade}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={item.lote || 'S/L'} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {item.escola_nome}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box mt={2}>
                      <Typography variant="body2" color="primary">
                        {configuracao.itensSelecionados.length} de {itensGuia.length} itens selecionados
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
      </Box>
    </Container>
  );
};

export default ConfiguracaoEntrega;