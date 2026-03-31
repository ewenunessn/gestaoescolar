import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
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
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import PageContainer from '../components/PageContainer';
import { DataTableAdvanced } from '../components/DataTableAdvanced';
import { guiaService, GuiaProdutoEscola } from '../services/guiaService';
import { produtoService, Produto } from '../services/produtoService';
import { useToast } from '../hooks/useToast';
import { usePageTitle } from '../contexts/PageTitleContext';
import { formatarQuantidade } from '../utils/formatters';
import api from '../services/api';

const GuiaDemandaEscolaItens: React.FC = () => {
  const navigate = useNavigate();
  const { guiaId, escolaId } = useParams<{ guiaId: string; escolaId: string }>();
  const toast = useToast();
  const { setPageTitle, setBackPath } = usePageTitle();
  
  const [guia, setGuia] = useState<any>(null);
  const [escola, setEscola] = useState<any>(null);
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
    data_programada: '',
    observacao: ''
  });

  useEffect(() => {
    if (guiaId && escolaId) {
      loadData();
    }
  }, [guiaId, escolaId]);

  useEffect(() => {
    setBackPath(`/guias-demanda/${guiaId}`);
    return () => {
      setBackPath(null);
    };
  }, [setBackPath, guiaId]);

  useEffect(() => {
    if (escola && guia) {
      setPageTitle(`${escola.nome} - ${guia.nome}`);
    } else if (escola) {
      setPageTitle(escola.nome);
    } else {
      setPageTitle('Itens da Escola');
    }
  }, [escola, guia, setPageTitle]);

  const loadData = async () => {
    try {
      setLoading(true);
      const guiaData = await guiaService.buscarGuia(Number(guiaId));
      setGuia(guiaData);
      
      const [itensData, produtosData] = await Promise.all([
        guiaService.listarProdutosPorEscola(Number(escolaId), guiaData.mes, guiaData.ano),
        produtoService.listar()
      ]);
      
      // Buscar dados da escola - usar a API correta
      try {
        const escolaResponse = await api.get(`/escolas/${escolaId}`);
        setEscola(escolaResponse.data.data || escolaResponse.data);
      } catch (error) {
        console.warn('Erro ao carregar escola, usando ID:', error);
        // Se falhar, criar um objeto básico com o ID
        setEscola({ id: Number(escolaId), nome: `Escola ${escolaId}` });
      }
      
      setItens(itensData);
      setProdutos(produtosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: GuiaProdutoEscola) => {
    if (item) {
      setEditingItem(item);
      
      // Extrair data programada do campo correto
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
        data_programada: dataProgramada,
        observacao: item.observacao || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        produto_id: 0,
        quantidade: 0,
        status: 'pendente',
        data_programada: '',
        observacao: ''
      });
    }
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!guia) return;
    
    try {
      if (editingItem) {
        await guiaService.atualizarProdutoEscola(editingItem.id, formData);
        toast.success('Item atualizado com sucesso!');
      } else {
        await guiaService.adicionarProdutoEscola({
          produtoId: formData.produto_id,
          escolaId: Number(escolaId),
          quantidade: formData.quantidade,
          status: formData.status,
          data_entrega: formData.data_programada,
          observacao: formData.observacao,
          mes_competencia: guia.mes,
          ano_competencia: guia.ano
        });
        toast.success('Item adicionado com sucesso!');
      }
      setOpenModal(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      toast.error('Não foi possível salvar o item.');
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
        <Typography variant="body2">{getValue() as string}</Typography>
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
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        {/* Estatísticas discretas */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Itens da Escola
          </Typography>
          
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
            <FormControl fullWidth>
              <InputLabel>Produto</InputLabel>
              <Select
                value={formData.produto_id || ''}
                label="Produto"
                onChange={(e) => setFormData({ ...formData, produto_id: Number(e.target.value) })}
              >
                {produtos.map((produto) => (
                  <MenuItem key={produto.id} value={produto.id}>
                    {produto.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Quantidade"
              type="number"
              value={formData.quantidade}
              onChange={(e) => setFormData({ ...formData, quantidade: Number(e.target.value) })}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="pendente">Disponível para Entrega</MenuItem>
                <MenuItem value="programada">Aguardando Estoque</MenuItem>
                <MenuItem value="parcial">Entrega Parcial</MenuItem>
                <MenuItem value="entregue">Já Entregue</MenuItem>
                <MenuItem value="cancelado">Cancelado</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Data Programada"
              type="date"
              value={formData.data_programada}
              onChange={(e) => setFormData({ ...formData, data_programada: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Observação"
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GuiaDemandaEscolaItens;
