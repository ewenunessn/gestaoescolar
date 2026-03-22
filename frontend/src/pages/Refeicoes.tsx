import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatusIndicator from '../components/StatusIndicator';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';
import TableFilter, { FilterField } from '../components/TableFilter';
import { useToast } from '../hooks/useToast';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Tooltip,
  Menu,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Restaurant,
  MoreVert,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Edit,
  Delete,
  Visibility,
  ContentCopy,
} from '@mui/icons-material';
import CompactPagination from '../components/CompactPagination';
import { useNavigate } from 'react-router-dom';
import { Refeicao } from '../types/refeicao';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { 
  useRefeicoes, 
  useCriarRefeicao, 
  useEditarRefeicao, 
  useDeletarRefeicao,
  useDuplicarRefeicao
} from '../hooks/queries/useRefeicaoQueries';

const RefeicoesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // React Query hooks
  const { data: refeicoes = [], isLoading: loading, error: queryError } = useRefeicoes();
  const criarRefeicaoMutation = useCriarRefeicao();
  const editarRefeicaoMutation = useEditarRefeicao();
  const deletarRefeicaoMutation = useDeletarRefeicao();
  const duplicarRefeicaoMutation = useDuplicarRefeicao();
  
  // Estados locais (apenas UI)
  const [error, setError] = useState<string | null>(null);

  // Estados do menu de ações
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);

  // Estados de filtros - NOVO SISTEMA
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Estados de paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estados de modais
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [editingRefeicao, setEditingRefeicao] = useState<Refeicao | null>(null);
  const [refeicaoToDelete, setRefeicaoToDelete] = useState<Refeicao | null>(null);
  const [refeicaoToDuplicate, setRefeicaoToDuplicate] = useState<Refeicao | null>(null);
  const [duplicateNome, setDuplicateNome] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'almoco' as 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia',
    ativo: true,
  });

  // Tratar erros do React Query
  useEffect(() => {
    if (queryError) {
      setError('Erro ao carregar refeições. Tente novamente.');
    }
  }, [queryError]);

  // Mapear tipos de refeição para exibição
  const tiposRefeicao = {
    'cafe_manha': 'Café da Manhã',
    'almoco': 'Almoço',
    'lanche_tarde': 'Lanche da Tarde',
    'jantar': 'Jantar',
    'ceia': 'Ceia'
  };

  // Definir campos de filtro
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'select',
      label: 'Tipo',
      key: 'tipo',
      options: Object.entries(tiposRefeicao).map(([value, label]) => ({ value, label })),
    },
    {
      type: 'select',
      label: 'Status',
      key: 'status',
      options: [
        { value: 'ativo', label: 'Ativas' },
        { value: 'inativo', label: 'Inativas' },
      ],
    },
    {
      type: 'select',
      label: 'Ordenar por',
      key: 'sortBy',
      options: [
        { value: 'name', label: 'Nome' },
        { value: 'tipo', label: 'Tipo' },
        { value: 'status', label: 'Status' },
      ],
    },
  ], []);

  // Filtrar e ordenar refeições
  const filteredRefeicoes = useMemo(() => {
    const sortBy = filters.sortBy || 'name';
    
    return refeicoes.filter(refeicao => {
      // Busca por palavra-chave
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!refeicao.nome.toLowerCase().includes(searchLower) &&
            !(refeicao.descricao || '').toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Filtro de tipo
      if (filters.tipo && refeicao.tipo !== filters.tipo) {
        return false;
      }

      // Filtro de status
      if (filters.status) {
        if (filters.status === 'ativo' && !refeicao.ativo) return false;
        if (filters.status === 'inativo' && refeicao.ativo) return false;
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nome.localeCompare(b.nome);
        case 'tipo':
          return a.tipo.localeCompare(b.tipo);
        case 'status':
          return Number(b.ativo) - Number(a.ativo);
        default:
          return a.nome.localeCompare(b.nome);
      }
    });
  }, [refeicoes, filters]);

  // Refeições paginadas
  const paginatedRefeicoes = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredRefeicoes.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRefeicoes, page, rowsPerPage]);

  // Funções de paginação
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setPage(0);
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(0);
  }, []);

  // Funções de modais
  const openModal = (refeicao: Refeicao | null = null) => {
    if (refeicao) {
      setEditingRefeicao(refeicao);
      setFormData({
        nome: refeicao.nome,
        descricao: refeicao.descricao || '',
        tipo: refeicao.tipo,
        ativo: refeicao.ativo,
      });
    } else {
      setEditingRefeicao(null);
      setFormData({
        nome: '',
        descricao: '',
        tipo: 'almoco',
        ativo: true,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRefeicao(null);
  };

  const handleSave = async () => {
    try {
      if (editingRefeicao) {
        await editarRefeicaoMutation.mutateAsync({ id: editingRefeicao.id, data: formData });
        toast.success('Sucesso!', 'Refeição atualizada com sucesso!');
      } else {
        await criarRefeicaoMutation.mutateAsync(formData);
        toast.success('Sucesso!', 'Refeição criada com sucesso!');
      }
      closeModal();
    } catch (err: any) {
      setError('Erro ao salvar refeição. Verifique os dados e tente novamente.');
    }
  };

  const openDeleteModal = (refeicao: Refeicao) => {
    setRefeicaoToDelete(refeicao);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setRefeicaoToDelete(null);
  };

  const handleDelete = async () => {
    if (!refeicaoToDelete) return;
    try {
      await deletarRefeicaoMutation.mutateAsync(refeicaoToDelete.id);
      toast.success('Sucesso!', 'Refeição excluída com sucesso!');
      closeDeleteModal();
    } catch (err: any) {
      const message = err.response?.data?.message.includes('cardapios')
        ? 'Não é possível excluir. A refeição está em uso em um ou mais cardápios.'
        : 'Erro ao excluir a refeição. Tente novamente.';
      setError(message);
    }
  };

  const handleViewDetails = (refeicao: Refeicao) => {
    navigate(`/refeicoes/${refeicao.id}`);
  };

  const openDuplicateModal = (refeicao: Refeicao) => {
    setRefeicaoToDuplicate(refeicao);
    setDuplicateNome(`${refeicao.nome} (Cópia)`);
    setDuplicateModalOpen(true);
  };

  const closeDuplicateModal = () => {
    setDuplicateModalOpen(false);
    setRefeicaoToDuplicate(null);
    setDuplicateNome('');
  };

  const handleDuplicate = async () => {
    if (!refeicaoToDuplicate || !duplicateNome.trim()) return;
    try {
      await duplicarRefeicaoMutation.mutateAsync({ 
        id: refeicaoToDuplicate.id, 
        nome: duplicateNome.trim() 
      });
      toast.success('Sucesso!', 'Refeição duplicada com sucesso!');
      closeDuplicateModal();
    } catch (err: any) {
      setError('Erro ao duplicar refeição. Tente novamente.');
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 56px)', bgcolor: '#ffffff', overflow: 'hidden' }}>
      <PageContainer fullHeight>
        <PageHeader 
          title="Refeições"
        />
        
        <Card sx={{ borderRadius: '12px', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <TextField
              placeholder="Buscar refeições..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              size="small"
              sx={{ flex: 1, minWidth: '200px', '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilters(prev => ({ ...prev, search: '' }))}><ClearIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={(e) => { setFilterAnchorEl(e.currentTarget); setFilterOpen(true); }}
                size="small"
              >
                Filtros
              </Button>
              <Button startIcon={<AddIcon />} onClick={() => openModal()} variant="contained" color="add" size="small">
                Nova Refeição
              </Button>
              <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)} size="small">
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
        </Card>

        <TableFilter
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={setFilters}
          fields={filterFields}
          initialValues={filters}
          showSearch={false}
          anchorEl={filterAnchorEl}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, px: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Exibindo {filteredRefeicoes.length} resultado{filteredRefeicoes.length !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusIndicator status="ativo" size="small" />
            <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ATIVAS
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
              {filteredRefeicoes.filter(r => r.ativo).length}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusIndicator status="inativo" size="small" />
            <Typography variant="body2" sx={{ color: '#495057', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              INATIVAS
            </Typography>
            <Typography variant="body2" sx={{ color: '#6c757d', fontWeight: 600 }}>
              {filteredRefeicoes.filter(r => !r.ativo).length}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={60} /></CardContent></Card>
          ) : error ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              </CardContent>
            </Card>
          ) : filteredRefeicoes.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Restaurant sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>Nenhuma refeição encontrada</Typography>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                <Table stickyHeader>
                <TableHead>
                <TableRow>
                  <TableCell align="left">Nome da Refeição</TableCell>
                  <TableCell align="center">Tipo</TableCell>
                  <TableCell align="center" width="180">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRefeicoes.map((refeicao) => (
                  <TableRow key={refeicao.id} hover>
                    <TableCell align="left">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusIndicator status={refeicao.ativo ? 'ativo' : 'inativo'} size="small" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{refeicao.nome}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">{tiposRefeicao[refeicao.tipo]}</Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Tooltip title="Ver Detalhes"><IconButton size="small" onClick={() => handleViewDetails(refeicao)} color="default"><Visibility fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Duplicar"><IconButton size="small" onClick={() => openDuplicateModal(refeicao)} color="primary"><ContentCopy fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => openModal(refeicao)} color="primary"><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Excluir"><IconButton size="small" onClick={() => openDeleteModal(refeicao)} color="delete"><Delete fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </TableContainer>
              <CompactPagination
                count={filteredRefeicoes.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Box>
          )}
        </Box>
      </PageContainer>

      {/* Modal de Criação/Edição */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingRefeicao ? 'Editar Refeição' : 'Nova Refeição'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField label="Nome da Refeição" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
            <TextField label="Descrição (Opcional)" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} multiline rows={3} />
            <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })} label="Tipo">
                    {Object.entries(tiposRefeicao).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={formData.ativo} onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })} />} label="Refeição Ativa" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeModal} sx={{ color: 'text.secondary' }} disabled={criarRefeicaoMutation.isPending || editarRefeicaoMutation.isPending}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.nome.trim() || criarRefeicaoMutation.isPending || editarRefeicaoMutation.isPending}>
            {criarRefeicaoMutation.isPending || editarRefeicaoMutation.isPending ? 'Salvando...' : (editingRefeicao ? 'Salvar Alterações' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onClose={closeDeleteModal} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a refeição "{refeicaoToDelete?.nome}"? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={closeDeleteModal} sx={{ color: 'text.secondary' }} disabled={deletarRefeicaoMutation.isPending}>Cancelar</Button>
            <Button onClick={handleDelete} color="delete" variant="contained" disabled={deletarRefeicaoMutation.isPending}>
              {deletarRefeicaoMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
        </DialogActions>
      </Dialog>
      
      {/* Menu de Ações */}
      <Menu anchorEl={actionsMenuAnchor} open={Boolean(actionsMenuAnchor)} onClose={() => setActionsMenuAnchor(null)}>
        {/* Adicionar opções como "Exportar" aqui no futuro */}
        <MenuItem disabled>
            <Typography>Nenhuma ação disponível</Typography>
        </MenuItem>
      </Menu>

      {/* Modal de Duplicar Refeição */}
      <Dialog open={duplicateModalOpen} onClose={closeDuplicateModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Duplicar Refeição</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Todos os dados da refeição "{refeicaoToDuplicate?.nome}" serão copiados, incluindo produtos e ingredientes. Apenas altere o nome da nova refeição.
            </Alert>
            <TextField 
              label="Nome da Nova Refeição" 
              value={duplicateNome} 
              onChange={(e) => setDuplicateNome(e.target.value)} 
              required 
              autoFocus
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={closeDuplicateModal} sx={{ color: 'text.secondary' }} disabled={duplicarRefeicaoMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDuplicate} 
            variant="contained" 
            disabled={!duplicateNome.trim() || duplicarRefeicaoMutation.isPending}
            startIcon={<ContentCopy />}
          >
            {duplicarRefeicaoMutation.isPending ? 'Duplicando...' : 'Duplicar'}
          </Button>
        </DialogActions>
      </Dialog>

      <LoadingOverlay 
        open={criarRefeicaoMutation.isPending || editarRefeicaoMutation.isPending || deletarRefeicaoMutation.isPending || duplicarRefeicaoMutation.isPending}
        message={
          criarRefeicaoMutation.isPending ? 'Criando refeição...' :
          editarRefeicaoMutation.isPending ? 'Atualizando refeição...' :
          deletarRefeicaoMutation.isPending ? 'Excluindo refeição...' :
          duplicarRefeicaoMutation.isPending ? 'Duplicando refeição...' :
          'Processando...'
        }
      />
    </Box>
  );
};

export default RefeicoesPage;
