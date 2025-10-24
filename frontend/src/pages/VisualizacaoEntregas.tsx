import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  Divider,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Badge
} from '@mui/material';
import {
  Route as RouteIcon,
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Add as AddIcon,
  LocalShipping as LocalShippingIcon
} from '@mui/icons-material';
import { rotaService } from '../modules/entregas/services/rotaService';
import { itemGuiaService, ItemGuia } from '../services/itemGuiaService';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import { RotaEntrega } from '../modules/entregas/types/rota';
import AdicionarProdutoIndividual from '../components/AdicionarProdutoIndividual';
import { guiaService } from '../services/guiaService';
import { useNotification } from '../context/NotificationContext';

interface EscolaComItens {
  escola_id: number;
  escola_nome: string;
  escola_endereco?: string;
  rota_id: number;
  rota_nome: string;
  rota_cor: string;
  itens: ItemGuia[];
  total_itens: number;
  produtos_unicos: number;
}

interface RotaComEscolas {
  rota: RotaEntrega;
  escolas: EscolaComItens[];
  expandida: boolean;
}

const VisualizacaoEntregas: React.FC = () => {
  const [rotasComEscolas, setRotasComEscolas] = useState<RotaComEscolas[]>([]);
  const [escolaSelecionada, setEscolaSelecionada] = useState<EscolaComItens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configuracaoAtiva, setConfiguracaoAtiva] = useState<any>(null);
  
  // Estado para modal de adicionar produto
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);
  
  // Estados para itens não marcados
  const [itensNaoMarcados, setItensNaoMarcados] = useState<ItemGuia[]>([]);
  const [marcandoItem, setMarcandoItem] = useState<number | null>(null);

  const { success, error: showError } = useNotification();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar configuração ativa
      const config = await rotaService.buscarConfiguracaoAtiva();
      if (!config) {
        setError('Nenhuma configuração de entrega ativa encontrada. Configure primeiro em "Configuração de Entrega".');
        return;
      }

      setConfiguracaoAtiva(config);

      // Buscar rotas selecionadas
      const todasRotas = await rotaService.listarRotas();
      const rotasSelecionadas = todasRotas.filter(rota => 
        config.rotasSelecionadas.includes(rota.id)
      );

      // Buscar itens da guia
      const itensGuia = await itemGuiaService.listarItensPorGuia(config.guiaId);
      const itensFiltrados = itensGuia.filter(item => 
        config.itensSelecionados.includes(item.id)
      );

      // Para cada rota, buscar suas escolas e agrupar itens
      const rotasProcessadas: RotaComEscolas[] = [];

      for (const rota of rotasSelecionadas) {
        try {
          const escolasRota = await rotaService.listarEscolasRota(rota.id);
          const escolasComItens: EscolaComItens[] = [];

          for (const escolaRota of escolasRota) {
            const itensEscola = itensFiltrados.filter(item => 
              item.escola_id === escolaRota.escola_id
            );

            const produtosUnicos = new Set(itensEscola.map(item => item.produto_nome));
            
            escolasComItens.push({
              escola_id: escolaRota.escola_id,
              escola_nome: escolaRota.escola_nome || `Escola ${escolaRota.escola_id}`,
              escola_endereco: escolaRota.escola_endereco,
              rota_id: rota.id,
              rota_nome: rota.nome,
              rota_cor: rota.cor,
              itens: itensEscola.sort((a, b) => a.produto_nome.localeCompare(b.produto_nome)),
              total_itens: itensEscola.length,
              produtos_unicos: produtosUnicos.size
            });
          }

          rotasProcessadas.push({
            rota,
            escolas: escolasComItens.sort((a, b) => a.escola_nome.localeCompare(b.escola_nome)),
            expandida: rotasProcessadas.length === 0 // Primeira rota expandida por padrão
          });
        } catch (err) {
          console.warn(`Erro ao processar rota ${rota.nome}:`, err);
        }
      }

      setRotasComEscolas(rotasProcessadas);

      // Selecionar primeira escola com itens automaticamente
      if (rotasProcessadas.length > 0) {
        const primeiraEscolaComItens = rotasProcessadas
          .flatMap(r => r.escolas)
          .find(e => e.total_itens > 0);
        
        if (primeiraEscolaComItens) {
          setEscolaSelecionada(primeiraEscolaComItens);
        } else if (rotasProcessadas[0].escolas.length > 0) {
          setEscolaSelecionada(rotasProcessadas[0].escolas[0]);
        }
      }

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados de entregas');
    } finally {
      setLoading(false);
    }
  };

  const toggleRotaExpansao = (rotaId: number) => {
    setRotasComEscolas(prev => 
      prev.map(item => 
        item.rota.id === rotaId 
          ? { ...item, expandida: !item.expandida }
          : item
      )
    );
  };

  const selecionarEscola = async (escola: EscolaComItens) => {
    setEscolaSelecionada(escola);
    // Carregar itens não marcados para esta escola
    if (configuracaoAtiva) {
      await carregarItensNaoMarcados(escola.escola_id, configuracaoAtiva.guiaId);
    }
  };

  const abrirModalAdicionar = () => {
    if (escolaSelecionada) {
      setModalAdicionarAberto(true);
    }
  };

  const fecharModalAdicionar = () => {
    setModalAdicionarAberto(false);
  };

  const handleProdutoAdicionado = () => {
    // Recarregar dados após adicionar produto
    carregarDados();
    fecharModalAdicionar();
  };

  const carregarItensNaoMarcados = async (escolaId: number, guiaId: number) => {
    try {
      const response = await itemGuiaService.listarItensPorGuia(guiaId);
      console.log('Todos os itens da guia:', response);
      
      const itensEscola = response.filter((item: any) => {
        const pertenceEscola = item.escola_id === escolaId;
        const naoMarcado = item.para_entrega === false || item.para_entrega === null || item.para_entrega === undefined;
        
        console.log(`Item ${item.id} (${item.produto_nome}):`, {
          pertenceEscola,
          para_entrega: item.para_entrega,
          naoMarcado
        });
        
        return pertenceEscola && naoMarcado;
      });
      
      console.log('Itens não marcados filtrados:', itensEscola);
      setItensNaoMarcados(itensEscola);
    } catch (err) {
      console.error('Erro ao carregar itens não marcados:', err);
      setItensNaoMarcados([]);
    }
  };

  const marcarParaEntrega = async (itemId: number) => {
    try {
      setMarcandoItem(itemId);
      console.log('Marcando item para entrega:', itemId);
      
      // Marcar o item como para_entrega
      console.log('Chamando API para marcar item:', itemId);
      const response = await guiaService.atualizarParaEntrega(itemId, true);
      console.log('Resposta da API atualizarParaEntrega:', response);
      
      // Atualizar a configuração para incluir este item
      if (configuracaoAtiva) {
        const novosItensSelecionados = [...configuracaoAtiva.itensSelecionados];
        if (!novosItensSelecionados.includes(itemId)) {
          novosItensSelecionados.push(itemId);
          
          // Salvar configuração atualizada
          await rotaService.salvarConfiguracao({
            guiaId: configuracaoAtiva.guiaId,
            rotasSelecionadas: configuracaoAtiva.rotasSelecionadas,
            itensSelecionados: novosItensSelecionados,
            ativa: true
          });
          
          // Atualizar estado local
          setConfiguracaoAtiva(prev => ({
            ...prev,
            itensSelecionados: novosItensSelecionados
          }));
        }
      }
      
      // Remover o item da lista de não marcados imediatamente
      setItensNaoMarcados(prev => prev.filter(item => item.id !== itemId));
      
      success('Item marcado para entrega com sucesso!');
      
      // Recarregar dados principais para atualizar a guia de entrega
      await carregarDados();
      
      // Recarregar itens não marcados para garantir consistência
      if (escolaSelecionada && configuracaoAtiva) {
        await carregarItensNaoMarcados(escolaSelecionada.escola_id, configuracaoAtiva.guiaId);
      }
    } catch (err: any) {
      console.error('Erro ao marcar item para entrega:', err);
      showError(err.response?.data?.error || 'Erro ao marcar item para entrega');
    } finally {
      setMarcandoItem(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <PageBreadcrumbs 
          items={[
            { label: 'Visualização de Entregas', icon: <LocalShippingIcon fontSize="small" /> }
          ]}
        />
        <Typography variant="h5" fontWeight="bold">
          Visualização de Entregas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Guia {configuracaoAtiva?.guiaId} • {rotasComEscolas.length} rotas • {rotasComEscolas.reduce((sum, r) => sum + r.escolas.length, 0)} escolas
        </Typography>
      </Box>

      {/* Conteúdo Principal */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar - Lista de Rotas e Escolas */}
        <Box sx={{ 
          width: 350, 
          borderRight: '1px solid', 
          borderColor: 'divider', 
          bgcolor: 'background.paper',
          overflow: 'auto'
        }}>
          <List dense>
            {rotasComEscolas.map((rotaItem) => (
              <React.Fragment key={rotaItem.rota.id}>
                {/* Cabeçalho da Rota */}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => toggleRotaExpansao(rotaItem.rota.id)}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: rotaItem.rota.cor, width: 32, height: 32 }}>
                        <RouteIcon fontSize="small" />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {rotaItem.rota.nome}
                          </Typography>
                          <Badge badgeContent={rotaItem.escolas.length} color="primary" />
                        </Box>
                      }
                      secondary={`${rotaItem.escolas.reduce((sum, e) => sum + e.total_itens, 0)} itens`}
                    />
                    {rotaItem.expandida ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                </ListItem>

                {/* Lista de Escolas */}
                <Collapse in={rotaItem.expandida}>
                  {rotaItem.escolas.map((escola) => (
                    <ListItem key={escola.escola_id} disablePadding>
                      <ListItemButton
                        selected={escolaSelecionada?.escola_id === escola.escola_id}
                        onClick={() => selecionarEscola(escola)}
                        sx={{ pl: 4 }}
                      >
                        <ListItemIcon>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: escola.total_itens > 0 ? 'success.main' : 'grey.400',
                              ml: 1
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight="medium">
                              {escola.escola_nome}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {escola.total_itens} itens
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        </Box>

        {/* Área Principal - Detalhes da Escola */}
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
          {escolaSelecionada ? (
            <Box sx={{ p: 3 }}>
              {/* Cabeçalho da Escola */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ bgcolor: escolaSelecionada.rota_cor, width: 48, height: 48 }}>
                      <SchoolIcon />
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h5" fontWeight="bold">
                        {escolaSelecionada.escola_nome}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        🚚 {escolaSelecionada.rota_nome}
                      </Typography>
                      {escolaSelecionada.escola_endereco && (
                        <Typography variant="body2" color="text.secondary">
                          📍 {escolaSelecionada.escola_endereco}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={abrirModalAdicionar}
                      color="success"
                      size="small"
                    >
                      Adicionar Produto
                    </Button>
                  </Box>

                  <Box display="flex" gap={1}>
                    <Chip 
                      icon={<InventoryIcon />}
                      label={`${escolaSelecionada.total_itens} itens`} 
                      color="primary" 
                      variant="outlined" 
                    />
                    <Chip 
                      icon={<AssignmentIcon />}
                      label={`${escolaSelecionada.produtos_unicos} produtos`} 
                      color="secondary" 
                      variant="outlined" 
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Guia de Entrega */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📋 Guia de Entrega
                  </Typography>
                  
                  {escolaSelecionada.total_itens === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Esta escola não possui itens para entrega na configuração atual.
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'primary.50' }}>
                            <TableCell width={50}>#</TableCell>
                            <TableCell>Produto</TableCell>
                            <TableCell align="center">Quantidade</TableCell>
                            <TableCell align="center">Unidade</TableCell>
                            <TableCell align="center">Lote</TableCell>
                            <TableCell align="center">Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {escolaSelecionada.itens.map((item, index) => (
                            <TableRow key={item.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                  {index + 1}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.produto_nome}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" fontWeight="bold">
                                  {(Number(item.quantidade) || 0).toLocaleString('pt-BR', { 
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 3 
                                  })}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={item.unidade} 
                                  size="small" 
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={item.lote || 'S/L'} 
                                  size="small" 
                                  color="info"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <IconButton size="small" color="success">
                                  <RadioButtonUncheckedIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {/* Resumo */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Total de Itens
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {escolaSelecionada.total_itens}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Produtos Únicos
                        </Typography>
                        <Typography variant="h6" color="secondary">
                          {escolaSelecionada.produtos_unicos}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Status da Entrega
                        </Typography>
                        <Typography variant="h6" color="warning.main">
                          Pendente
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </CardContent>
              </Card>

              {/* Seção de Itens Não Marcados */}
              {itensNaoMarcados.length > 0 && (
                <Card sx={{ mt: 3 }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Typography variant="h6">
                        📦 Itens Disponíveis para Entrega
                      </Typography>
                      <Chip 
                        label={`${itensNaoMarcados.length} itens`} 
                        size="small" 
                        color="warning" 
                        variant="outlined" 
                      />
                    </Box>
                    
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Estes itens estão na guia mas não foram marcados para entrega. Clique em "Marcar" para incluí-los na guia de entrega.
                    </Alert>

                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'warning.50' }}>
                            <TableCell>Produto</TableCell>
                            <TableCell align="center">Quantidade</TableCell>
                            <TableCell align="center">Unidade</TableCell>
                            <TableCell align="center">Lote</TableCell>
                            <TableCell align="center">Ação</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {itensNaoMarcados.map((item) => (
                            <TableRow key={item.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.produto_nome}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" fontWeight="bold">
                                  {(Number(item.quantidade) || 0).toLocaleString('pt-BR', { 
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 3 
                                  })}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={item.unidade} 
                                  size="small" 
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={item.lote || 'S/L'} 
                                  size="small" 
                                  color="info"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => marcarParaEntrega(item.id)}
                                  disabled={marcandoItem === item.id}
                                  startIcon={marcandoItem === item.id ? <CircularProgress size={16} /> : undefined}
                                >
                                  {marcandoItem === item.id ? 'Marcando...' : 'Marcar'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center" 
              height="100%"
              color="text.secondary"
            >
              <SchoolIcon sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h6">
                Selecione uma escola
              </Typography>
              <Typography variant="body2">
                Escolha uma escola na lista à esquerda para ver os detalhes da entrega
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Modal para adicionar produto individual */}
      {configuracaoAtiva && (
        <AdicionarProdutoIndividual
          open={modalAdicionarAberto}
          onClose={fecharModalAdicionar}
          guia={{ 
            id: configuracaoAtiva.guiaId, 
            mes: 0, 
            ano: 0, 
            status: 'aberta' as const,
            createdAt: '',
            updatedAt: ''
          }}
          onUpdate={handleProdutoAdicionado}
          escolaPreSelecionada={escolaSelecionada ? {
            id: escolaSelecionada.escola_id,
            nome: escolaSelecionada.escola_nome
          } : undefined}
        />
      )}
    </Box>
  );
};

export default VisualizacaoEntregas;