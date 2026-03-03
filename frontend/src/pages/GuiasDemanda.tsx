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
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalShipping as ShippingIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';
import { escolaService } from '../services/escolaService';
import { guiaService, GuiaProdutoEscola } from '../services/guiaService';
import { produtoService, Produto } from '../services/produtoService';
import { listarEstoqueEscola, EstoqueEscolarItem } from '../services/estoqueEscolarService';
import api from '../services/api';

const GuiasDemanda: React.FC = () => {
  // Estados principais
  const [view, setView] = useState<'list' | 'details'>('list');
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [schoolProducts, setSchoolProducts] = useState<GuiaProdutoEscola[]>([]);
  const [products, setProducts] = useState<Produto[]>([]);
  
  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Modal e Formulário
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    produtoId: '',
    quantidade: '',
    unidade: '',
    data_entrega: new Date().toISOString().split('T')[0],
    mes_competencia: new Date().getMonth() + 1,
    ano_competencia: new Date().getFullYear(),
    observacao: '',
    status: 'pendente'
  });
  const [openBatchDialog, setOpenBatchDialog] = useState(false);
  const [batchMode, setBatchMode] = useState<'add' | 'edit'>('add');
  const [batchForm, setBatchForm] = useState({
    produtoId: '',
    unidade: '',
    data_entrega: new Date().toISOString().split('T')[0],
    mes_competencia: new Date().getMonth() + 1,
    ano_competencia: new Date().getFullYear()
  });
  const [batchQuantidades, setBatchQuantidades] = useState<Record<number, string>>({});
  const [batchUnidades, setBatchUnidades] = useState<Record<number, string>>({});
  const [batchStatus, setBatchStatus] = useState<Record<number, string>>({});
  const [batchItensExistentes, setBatchItensExistentes] = useState<Record<number, GuiaProdutoEscola | null>>({});
  const [batchLoadingExisting, setBatchLoadingExisting] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    currentIndex: 0,
    total: 0,
    escolaNome: '',
    quantidade: '',
    unidade: ''
  });
  const [estoqueIndividual, setEstoqueIndividual] = useState<EstoqueEscolarItem | null>(null);
  const [batchEstoqueMap, setBatchEstoqueMap] = useState<Record<number, EstoqueEscolarItem | null>>({});
  const [mesStatusMap, setMesStatusMap] = useState<Record<number, 'none' | 'pendente' | 'programada' | 'em_rota'>>({});
  
  // Modal de histórico
  const [openHistoricoDialog, setOpenHistoricoDialog] = useState(false);
  const [historicoItem, setHistoricoItem] = useState<GuiaProdutoEscola | null>(null);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoEntregas, setHistoricoEntregas] = useState<any[]>([]);

  const { success, error } = useNotification();

  // Carregar dados iniciais
  useEffect(() => {
    loadSchools();
    loadProducts();
  }, [currentMonth, currentYear]); // Recarrega ao mudar mês/ano

  // Carregar produtos quando uma escola é selecionada ou quando muda mês/ano
  useEffect(() => {
    if (selectedSchool) {
      loadSchoolProducts(selectedSchool.id);
    }
  }, [selectedSchool, currentMonth, currentYear]);

  const loadSchools = async () => {
    try {
      setLoading(true);
      // Carrega escolas com status para o mês atual
      const data = await guiaService.listarStatusEscolas(currentMonth, currentYear);
      setSchools(data);
    } catch (err) {
      console.error('Erro ao carregar escolas:', err);
      error('Erro ao carregar lista de escolas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const carregarStatusMeses = async () => {
      const meses = Array.from({ length: 12 }, (_, i) => i + 1);
      const results = await Promise.all(
        meses.map(async (m) => {
          try {
            const data = await guiaService.listarStatusEscolas(m, currentYear);
            let pend = 0;
            let prog = 0;
            let rota = 0;
            if (Array.isArray(data)) {
              data.forEach((s: any) => {
                pend += Number(s.qtd_pendente || 0);
                prog += Number(s.qtd_programada || 0);
                rota += Number(s.qtd_em_rota || 0);
              });
            }
            const status: 'none' | 'pendente' | 'programada' | 'em_rota' =
              pend > 0 ? 'pendente' : prog > 0 ? 'programada' : rota > 0 ? 'em_rota' : 'none';
            return { m, status };
          } catch {
            return { m, status: 'none' as const };
          }
        })
      );
      const map: Record<number, 'none' | 'pendente' | 'programada' | 'em_rota'> = {};
      results.forEach(({ m, status }) => (map[m] = status));
      setMesStatusMap(map);
    };
    carregarStatusMeses();
  }, [currentYear]);

  const getSchoolStatusColor = (school: any) => {
    if (school.qtd_pendente > 0) return '#f44336'; // Vermelho
    if (school.qtd_programada > 0) return '#2196f3'; // Azul
    if (school.qtd_em_rota > 0) return '#ff9800'; // Laranja
    return '#4caf50'; // Verde
  };

  const getStatusText = (school: any) => {
    if (school.qtd_pendente > 0) return 'PENDENTE';
    if (school.qtd_programada > 0) return 'PROGRAMADO';
    if (school.qtd_em_rota > 0) return 'EM ROTA';
    return 'CONCLUÍDO';
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
    try {
      setLoading(true);
      const data = await guiaService.listarProdutosPorEscola(escolaId, currentMonth, currentYear);
      setSchoolProducts(data);
    } catch (err) {
      console.error('Erro ao carregar produtos da escola:', err);
      error('Erro ao carregar produtos da escola');
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolClick = (school: any) => {
    setSelectedSchool(school);
    setView('details');
  };

  const handleBack = () => {
    setSelectedSchool(null);
    setView('list');
    setSchoolProducts([]);
  };

  const handleOpenDialog = (item?: GuiaProdutoEscola) => {
    if (item) {
      setEditMode(true);
      setSelectedItemId(item.id);
      
      // Se o item tem data_entrega, usar o mês/ano dela como padrão
      const dataEntrega = item.data_entrega ? new Date(item.data_entrega) : new Date();
      
      setFormData({
        produtoId: item.produto_id?.toString() || item.produto?.id.toString() || '',
        quantidade: item.quantidade.toString(),
        unidade: item.unidade,
        data_entrega: item.data_entrega ? item.data_entrega.split('T')[0] : new Date().toISOString().split('T')[0],
        mes_competencia: dataEntrega.getMonth() + 1,
        ano_competencia: dataEntrega.getFullYear(),
        observacao: item.observacao || '',
        status: item.status || 'pendente'
      });
    } else {
      setEditMode(false);
      setSelectedItemId(null);
      setFormData({
        produtoId: '',
        quantidade: '',
        unidade: '',
        data_entrega: new Date().toISOString().split('T')[0],
        mes_competencia: new Date().getMonth() + 1,
        ano_competencia: new Date().getFullYear(),
        observacao: '',
        status: 'pendente'
      });
    }
    setOpenDialog(true);
  };

  const handleOpenHistorico = async (item: GuiaProdutoEscola) => {
    setHistoricoItem(item);
    setOpenHistoricoDialog(true);
    setHistoricoLoading(true);
    
    try {
      // Buscar histórico de entregas do item usando o serviço api
      const response = await api.get(`/entregas/itens/${item.id}/historico`);
      setHistoricoEntregas(response.data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      error('Erro ao carregar histórico de entregas');
      setHistoricoEntregas([]);
    } finally {
      setHistoricoLoading(false);
    }
  };

  const handleCloseHistorico = () => {
    setOpenHistoricoDialog(false);
    setHistoricoItem(null);
    setHistoricoEntregas([]);
  };

  const handleProductChange = (produtoId: number) => {
    const product = products.find(p => p.id === produtoId);
    setFormData(prev => ({
      ...prev,
      produtoId: produtoId.toString(),
      unidade: product?.unidade_contrato || 'Kg'
    }));
  };

  const handleBatchProductChange = (produtoId: number) => {
    const product = products.find(p => p.id === produtoId);
    setBatchForm(prev => ({
      ...prev,
      produtoId: produtoId.toString(),
      unidade: product?.unidade_contrato || product?.unidade || 'Kg'
    }));
  };

  // Carregar estoque para o diálogo individual
  useEffect(() => {
    const carregar = async () => {
      if (!selectedSchool?.id || !formData.produtoId) {
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
  }, [selectedSchool?.id, formData.produtoId]);

  // Carregar estoque para todas as escolas no lote quando produto é selecionado
  useEffect(() => {
    const carregarBatchEstoque = async () => {
      if (!batchForm.produtoId) {
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
    if (openBatchDialog) {
      void carregarBatchEstoque();
    }
  }, [batchForm.produtoId, openBatchDialog, schools]);

  const handleBatchQuantidadeChange = (escolaId: number, value: string) => {
    setBatchQuantidades(prev => ({
      ...prev,
      [escolaId]: value
    }));
  };

  const handleBatchUnidadeChange = (escolaId: number, value: string) => {
    setBatchUnidades(prev => ({
      ...prev,
      [escolaId]: value
    }));
  };

  const handleBatchStatusChange = (escolaId: number, value: string) => {
    setBatchStatus(prev => ({
      ...prev,
      [escolaId]: value
    }));
  };

  const abrirBatchDialog = () => {
    setBatchMode('add');
    setBatchForm({
      produtoId: '',
      unidade: '',
      data_entrega: new Date().toISOString().split('T')[0],
      mes_competencia: new Date().getMonth() + 1,
      ano_competencia: new Date().getFullYear()
    });
    setBatchQuantidades({});
    setBatchUnidades({});
    setBatchStatus({});
    setBatchItensExistentes({});
    setBatchSaving(false);
    setBatchProgress({
      currentIndex: 0,
      total: 0,
      escolaNome: '',
      quantidade: '',
      unidade: ''
    });
    setOpenBatchDialog(true);
  };

  const normalizarData = (data?: string | null) => {
    if (!data) return '';
    return data.split('T')[0];
  };

  const carregarItensBatch = async () => {
    if (!batchForm.produtoId || !batchForm.data_entrega) return;
    if (schools.length === 0) return;
    try {
      setBatchLoadingExisting(true);
      const produtoIdSelecionado = Number(batchForm.produtoId);
      const itensPorEscola = await Promise.all(
        schools.map(async (school) => {
          const itens = await guiaService.listarProdutosPorEscola(school.id, currentMonth, currentYear);
          const item = itens.find((it) => {
            const produtoId = it.produto_id || it.produto?.id;
            return produtoId === produtoIdSelecionado && normalizarData(it.data_entrega) === batchForm.data_entrega;
          });
          return { schoolId: school.id, item: item || null };
        })
      );

      const quantidades: Record<number, string> = {};
      const unidades: Record<number, string> = {};
      const status: Record<number, string> = {};
      const itensMap: Record<number, GuiaProdutoEscola | null> = {};

      itensPorEscola.forEach(({ schoolId, item }) => {
        itensMap[schoolId] = item;
        if (item) {
          quantidades[schoolId] = item.quantidade?.toString() || '';
          unidades[schoolId] = item.unidade || batchForm.unidade || 'Kg';
          status[schoolId] = item.status || 'pendente';
        } else {
          quantidades[schoolId] = '';
          unidades[schoolId] = batchForm.unidade || 'Kg';
          status[schoolId] = 'pendente';
        }
      });

      setBatchItensExistentes(itensMap);
      setBatchQuantidades(quantidades);
      setBatchUnidades(unidades);
      setBatchStatus(status);
    } catch (err) {
      console.error('Erro ao carregar itens em lote:', err);
      error('Erro ao carregar itens para edição em lote');
    } finally {
      setBatchLoadingExisting(false);
    }
  };

  useEffect(() => {
    if (batchMode !== 'edit') return;
    if (!openBatchDialog) return;
    if (!batchForm.produtoId || !batchForm.data_entrega) return;
    carregarItensBatch();
  }, [batchMode, batchForm.produtoId, batchForm.data_entrega, openBatchDialog, currentMonth, currentYear]);

  const handleBatchSubmit = async () => {
    if (!batchForm.produtoId || !batchForm.data_entrega) {
      error('Selecione produto e data de entrega');
      return;
    }
    const payloads = schools
      .map((school) => {
        const quantidade = Number(batchQuantidades[school.id] || 0);
        const unidade = batchUnidades[school.id] || batchForm.unidade || 'Kg';
        const status = batchStatus[school.id] || 'pendente';
        const itemExistente = batchItensExistentes[school.id];
        return {
          school,
          quantidade,
          unidade,
          status,
          itemExistente
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
        escolaNome: '',
        quantidade: '',
        unidade: batchForm.unidade || 'Kg'
      });
      for (let index = 0; index < payloads.length; index++) {
        const { school, quantidade, unidade, status, itemExistente } = payloads[index];
        setBatchProgress({
          currentIndex: index + 1,
          total: payloads.length,
          escolaNome: school.nome,
          quantidade: quantidade.toString(),
          unidade
        });
        const data = {
          produtoId: parseInt(batchForm.produtoId),
          quantidade,
          unidade,
          data_entrega: batchForm.data_entrega,
          mes_competencia: batchForm.mes_competencia,
          ano_competencia: batchForm.ano_competencia,
          status
        };
        if (batchMode === 'edit' && itemExistente?.id) {
          await guiaService.atualizarProdutoEscola(itemExistente.id, data);
        } else {
          await guiaService.adicionarProdutoEscola(school.id, data);
        }
      }
      success(batchMode === 'edit' ? 'Quantidades atualizadas com sucesso' : 'Quantidades adicionadas com sucesso');
      setOpenBatchDialog(false);
      loadSchools();
    } catch (err) {
      console.error('Erro ao salvar em lote:', err);
      error('Erro ao salvar quantidades em lote');
    } finally {
      setBatchSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!selectedSchool) return;
      if (!formData.produtoId || !formData.quantidade || !formData.data_entrega) {
        error('Preencha todos os campos obrigatórios');
        return;
      }

      if (parseFloat(formData.quantidade) <= 0) {
        error('A quantidade deve ser maior que zero');
        return;
      }

      const data = {
        produtoId: parseInt(formData.produtoId),
        quantidade: parseFloat(formData.quantidade),
        unidade: formData.unidade || 'Kg',
        data_entrega: formData.data_entrega,
        mes_competencia: formData.mes_competencia,
        ano_competencia: formData.ano_competencia,
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
        } else if (item.guia_id && item.produto_id && item.escola_id) {
          await guiaService.removerProdutoGuia(item.guia_id, item.produto_id, item.escola_id);
        } else {
          console.error('Item sem ID ou dados insuficientes:', item);
          error('Erro: Identificador do item não encontrado');
          return;
        }
        
        success('Item removido com sucesso');
        if (selectedSchool) loadSchoolProducts(selectedSchool.id);
      } catch (err) {
        console.error('Erro ao remover item:', err);
        error('Erro ao remover item');
      }
    }
  };

  // Função para formatar números removendo zeros desnecessários
  const formatarQuantidade = (valor: number | null | undefined): string => {
    const num = Number(valor) || 0;
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entregue': return 'success';
      case 'parcial': return 'warning';
      case 'pendente': return 'warning';
      case 'cancelado': return 'error';
      case 'em_rota': return 'info';
      case 'programada': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'entregue': return <CheckCircleIcon fontSize="small" />;
      case 'parcial': return <CheckCircleIcon fontSize="small" />;
      case 'pendente': return <ScheduleIcon fontSize="small" />;
      case 'cancelado': return <CancelIcon fontSize="small" />;
      case 'em_rota': return <ShippingIcon fontSize="small" />;
      case 'programada': return <ScheduleIcon fontSize="small" color="disabled" />;
      default: return null;
    }
  };

  // Renderização da Lista de Escolas
  const renderSchoolList = () => {
    const filteredSchools = schools.filter(school => 
      school.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <Box>
        <PageHeader 
          title="Guia de Demanda por Escola" 
          subtitle="Selecione uma escola para gerenciar as demandas"
        />
        
        <Box mb={3} display="flex" gap={2}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Mês</InputLabel>
            <Select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              label="Mês"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor:
                          mesStatusMap[i + 1] === 'pendente'
                            ? '#f44336'
                            : mesStatusMap[i + 1] === 'programada'
                            ? '#2196f3'
                            : mesStatusMap[i + 1] === 'em_rota'
                            ? '#ff9800'
                            : 'divider'
                      }}
                    />
                    {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Ano</InputLabel>
            <Select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              label="Ano"
            >
              <MenuItem value={2024}>2024</MenuItem>
              <MenuItem value={2025}>2025</MenuItem>
              <MenuItem value={2026}>2026</MenuItem>
            </Select>
          </FormControl>
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
            onClick={abrirBatchDialog}
            sx={{ whiteSpace: 'nowrap', textTransform: 'none', px: 1.5 }}
          >
            Qtd. em lote
          </Button>
        </Box>

        <Box mb={2} display="flex" gap={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={16} height={16} bgcolor="#f44336" borderRadius="50%" />
            <Typography variant="caption">Pendente (Para Entrega)</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={16} height={16} bgcolor="#2196f3" borderRadius="50%" />
            <Typography variant="caption">Programada (Aguardando)</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box width={16} height={16} bgcolor="#4caf50" borderRadius="50%" />
            <Typography variant="caption">Sem Pendências</Typography>
          </Box>
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
                    const statusText = getStatusText(school);

                    return (
                      <Grid item xs={12} sm={6} md={4} lg={2} key={school.id}>
                        <Card 
                          onClick={() => handleSchoolClick(school)}
                          sx={{ 
                            cursor: 'pointer', 
                            height: '100%',
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                            borderRadius: 2,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            border: '1px solid #e0e0e0'
                          }}
                        >
                          {/* Header Colorido com Nome e Endereço */}
                          <Box 
                            sx={{ 
                              bgcolor: statusColor, 
                              p: 1.5,
                              color: '#fff',
                              textAlign: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              minHeight: 60
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2, textTransform: 'uppercase', fontSize: '0.85rem' }}>
                              {school.nome}
                            </Typography>
                          </Box>

                          {/* Corpo Branco com Ordem na Rota */}
                          <CardContent sx={{ 
                            flexGrow: 1, 
                            bgcolor: '#fff', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            p: 1.5,
                            '&:last-child': { pb: 1.5 }
                          }}>
                            <Typography 
                              variant="h3" 
                              component="div" 
                              sx={{ 
                                fontWeight: 'bold', 
                                color: statusColor,
                                lineHeight: 1,
                                mb: 0.5
                              }}
                            >
                              {school.ordem_rota || '-'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            ))}
            {filteredSchools.length === 0 && (
              <Box textAlign="center" py={4}>
                <Typography color="textSecondary">Nenhuma escola encontrada.</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  // Renderização dos Detalhes da Escola
  const renderSchoolDetails = () => {
    if (!selectedSchool) return null;

    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4">{selectedSchool.nome}</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Gerenciamento de Demandas
            </Typography>
          </Box>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" gap={2}>
             <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Mês</InputLabel>
              <Select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                label="Mês"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor:
                            mesStatusMap[i + 1] === 'pendente'
                              ? '#f44336'
                              : mesStatusMap[i + 1] === 'programada'
                              ? '#2196f3'
                              : mesStatusMap[i + 1] === 'em_rota'
                              ? '#ff9800'
                              : 'divider'
                        }}
                      />
                      {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Ano</InputLabel>
              <Select
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                label="Ano"
              >
                <MenuItem value={2024}>2024</MenuItem>
                <MenuItem value={2025}>2025</MenuItem>
                <MenuItem value={2026}>2026</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Adicionar Produto
          </Button>
        </Box>

        <TableContainer component={Paper}>
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
                    Nenhum produto encontrado para este período.
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
                        icon={getStatusIcon(item.status || 'pendente')}
                        label={item.status?.toUpperCase() || 'PENDENTE'} 
                        color={getStatusColor(item.status || 'pendente') as any}
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{item.observacao || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenHistorico(item)} color="info" title="Ver Histórico">
                        <HistoryIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpenDialog(item)} color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteProduct(item)} color="error">
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
      {view === 'list' ? renderSchoolList() : renderSchoolDetails()}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Editar Produto' : 'Adicionar Produto para Entrega'}</DialogTitle>
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

            <Box
              display="grid"
              sx={{
                gridTemplateColumns: estoqueIndividual ? 'max-content 1fr max-content' : '1fr max-content',
                alignItems: 'center',
                columnGap: 1
              }}
            >
              {estoqueIndividual && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  <Chip
                    size="small"
                    label={`${(estoqueIndividual.quantidade_atual ?? 0).toLocaleString('pt-BR')} ${estoqueIndividual.unidade}`}
                    sx={{ height: 22 }}
                  />
                  {estoqueIndividual.data_ultima_atualizacao && (
                    <Typography variant="caption" color="text.secondary">
                      {new Date(estoqueIndividual.data_ultima_atualizacao).toLocaleDateString('pt-BR')}
                    </Typography>
                  )}
                </Box>
              )}
              <TextField
                label="Quantidade"
                type="number"
                fullWidth
                value={formData.quantidade}
                onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
                sx={{ minWidth: 140 }}
              />
              <TextField
                label="Unidade"
                fullWidth
                value={formData.unidade}
                onChange={(e) => setFormData({...formData, unidade: e.target.value})}
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

            <Box sx={{ 
              p: 2, 
              bgcolor: '#f0f7ff', 
              borderRadius: 1, 
              border: '1px solid #bbdefb' 
            }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#1976d2', fontWeight: 600 }}>
                📊 Mês de Competência (Consumo)
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#666' }}>
                Define para qual mês o consumo será contabilizado. Por padrão, usa o mês da data de entrega.
              </Typography>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Mês</InputLabel>
                  <Select
                    value={formData.mes_competencia}
                    onChange={(e) => setFormData({...formData, mes_competencia: Number(e.target.value)})}
                    label="Mês"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Ano</InputLabel>
                  <Select
                    value={formData.ano_competencia}
                    onChange={(e) => setFormData({...formData, ano_competencia: Number(e.target.value)})}
                    label="Ano"
                  >
                    <MenuItem value={2024}>2024</MenuItem>
                    <MenuItem value={2025}>2025</MenuItem>
                    <MenuItem value={2026}>2026</MenuItem>
                    <MenuItem value={2027}>2027</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              {formData.data_entrega && (() => {
                const dataEntrega = new Date(formData.data_entrega + 'T00:00:00');
                const mesEntrega = dataEntrega.getMonth() + 1;
                const anoEntrega = dataEntrega.getFullYear();
                
                // Entrega antecipada = entregar ANTES do mês de competência
                const isAntecipada = anoEntrega < formData.ano_competencia || 
                  (anoEntrega === formData.ano_competencia && mesEntrega < formData.mes_competencia);
                
                if (isAntecipada) {
                  return (
                    <Box sx={{ mt: 1, p: 1, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ffb74d' }}>
                      <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600 }}>
                        ⚠️ Entrega Antecipada: Será entregue em {dataEntrega.toLocaleDateString('pt-BR')} 
                        para consumo em {new Date(0, formData.mes_competencia - 1).toLocaleString('pt-BR', { month: 'long' })}/{formData.ano_competencia}
                      </Typography>
                    </Box>
                  );
                }
                return null;
              })()}
            </Box>

            <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  label="Status"
                >
                  <MenuItem value="pendente">Pendente (Pronto para entrega)</MenuItem>
                  <MenuItem value="programada">Programada (Aguardando)</MenuItem>
                  <MenuItem value="em_rota">Em Rota</MenuItem>
                  <MenuItem value="parcial">Parcial (Entrega parcial realizada)</MenuItem>
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
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editMode ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openBatchDialog} onClose={() => !batchSaving && setOpenBatchDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Adicionar quantidade em lote</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Modo</InputLabel>
                  <Select
                    value={batchMode}
                    label="Modo"
                    onChange={(e) => setBatchMode(e.target.value as 'add' | 'edit')}
                    disabled={batchSaving}
                  >
                    <MenuItem value="add">Adicionar</MenuItem>
                    <MenuItem value="edit">Editar</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={5}>
                <FormControl fullWidth>
                  <InputLabel>Produto</InputLabel>
                  <Select
                    value={batchForm.produtoId}
                    onChange={(e) => handleBatchProductChange(Number(e.target.value))}
                    label="Produto"
                    disabled={batchSaving}
                  >
                    {products.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.nome}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Unidade"
                  fullWidth
                  value={batchForm.unidade}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, unidade: e.target.value }))}
                  disabled={batchSaving}
                />
              </Grid>
              <Grid item xs={12} md={2}>
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

            <Box sx={{ 
              p: 2, 
              bgcolor: '#f0f7ff', 
              borderRadius: 1, 
              border: '1px solid #bbdefb',
              mb: 2
            }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#1976d2', fontWeight: 600 }}>
                📊 Mês de Competência (Consumo)
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#666' }}>
                Define para qual mês o consumo será contabilizado em todas as escolas.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Mês</InputLabel>
                    <Select
                      value={batchForm.mes_competencia}
                      onChange={(e) => setBatchForm(prev => ({ ...prev, mes_competencia: Number(e.target.value) }))}
                      label="Mês"
                      disabled={batchSaving}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Ano</InputLabel>
                    <Select
                      value={batchForm.ano_competencia}
                      onChange={(e) => setBatchForm(prev => ({ ...prev, ano_competencia: Number(e.target.value) }))}
                      label="Ano"
                      disabled={batchSaving}
                    >
                      <MenuItem value={2024}>2024</MenuItem>
                      <MenuItem value={2025}>2025</MenuItem>
                      <MenuItem value={2026}>2026</MenuItem>
                      <MenuItem value={2027}>2027</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              {batchForm.data_entrega && (() => {
                const dataEntrega = new Date(batchForm.data_entrega + 'T00:00:00');
                const mesEntrega = dataEntrega.getMonth() + 1;
                const anoEntrega = dataEntrega.getFullYear();
                
                // Entrega antecipada = entregar ANTES do mês de competência
                const isAntecipada = anoEntrega < batchForm.ano_competencia || 
                  (anoEntrega === batchForm.ano_competencia && mesEntrega < batchForm.mes_competencia);
                
                if (isAntecipada) {
                  return (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ffb74d' }}>
                      <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 600 }}>
                        ⚠️ Entrega Antecipada em Lote
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#e65100', display: 'block', mt: 0.5 }}>
                        Todas as escolas receberão em {dataEntrega.toLocaleDateString('pt-BR')} 
                        para consumo em {new Date(0, batchForm.mes_competencia - 1).toLocaleString('pt-BR', { month: 'long' })}/{batchForm.ano_competencia}
                      </Typography>
                    </Box>
                  );
                }
                return null;
              })()}
            </Box>
            {batchMode === 'edit' && batchLoadingExisting && (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={18} />
                <Typography variant="body2">Carregando itens para edição...</Typography>
              </Box>
            )}

            <TableContainer component={Paper} sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Escola</TableCell>
                    <TableCell width={180}>Estoque</TableCell>
                    <TableCell width={160}>Quantidade</TableCell>
                    <TableCell width={140}>Unidade</TableCell>
                    <TableCell width={180}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>{school.nome}</TableCell>
                      <TableCell>
                        {batchEstoqueMap[school.id] && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              size="small"
                              label={`${(batchEstoqueMap[school.id]!.quantidade_atual ?? 0).toLocaleString('pt-BR')} ${batchEstoqueMap[school.id]!.unidade}`}
                              sx={{ height: 22 }}
                            />
                            {batchEstoqueMap[school.id]!.data_ultima_atualizacao && (
                              <Typography variant="caption" color="text.secondary">
                                {new Date(batchEstoqueMap[school.id]!.data_ultima_atualizacao as string).toLocaleDateString('pt-BR')}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={batchQuantidades[school.id] || ''}
                          onChange={(e) => handleBatchQuantidadeChange(school.id, e.target.value)}
                          inputProps={{ min: 0, step: 0.001 }}
                          disabled={batchSaving || batchLoadingExisting}
                          sx={{ width: 160 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={batchUnidades[school.id] ?? batchForm.unidade}
                          onChange={(e) => handleBatchUnidadeChange(school.id, e.target.value)}
                          disabled={batchSaving || batchLoadingExisting}
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={batchStatus[school.id] || 'pendente'}
                            onChange={(e) => handleBatchStatusChange(school.id, e.target.value)}
                            disabled={batchSaving || batchLoadingExisting}
                          >
                            <MenuItem value="pendente">Pendente (Para entrega)</MenuItem>
                            <MenuItem value="programada">Programada</MenuItem>
                            <MenuItem value="em_rota">Em rota</MenuItem>
                            <MenuItem value="parcial">Parcial</MenuItem>
                            <MenuItem value="entregue">Entregue</MenuItem>
                            <MenuItem value="cancelado">Cancelado</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                  {schools.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        Nenhuma escola disponível
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {batchSaving && (
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">
                      Salvando {batchProgress.currentIndex} de {batchProgress.total}
                    </Typography>
                  </Box>
                  <Box mt={1}>
                    <Typography variant="subtitle2">{batchProgress.escolaNome}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {batchProgress.quantidade} {batchProgress.unidade}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBatchDialog(false)} disabled={batchSaving}>Cancelar</Button>
          <Button onClick={handleBatchSubmit} variant="contained" disabled={batchSaving}>
            {batchSaving ? <CircularProgress size={20} /> : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Histórico de Entregas */}
      <Dialog 
        open={openHistoricoDialog} 
        onClose={handleCloseHistorico}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon />
            <Typography variant="h6">Histórico de Entregas</Typography>
          </Box>
          {historicoItem && (
            <Typography variant="subtitle2" color="textSecondary">
              {historicoItem.produto_nome || historicoItem.produto?.nome} - {historicoItem.quantidade} {historicoItem.unidade}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {historicoLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          ) : historicoEntregas.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                Nenhuma entrega registrada para este item
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell>Quantidade</TableCell>
                    <TableCell>Entregador</TableCell>
                    <TableCell>Recebedor</TableCell>
                    <TableCell>Observação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historicoEntregas.map((entrega) => (
                    <TableRow key={entrega.id}>
                      <TableCell>
                        {new Date(entrega.data_entrega).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${formatarQuantidade(parseFloat(entrega.quantidade_entregue) || 0)} ${historicoItem?.unidade || ''}`}
                          size="small"
                          color="success"
                        />
                      </TableCell>
                      <TableCell>{entrega.nome_quem_entregou}</TableCell>
                      <TableCell>{entrega.nome_quem_recebeu}</TableCell>
                      <TableCell>{entrega.observacao || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {historicoItem && historicoEntregas.length > 0 && (
            <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Quantidade Programada
                  </Typography>
                  <Typography variant="h6">
                    {formatarQuantidade(historicoItem?.quantidade || 0)} {historicoItem?.unidade || ''}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Total Entregue
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatarQuantidade(historicoEntregas.reduce((sum, e) => sum + (parseFloat(e.quantidade_entregue) || 0), 0))} {historicoItem?.unidade || ''}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Saldo Pendente
                  </Typography>
                  <Typography variant="h6" color={
                    ((historicoItem?.quantidade || 0) - historicoEntregas.reduce((sum, e) => sum + (parseFloat(e.quantidade_entregue) || 0), 0)) > 0.01 
                      ? "warning.main" 
                      : "success.main"
                  }>
                    {formatarQuantidade((historicoItem?.quantidade || 0) - historicoEntregas.reduce((sum, e) => sum + (parseFloat(e.quantidade_entregue) || 0), 0))} {historicoItem?.unidade || ''}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistorico}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuiasDemanda;
