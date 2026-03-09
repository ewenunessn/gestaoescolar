import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  InputAdornment,
  CircularProgress,
  Badge,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  CalendarMonth as CalendarIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { escolaService } from '../services/escolaService';
import { guiaService, GuiaProdutoEscola } from '../services/guiaService';
import { produtoService, Produto } from '../services/produtoService';
import { listarEstoqueEscola, EstoqueEscolarItem } from '../services/estoqueEscolarService';
import api from '../services/api';

interface Competencia {
  mes: number;
  ano: number;
  guia_id: number;
  guia_nome: string;
  guia_status: string;
  total_itens: number;
  total_escolas: number;
  qtd_pendente: number;
  qtd_programada: number;
  qtd_parcial: number;
  qtd_entregue: number;
  qtd_cancelado: number;
}

const GuiasDemandaRefatorado: React.FC = () => {
  // Estados de navegação
  const [view, setView] = useState<'competencias' | 'escolas' | 'detalhes'>('competencias');
  const [selectedCompetencia, setSelectedCompetencia] = useState<Competencia | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);

  // Estados de dados
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolProducts, setSchoolProducts] = useState<GuiaProdutoEscola[]>([]);
  const [products, setProducts] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de nova competência
  const [openNovaCompetencia, setOpenNovaCompetencia] = useState(false);
  const [novaCompetenciaForm, setNovaCompetenciaForm] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });

  // Menu de ações da competência
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedCompetenciaMenu, setSelectedCompetenciaMenu] = useState<Competencia | null>(null);

  // Modal de produto individual
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    produtoId: '',
    quantidade: '',
    unidade: '',
    data_entrega: new Date().toISOString().split('T')[0],
    observacao: '',
    status: 'pendente'
  });
  const [estoqueIndividual, setEstoqueIndividual] = useState<EstoqueEscolarItem | null>(null);

  // Modal de lote
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [batchForm, setBatchForm] = useState({
    produtoId: '',
    unidade: '',
    data_entrega: new Date().toISOString().split('T')[0]
  });
  const [batchQuantidades, setBatchQuantidades] = useState<Record<number, string>>({});
  const [batchStatus, setBatchStatus] = useState<Record<number, string>>({});
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    currentIndex: 0,
    total: 0,
    escolaNome: ''
  });
  const [batchEstoqueMap, setBatchEstoqueMap] = useState<Record<number, EstoqueEscolarItem | null>>({});

  const { success, error } = useNotification();

  // Carregar competências ao montar
  useEffect(() => {
    loadCompetencias();
    loadProducts();
  }, []);

  // Carregar escolas quando seleciona competência
  useEffect(() => {
    if (selectedCompetencia) {
      loadSchools();
    }
  }, [selectedCompetencia]);

  // Carregar produtos quando seleciona escola
  useEffect(() => {
    if (selectedSchool && selectedCompetencia) {
      loadSchoolProducts(selectedSchool.id);
    }
  }, [selectedSchool, selectedCompetencia]);

  const loadCompetencias = async () => {
    try {
      setLoading(true);
      const data = await guiaService.listarCompetencias();
      setCompetencias(data);
    } catch (err) {
      console.error('Erro ao carregar competências:', err);
      error('Erro ao carregar competências');
    } finally {
      setLoading(false);
    }
  };

  const loadSchools = async () => {
    if (!selectedCompetencia) return;
    
    try {
      setLoading(true);
      const data = await guiaService.listarStatusEscolas(
        selectedCompetencia.mes,
        selectedCompetencia.ano
      );
      setSchools(data);
    } catch (err) {
      console.error('Erro ao carregar escolas:', err);
      error('Erro ao carregar escolas');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await produtoService.listar();
      setProducts(data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    }
  };

  const loadSchoolProducts = async (escolaId: number) => {
    if (!selectedCompetencia) return;
    
    try {
      setLoading(true);
      const data = await guiaService.listarProdutosPorEscola(
        escolaId,
        selectedCompetencia.mes,
        selectedCompetencia.ano
      );
      setSchoolProducts(data);
    } catch (err) {
      console.error('Erro ao carregar produtos da escola:', err);
      error('Erro ao carregar produtos da escola');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarCompetencia = async () => {
    try {
      await guiaService.criarGuia({
        mes: novaCompetenciaForm.mes,
        ano: novaCompetenciaForm.ano,
        nome: `Guia ${novaCompetenciaForm.mes}/${novaCompetenciaForm.ano}`
      });
      success('Competência criada com sucesso!');
      setOpenNovaCompetencia(false);
      loadCompetencias();
    } catch (err) {
      console.error('Erro ao criar competência:', err);
      error('Erro ao criar competência');
    }
  };

  const handleOpenMenuCompetencia = (event: React.MouseEvent<HTMLElement>, comp: Competencia) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedCompetenciaMenu(comp);
  };

  const handleCloseMenuCompetencia = () => {
    setMenuAnchor(null);
    setSelectedCompetenciaMenu(null);
  };

  const handleExcluirCompetencia = async () => {
    if (!selectedCompetenciaMenu) return;

    if (window.confirm(
      `Tem certeza que deseja excluir a competência ${getMesNome(selectedCompetenciaMenu.mes)}/${selectedCompetenciaMenu.ano}?\n\n` +
      `Isso irá remover TODOS os ${selectedCompetenciaMenu.total_itens} itens cadastrados!`
    )) {
      try {
        await guiaService.deletarGuia(selectedCompetenciaMenu.guia_id);
        success('Competência excluída com sucesso!');
        handleCloseMenuCompetencia();
        loadCompetencias();
      } catch (err) {
        console.error('Erro ao excluir competência:', err);
        error('Erro ao excluir competência');
      }
    }
  };

  const handleBatchSubmit = async () => {
    if (!batchForm.produtoId || !batchForm.data_entrega || !selectedCompetencia) {
      error('Selecione produto e data de entrega');
      return;
    }

    const payloads = schools
      .map((school) => {
        const quantidade = Number(batchQuantidades[school.id] || 0);
        const status = batchStatus[school.id] || 'pendente';
        return {
          school,
          quantidade,
          status
        };
      })
      .filter((item) => item.quantidade > 0);

    if (payloads.length === 0) {
      error('Informe quantidade maior que zero em pelo menos uma escola');
      return;
    }

    try {
      setBatchSaving(true);
      setBatchProgress({
        currentIndex: 0,
        total: payloads.length,
        escolaNome: ''
      });

      for (let index = 0; index < payloads.length; index++) {
        const { school, quantidade, status } = payloads[index];
        setBatchProgress({
          currentIndex: index + 1,
          total: payloads.length,
          escolaNome: school.nome
        });

        const data = {
          produtoId: parseInt(batchForm.produtoId),
          quantidade,
          unidade: batchForm.unidade || 'Kg',
          data_entrega: batchForm.data_entrega,
          mes_competencia: selectedCompetencia.mes,
          ano_competencia: selectedCompetencia.ano,
          status
        };

        await guiaService.adicionarProdutoEscola(school.id, data);
      }

      success('Quantidades adicionadas com sucesso!');
      setOpenBatchDialog(false);
      setBatchQuantidades({});
      setBatchStatus({});
      loadSchools();
    } catch (err) {
      console.error('Erro ao salvar em lote:', err);
      error('Erro ao salvar quantidades em lote');
    } finally {
      setBatchSaving(false);
    }
  };

  // Carregar estoque para todas as escolas quando produto é selecionado
  useEffect(() => {
    const carregarBatchEstoque = async () => {
      if (!batchForm.produtoId || !openBatchDialog) {
        setBatchEstoqueMap({});
        return;
      }
      
      const produtoIdSel = Number(batchForm.produtoId);
      try {
        const results = await Promise.all(
          schools.map(async (s) => {
            try {
              const estoque = await listarEstoqueEscola(s.id);
              const item = estoque.find(i => i.produto_id === produtoIdSel) || null;
              return { id: s.id, item };
            } catch {
              return { id: s.id, item: null };
            }
          })
        );
        
        const map: Record<number, EstoqueEscolarItem | null> = {};
        results.forEach(({ id, item }) => { map[id] = item; });
        setBatchEstoqueMap(map);
      } catch {
        setBatchEstoqueMap({});
      }
    };
    
    carregarBatchEstoque();
  }, [batchForm.produtoId, openBatchDialog, schools]);

  // Carregar estoque individual quando produto é selecionado
  useEffect(() => {
    const carregar = async () => {
      if (!selectedSchool?.id || !formData.produtoId || !openDialog) {
        setEstoqueIndividual(null);
        return;
      }
      try {
        const estoque = await listarEstoqueEscola(Number(selectedSchool.id));
        const item = estoque.find(i => i.produto_id === Number(formData.produtoId)) || null;
        setEstoqueIndividual(item);
      } catch (e) {
        setEstoqueIndividual(null);
      }
    };
    carregar();
  }, [selectedSchool?.id, formData.produtoId, openDialog]);

  const handleProductChange = (produtoId: number) => {
    const product = products.find(p => p.id === produtoId);
    setFormData(prev => ({
      ...prev,
      produtoId: produtoId.toString(),
      unidade: product?.unidade_contrato || product?.unidade || 'Kg'
    }));
  };

  const handleSubmitIndividual = async () => {
    if (!selectedSchool || !selectedCompetencia) return;
    
    if (!formData.produtoId || !formData.quantidade || !formData.data_entrega) {
      error('Preencha todos os campos obrigatórios');
      return;
    }

    if (parseFloat(formData.quantidade) <= 0) {
      error('A quantidade deve ser maior que zero');
      return;
    }

    try {
      const data = {
        produtoId: parseInt(formData.produtoId),
        quantidade: parseFloat(formData.quantidade),
        unidade: formData.unidade || 'Kg',
        data_entrega: formData.data_entrega,
        mes_competencia: selectedCompetencia.mes,
        ano_competencia: selectedCompetencia.ano,
        observacao: formData.observacao,
        status: formData.status
      };

      if (editMode && selectedItemId) {
        await guiaService.atualizarProdutoEscola(selectedItemId, data);
        success('Produto atualizado com sucesso!');
      } else {
        await guiaService.adicionarProdutoEscola(selectedSchool.id, data);
        success('Produto adicionado com sucesso!');
      }

      setOpenDialog(false);
      loadSchoolProducts(selectedSchool.id);
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      error('Erro ao salvar produto');
    }
  };

  const handleDeleteProduct = async (item: GuiaProdutoEscola) => {
    if (window.confirm('Tem certeza que deseja remover este item?')) {
      try {
        if (item.id) {
          await guiaService.removerItemGuia(item.id);
          success('Item removido com sucesso');
          if (selectedSchool) loadSchoolProducts(selectedSchool.id);
        }
      } catch (err) {
        console.error('Erro ao remover item:', err);
        error('Erro ao remover item');
      }
    }
  };

  const handleEditProduct = (item: GuiaProdutoEscola) => {
    setEditMode(true);
    setSelectedItemId(item.id);
    setFormData({
      produtoId: item.produto_id?.toString() || item.produto?.id.toString() || '',
      quantidade: item.quantidade.toString(),
      unidade: item.unidade,
      data_entrega: item.data_entrega ? item.data_entrega.split('T')[0] : new Date().toISOString().split('T')[0],
      observacao: item.observacao || '',
      status: item.status || 'pendente'
    });
    setOpenDialog(true);
  };

  const handleSelectCompetencia = (comp: Competencia) => {
    setSelectedCompetencia(comp);
    setView('escolas');
  };

  const handleBackToCompetencias = () => {
    setSelectedCompetencia(null);
    setView('competencias');
    setSchools([]);
  };

  const handleSelectSchool = (school: any) => {
    setSelectedSchool(school);
    setView('detalhes');
  };

  const handleBackToSchools = () => {
    setSelectedSchool(null);
    setView('escolas');
    setSchoolProducts([]);
  };

  const getCompetenciaStatusColor = (comp: Competencia) => {
    if (comp.total_itens === 0) return '#9e9e9e';
    if (comp.qtd_pendente > 0) return '#f44336';
    if (comp.qtd_programada > 0) return '#2196f3';
    if (comp.qtd_parcial > 0) return '#ff9800';
    return '#4caf50';
  };

  const getSchoolStatusColor = (school: any) => {
    const qtdPendente = Number(school.qtd_pendente) || 0;
    const qtdProgramada = Number(school.qtd_programada) || 0;
    const qtdParcial = Number(school.qtd_parcial) || 0;
    const qtdEntregue = Number(school.qtd_entregue) || 0;
    const qtdCancelado = Number(school.qtd_cancelado) || 0;
    
    const totalItens = qtdPendente + qtdProgramada + qtdParcial + qtdEntregue + qtdCancelado;
    
    if (totalItens === 0) return '#9e9e9e';
    if (qtdPendente > 0) return '#f44336';
    if (qtdProgramada > 0) return '#2196f3';
    if (qtdParcial > 0) return '#ff9800';
    return '#4caf50';
  };

  const getMesNome = (mes: number) => {
    return new Date(0, mes - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
  };

  // Renderizar lista de competências
  const renderCompetencias = () => {
    return (
      <Box>
        <PageHeader 
          title="Guia de Demanda - Competências" 
          subtitle="Selecione uma competência para gerenciar"
        />

        <Box mb={3} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenNovaCompetencia(true)}
          >
            Nova Competência
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {competencias.map((comp) => {
              const statusColor = getCompetenciaStatusColor(comp);
              
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`${comp.ano}-${comp.mes}`}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: 6, transform: 'translateY(-4px)' },
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '2px solid #e0e0e0',
                      position: 'relative'
                    }}
                  >
                    {/* Botão de menu no canto superior direito */}
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenMenuCompetencia(e, comp)}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        zIndex: 1,
                        '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>

                    <Box
                      onClick={() => handleSelectCompetencia(comp)}
                      sx={{
                        bgcolor: statusColor,
                        p: 2,
                        color: '#fff',
                        textAlign: 'center'
                      }}
                    >
                      <CalendarIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {getMesNome(comp.mes)}
                      </Typography>
                      <Typography variant="h6">
                        {comp.ano}
                      </Typography>
                    </Box>

                    <CardContent onClick={() => handleSelectCompetencia(comp)}>
                      <Box display="flex" flexDirection="column" gap={1}>
                        <Typography variant="body2" color="textSecondary">
                          {comp.total_itens} {comp.total_itens === 1 ? 'item' : 'itens'} • {comp.total_escolas} {comp.total_escolas === 1 ? 'escola' : 'escolas'}
                        </Typography>
                        
                        {comp.qtd_pendente > 0 && (
                          <Chip
                            size="small"
                            label={`${comp.qtd_pendente} Pendente${comp.qtd_pendente > 1 ? 's' : ''}`}
                            sx={{ bgcolor: '#f44336', color: '#fff' }}
                          />
                        )}
                        {comp.qtd_programada > 0 && (
                          <Chip
                            size="small"
                            label={`${comp.qtd_programada} Programada${comp.qtd_programada > 1 ? 's' : ''}`}
                            sx={{ bgcolor: '#2196f3', color: '#fff' }}
                          />
                        )}
                        {comp.qtd_parcial > 0 && (
                          <Chip
                            size="small"
                            label={`${comp.qtd_parcial} Parcial${comp.qtd_parcial > 1 ? 'is' : ''}`}
                            sx={{ bgcolor: '#ff9800', color: '#fff' }}
                          />
                        )}
                        {comp.qtd_entregue > 0 && (
                          <Chip
                            size="small"
                            label={`${comp.qtd_entregue} Entregue${comp.qtd_entregue > 1 ? 's' : ''}`}
                            sx={{ bgcolor: '#4caf50', color: '#fff' }}
                          />
                        )}
                        {comp.total_itens === 0 && (
                          <Typography variant="caption" color="textSecondary" fontStyle="italic">
                            Nenhum item cadastrado
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Dialog Nova Competência */}
        <Dialog open={openNovaCompetencia} onClose={() => setOpenNovaCompetencia(false)}>
          <DialogTitle>Nova Competência</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={2}>
              <FormControl fullWidth>
                <InputLabel>Mês</InputLabel>
                <Select
                  value={novaCompetenciaForm.mes}
                  onChange={(e) => setNovaCompetenciaForm(prev => ({ ...prev, mes: Number(e.target.value) }))}
                  label="Mês"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {getMesNome(i + 1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Ano</InputLabel>
                <Select
                  value={novaCompetenciaForm.ano}
                  onChange={(e) => setNovaCompetenciaForm(prev => ({ ...prev, ano: Number(e.target.value) }))}
                  label="Ano"
                >
                  {[2024, 2025, 2026, 2027].map(ano => (
                    <MenuItem key={ano} value={ano}>{ano}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNovaCompetencia(false)}>Cancelar</Button>
            <Button onClick={handleCriarCompetencia} variant="contained">Criar</Button>
          </DialogActions>
        </Dialog>

        {/* Menu de Ações da Competência */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleCloseMenuCompetencia}
        >
          <MenuItem onClick={handleExcluirCompetencia}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Excluir Competência</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    );
  };

  // Renderizar lista de escolas (similar ao atual, mas sem seletores de mês/ano)
  const renderEscolas = () => {
    if (!selectedCompetencia) return null;

    const filteredSchools = schools.filter(school => 
      school.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={handleBackToCompetencias} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box flexGrow={1}>
            <Typography variant="h4">
              {getMesNome(selectedCompetencia.mes)} / {selectedCompetencia.ano}
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Selecione uma escola para gerenciar produtos
            </Typography>
          </Box>
        </Box>

        <Box mb={3} display="flex" gap={2}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Buscar escola..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenBatchDialog(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Adicionar em Lote
          </Button>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={4}>
            {Object.entries(
              filteredSchools.reduce((acc, school) => {
                const rota = school.escola_rota || 'Sem Rota';
                if (!acc[rota]) acc[rota] = [];
                acc[rota].push(school);
                return acc;
              }, {} as Record<string, typeof schools>)
            ).map(([rota, schoolsInRota]) => (
              <Box key={rota}>
                <Typography variant="h5" sx={{ mb: 2, borderBottom: '2px solid #e0e0e0', pb: 1, color: '#1976d2', fontWeight: 'bold' }}>
                  {rota}
                </Typography>
                <Grid container spacing={2}>
                  {schoolsInRota.map((school) => {
                    const statusColor = getSchoolStatusColor(school);

                    return (
                      <Grid item xs={12} sm={6} md={4} lg={2} key={school.id}>
                        <Card 
                          onClick={() => handleSelectSchool(school)}
                          sx={{ 
                            cursor: 'pointer', 
                            height: '100%',
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '1px solid #e0e0e0'
                          }}
                        >
                          <Box 
                            sx={{ 
                              bgcolor: statusColor, 
                              p: 1.5,
                              color: '#fff',
                              textAlign: 'center',
                              minHeight: 60
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                              {school.nome}
                            </Typography>
                          </Box>

                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="h3" sx={{ fontWeight: 'bold', color: statusColor, textAlign: 'center' }}>
                              {school.ordem_rota || '-'}
                            </Typography>
                            
                            <Box sx={{ mt: 1, textAlign: 'center' }}>
                              {(() => {
                                const qtdPendente = Number(school.qtd_pendente) || 0;
                                const qtdProgramada = Number(school.qtd_programada) || 0;
                                const qtdParcial = Number(school.qtd_parcial) || 0;
                                const qtdEntregue = Number(school.qtd_entregue) || 0;
                                const totalItens = qtdPendente + qtdProgramada + qtdParcial + qtdEntregue;
                                
                                if (totalItens === 0) {
                                  return (
                                    <Typography variant="caption" sx={{ color: '#9e9e9e', fontStyle: 'italic' }}>
                                      Sem itens
                                    </Typography>
                                  );
                                }
                                
                                return (
                                  <>
                                    {qtdPendente > 0 && (
                                      <Typography variant="caption" sx={{ display: 'block', color: '#f44336', fontWeight: 600 }}>
                                        {qtdPendente} Pendente{qtdPendente > 1 ? 's' : ''}
                                      </Typography>
                                    )}
                                    {qtdProgramada > 0 && (
                                      <Typography variant="caption" sx={{ display: 'block', color: '#2196f3', fontWeight: 600 }}>
                                        {qtdProgramada} Programada{qtdProgramada > 1 ? 's' : ''}
                                      </Typography>
                                    )}
                                    {qtdParcial > 0 && (
                                      <Typography variant="caption" sx={{ display: 'block', color: '#ff9800', fontWeight: 600 }}>
                                        {qtdParcial} Parcial{qtdParcial > 1 ? 'is' : ''}
                                      </Typography>
                                    )}
                                    {qtdEntregue > 0 && (
                                      <Typography variant="caption" sx={{ display: 'block', color: '#4caf50', fontWeight: 600 }}>
                                        {qtdEntregue} Entregue{qtdEntregue > 1 ? 's' : ''}
                                      </Typography>
                                    )}
                                  </>
                                );
                              })()}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  // Renderizar detalhes da escola (tabela de produtos - manter igual ao atual)
  const renderDetalhes = () => {
    if (!selectedSchool || !selectedCompetencia) return null;

    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={handleBackToSchools} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box flexGrow={1}>
            <Typography variant="h4">{selectedSchool.nome}</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {getMesNome(selectedCompetencia.mes)} / {selectedCompetencia.ano}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditMode(false);
              setFormData({
                produtoId: '',
                quantidade: '',
                unidade: '',
                data_entrega: new Date().toISOString().split('T')[0],
                observacao: '',
                status: 'pendente'
              });
              setOpenDialog(true);
            }}
          >
            Adicionar Produto
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data Entrega</TableCell>
                <TableCell>Produto</TableCell>
                <TableCell>Quantidade</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Observação</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {schoolProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                schoolProducts.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.data_entrega ? new Date(item.data_entrega).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{item.produto_nome || item.produto?.nome || 'Produto desconhecido'}</TableCell>
                    <TableCell>
                      {item.quantidade} {item.unidade}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.status?.toUpperCase() || 'PENDENTE'} 
                        color={
                          item.status === 'entregue' ? 'success' :
                          item.status === 'parcial' ? 'warning' :
                          item.status === 'programada' ? 'info' :
                          item.status === 'cancelado' ? 'default' : 'error'
                        }
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{item.observacao || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="primary" onClick={() => handleEditProduct(item)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteProduct(item)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box p={3}>
      {view === 'competencias' && renderCompetencias()}
      {view === 'escolas' && renderEscolas()}
      {view === 'detalhes' && renderDetalhes()}

      {/* Dialog de Produto Individual */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Editar Produto' : 'Adicionar Produto'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <FormControl fullWidth>
              <InputLabel>Produto</InputLabel>
              <Select
                value={formData.produtoId}
                onChange={(e) => handleProductChange(Number(e.target.value))}
                label="Produto"
              >
                {products.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box display="flex" gap={2} alignItems="center">
              {estoqueIndividual && (
                <Chip
                  size="small"
                  label={`Estoque: ${estoqueIndividual.quantidade_atual ?? 0} ${estoqueIndividual.unidade}`}
                  color={Number(estoqueIndividual.quantidade_atual) > 0 ? 'success' : 'default'}
                />
              )}
              <TextField
                label="Quantidade"
                type="number"
                fullWidth
                value={formData.quantidade}
                onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
              />
              <TextField
                label="Unidade"
                fullWidth
                value={formData.unidade}
                onChange={(e) => setFormData({...formData, unidade: e.target.value})}
                sx={{ maxWidth: 120 }}
              />
            </Box>

            <TextField
              label="Data de Entrega"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.data_entrega}
              onChange={(e) => setFormData({...formData, data_entrega: e.target.value})}
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                label="Status"
              >
                <MenuItem value="pendente">Pendente</MenuItem>
                <MenuItem value="programada">Programada</MenuItem>
                <MenuItem value="parcial">Parcial</MenuItem>
                <MenuItem value="entregue">Entregue</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Observação"
              multiline
              rows={3}
              fullWidth
              value={formData.observacao}
              onChange={(e) => setFormData({...formData, observacao: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSubmitIndividual} variant="contained" color="primary">
            {editMode ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Adicionar em Lote */}
      <Dialog open={openBatchDialog} onClose={() => setOpenBatchDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Adicionar Produtos em Lote</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Produto</InputLabel>
                  <Select
                    value={batchForm.produtoId}
                    onChange={(e) => setBatchForm(prev => ({ ...prev, produtoId: e.target.value }))}
                    label="Produto"
                    disabled={batchSaving}
                  >
                    {products.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Unidade"
                  fullWidth
                  value={batchForm.unidade}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, unidade: e.target.value }))}
                  disabled={batchSaving}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Data de Entrega"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={batchForm.data_entrega}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, data_entrega: e.target.value }))}
                  disabled={batchSaving}
                />
              </Grid>
            </Grid>

            {batchForm.produtoId && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Preencha as quantidades para cada escola:
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Escola</TableCell>
                        <TableCell>Rota</TableCell>
                        <TableCell width={120}>Estoque Atual</TableCell>
                        <TableCell width={150}>Quantidade</TableCell>
                        <TableCell width={150}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schools.map((school) => {
                        const estoqueItem = batchEstoqueMap[school.id];
                        const temEstoque = estoqueItem && estoqueItem.quantidade_atual !== null && estoqueItem.quantidade_atual !== undefined;
                        
                        return (
                          <TableRow key={school.id}>
                            <TableCell>{school.nome}</TableCell>
                            <TableCell>{school.escola_rota || '-'}</TableCell>
                            <TableCell>
                              {temEstoque ? (
                                <Chip
                                  size="small"
                                  label={`${estoqueItem.quantidade_atual} ${estoqueItem.unidade}`}
                                  color={Number(estoqueItem.quantidade_atual) > 0 ? 'success' : 'default'}
                                  sx={{ minWidth: 80 }}
                                />
                              ) : (
                                <Typography variant="caption" color="textSecondary">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                size="small"
                                fullWidth
                                value={batchQuantidades[school.id] || ''}
                                onChange={(e) => setBatchQuantidades(prev => ({
                                  ...prev,
                                  [school.id]: e.target.value
                                }))}
                                disabled={batchSaving}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                fullWidth
                                value={batchStatus[school.id] || 'pendente'}
                                onChange={(e) => setBatchStatus(prev => ({
                                  ...prev,
                                  [school.id]: e.target.value
                                }))}
                                disabled={batchSaving}
                              >
                                <MenuItem value="pendente">Pendente</MenuItem>
                                <MenuItem value="programada">Programada</MenuItem>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {batchSaving && (
              <Box display="flex" alignItems="center" gap={2}>
                <CircularProgress size={24} />
                <Typography>
                  Salvando {batchProgress.currentIndex} de {batchProgress.total}...
                  {batchProgress.escolaNome && ` (${batchProgress.escolaNome})`}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBatchDialog(false)} disabled={batchSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleBatchSubmit} 
            variant="contained" 
            disabled={!batchForm.produtoId || batchSaving}
          >
            {batchSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuiasDemandaRefatorado;
