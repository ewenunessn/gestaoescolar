import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Card,
  TextField,
  Typography,
  IconButton,
  Chip,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from "@mui/material";
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  ArrowBack as ArrowBackIcon
} from "@mui/icons-material";
import { ColumnDef } from "@tanstack/react-table";
import PageContainer from "../../../components/PageContainer";
import PageBreadcrumbs from "../../../components/PageBreadcrumbs";
import { DataTableAdvanced } from "../../../components/DataTableAdvanced";
import { guiaService, GuiaProdutoEscola } from "../../../services/guiaService";
import { produtoService, Produto } from "../../../services/produtoService";
import { useToast } from "../../../hooks/useToast";
import { usePageTitle } from "../../../contexts/PageTitleContext";
import { formatarQuantidade } from "../../../utils/formatters";
import api from "../../../services/api";
import useRealtimeRefresh from "../../../hooks/useRealtimeRefresh";

// Função para converter siglas de unidades em nomes completos
const getUnidadeCompleta = (sigla: string): string => {
  const unidades: Record<string, string> = {
    'KG': 'Quilograma',
    'G': 'Grama',
    'L': 'Litro',
    'ML': 'Mililitro',
    'UN': 'Unidade',
    'CX': 'Caixa',
    'PCT': 'Pacote',
    'FD': 'Fardo',
    'SC': 'Saco',
    'DZ': 'Dúzia',
    'LT': 'Lata',
    'BD': 'Bandeja',
    'MÇ': 'Maço',
    'PC': 'Peça',
    'FR': 'Frasco',
    'GL': 'Galão',
    'TB': 'Tubo',
    'RL': 'Rolo',
    'PT': 'Pote',
    'BL': 'Balde',
    'GF': 'Garrafa'
  };
  
  return unidades[sigla.toUpperCase()] || sigla;
};

const GuiaDemandaEscolaItens: React.FC = () => {
  const navigate = useNavigate();
  const { guiaId, escolaId } = useParams<{ guiaId: string; escolaId: string }>();
  const toast = useToast();
  const { setPageTitle, setBackPath } = usePageTitle();
  
  const [guia, setGuia] = useState<any>(null);
  const [escola, setEscola] = useState<any>(null);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [itens, setItens] = useState<GuiaProdutoEscola[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Paginação removida - será gerenciada pela DataTableAdvanced
  
  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GuiaProdutoEscola | null>(null);
  const [formData, setFormData] = useState({
    produto_id: 0,
    quantidade: 0,
    status: 'pendente' as 'pendente' | 'programada' | 'parcial' | 'entregue' | 'cancelado',
    data_programada: ''
  });

  useEffect(() => {
    
    if (!guiaId) {
      toast.error('ID da guia não encontrado na URL');
      navigate('/guias-demanda');
      return;
    }
    
    if (!escolaId) {
      toast.error('ID da escola não encontrado na URL');
      navigate(`/guias-demanda/${guiaId}`);
      return;
    }
    
    loadData();
  }, [guiaId, escolaId]);

  useEffect(() => {
    setBackPath(`/guias-demanda/${guiaId}`);
    return () => {
      setBackPath(null);
    };
  }, [guiaId]);

  useEffect(() => {
    if (escola && guia) {
      setPageTitle(`${escola.nome} - ${guia.nome}`);
    } else if (escola) {
      setPageTitle(escola.nome);
    } else {
      setPageTitle('Itens da Escola');
    }
  }, [escola, guia]);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const guiaData = await guiaService.buscarGuia(Number(guiaId));
      setGuia(guiaData);
      
      const [itensData, produtosData, escolasData] = await Promise.all([
        guiaService.listarProdutosPorEscola(Number(escolaId), guiaData.mes, guiaData.ano),
        produtoService.listar(),
        api.get('/escolas').then(res => res.data.data || res.data)
      ]);
      
      // Buscar dados da escola - usar a API correta
      try {
        const escolaResponse = await api.get(`/escolas/${escolaId}`);
        setEscola(escolaResponse.data.data || escolaResponse.data);
      } catch (error) {
        // Se falhar, criar um objeto básico com o ID
        setEscola({ id: Number(escolaId), nome: `Escola ${escolaId}` });
      }
      
      setItens(itensData);
      setProdutos(produtosData);
      setEscolas(escolasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useRealtimeRefresh({
    domains: ['guias'],
    entityId: guiaId ? Number(guiaId) : undefined,
    escolaId: escolaId ? Number(escolaId) : undefined,
    onRefresh: () => {
      loadData(false);
    },
  });

  const handleOpenModal = (item?: GuiaProdutoEscola) => {
    if (item) {
      setEditingItem(item);
      
      let dataProgramada = '';
      if (item.data_programada) {
        dataProgramada = item.data_programada.split('T')[0];
      } else if (item.data_entrega) {
        dataProgramada = item.data_entrega.split('T')[0];
      }
      
      setFormData({
        produto_id: item.produto_id || item.produtoId || 0,
        quantidade: item.quantidade,
        status: item.status as any,
        data_programada: dataProgramada
      });
    } else {
      setEditingItem(null);
      setFormData({
        produto_id: 0,
        quantidade: 0,
        status: 'pendente',
        data_programada: ''
      });
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    
    if (!guia || !escolaId) {
      toast.error('Dados da guia ou escola não encontrados');
      return;
    }
    
    const escolaIdNum = Number(escolaId);
    if (isNaN(escolaIdNum)) {
      toast.error('ID da escola inválido');
      return;
    }
    
    try {
      if (editingItem) {
        await guiaService.atualizarProdutoEscola(editingItem.id, {
          quantidade: formData.quantidade
        });
        toast.success('Item atualizado com sucesso!');
      } else {
        const produtoSelecionado = produtos.find(p => p.id === formData.produto_id);
        if (!produtoSelecionado) {
          toast.error('Produto não encontrado');
          return;
        }
        
        // Validar campos antes de enviar
        if (!formData.produto_id || formData.produto_id === 0) {
          toast.error('Selecione um produto');
          return;
        }
        
        if (!formData.quantidade || formData.quantidade <= 0) {
          toast.error('Informe uma quantidade válida');
          return;
        }
        
        // Dados que o backend espera (camelCase!)
        const dadosParaEnviar: any = {
          produtoId: Number(formData.produto_id),
          escolaId: Number(escolaIdNum),
          quantidade: Number(formData.quantidade),
          unidade: String(produtoSelecionado.unidade || 'UN'),
          status: formData.status
        };
        
        // Adicionar data programada se foi preenchida
        if (formData.data_programada) {
          dadosParaEnviar.dataProgramada = formData.data_programada;
        }
        
        
        const response = await api.post(`/guias/${guiaId}/produtos`, dadosParaEnviar);
        toast.success('Item adicionado com sucesso!');
      }
      setOpenModal(false);
      loadData();
    } catch (error: any) {
      console.error('❌ Erro completo:', error);
      console.error('❌ Resposta do servidor:', error.response);
      console.error('❌ Dados do erro:', error.response?.data);
      
      const mensagemErro = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Não foi possível salvar o item.';
      
      toast.error(mensagemErro);
      
      // Se o backend retornou detalhes, mostrar no console
      if (error.response?.data?.campos_recebidos) {
        console.error('❌ Campos recebidos pelo backend:', error.response.data.campos_recebidos);
      }
      if (error.response?.data?.body_completo) {
        console.error('❌ Body completo recebido pelo backend:', error.response.data.body_completo);
      }
    }
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
      'pendente': 'warning',
      'programada': 'info',
      'parcial': 'warning',
      'entregue': 'success',
      'cancelado': 'error'
    };
    return statusMap[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      'pendente': 'Disponível p/ Entrega',
      'programada': 'Aguardando Estoque',
      'parcial': 'Entrega Parcial',
      'entregue': 'Já Entregue',
      'cancelado': 'Cancelado'
    };
    return statusLabels[status] || status;
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este item?')) return;
    
    try {
      await guiaService.removerItemGuia(id);
      toast.success('Item removido com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast.error('Não foi possível excluir o item.');
    }
  };

  // Colunas para a DataTableAdvanced
  const columns = useMemo<ColumnDef<GuiaProdutoEscola>[]>(() => [
    {
      accessorKey: 'produto_nome',
      header: 'Produto',
      size: 300,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {getValue() as string}
        </Typography>
      ),
    },
    {
      accessorKey: 'quantidade',
      header: 'Quantidade',
      size: 120,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Typography variant="body2">{formatarQuantidade(getValue() as number)}</Typography>
      ),
    },
    {
      accessorKey: 'unidade',
      header: 'Unidade',
      size: 100,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Typography variant="body2">{getUnidadeCompleta(getValue() as string)}</Typography>
      ),
    },
    {
      accessorKey: 'data_programada',
      header: 'Data Programada',
      size: 140,
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const data = item.data_programada || item.data_entrega;
        if (!data) return <Typography variant="body2">—</Typography>;
        try {
          return (
            <Typography variant="body2">
              {new Date(data).toLocaleDateString('pt-BR')}
            </Typography>
          );
        } catch {
          return <Typography variant="body2">—</Typography>;
        }
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 160,
      enableSorting: true,
      cell: ({ getValue }) => (
        <Chip 
          label={getStatusLabel(getValue() as string)} 
          size="small" 
          color={getStatusColor(getValue() as string)}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      size: 120,
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              color="secondary"
              onClick={() => handleOpenModal(row.original)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDelete(row.original.id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], []);

  // Toolbar actions
  const toolbarActions = (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={() => handleOpenModal()}
      size="small"
      sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
    >
      Adicionar Item
    </Button>
  );

  // Estatísticas para o header
  const estatisticas = useMemo(() => {
    return {
      totalItens: itens.length,
      disponivelEntrega: itens.filter(i => i.status === 'pendente').length,
      aguardandoEstoque: itens.filter(i => i.status === 'programada').length,
      jaEntregues: itens.filter(i => i.status === 'entregue').length,
    };
  }, [itens]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: 'background.default', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Tooltip title="Voltar">
            <IconButton
              size="small"
              onClick={() => navigate(`/guias-demanda/${guiaId}`)}
              sx={{ 
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { 
                  bgcolor: 'action.selected',
                  borderColor: 'primary.main'
                }
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <PageBreadcrumbs items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Demandas', path: '/demandas' },
            { label: 'Guias', path: '/guias-demanda' },
            { label: escola?.nome || 'Escola' },
          ]} />
        </Box>
        {/* Estatísticas discretas */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Itens da Escola
            </Typography>
            
            <Autocomplete
              size="small"
              options={escolas}
              getOptionLabel={(option) => option.nome || ''}
              value={escolas.find(e => e.id === Number(escolaId)) || null}
              onChange={(_, newValue) => {
                if (newValue) {
                  navigate(`/guias-demanda/${guiaId}/escola/${newValue.id}`);
                }
              }}
              sx={{ minWidth: 300 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Alternar escola..."
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    )
                  }}
                />
              )}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {[
              { label: 'Total de Produtos', value: estatisticas.totalItens, color: 'text.secondary' },
              { label: 'Disponível p/ Entrega', value: estatisticas.disponivelEntrega, color: 'warning.main' },
              { label: 'Aguardando Estoque', value: estatisticas.aguardandoEstoque, color: 'info.main' },
              { label: 'Já Entregues', value: estatisticas.jaEntregues, color: 'success.main' },
            ].map(c => (
              <Box key={c.label} sx={{ textAlign: 'center', minWidth: 80 }}>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', display: 'block' }}>
                  {c.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: c.color, fontSize: '0.9rem' }}>
                  {c.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {itens.length === 0 ? (
            <Box textAlign="center" py={8}>
              <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Nenhum item encontrado
              </Typography>
            </Box>
          ) : (
            <DataTableAdvanced
              title="Itens da Demanda"
              data={itens}
              columns={columns}
              loading={loading}
              searchPlaceholder="Buscar produtos..."
              emptyMessage="Nenhum produto encontrado"
              toolbarActions={toolbarActions}
            />
          )}
        </Box>
      </PageContainer>

      {/* Modal Adicionar/Editar Item */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Autocomplete
              options={produtos}
              getOptionLabel={(option) => option.nome}
              value={produtos.find(p => p.id === formData.produto_id) || null}
              onChange={(event, newValue) => {
                setFormData({ ...formData, produto_id: newValue ? newValue.id : 0 });
              }}
              disabled={!!editingItem}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Produto"
                  placeholder="Digite para buscar..."
                />
              )}
              noOptionsText="Nenhum produto encontrado"
              fullWidth
            />
            
            <TextField
              label="Quantidade"
              type="number"
              value={formData.quantidade}
              onChange={(e) => setFormData({ ...formData, quantidade: Number(e.target.value) })}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
            
            <TextField
              select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              fullWidth
            >
              <MenuItem value="pendente">Disponível para Entrega</MenuItem>
              <MenuItem value="programada">Aguardando Estoque</MenuItem>
              <MenuItem value="parcial">Entrega Parcial</MenuItem>
              <MenuItem value="entregue">Já Entregue</MenuItem>
              <MenuItem value="cancelado">Cancelado</MenuItem>
            </TextField>
            
            <TextField
              label="Data Programada"
              type="date"
              value={formData.data_programada}
              onChange={(e) => setFormData({ ...formData, data_programada: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.produto_id || formData.quantidade <= 0}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuiaDemandaEscolaItens;
