import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  InputAdornment,
  Tooltip,
  Stack,
  Divider,
  Autocomplete,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  School as SchoolIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  Refresh,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useEscolas } from '../hooks/queries';
import { useTenant } from '../context/TenantContext';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import { useEstoqueEscola, useRegistrarMovimentacao } from '../hooks/queries/useEstoqueEscolaQueries';
import { formatarQuantidade as formatarQtd } from '../utils/formatters';
import TenantInventoryFilter from '../components/TenantInventoryFilter';
import TenantInventoryList from '../components/TenantInventoryList';
import TenantInventoryBreadcrumbs from '../components/TenantInventoryBreadcrumbs';

// Interface Escola importada do hook useEscolas

interface ItemEstoque {
  id: number;
  escola_id: number;
  produto_id: number;
  produto_nome: string;
  unidade_medida?: string;
  unidade?: string; // Campo alternativo do serviço
  categoria: string;
  quantidade_atual: number;
  data_validade?: string;
  status_estoque: 'normal' | 'critico' | 'vencido' | 'atencao' | 'sem_estoque';
  dias_para_vencimento?: number;
}

interface MovimentacaoForm {
  escola_id: string;
  produto_id: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'ajuste';
  quantidade: string;
  data_validade?: string;
}

const MovimentacaoEstoquePage = () => {
  const navigate = useNavigate();
  const { currentTenant, loading: tenantLoading, error: tenantContextError } = useTenant();
  const escolasQuery = useEscolas();
  
  // Estados principais
  const [escolaSelecionada, setEscolaSelecionada] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados do modal de lotes/validade
  const [modalLotesOpen, setModalLotesOpen] = useState(false);
  const [itemLotesSelecionado, setItemLotesSelecionado] = useState<ItemEstoque | null>(null);
  const [lotesItem, setLotesItem] = useState<any[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [mostrarLotesEsgotados, setMostrarLotesEsgotados] = useState(false);
  
  // React Query hooks
  const escolaId = escolaSelecionada ? parseInt(escolaSelecionada) : null;
  const estoqueQuery = useEstoqueEscola(escolaId);
  const registrarMovimentacaoMutation = useRegistrarMovimentacao();
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  
  // Estados do modal de movimentação
  const [modalOpen, setModalOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<ItemEstoque | null>(null);
  const [formData, setFormData] = useState<MovimentacaoForm>({
    escola_id: '',
    produto_id: '',
    tipo_movimentacao: 'entrada',
    quantidade: '',
    data_validade: '',
  });
  const salvando = registrarMovimentacaoMutation.isPending;

  const escolas = escolasQuery.data || [];
  const estoque = estoqueQuery.data || [];
  const loading = estoqueQuery.isLoading || tenantLoading;

  // Enhanced error handling for tenant-specific errors
  const handleTenantError = useCallback((error: any) => {
    if (error?.response?.status === 403) {
      const errorCode = error?.response?.data?.code;
      if (errorCode === 'TENANT_OWNERSHIP_ERROR') {
        setTenantError('Você não tem permissão para acessar este recurso da organização.');
      } else if (errorCode === 'CROSS_TENANT_INVENTORY_ACCESS') {
        setTenantError('Acesso negado: operação entre organizações não permitida.');
      } else {
        setTenantError('Acesso negado: você não tem permissão para esta operação.');
      }
    } else if (error?.response?.status === 429 && error?.response?.data?.code === 'TENANT_INVENTORY_LIMIT_ERROR') {
      setTenantError('Limite de inventário da organização excedido.');
    } else if (error?.response?.data?.code === 'TENANT_CONTEXT_MISSING') {
      setTenantError('Contexto de organização não encontrado. Faça login novamente.');
    } else {
      setError(error?.message || 'Erro desconhecido');
    }
  }, []);

  // Check for tenant context errors
  useEffect(() => {
    if (tenantContextError) {
      setTenantError('Erro ao carregar contexto da organização. Tente fazer login novamente.');
    }
  }, [tenantContextError]);

  // Check for query errors and handle tenant-specific ones
  useEffect(() => {
    if (estoqueQuery.error) {
      handleTenantError(estoqueQuery.error);
    }
  }, [estoqueQuery.error, handleTenantError]);

  useEffect(() => {
    if (escolasQuery.error) {
      handleTenantError(escolasQuery.error);
    }
  }, [escolasQuery.error, handleTenantError]);

  // Debug: Log dos dados do estoque
  useEffect(() => {
    console.log('Estado do estoque:', {
      loading: estoqueQuery.isLoading,
      error: estoqueQuery.error,
      data: estoque,
      escolaId
    });
    
    if (estoque.length > 0) {
      console.log('Primeiro item do estoque:', estoque[0]);
      console.log('Tipo de quantidade_atual:', typeof estoque[0].quantidade_atual, estoque[0].quantidade_atual);
    }
  }, [estoque, estoqueQuery.isLoading, estoqueQuery.error, escolaId]);

  // Recarregar lotes quando o filtro de lotes esgotados mudar
  useEffect(() => {
    if (modalLotesOpen && itemLotesSelecionado) {
      carregarLotes(itemLotesSelecionado);
    }
  }, [mostrarLotesEsgotados]);

  // Filtrar itens do estoque
  const itensFiltrados = useMemo(() => {
    if (!Array.isArray(estoque)) return [];
    
    return estoque.filter(item => {
      // Verificar se o item tem as propriedades necessárias
      if (!item || typeof item.produto_nome !== 'string' || !item.produto_id) return false;
      
      const matchesSearch = item.produto_nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategoria = !categoriaFiltro || item.categoria === categoriaFiltro;
      const matchesStatus = !statusFiltro || item.status_estoque === statusFiltro;
      
      return matchesSearch && matchesCategoria && matchesStatus;
    });
  }, [estoque, searchTerm, categoriaFiltro, statusFiltro]);

  // Obter categorias únicas
  const categorias = useMemo(() => {
    if (!Array.isArray(estoque)) return [];
    return [...new Set(estoque.map(item => item?.categoria).filter(Boolean))].sort();
  }, [estoque]);

  // Abrir modal de movimentação
  const abrirModalMovimentacao = (item: ItemEstoque, tipo: 'entrada' | 'saida' | 'ajuste') => {
    setItemSelecionado(item);
    setFormData({
      escola_id: escolaSelecionada,
      produto_id: item.produto_id.toString(),
      tipo_movimentacao: tipo,
      quantidade: '',
      data_validade: '',
    });
    setModalOpen(true);
  };

  // Fechar modal
  const fecharModal = () => {
    setModalOpen(false);
    setItemSelecionado(null);
    setFormData({
      escola_id: '',
      produto_id: '',
      tipo_movimentacao: 'entrada',
      quantidade: '',
      data_validade: '',
    });
  };

  // Salvar movimentação
  const salvarMovimentacao = async () => {
    if (!formData.quantidade) {
      setError('Quantidade é obrigatória');
      return;
    }

    const quantidade = parseFloat(formData.quantidade);
    if (quantidade <= 0) {
      setError('Quantidade deve ser maior que zero');
      return;
    }

    if (formData.tipo_movimentacao === 'saida' && itemSelecionado) {
      const estoqueAtual = Number(itemSelecionado.quantidade_atual) || 0;
      if (quantidade > estoqueAtual) {
        setError('Quantidade de saída não pode ser maior que o estoque atual');
        return;
      }
    }

    setError(null);
    setTenantError(null);

    try {
      // Gerar motivo automático baseado no tipo de movimentação
      const gerarMotivoAutomatico = (tipo: string) => {
        switch (tipo) {
          case 'entrada':
            return 'Entrada de estoque';
          case 'saida':
            return 'Saída de estoque';
          case 'ajuste':
            return 'Ajuste de estoque - conferência';
          default:
            return 'Movimentação de estoque';
        }
      };

      const payload = {
        produto_id: parseInt(formData.produto_id),
        tipo_movimentacao: formData.tipo_movimentacao,
        quantidade: quantidade,
        motivo: gerarMotivoAutomatico(formData.tipo_movimentacao),
        data_validade: formData.data_validade || undefined,
        usuario_id: 1, // TODO: Pegar do contexto de usuário
      };

      await registrarMovimentacaoMutation.mutateAsync({
        escolaId: parseInt(escolaSelecionada),
        dadosMovimentacao: payload
      });
      
      setSuccessMessage('Movimentação registrada com sucesso!');
      fecharModal();
    } catch (err: any) {
      console.error('Erro ao registrar movimentação:', err);
      handleTenantError(err);
    }
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vencido': return 'error';
      case 'critico': return 'warning';
      case 'atencao': return 'info';
      case 'sem_estoque': return 'default';
      default: return 'success';
    }
  };

  // Obter texto do status
  const getStatusText = (status: string, dias?: number) => {
    switch (status) {
      case 'vencido': return 'Vencido';
      case 'critico': return dias === 0 ? 'Vence hoje' : `${dias} dias`;
      case 'atencao': return dias === 0 ? 'Vence hoje' : `${dias} dias`;
      case 'sem_estoque': return 'Sem estoque';
      default: return 'Normal';
    }
  };

  // Formatar data
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Função para carregar lotes (reutilizável)
  const carregarLotes = async (item: ItemEstoque) => {
    setLoadingLotes(true);
    
    try {
      let lotesEncontrados = [];
      
      // Buscar lotes através do estoque da escola (agora inclui lotes individuais)
      try {
        const { listarEstoqueEscola } = await import('../services/estoqueEscola');
        const estoqueEscola = await listarEstoqueEscola(parseInt(escolaSelecionada));
        const itemCompleto = estoqueEscola.find((estoqueItem: any) => estoqueItem.produto_id === item.produto_id);
        
        // Verificar se o item tem lotes específicos
        const itemComLotes = itemCompleto as any;
        if (itemCompleto && itemComLotes.lotes && Array.isArray(itemComLotes.lotes) && itemComLotes.lotes.length > 0) {
          lotesEncontrados = itemComLotes.lotes.filter((lote: any) => {
            if (mostrarLotesEsgotados) {
              // Mostrar todos os lotes (ativos e esgotados)
              return lote.status === 'ativo' || lote.status === 'esgotado';
            } else {
              // Mostrar apenas lotes ativos com quantidade > 0
              return lote.status === 'ativo' && lote.quantidade_atual > 0;
            }
          });
        }
      } catch (error: any) {
        console.log('Erro ao buscar estoque com lotes:', error);
        handleTenantError(error);
      }
      
      // Se não encontrou lotes específicos E tem estoque, criar um lote virtual
      if (lotesEncontrados.length === 0 && item.quantidade_atual > 0 && !mostrarLotesEsgotados) {
        lotesEncontrados = [{
          id: 'principal',
          lote: 'Estoque Principal',
          quantidade_atual: item.quantidade_atual,
          data_validade: (item as any).data_validade || null,
          data_fabricacao: null,
          status: 'ativo'
        }];
      }
      
      setLotesItem(lotesEncontrados);
    } catch (error: any) {
      console.error('Erro ao carregar lotes:', error);
      handleTenantError(error);
      // Em caso de erro, só mostrar dados se tiver estoque
      if (item.quantidade_atual > 0 && !mostrarLotesEsgotados) {
        setLotesItem([{
          id: 'principal',
          lote: 'Estoque Principal',
          quantidade_atual: item.quantidade_atual,
          data_validade: (item as any).data_validade || null,
          data_fabricacao: null,
          status: 'ativo'
        }]);
      } else {
        setLotesItem([]);
      }
    } finally {
      setLoadingLotes(false);
    }
  };

  // Abrir modal de lotes/validade
  const abrirModalLotes = async (item: ItemEstoque) => {
    setItemLotesSelecionado(item);
    setModalLotesOpen(true);
    await carregarLotes(item);
  };

  // Formatar quantidade de forma segura
  // Usar a função utilitária de formatação
  const formatarQuantidade = formatarQtd;

  // Show tenant loading state
  if (tenantLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
            Carregando contexto da organização...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Show error if no tenant context
  if (!currentTenant && !tenantLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Contexto de organização não encontrado
          </Alert>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Não foi possível identificar sua organização. Faça login novamente ou entre em contato com o suporte.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Recarregar Página
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <TenantInventoryBreadcrumbs 
        items={[
          { label: 'Início', path: '/', icon: <SchoolIcon fontSize="small" /> },
          { label: 'Movimentação de Estoque', icon: <InventoryIcon fontSize="small" />, current: true }
        ]}
      />
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>

        {/* Alertas */}
        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        {tenantError && (
          <Alert severity="error" onClose={() => setTenantError(null)} sx={{ mb: 2 }}>
            {tenantError}
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Header */}
        <Card sx={{ p: 3, mb: 3, borderRadius: '12px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Movimentação de Estoque
              </Typography>
              {currentTenant && (
                <Chip 
                  label={currentTenant.name} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
            </Box>
            <IconButton 
              onClick={() => estoqueQuery.refetch()} 
              disabled={!escolaSelecionada || estoqueQuery.isFetching}
              color="primary"
              sx={{ 
                bgcolor: 'primary.50',
                '&:hover': { bgcolor: 'primary.100' }
              }}
            >
              <Refresh />
            </IconButton>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                options={escolas.filter(escola => escola.ativo)}
                getOptionLabel={(escola) => {
                  const municipio = (escola as any).municipio;
                  return municipio ? `${escola.nome} - ${municipio}` : escola.nome;
                }}
                value={escolas.find(escola => escola.id.toString() === escolaSelecionada) || null}
                onChange={(event, newValue) => {
                  setEscolaSelecionada(newValue ? newValue.id.toString() : '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Selecionar Escola"
                    placeholder="Digite para pesquisar..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <SchoolIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                renderOption={(props, escola) => (
                  <Box component="li" {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <SchoolIcon color="action" fontSize="small" />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {escola.nome}
                        </Typography>
                        {(escola as any).municipio && (
                          <Typography variant="caption" color="text.secondary">
                            {(escola as any).municipio}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
                noOptionsText="Nenhuma escola encontrada"
                loadingText="Carregando escolas..."
                clearText="Limpar"
                openText="Abrir"
                closeText="Fechar"
              />
            </Grid>
          </Grid>
        </Card>

        {/* Filtros e Busca */}
        {escolaSelecionada && (
          <TenantInventoryFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={categoriaFiltro}
            onCategoryChange={setCategoriaFiltro}
            selectedStatus={statusFiltro}
            onStatusChange={setStatusFiltro}
            categories={categorias}
            hasActiveFilters={!!(searchTerm || categoriaFiltro || statusFiltro)}
            onClearFilters={() => {
              setSearchTerm('');
              setCategoriaFiltro('');
              setStatusFiltro('');
            }}
            placeholder="Buscar produtos..."
            showTenantInfo={false}
          />
        )}

        {/* Lista de Estoque */}
        {escolaSelecionada && (
          <TenantInventoryList
            items={itensFiltrados}
            loading={loading}
            error={estoqueQuery.error || tenantError}
            onViewDetails={(item) => abrirModalLotes(item as ItemEstoque)}
            onAddStock={(item) => abrirModalMovimentacao(item as ItemEstoque, 'entrada')}
            onRemoveStock={(item) => abrirModalMovimentacao(item as ItemEstoque, 'saida')}
            onAdjustStock={(item) => abrirModalMovimentacao(item as ItemEstoque, 'ajuste')}
            emptyMessage={estoque.length === 0 ? 'Nenhum produto encontrado' : 'Nenhum produto corresponde aos filtros'}
          />
        )}

        {/* Modal de Movimentação */}
        <Dialog open={modalOpen} onClose={fecharModal} maxWidth="sm" fullWidth>
          <DialogTitle>
            {formData.tipo_movimentacao === 'entrada' ? 'Entrada de Estoque' : 
             formData.tipo_movimentacao === 'saida' ? 'Saída de Estoque' : 
             'Ajuste de Estoque'}
          </DialogTitle>
          <DialogContent dividers>
            {itemSelecionado && (
              <>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {itemSelecionado.produto_nome}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estoque atual: {formatarQuantidade(itemSelecionado.quantidade_atual)} {itemSelecionado.unidade_medida || itemSelecionado.unidade}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={
                        formData.tipo_movimentacao === 'entrada' ? 'Quantidade a adicionar' :
                        formData.tipo_movimentacao === 'saida' ? 'Quantidade a retirar' :
                        'Quantidade total atual (conferência)'
                      }
                      type="number"
                      value={formData.quantidade}
                      onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {itemSelecionado.unidade_medida || itemSelecionado.unidade}
                          </InputAdornment>
                        ),
                      }}
                      helperText={
                        formData.tipo_movimentacao === 'ajuste' 
                          ? `Estoque atual: ${itemSelecionado.quantidade_atual} ${itemSelecionado.unidade_medida || itemSelecionado.unidade}. Digite a quantidade total que deveria ter após conferência.`
                          : undefined
                      }
                    />
                  </Grid>
                  
                  {formData.tipo_movimentacao === 'entrada' && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Data de Validade"
                        type="date"
                        value={formData.data_validade}
                        onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  )}


                </Grid>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharModal} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              onClick={salvarMovimentacao}
              variant="contained"
              disabled={salvando || !formData.quantidade}
            >
              {salvando ? <CircularProgress size={24} /> : 'Registrar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Lotes/Validade */}
        <Dialog open={modalLotesOpen} onClose={() => setModalLotesOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <InventoryIcon color="primary" />
              <Box>
                <Typography variant="h6">
                  Detalhes por Lote/Validade
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {itemLotesSelecionado?.produto_nome}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {loadingLotes ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Carregando lotes...
                </Typography>
              </Box>
            ) : (
              <Box>
                {/* Resumo do produto */}
                <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">
                          Produto
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {itemLotesSelecionado?.produto_nome}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">
                          Quantidade Total
                        </Typography>
                        <Typography variant="body1" fontWeight={600} color="primary.main">
                          {formatarQuantidade(itemLotesSelecionado?.quantidade_atual || 0)} {itemLotesSelecionado?.unidade_medida || itemLotesSelecionado?.unidade}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="caption" color="text.secondary">
                          Status
                        </Typography>
                        <Chip
                          label={getStatusText(itemLotesSelecionado?.status_estoque || 'normal', itemLotesSelecionado?.dias_para_vencimento)}
                          color={getStatusColor(itemLotesSelecionado?.status_estoque || 'normal') as any}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Lista de lotes */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Lotes Disponíveis ({lotesItem.length})
                  </Typography>
                  <FormControl size="small">
                    <InputLabel>Filtro</InputLabel>
                    <Select
                      value={mostrarLotesEsgotados ? 'todos' : 'ativos'}
                      onChange={(e) => setMostrarLotesEsgotados(e.target.value === 'todos')}
                      label="Filtro"
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="ativos">Apenas Ativos</MenuItem>
                      <MenuItem value="todos">Todos os Lotes</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                {lotesItem.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      Produto sem estoque
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Faça uma entrada para adicionar este produto ao estoque
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {lotesItem.map((lote, index) => {
                      const diasParaVencimento = lote.data_validade ? 
                        Math.ceil((new Date(lote.data_validade).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                      
                      let statusValidade = 'normal';
                      let corStatus = '#4caf50';
                      
                      // Verificar se o lote está esgotado
                      const isEsgotado = lote.status === 'esgotado' || lote.quantidade_atual === 0;
                      
                      if (isEsgotado) {
                        statusValidade = 'esgotado';
                        corStatus = '#9e9e9e';
                      } else if (diasParaVencimento !== null) {
                        if (diasParaVencimento < 0) {
                          statusValidade = 'vencido';
                          corStatus = '#f44336';
                        } else if (diasParaVencimento <= 7) {
                          statusValidade = 'critico';
                          corStatus = '#ff9800';
                        } else if (diasParaVencimento <= 30) {
                          statusValidade = 'atencao';
                          corStatus = '#ff9800';
                        }
                      }

                      return (
                        <Card 
                          key={lote.id || index} 
                          sx={{ 
                            border: `2px solid ${corStatus}20`,
                            opacity: isEsgotado ? 0.6 : 1,
                            backgroundColor: isEsgotado ? 'grey.50' : 'background.paper'
                          }}
                        >
                          <CardContent>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Lote
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  {lote.lote} {isEsgotado && '(Esgotado)'}
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={12} sm={2}>
                                <Typography variant="caption" color="text.secondary">
                                  Quantidade
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  {formatarQuantidade(lote.quantidade_atual)} {itemLotesSelecionado?.unidade_medida || itemLotesSelecionado?.unidade}
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={12} sm={3}>
                                <Typography variant="caption" color="text.secondary">
                                  Validade
                                </Typography>
                                <Typography variant="body2">
                                  {lote.data_validade ? formatarData(lote.data_validade) : 'Sem validade'}
                                </Typography>
                              </Grid>
                              
                              <Grid item xs={12} sm={2}>
                                <Typography variant="caption" color="text.secondary">
                                  Status
                                </Typography>
                                <Chip
                                  label={
                                    statusValidade === 'esgotado' ? 'Esgotado' :
                                    statusValidade === 'vencido' ? 'Vencido' :
                                    statusValidade === 'critico' ? `${diasParaVencimento}d` :
                                    statusValidade === 'atencao' ? `${diasParaVencimento}d` :
                                    'Normal'
                                  }
                                  size="small"
                                  sx={{ 
                                    bgcolor: `${corStatus}20`,
                                    color: corStatus,
                                    fontWeight: 600
                                  }}
                                />
                              </Grid>
                              
                              <Grid item xs={12} sm={2}>
                                <Stack direction="row" spacing={1}>
                                  <Tooltip title="Entrada neste lote">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => {
                                        setModalLotesOpen(false);
                                        abrirModalMovimentacao(itemLotesSelecionado!, 'entrada');
                                      }}
                                    >
                                      <AddIcon />
                                    </IconButton>
                                  </Tooltip>
                                  {!isEsgotado && (
                                    <Tooltip title="Saída deste lote">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => {
                                          setModalLotesOpen(false);
                                          abrirModalMovimentacao(itemLotesSelecionado!, 'saida');
                                        }}
                                      >
                                        <RemoveIcon />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="Ajustar estoque (conferência)">
                                    <IconButton
                                      size="small"
                                      color="warning"
                                      onClick={() => {
                                        setModalLotesOpen(false);
                                        abrirModalMovimentacao(itemLotesSelecionado!, 'ajuste');
                                      }}
                                    >
                                      <Assessment />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalLotesOpen(false)}>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default MovimentacaoEstoquePage;