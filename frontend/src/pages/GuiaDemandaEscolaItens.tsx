import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CompactPagination from '../components/CompactPagination';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import PageContainer from '../components/PageContainer';
import PageBreadcrumbs from '../components/PageBreadcrumbs';
import { guiaService, GuiaProdutoEscola } from '../services/guiaService';
import { produtoService, Produto } from '../services/produtoService';
import { useToast } from '../hooks/useToast';
import api from '../services/api';

const GuiaDemandaEscolaItens: React.FC = () => {
  const navigate = useNavigate();
  const { guiaId, escolaId } = useParams<{ guiaId: string; escolaId: string }>();
  const toast = useToast();
  
  const [guia, setGuia] = useState<any>(null);
  const [escola, setEscola] = useState<any>(null);
  const [itens, setItens] = useState<GuiaProdutoEscola[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
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
        toast.success('Sucesso!', 'Item atualizado com sucesso!');
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
        toast.success('Sucesso!', 'Item adicionado com sucesso!');
      }
      setOpenModal(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      toast.error('Erro ao salvar', 'Não foi possível salvar o item.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este item?')) return;
    
    try {
      await guiaService.removerItemGuia(id);
      toast.success('Sucesso!', 'Item removido com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao excluir', 'Não foi possível excluir o item.');
    }
  };

  const filteredItens = useMemo(() => {
    return itens.filter(item => 
      item.produto_nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [itens, searchTerm]);

  const paginatedItens = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredItens.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredItens, page, rowsPerPage]);

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
      'pendente': 'default',
      'programada': 'info',
      'parcial': 'warning',
      'entregue': 'success',
      'cancelado': 'error'
    };
    return statusMap[status] || 'default';
  };

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
        <PageBreadcrumbs
          items={[
            { label: 'Guias de Demanda', path: '/guias-demanda', icon: <CalendarIcon fontSize="small" /> },
            { label: guia?.nome || 'Guia', path: `/guias-demanda/${guiaId}` },
            { label: escola?.nome || 'Escola' }
          ]}
        />
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate(`/guias-demanda/${guiaId}`)} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {escola?.nome}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {guia?.nome}
            </Typography>
          </Box>
        </Box>

        {/* Barra de Pesquisa e Cards de Resumo na mesma linha */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'stretch' }}>
          <Card sx={{ borderRadius: '12px', p: 2, flex: '0 0 300px' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenModal()}
                size="small"
                sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, whiteSpace: 'nowrap' }}
              >
                Adicionar
              </Button>
            </Box>
          </Card>
          
          <Card sx={{ p: 1.5, flex: 1, minWidth: '100px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Total de Itens</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>{itens.length}</Typography>
          </Card>
          <Card sx={{ p: 1.5, flex: 1, minWidth: '100px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Pendentes</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'warning.main' }}>
              {itens.filter(i => i.status === 'pendente').length}
            </Typography>
          </Card>
          <Card sx={{ p: 1.5, flex: 1, minWidth: '100px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Programados</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'info.main' }}>
              {itens.filter(i => i.status === 'programada').length}
            </Typography>
          </Card>
          <Card sx={{ p: 1.5, flex: 1, minWidth: '100px' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Entregues</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
              {itens.filter(i => i.status === 'entregue').length}
            </Typography>
          </Card>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 500 }}>
            Exibindo {filteredItens.length} {filteredItens.length === 1 ? 'item' : 'itens'}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {filteredItens.length === 0 ? (
            <Box textAlign="center" py={8}>
              <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Nenhum item encontrado
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell align="center">Quantidade</TableCell>
                      <TableCell align="center">Unidade</TableCell>
                      <TableCell align="center">Data Programada</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedItens.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.produto_nome}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{item.quantidade}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{item.unidade}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {(() => {
                              const data = item.data_programada || item.data_entrega;
                              if (!data) return '-';
                              try {
                                return new Date(data).toLocaleDateString('pt-BR');
                              } catch {
                                return '-';
                              }
                            })()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={item.status} 
                            size="small" 
                            color={getStatusColor(item.status)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => handleOpenModal(item)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                size="small"
                                color="delete"
                                onClick={() => handleDelete(item.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <CompactPagination
                count={filteredItens.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Box>
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
                <MenuItem value="pendente">Pendente</MenuItem>
                <MenuItem value="programada">Programada</MenuItem>
                <MenuItem value="parcial">Parcial</MenuItem>
                <MenuItem value="entregue">Entregue</MenuItem>
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
